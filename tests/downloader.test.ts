
import { validateUrl, downloadVideo } from '../src/downloader';
import { spawn } from 'child_process';
import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';

// Mock child_process
jest.mock('child_process');

describe('Downloader Module', () => {
  describe('validateUrl', () => {
    it('should validate Instagram URLs', () => {
      expect(validateUrl('https://www.instagram.com/reel/C2d7s8ov9/')).toBe('instagram');
      expect(validateUrl('https://instagram.com/p/C2d7s8ov9/')).toBe('instagram');
    });

    it('should validate TikTok URLs', () => {
      expect(validateUrl('https://www.tiktok.com/@user/video/1234567890')).toBe('tiktok');
      expect(validateUrl('https://tiktok.com/@user/video/1234567890')).toBe('tiktok');
    });

    it('should validate YouTube Shorts URLs', () => {
      expect(validateUrl('https://www.youtube.com/shorts/abcdefghijk')).toBe('youtube');
      expect(validateUrl('https://youtu.be/abcdefghijk')).toBe('youtube'); // Only if logic allows
    });

    it('should return null for invalid URLs', () => {
      expect(validateUrl('https://google.com')).toBeNull();
      expect(validateUrl('invalid-url')).toBeNull();
    });
  });

  describe('downloadVideo', () => {
    const mockSpawn = spawn as jest.Mock;

    beforeEach(() => {
        mockSpawn.mockClear();
    });

    it('should successfully download a video', async () => {
        const mockChildProcess = new EventEmitter();
        (mockChildProcess as any).stdout = new EventEmitter();
        (mockChildProcess as any).stderr = new EventEmitter();
        
        mockSpawn.mockReturnValue(mockChildProcess);

        const url = 'https://www.instagram.com/reel/test/';
        const downloadPromise = downloadVideo(url);

        // Simulate yt-dlp output
        const metadata = {
            id: 'test-id',
            title: 'Test Video',
            uploader: 'test_user',
            duration: 60,
            ext: 'mp4',
            filename: '/abs/path/to/downloaded/video.mp4',
            _filename: '/abs/path/to/downloaded/video.mp4'
        };

        // Emit data
        setTimeout(() => {
            (mockChildProcess as any).stdout.emit('data', JSON.stringify(metadata));
            mockChildProcess.emit('close', 0);
        }, 10);

        const result = await downloadPromise;

        expect(result).toEqual({
            url,
            platform: 'instagram',
            videoId: 'test-id',
            title: 'Test Video',
            author: 'test_user',
            duration: 60,
            downloadedAt: expect.any(Date),
            filePath: '/abs/path/to/downloaded/video.mp4'
        });

        expect(mockSpawn).toHaveBeenCalledWith('yt-dlp', expect.arrayContaining([
            url,
            '--print-json'
        ]));
    });

    it('should handle yt-dlp errors', async () => {
        const mockChildProcess = new EventEmitter();
        (mockChildProcess as any).stdout = new EventEmitter();
        (mockChildProcess as any).stderr = new EventEmitter();
        
        mockSpawn.mockReturnValue(mockChildProcess);

        const url = 'https://www.instagram.com/reel/fail/';
        const downloadPromise = downloadVideo(url);

        setTimeout(() => {
            (mockChildProcess as any).stderr.emit('data', 'Error: Video unavailable');
            mockChildProcess.emit('close', 1);
        }, 10);

        await expect(downloadPromise).rejects.toThrow('yt-dlp process exited with code 1');
    });

    it('should throw error for invalid URL', async () => {
        await expect(downloadVideo('https://invalid.com')).rejects.toThrow('Invalid or unsupported URL');
    });
  });
});
