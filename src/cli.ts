
import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs';
import { config, initDirectories, printConfig } from './config';
import { downloadVideo } from './downloader';
import { processBatchFile } from './batch';
import { extractAudio, transcribeAudio } from './transcriber';
import { analyzeStructure, analyzeTrends } from './analyzer';
import { generateScript, generateStoryboard } from './generator';
import { generateReport, loadAnalysesFromDirectory, loadBatchResult } from './reporter';
import { ReelAnalysis, ScriptInput } from './types';

const program = new Command();

// Initialize CLI
program
  .name('reels-analyzer')
  .description('AI-powered tool for analyzing and creating viral short-form content')
  .version('1.0.0');

// Global options
program
  .option('-v, --verbose', 'Enable verbose logging')
  .hook('preAction', (thisCommand) => {
    const opts = thisCommand.opts();
    if (opts.verbose) {
      process.env.LOG_LEVEL = 'debug';
      printConfig();
    }
    initDirectories(config);
  });

// Command: Analyze
program
  .command('analyze')
  .description('Download and analyze a single video')
  .argument('<url>', 'Video URL (Instagram, TikTok, YouTube Shorts)')
  .option('-o, --output <dir>', 'Output directory', config.outputDir)
  .action(async (url, options) => {
    try {
      console.log(`🎬 Starting analysis for: ${url}`);
      
      // 1. Download
      console.log('⬇️  Downloading video...');
      const reel = await downloadVideo(url);
      console.log(`✅ Downloaded: ${reel.title}`);

      // 2. Transcribe
      console.log('🎧 Extracting and transcribing audio...');
      const audioPath = await extractAudio(reel.filePath);
      const transcript = await transcribeAudio(audioPath);
      console.log(`✅ Transcribed (${transcript.duration}s)`);

      // 3. Analyze Structure
      console.log('🧠 Analyzing structure with Claude...');
      const analysis = await analyzeStructure(transcript);
      
      // Save results
      const result = {
        meta: reel,
        transcript,
        analysis
      };

      const filename = `analysis-${reel.videoId || Date.now()}.json`;
      const outputPath = path.join(options.output, filename);
      fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));

      console.log(`\n✨ Analysis Complete! Saved to: ${outputPath}`);
      console.log(`   Hook: ${analysis.hookType} ("${analysis.hookText}")`);
      console.log(`   Summary: ${analysis.summary}`);

    } catch (error: any) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

// Command: Trends
program
  .command('trends')
  .description('Analyze multiple videos to find trends')
  .argument('<files...>', 'List of analysis JSON files to aggregate')
  .option('-o, --output <dir>', 'Output directory', config.outputDir)
  .action(async (files, options) => {
    try {
      console.log(`📊 Aggregating trends from ${files.length} files...`);
      
      const analyses: ReelAnalysis[] = [];
      
      for (const file of files) {
        if (fs.existsSync(file)) {
          const content = JSON.parse(fs.readFileSync(file, 'utf-8'));
          if (content.analysis) {
            analyses.push(content.analysis);
          } else {
             console.warn(`⚠️  Skipping ${file}: No analysis data found`);
          }
        }
      }

      if (analyses.length === 0) {
        throw new Error('No valid analysis data found to aggregate.');
      }

      const trends = await analyzeTrends(analyses);
      
      const outputPath = path.join(options.output, `trends-${Date.now()}.json`);
      fs.writeFileSync(outputPath, JSON.stringify(trends, null, 2));

      console.log(`\n✨ Trend Analysis Complete! Saved to: ${outputPath}`);
      console.log('📈 Key Insights:');
      trends.insights.forEach((i: string) => console.log(`   - ${i}`));

    } catch (error: any) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

// Command: Batch
program
  .command('batch')
  .description('Process multiple videos from a file')
  .argument('<file>', 'Path to file containing URLs (one per line)')
  .option('-c, --concurrency <number>', 'Number of concurrent downloads', String(config.maxConcurrentDownloads))
  .option('-o, --output <dir>', 'Output directory')
  .action(async (file, options) => {
    try {
      const result = await processBatchFile(file, {
        concurrency: parseInt(options.concurrency),
        outputDir: options.output
      });

      console.log('\n==========================================');
      console.log('🏁 Batch Processing Finished');
      console.log('==========================================');
      console.log(`Total: ${result.items.length}`);
      console.log(`✅ Successful: ${result.successful}`);
      console.log(`❌ Failed: ${result.failed}`);
      console.log(`⏱️  Duration: ${((result.completedAt!.getTime() - result.startedAt.getTime()) / 1000).toFixed(1)}s`);
      
      if (result.failed > 0) {
        console.log('\nFailed Items:');
        result.items.filter(i => i.status === 'failed').forEach(i => {
            console.log(` - ${i.url}: ${i.error}`);
        });
        process.exit(1); 
      }

    } catch (error: any) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

// Command: Generate
program
  .command('generate')
  .description('Generate a new script and storyboard')
  .argument('<topic>', 'Topic for the new reel')
  .option('-d, --duration <seconds>', 'Target duration (15, 30, 60)', '30')
  .option('-t, --tone <tone>', 'Tone of voice', 'casual')
  .option('--trend-file <file>', 'Optional trend analysis JSON to use as context')
  .option('-o, --output <dir>', 'Output directory', config.outputDir)
  .action(async (topic, options) => {
    try {
      console.log(`✍️  Generating content for topic: "${topic}"`);

      // Load trends if provided
      let trendAnalysis = undefined;
      if (options.trendFile && fs.existsSync(options.trendFile)) {
        trendAnalysis = JSON.parse(fs.readFileSync(options.trendFile, 'utf-8'));
        console.log('   (Using trend context)');
      }

      const input: ScriptInput = {
        topic,
        targetDuration: parseInt(options.duration) as any,
        tone: options.tone as any,
        trendAnalysis
      };

      // 1. Generate Script
      console.log('📝 Writing script...');
      const script = await generateScript(input);
      console.log(`✅ Script created: "${script.title}"`);

      // 2. Generate Storyboard
      console.log('🎨 Sketching storyboard...');
      const storyboard = await generateStoryboard(script);
      
      // Save results
      const timestamp = Date.now();
      const scriptPath = path.join(options.output, `script-${timestamp}.json`);
      const storyboardPath = path.join(options.output, `storyboard-${timestamp}.json`);

      fs.writeFileSync(scriptPath, JSON.stringify(script, null, 2));
      fs.writeFileSync(storyboardPath, JSON.stringify(storyboard, null, 2));

      // Also save as nice markdown
      const mdPath = path.join(options.output, `project-${timestamp}.md`);
      const mdContent = `
# 🎬 ${script.title}

## Script
**Hook (${script.hook.type})**: ${script.hook.text}
**CTA**: ${script.cta.text}

## Storyboard
| Time | Shot | Visual | Script |
|------|------|--------|--------|
${storyboard.cuts.map(c => `| ${c.startTime}-${c.endTime}s | ${c.shotType} | ${c.description} | ${c.script} |`).join('\n')}
      `;
      fs.writeFileSync(mdPath, mdContent);

      console.log(`\n✨ Generation Complete!`);
      console.log(`   📄 Script: ${scriptPath}`);
      console.log(`   🎨 Storyboard: ${storyboardPath}`);
      console.log(`   📑 Review: ${mdPath}`);

    } catch (error: any) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

// Command: Report
program
  .command('report')
  .description('Generate HTML/Markdown reports from batch analysis results')
  .argument('[dir]', 'Directory containing analysis JSON files', path.join(config.outputDir, 'batch-results'))
  .option('-o, --output <dir>', 'Output directory for reports', path.join(config.outputDir, 'reports'))
  .option('--no-html', 'Skip HTML dashboard generation')
  .action(async (dir, options) => {
    try {
      console.log(`📊 Generating reports from: ${dir}`);

      // Load analyses from directory
      const analyses = loadAnalysesFromDirectory(dir);
      if (analyses.length === 0) {
        console.warn('⚠️  No analysis files found in directory.');
        console.log('   Make sure you have run the batch command first.');
        process.exit(1);
      }

      console.log(`   Found ${analyses.length} analysis files`);

      // Load batch result if available
      const batchResult = loadBatchResult(dir);

      // Generate reports
      const reports = await generateReport(
        { analyses, batchResult },
        {
          outputPath: options.output,
          includeCharts: options.html !== false
        }
      );

      console.log(`\n✨ Reports Generated!`);
      reports.forEach(r => {
        console.log(`   📄 ${r.format.toUpperCase()}: ${r.filePath}`);
      });

      // Open HTML dashboard hint
      if (options.html !== false) {
        console.log(`\n💡 Tip: Open dashboard.html in a browser to view interactive charts`);
      }

    } catch (error: any) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

// Handle unknown commands
program.on('command:*', () => {
    console.error('Invalid command: %s\nSee --help for a list of available commands.', program.args.join(' '));
    process.exit(1);
});

// Run
program.parse(process.argv);
