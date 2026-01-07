
import { processBatch, processBatchFile } from '../src/batch';
import * as fs from 'fs';
import * as path from 'path';

// Mock dependencies
jest.mock('../src/downloader', () => ({
  downloadVideo: jest.fn().mockImplementation(async (url) => {
    if (url.includes('fail')) throw new Error('Download failed');
    return { videoId: 'id_' + Math.random(), filePath: '/tmp/video.mp4', title: 'Mock' };
  })
}));

jest.mock('../src/transcriber', () => ({
  extractAudio: jest.fn().mockResolvedValue('/tmp/audio.mp3'),
  transcribeAudio: jest.fn().mockResolvedValue({ fullText: 'Text', segments: [], duration: 10 })
}));

jest.mock('../src/analyzer', () => ({
  analyzeStructure: jest.fn().mockResolvedValue({ hookType: 'question', summary: 'Analyzed' })
}));

// Mock FS completely to avoid spyOn issues
jest.mock('fs', () => ({
    ...jest.requireActual('fs'),
    writeFileSync: jest.fn(),
    mkdirSync: jest.fn(),
    readFileSync: jest.fn(),
    existsSync: jest.fn()
}));

describe('Batch Processor', () => {

  beforeEach(() => {
    jest.clearAllMocks();
    (fs.existsSync as jest.Mock).mockReturnValue(true);
  });

  it('should process a list of URLs successfully', async () => {
    const urls = ['http://example.com/1', 'http://example.com/2'];
    const result = await processBatch(urls, { concurrency: 2, outputDir: '/tmp/test' });

    expect(result.items).toHaveLength(2);
    expect(result.successful).toBe(2);
    expect(result.failed).toBe(0);
    expect(fs.writeFileSync).toHaveBeenCalled();
  });

  it('should handle failures gracefully', async () => {
    const urls = ['http://example.com/good', 'http://example.com/fail'];
    const result = await processBatch(urls, { concurrency: 2, outputDir: '/tmp/test' });

    expect(result.successful).toBe(1);
    expect(result.failed).toBe(1);
    
    const failedItem = result.items.find(i => i.url.includes('fail'));
    expect(failedItem?.status).toBe('failed');
    expect(failedItem?.error).toBe('Download failed');
  });
});
