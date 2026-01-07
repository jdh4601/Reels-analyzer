
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import OpenAI from 'openai';
import { config } from '../config';
import { Transcript, TranscriptSegment } from '../types';

/**
 * Extracts audio from a video file using ffmpeg
 * @param videoPath Path to the video file
 * @returns Path to the extracted audio file (mp3)
 */
export async function extractAudio(videoPath: string): Promise<string> {
  if (!fs.existsSync(videoPath)) {
    throw new Error(`Video file not found: ${videoPath}`);
  }

  const audioPath = videoPath.replace(/\.(mp4|mov|webm|mkv)$/i, '.mp3');
  
  // If audio file already exists, return it (cache)
  if (fs.existsSync(audioPath)) {
    return audioPath;
  }

  return new Promise((resolve, reject) => {
    // ffmpeg -i input.mp4 -vn -acodec libmp3lame -q:a 4 output.mp3
    const args = [
      '-i', videoPath,
      '-vn', // No video
      '-acodec', 'libmp3lame',
      '-q:a', '4', // Quality VBR 4
      '-y', // Overwrite
      audioPath
    ];

    const child = spawn('ffmpeg', args);

    let stderrData = '';

    child.stderr.on('data', (data) => {
      stderrData += data.toString();
    });

    child.on('error', (err) => {
      if ((err as any).code === 'ENOENT') {
        reject(new Error('ffmpeg not found. Please install ffmpeg to extract audio.'));
      } else {
        reject(err);
      }
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve(audioPath);
      } else {
        reject(new Error(`ffmpeg exited with code ${code}: ${stderrData}`));
      }
    });
  });
}

/**
 * Transcribes audio file using OpenAI Whisper API or local Whisper CLI
 * @param audioPath Path to the audio file
 * @returns Transcript object
 */
export async function transcribeAudio(audioPath: string): Promise<Transcript> {
  if (!fs.existsSync(audioPath)) {
    throw new Error(`Audio file not found: ${audioPath}`);
  }

  // Try OpenAI API first if key is present
  if (config.openaiApiKey) {
    try {
      const openai = new OpenAI({ apiKey: config.openaiApiKey });
      
      const transcription = await openai.audio.transcriptions.create({
        file: fs.createReadStream(audioPath),
        model: 'whisper-1',
        response_format: 'verbose_json',
        timestamp_granularities: ['segment'],
      });

      // Map OpenAI response to our Transcript type
      const segments: TranscriptSegment[] = (transcription.segments || []).map(seg => ({
        start: seg.start,
        end: seg.end,
        text: seg.text.trim()
      }));

      return {
        segments,
        fullText: transcription.text,
        language: transcription.language,
        duration: transcription.duration
      };
    } catch (error: any) {
        console.warn('OpenAI API transcription failed, falling back to local check...', error.message);
        // Fallthrough to local check
    }
  }

  // Fallback: Try local whisper CLI
  return transcribeWithLocalWhisper(audioPath);
}

/**
 * Transcribes audio using local Whisper CLI
 */
async function transcribeWithLocalWhisper(audioPath: string): Promise<Transcript> {
  const model = config.whisperModel || 'base';
  const outputDir = path.dirname(audioPath);
  const baseName = path.basename(audioPath, path.extname(audioPath));

  return new Promise((resolve, reject) => {
    // whisper audio.mp3 --model base --output_format json --output_dir ./
    const args = [
      audioPath,
      '--model', model,
      '--output_format', 'json',
      '--output_dir', outputDir,
      '--language', 'ko',  // Default to Korean, can be made configurable
    ];

    console.log(`🎤 Running local Whisper (model: ${model})...`);

    const child = spawn('whisper', args);

    let stderrData = '';
    let stdoutData = '';

    child.stdout.on('data', (data) => {
      stdoutData += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderrData += data.toString();
    });

    child.on('error', (err) => {
      if ((err as any).code === 'ENOENT') {
        reject(new Error('Local whisper not found. Install with: pip install openai-whisper'));
      } else {
        reject(err);
      }
    });

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Whisper exited with code ${code}: ${stderrData}`));
        return;
      }

      // Read the generated JSON file
      const jsonPath = path.join(outputDir, `${baseName}.json`);

      if (!fs.existsSync(jsonPath)) {
        reject(new Error(`Whisper output not found: ${jsonPath}`));
        return;
      }

      try {
        const result = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

        const segments: TranscriptSegment[] = (result.segments || []).map((seg: any) => ({
          start: seg.start,
          end: seg.end,
          text: seg.text.trim()
        }));

        const fullText = segments.map(s => s.text).join(' ');
        const duration = segments.length > 0 ? segments[segments.length - 1].end : 0;

        resolve({
          segments,
          fullText,
          language: result.language || 'ko',
          duration
        });
      } catch (parseErr) {
        reject(new Error(`Failed to parse whisper output: ${parseErr}`));
      }
    });
  });
}
