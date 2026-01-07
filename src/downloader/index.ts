
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { config } from '../config';
import { Platform, ReelMetadata } from '../types';

/**
 * URL이 유효한지 검사하고 플랫폼을 반환합니다.
 */
export function validateUrl(url: string): Platform | null {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();

    if (hostname.includes('instagram.com')) {
      if (urlObj.pathname.includes('/reel/') || urlObj.pathname.includes('/p/') || urlObj.pathname.includes('/reels/')) {
        return 'instagram';
      }
    }

    if (hostname.includes('tiktok.com')) {
      return 'tiktok';
    }

    if (hostname.includes('youtube.com')) {
      if (urlObj.pathname.includes('/shorts/')) {
        return 'youtube';
      }
    }
    
    if (hostname.includes('youtu.be')) {
        return 'youtube';
    }

    return null;
  } catch (e) {
    return null;
  }
}

interface YtDlpOutput {
  id: string;
  title: string;
  uploader: string;
  duration: number;
  ext: string;
  filename: string;
  _filename?: string;
}

/**
 * yt-dlp를 사용하여 비디오를 다운로드합니다.
 */
export async function downloadVideo(url: string): Promise<ReelMetadata> {
  const platform = validateUrl(url);
  if (!platform) {
    throw new Error(`Invalid or unsupported URL: ${url}`);
  }

  // Ensure download directory exists
  if (!fs.existsSync(config.downloadDir)) {
    fs.mkdirSync(config.downloadDir, { recursive: true });
  }

  // Generate a temporary filename pattern for yt-dlp to use, then we'll get the real one from JSON
  const outputTemplate = path.join(config.downloadDir, '%(title)s [%(id)s].%(ext)s');

  return new Promise((resolve, reject) => {
    // First, fetch metadata and download
    // We use --print-json to get metadata after download
    const args = [
      url,
      '-o', outputTemplate,
      '--no-playlist',
      '--print-json',
      '--no-simulate', // Ensure it downloads
      '-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best' // Prefer MP4
    ];

    const child = spawn('yt-dlp', args);

    let stdoutData = '';
    let stderrData = '';

    child.stdout.on('data', (data) => {
      stdoutData += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderrData += data.toString();
    });

    child.on('close', (code) => {
      if (code !== 0) {
        console.error('yt-dlp error:', stderrData);
        reject(new Error(`yt-dlp process exited with code ${code}`));
        return;
      }

      try {
        // yt-dlp might output progress info to stdout before the JSON
        // We need to find the JSON line. It's usually the last line or close to it.
        // But since we use --print-json, it prints metadata to stdout.
        // It might be mixed with other output if not careful, but usually it's one JSON object per video.
        const lines = stdoutData.trim().split('\n');
        let jsonData: YtDlpOutput | null = null;
        
        // Find the line that looks like JSON
        for (const line of lines) {
            try {
                const parsed = JSON.parse(line);
                if (parsed.id && parsed.title) {
                    jsonData = parsed;
                    break;
                }
            } catch (e) {
                // Ignore non-JSON lines
            }
        }

        if (!jsonData) {
          reject(new Error('Could not parse yt-dlp output metadata'));
          return;
        }

        const filename = jsonData._filename || jsonData.filename || ''; // yt-dlp sometimes puts the actual filename in _filename
        
        // If filename is not absolute, make it absolute (though we passed absolute path in template)
        // yt-dlp output filename might be relative to CWD if not specified absolute.
        // We passed absolute path in outputTemplate, so it should be fine?
        // Let's verify file existence if possible, or trust yt-dlp.
        
        // Actually, jsonData.filename usually contains the path if we provided a path in -o.
        
        const metadata: ReelMetadata = {
          url,
          platform,
          videoId: jsonData.id,
          title: jsonData.title,
          author: jsonData.uploader,
          duration: jsonData.duration,
          downloadedAt: new Date(),
          filePath: jsonData._filename || jsonData.filename || 'unknown' // This might need refinement
        };

        resolve(metadata);

      } catch (e: any) {
        reject(new Error(`Failed to parse yt-dlp output: ${e.message}`));
      }
    });

    child.on('error', (err) => {
        if ((err as any).code === 'ENOENT') {
            reject(new Error('yt-dlp alias or executable not found in PATH. Please install yt-dlp.'));
        } else {
            reject(err);
        }
    });
  });
}
