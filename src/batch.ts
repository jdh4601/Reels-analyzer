
import * as fs from 'fs';
import * as path from 'path';
import { config } from './config';
import { downloadVideo } from './downloader';
import { extractAudio, transcribeAudio } from './transcriber';
import { analyzeStructure } from './analyzer';
import { BatchResult, BatchItem, BatchStatus } from './types';

/**
 * Reads URLs from a file and processes them in batches
 */
export async function processBatchFile(
  filePath: string, 
  options: { concurrency?: number; outputDir?: string } = {}
): Promise<BatchResult> {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Batch file not found: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const urls = content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0 && !line.startsWith('#')); // Ignore empty lines and comments

  if (urls.length === 0) {
    throw new Error('No valid URLs found in file');
  }

  return processBatch(urls, options);
}

/**
 * Process a list of URLs with concurrency control
 */
export async function processBatch(
  urls: string[], 
  options: { concurrency?: number; outputDir?: string } = {}
): Promise<BatchResult> {
  const concurrency = options.concurrency || config.maxConcurrentDownloads || 3;
  const outputDir = options.outputDir || path.join(config.outputDir, 'batch-results');
  
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const items: BatchItem[] = urls.map(url => ({
    url,
    status: 'pending'
  }));

  const result: BatchResult = {
    items,
    successful: 0,
    failed: 0,
    startedAt: new Date()
  };

  // Simple worker pool
  console.log(`🚀 Starting batch processing for ${urls.length} URLs (Concurrency: ${concurrency})`);
  
  // Queue iterator
  const queue = items.entries(); 
  
  const worker = async (workerId: number) => {
    for (const [index, item] of queue) {
      // Update item status
      item.status = 'downloading';
      item.startedAt = new Date();
      console.log(`[Worker ${workerId}] Processing: ${item.url}`);

      try {
        // 1. Download
        const reel = await downloadVideo(item.url);
        item.reel = { metadata: reel };
        
        // 2. Transcribe
        item.status = 'transcribing';
        const audioPath = await extractAudio(reel.filePath);
        item.reel.audioPath = audioPath;
        
        const transcript = await transcribeAudio(audioPath);
        item.reel.transcript = transcript;

        // 3. Analyze
        item.status = 'analyzing';
        const analysis = await analyzeStructure(transcript);
        item.reel.analysis = analysis;

        // Save individual result immediately
        const filename = `analysis-${reel.videoId}.json`;
        fs.writeFileSync(
            path.join(outputDir, filename), 
            JSON.stringify({ meta: reel, transcript, analysis }, null, 2)
        );

        item.status = 'completed';
        item.completedAt = new Date();
        result.successful++;
        console.log(`[Worker ${workerId}] ✅ Completed: ${item.url}`);

      } catch (err: any) {
        item.status = 'failed';
        item.error = err.message;
        item.completedAt = new Date();
        result.failed++;
        console.error(`[Worker ${workerId}] ❌ Failed: ${item.url} - ${err.message}`);
      }
    }
  };

  // Start workers
  const workers = Array(Math.min(concurrency, items.length))
    .fill(null)
    .map((_, i) => worker(i + 1));

  await Promise.all(workers);

  result.completedAt = new Date();
  
  // Save summary
  fs.writeFileSync(
    path.join(outputDir, `batch-summary-${Date.now()}.json`), 
    JSON.stringify(result, null, 2)
  );

  return result;
}
