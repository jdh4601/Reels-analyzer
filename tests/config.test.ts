import { config } from '../src/config';

describe('Config', () => {
  it('should have version', () => {
    expect(config.version).toBe('1.0.0');
  });

  it('should have default output directories', () => {
    expect(config.outputDir).toBe('./output');
    expect(config.downloadDir).toBe('./output/downloads');
    expect(config.reportsDir).toBe('./output/reports');
  });

  it('should have default whisper model', () => {
    expect(config.whisperModel).toBe('base');
  });

  it('should have default max concurrent downloads', () => {
    expect(config.maxConcurrentDownloads).toBe(3);
  });

  it('should have default log level', () => {
    expect(config.logLevel).toBe('info');
  });
});
