
import { extractAudio, transcribeAudio } from '../src/transcriber';
import { spawn } from 'child_process';
import * as fs from 'fs';
import { EventEmitter } from 'events';
import { config } from '../src/config';

// Mock dependencies
jest.mock('child_process');
jest.mock('fs');
jest.mock('openai');

describe('Transcriber Module', () => {
  const mockSpawn = spawn as jest.Mock;
  const mockFsExists = fs.existsSync as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFsExists.mockReturnValue(true); // Default to file exists
  });

  describe('extractAudio', () => {
    it('should spawn ffmpeg to extract audio', async () => {
        const mockChildProcess = new EventEmitter();
        (mockChildProcess as any).stderr = new EventEmitter();
        mockSpawn.mockReturnValue(mockChildProcess);

        const videoPath = '/path/to/video.mp4';
        const expectedAudioPath = '/path/to/video.mp3';
        
        // Mock fs.existsSync to return false for audioPath initially (so it extracts)
        mockFsExists.mockImplementation((path) => {
            if (path === videoPath) return true;
            if (path === expectedAudioPath) return false;
            return false;
        });

        const promise = extractAudio(videoPath);

        setTimeout(() => {
            mockChildProcess.emit('close', 0);
        }, 10);

        const result = await promise;
        expect(result).toBe(expectedAudioPath);
        expect(mockSpawn).toHaveBeenCalledWith('ffmpeg', expect.arrayContaining([
            '-i', videoPath,
            '-vn',
            expectedAudioPath
        ]));
    });

    it('should handle ffmpeg errors', async () => {
        const mockChildProcess = new EventEmitter();
        (mockChildProcess as any).stderr = new EventEmitter();
        mockSpawn.mockReturnValue(mockChildProcess);

        const videoPath = '/path/to/bad_video.mp4';
        mockFsExists.mockReturnValue(true); // video exists
        mockFsExists.mockImplementation((path) => path === videoPath); // audio doesn't exist

        const promise = extractAudio(videoPath);

        setTimeout(() => {
            (mockChildProcess as any).stderr.emit('data', 'Conversion failed');
            mockChildProcess.emit('close', 1);
        }, 10);

        await expect(promise).rejects.toThrow('ffmpeg exited with code 1');
    });

    it('should throw error if ffmpeg is missing', async () => {
         const mockChildProcess = new EventEmitter();
        (mockChildProcess as any).stderr = new EventEmitter();
        mockSpawn.mockReturnValue(mockChildProcess);
        
        mockFsExists.mockImplementation((path) => {
            if (path === '/path/video.mp4') return true;
            return false; // audio file does not exist
        });

        const promise = extractAudio('/path/video.mp4');
        
        const err = new Error('spawn ffmpeg ENOENT');
        (err as any).code = 'ENOENT';

        setTimeout(() => {
            mockChildProcess.emit('error', err);
        }, 10);

        await expect(promise).rejects.toThrow('ffmpeg not found');
    });
  });

  describe('transcribeAudio', () => {
     it('should throw error if API Key is missing', async () => {
         // Save original key
         const originalKey = config.openaiApiKey;
         delete config.openaiApiKey;

         await expect(transcribeAudio('/path/audio.mp3')).rejects.toThrow('OpenAI API Key not configured');

         // Restore
         if (originalKey) config.openaiApiKey = originalKey;
     });
  });
});
