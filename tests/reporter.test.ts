
import {
  generateReport,
  generateMarkdownReport,
  generateHtmlReport,
  loadAnalysesFromDirectory,
  loadBatchResult,
  ReportData
} from '../src/reporter';
import { ReelAnalysis, TrendAnalysis, BatchResult } from '../src/types';
import * as fs from 'fs';
import * as path from 'path';

// Mock fs to avoid writing actual files during test
jest.mock('fs', () => ({
    ...jest.requireActual('fs'),
    writeFileSync: jest.fn(),
    mkdirSync: jest.fn(),
    existsSync: jest.fn().mockReturnValue(true),
    readdirSync: jest.fn().mockReturnValue([]),
    readFileSync: jest.fn()
}));

const mockFs = fs as jest.Mocked<typeof fs>;

describe('Report Generator', () => {
  const mockAnalysis: ReelAnalysis = {
    hookTime: 3,
    hookType: 'question',
    hookText: 'Why is this important?',
    sections: [],
    ctaType: 'follow',
    ctaText: 'Follow for more!',
    editingStyle: {
      cutFrequency: 'medium',
      textOverlay: true,
      transitionEffects: ['fade', 'cut']
    },
    audioStyle: {
      hasVoiceover: true,
      hasTrendingSound: false,
      subtitleDependent: true
    },
    totalDuration: 30,
    engagementHooks: ['Question hook'],
    summary: 'Educational content with question hook'
  };

  const mockAnalysis2: ReelAnalysis = {
    hookTime: 2,
    hookType: 'shock',
    hookText: 'You will not believe this!',
    sections: [],
    ctaType: 'share',
    editingStyle: {
      cutFrequency: 'high',
      textOverlay: false,
      transitionEffects: ['zoom']
    },
    audioStyle: {
      hasVoiceover: true,
      hasTrendingSound: true,
      subtitleDependent: false
    },
    totalDuration: 15,
    engagementHooks: ['Shock value'],
    summary: 'Fast-paced content'
  };

  const mockTrends: TrendAnalysis = {
    analyzedCount: 2,
    patterns: {
      hookPatterns: [
        { type: 'question', frequency: 1, examples: ['Why is this important?'] },
        { type: 'shock', frequency: 1, examples: ['You will not believe this!'] }
      ],
      popularFormats: [
        { name: 'Short & Snappy', description: 'Under 15s videos', frequency: 1 },
        { name: 'Standard Reel', description: 'General purpose', frequency: 1 }
      ],
      averageDuration: 22,
      commonCTAs: ['follow', 'share'],
      editingTrends: {
        averageCutFrequency: 'high',
        textOverlayUsage: 50,
        popularTransitions: ['fade', 'cut', 'zoom']
      }
    },
    insights: ['The most effective hook type is \'question\', appearing in 50% of videos.'],
    recommendations: ['Start your video with a \'question\' hook'],
    analyzedAt: new Date()
  };

  const mockReportData: ReportData = {
    analyses: [mockAnalysis, mockAnalysis2],
    trends: mockTrends
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateReport', () => {
    it('should generate both markdown and html reports', async () => {
      const reports = await generateReport(mockReportData);

      expect(reports).toHaveLength(2);
      expect(reports[0].format).toBe('markdown');
      expect(reports[1].format).toBe('html');
    });

    it('should skip html report when includeCharts is false', async () => {
      const reports = await generateReport(mockReportData, { includeCharts: false });

      expect(reports).toHaveLength(1);
      expect(reports[0].format).toBe('markdown');
    });

    it('should create output directory if it does not exist', async () => {
      mockFs.existsSync.mockReturnValue(false);

      await generateReport(mockReportData, { outputPath: '/custom/path' });

      expect(fs.mkdirSync).toHaveBeenCalledWith('/custom/path', { recursive: true });
    });
  });

  describe('generateMarkdownReport', () => {
    it('should generate markdown with summary section', () => {
      const report = generateMarkdownReport(mockReportData, '/output');

      expect(report.format).toBe('markdown');
      expect(report.content).toContain('# Reels Analysis Report');
      expect(report.content).toContain('**Total Videos Analyzed:** 2');
      expect(report.content).toContain('**Average Duration:** 22s');
    });

    it('should include hook types distribution table', () => {
      const report = generateMarkdownReport(mockReportData, '/output');

      expect(report.content).toContain('## Hook Types Distribution');
      expect(report.content).toContain('| Hook Type | Count | Percentage |');
      expect(report.content).toContain('| question | 1 | 50% |');
      expect(report.content).toContain('| shock | 1 | 50% |');
    });

    it('should include hook examples', () => {
      const report = generateMarkdownReport(mockReportData, '/output');

      expect(report.content).toContain('### Top Hook Examples');
      expect(report.content).toContain('> "Why is this important?"');
    });

    it('should include popular formats', () => {
      const report = generateMarkdownReport(mockReportData, '/output');

      expect(report.content).toContain('## Popular Formats');
      expect(report.content).toContain('**Short & Snappy**');
    });

    it('should include CTA section', () => {
      const report = generateMarkdownReport(mockReportData, '/output');

      expect(report.content).toContain('## Common CTAs');
      expect(report.content).toContain('**follow**');
      expect(report.content).toContain('**share**');
    });

    it('should include editing trends', () => {
      const report = generateMarkdownReport(mockReportData, '/output');

      expect(report.content).toContain('## Editing Trends');
      expect(report.content).toContain('**Average Cut Frequency:** high');
      expect(report.content).toContain('**Text Overlay Usage:** 50%');
      expect(report.content).toContain('**Popular Transitions:** fade, cut, zoom');
    });

    it('should include insights and recommendations', () => {
      const report = generateMarkdownReport(mockReportData, '/output');

      expect(report.content).toContain('## Key Insights');
      expect(report.content).toContain('question');
      expect(report.content).toContain('## Recommendations');
    });

    it('should include individual video analysis in collapsible section', () => {
      const report = generateMarkdownReport(mockReportData, '/output');

      expect(report.content).toContain('## Individual Video Analysis');
      expect(report.content).toContain('<details>');
      expect(report.content).toContain('Click to expand (2 videos)');
      expect(report.content).toContain('### Video 1');
      expect(report.content).toContain('### Video 2');
    });

    it('should save file to latest.md', () => {
      generateMarkdownReport(mockReportData, '/output');

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        '/output/latest.md',
        expect.any(String)
      );
    });

    it('should handle batch result data', () => {
      const dataWithBatch: ReportData = {
        ...mockReportData,
        batchResult: {
          items: [],
          successful: 5,
          failed: 2,
          startedAt: new Date()
        }
      };

      const report = generateMarkdownReport(dataWithBatch, '/output');

      expect(report.content).toContain('**Successful:** 5');
      expect(report.content).toContain('**Failed:** 2');
    });
  });

  describe('generateHtmlReport', () => {
    it('should generate valid HTML structure', () => {
      const report = generateHtmlReport(mockReportData, '/output');

      expect(report.format).toBe('html');
      expect(report.content).toContain('<!DOCTYPE html>');
      expect(report.content).toContain('<html lang="ko">');
      expect(report.content).toContain('</html>');
    });

    it('should include Chart.js CDN', () => {
      const report = generateHtmlReport(mockReportData, '/output');

      expect(report.content).toContain('cdn.jsdelivr.net/npm/chart.js');
    });

    it('should include all chart canvases', () => {
      const report = generateHtmlReport(mockReportData, '/output');

      expect(report.content).toContain('id="hookChart"');
      expect(report.content).toContain('id="durationChart"');
      expect(report.content).toContain('id="ctaChart"');
      expect(report.content).toContain('id="editingChart"');
    });

    it('should include stat cards with correct data', () => {
      const report = generateHtmlReport(mockReportData, '/output');

      expect(report.content).toContain('>2<'); // Videos analyzed
      expect(report.content).toContain('>22s<'); // Avg duration
      expect(report.content).toContain('>50%<'); // Text overlay
    });

    it('should include insights section', () => {
      const report = generateHtmlReport(mockReportData, '/output');

      expect(report.content).toContain('Key Insights');
      expect(report.content).toContain('insight-item');
    });

    it('should include recommendations section', () => {
      const report = generateHtmlReport(mockReportData, '/output');

      expect(report.content).toContain('Recommendations');
      expect(report.content).toContain('rec-item');
    });

    it('should save file to dashboard.html', () => {
      generateHtmlReport(mockReportData, '/output');

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        '/output/dashboard.html',
        expect.any(String)
      );
    });

    it('should escape HTML special characters in insights', () => {
      const dataWithSpecialChars: ReportData = {
        analyses: [mockAnalysis],
        trends: {
          ...mockTrends,
          insights: ['Use <script> tags carefully'],
          recommendations: ['Avoid "quotes" & special chars']
        }
      };

      const report = generateHtmlReport(dataWithSpecialChars, '/output');

      expect(report.content).toContain('&lt;script&gt;');
      expect(report.content).toContain('&amp;');
      expect(report.content).toContain('&quot;');
    });
  });

  describe('loadAnalysesFromDirectory', () => {
    it('should return empty array if directory does not exist', () => {
      mockFs.existsSync.mockReturnValue(false);

      const result = loadAnalysesFromDirectory('/nonexistent');

      expect(result).toEqual([]);
    });

    it('should load analysis files from directory', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue(['analysis-123.json', 'analysis-456.json', 'other.txt'] as any);
      mockFs.readFileSync.mockImplementation((filePath: any) => {
        if (filePath.includes('123')) {
          return JSON.stringify({ analysis: mockAnalysis });
        }
        return JSON.stringify({ analysis: mockAnalysis2 });
      });

      const result = loadAnalysesFromDirectory('/batch-results');

      expect(result).toHaveLength(2);
      expect(result[0].hookType).toBe('question');
    });

    it('should skip invalid json files', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue(['analysis-bad.json'] as any);
      mockFs.readFileSync.mockReturnValue('invalid json');

      const result = loadAnalysesFromDirectory('/batch-results');

      expect(result).toEqual([]);
    });
  });

  describe('loadBatchResult', () => {
    it('should return undefined if directory does not exist', () => {
      mockFs.existsSync.mockReturnValue(false);

      const result = loadBatchResult('/nonexistent');

      expect(result).toBeUndefined();
    });

    it('should return undefined if no batch summary files', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue(['other.json'] as any);

      const result = loadBatchResult('/batch-results');

      expect(result).toBeUndefined();
    });

    it('should load most recent batch summary', () => {
      const mockBatchResult: BatchResult = {
        items: [],
        successful: 5,
        failed: 1,
        startedAt: new Date()
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue([
        'batch-summary-1000.json',
        'batch-summary-2000.json'
      ] as any);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockBatchResult));

      const result = loadBatchResult('/batch-results');

      expect(result?.successful).toBe(5);
      expect(result?.failed).toBe(1);
    });
  });

  describe('empty data handling', () => {
    it('should handle empty analyses array', async () => {
      const emptyData: ReportData = { analyses: [] };

      const reports = await generateReport(emptyData);

      expect(reports).toHaveLength(2);
      expect(reports[0].content).toContain('**Total Videos Analyzed:** 0');
    });

    it('should handle data without trends', async () => {
      const dataWithoutTrends: ReportData = { analyses: [mockAnalysis] };

      const reports = await generateReport(dataWithoutTrends);

      expect(reports).toHaveLength(2);
      // Should auto-generate trends from analyses
      expect(reports[0].content).toContain('question');
    });
  });
});
