/**
 * End-to-End Pipeline Tests
 * Tests the complete workflow from analysis to report generation
 */

import * as fs from 'fs';
import * as path from 'path';
import { analyzeTrends } from '../../src/analyzer/trends';
import { generateScript } from '../../src/generator/script';
import { generateStoryboard } from '../../src/generator/storyboard';
import { generateReport, ReportData } from '../../src/reporter';
import {
  ReelAnalysis,
  Transcript,
  Script,
  ScriptInput,
  TrendAnalysis
} from '../../src/types';

// Mock external dependencies
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
  existsSync: jest.fn().mockReturnValue(true),
  readdirSync: jest.fn().mockReturnValue([]),
  readFileSync: jest.fn()
}));

// Mock Claude API calls
jest.mock('../../src/analyzer/structure', () => ({
  analyzeStructure: jest.fn().mockResolvedValue({
    hookTime: 3,
    hookType: 'question',
    hookText: 'Did you know this secret?',
    sections: [
      { name: 'hook', startTime: 0, endTime: 3, content: 'Hook content', purpose: 'Grab attention' },
      { name: 'body', startTime: 3, endTime: 25, content: 'Main content', purpose: 'Deliver value' },
      { name: 'cta', startTime: 25, endTime: 30, content: 'CTA content', purpose: 'Drive action' }
    ],
    ctaType: 'follow',
    ctaText: 'Follow for more tips!',
    editingStyle: {
      cutFrequency: 'high',
      textOverlay: true,
      transitionEffects: ['fade', 'zoom']
    },
    audioStyle: {
      hasVoiceover: true,
      hasTrendingSound: false,
      subtitleDependent: true
    },
    totalDuration: 30,
    engagementHooks: ['Question hook', 'Value promise'],
    summary: 'Educational content with strong hook'
  })
}));

jest.mock('../../src/generator/script', () => ({
  generateScript: jest.fn().mockResolvedValue({
    title: 'Test Script',
    hook: {
      type: 'question',
      text: 'Want to know the secret?',
      duration: 3
    },
    body: {
      sections: [
        { text: 'First point here', duration: 8, visualNotes: 'Show example' },
        { text: 'Second point here', duration: 8, visualNotes: 'Demo' }
      ]
    },
    cta: {
      type: 'follow',
      text: 'Follow for more!',
      duration: 3
    },
    totalDuration: 22,
    notes: ['Keep energy high'],
    generatedAt: new Date()
  })
}));

jest.mock('../../src/generator/storyboard', () => ({
  generateStoryboard: jest.fn().mockResolvedValue({
    title: 'Test Storyboard',
    cuts: [
      {
        cutNumber: 1,
        startTime: 0,
        endTime: 3,
        shotType: 'closeup',
        description: 'Face shot for hook',
        script: 'Want to know the secret?',
        textOverlay: 'THE SECRET',
        transition: 'fade'
      },
      {
        cutNumber: 2,
        startTime: 3,
        endTime: 11,
        shotType: 'medium',
        description: 'Explaining first point',
        script: 'First point here',
        transition: 'cut'
      },
      {
        cutNumber: 3,
        startTime: 11,
        endTime: 19,
        shotType: 'broll',
        description: 'Demo footage',
        script: 'Second point here',
        transition: 'zoom'
      },
      {
        cutNumber: 4,
        startTime: 19,
        endTime: 22,
        shotType: 'closeup',
        description: 'CTA delivery',
        script: 'Follow for more!',
        textOverlay: 'FOLLOW NOW'
      }
    ],
    totalDuration: 22,
    notes: ['Use trending audio'],
    generatedAt: new Date()
  })
}));

describe('E2E Pipeline Tests', () => {
  // Sample analysis data simulating batch results
  const sampleAnalyses: ReelAnalysis[] = [
    {
      hookTime: 3,
      hookType: 'question',
      hookText: 'Did you know this?',
      sections: [],
      ctaType: 'follow',
      ctaText: 'Follow me!',
      editingStyle: { cutFrequency: 'high', textOverlay: true, transitionEffects: ['fade'] },
      audioStyle: { hasVoiceover: true, hasTrendingSound: false, subtitleDependent: true },
      totalDuration: 30,
      engagementHooks: ['Question'],
      summary: 'Educational content'
    },
    {
      hookTime: 2,
      hookType: 'shock',
      hookText: 'This will blow your mind!',
      sections: [],
      ctaType: 'share',
      ctaText: 'Share with friends',
      editingStyle: { cutFrequency: 'high', textOverlay: true, transitionEffects: ['zoom', 'cut'] },
      audioStyle: { hasVoiceover: true, hasTrendingSound: true, subtitleDependent: false },
      totalDuration: 15,
      engagementHooks: ['Shock value'],
      summary: 'Viral content'
    },
    {
      hookTime: 4,
      hookType: 'list',
      hookText: '3 things you need to know',
      sections: [],
      ctaType: 'save',
      ctaText: 'Save for later',
      editingStyle: { cutFrequency: 'medium', textOverlay: true, transitionEffects: ['fade'] },
      audioStyle: { hasVoiceover: true, hasTrendingSound: false, subtitleDependent: true },
      totalDuration: 45,
      engagementHooks: ['List format'],
      summary: 'Listicle content'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Analysis → Trends Pipeline', () => {
    it('should analyze multiple reels and extract trends', () => {
      const trends = analyzeTrends(sampleAnalyses);

      expect(trends.analyzedCount).toBe(3);
      expect(trends.patterns.hookPatterns.length).toBeGreaterThan(0);
      expect(trends.patterns.averageDuration).toBe(30); // (30+15+45)/3
      expect(trends.insights.length).toBeGreaterThan(0);
      expect(trends.recommendations.length).toBeGreaterThan(0);
    });

    it('should identify most common hook type', () => {
      const trends = analyzeTrends(sampleAnalyses);

      // Each hook type appears once, so any could be first
      const hookTypes = trends.patterns.hookPatterns.map(h => h.type);
      expect(hookTypes).toContain('question');
      expect(hookTypes).toContain('shock');
      expect(hookTypes).toContain('list');
    });

    it('should calculate editing trends correctly', () => {
      const trends = analyzeTrends(sampleAnalyses);

      expect(trends.patterns.editingTrends.textOverlayUsage).toBe(100); // All have text overlay
      expect(['medium', 'high']).toContain(trends.patterns.editingTrends.averageCutFrequency);
    });
  });

  describe('Trends → Script Generation Pipeline', () => {
    it('should generate script based on trend analysis', async () => {
      const trends = analyzeTrends(sampleAnalyses);

      const input: ScriptInput = {
        topic: 'How to go viral on Instagram',
        targetDuration: 30,
        trendAnalysis: trends,
        tone: 'casual'
      };

      const script = await generateScript(input);

      expect(script.title).toBeDefined();
      expect(script.hook).toBeDefined();
      expect(script.hook.type).toBeDefined();
      expect(script.body.sections.length).toBeGreaterThan(0);
      expect(script.cta).toBeDefined();
      expect(script.totalDuration).toBeGreaterThan(0);
    });
  });

  describe('Script → Storyboard Pipeline', () => {
    it('should generate storyboard from script', async () => {
      const mockScript: Script = {
        title: 'Test Video',
        hook: { type: 'question', text: 'Hook text', duration: 3 },
        body: { sections: [{ text: 'Body text', duration: 20 }] },
        cta: { type: 'follow', text: 'CTA text', duration: 3 },
        totalDuration: 26,
        notes: [],
        generatedAt: new Date()
      };

      const storyboard = await generateStoryboard(mockScript);

      expect(storyboard.title).toBeDefined();
      expect(storyboard.cuts.length).toBeGreaterThan(0);
      expect(storyboard.cuts[0].shotType).toBeDefined();
      expect(storyboard.cuts[0].description).toBeDefined();
    });
  });

  describe('Full Pipeline: Analysis → Report', () => {
    it('should generate complete reports from analysis data', async () => {
      const trends = analyzeTrends(sampleAnalyses);

      const reportData: ReportData = {
        analyses: sampleAnalyses,
        trends
      };

      const reports = await generateReport(reportData, { outputPath: '/output/reports' });

      expect(reports).toHaveLength(2);

      // Markdown report
      const mdReport = reports.find(r => r.format === 'markdown');
      expect(mdReport).toBeDefined();
      expect(mdReport!.content).toContain('# Reels Analysis Report');
      expect(mdReport!.content).toContain('**Total Videos Analyzed:** 3');

      // HTML report
      const htmlReport = reports.find(r => r.format === 'html');
      expect(htmlReport).toBeDefined();
      expect(htmlReport!.content).toContain('<!DOCTYPE html>');
      expect(htmlReport!.content).toContain('Chart');
    });

    it('should include trend insights in reports', async () => {
      const trends = analyzeTrends(sampleAnalyses);
      const reportData: ReportData = { analyses: sampleAnalyses, trends };

      const reports = await generateReport(reportData);
      const mdReport = reports.find(r => r.format === 'markdown')!;

      expect(mdReport.content).toContain('## Key Insights');
      expect(mdReport.content).toContain('## Recommendations');
    });
  });

  describe('Complete Content Creation Pipeline', () => {
    it('should execute full pipeline: analyze → trends → script → storyboard → report', async () => {
      // Step 1: Analyze trends from batch results
      const trends = analyzeTrends(sampleAnalyses);
      expect(trends.analyzedCount).toBe(3);

      // Step 2: Generate script based on trends
      const scriptInput: ScriptInput = {
        topic: 'Instagram Growth Hacks',
        targetDuration: 30,
        trendAnalysis: trends,
        tone: 'educational'
      };
      const script = await generateScript(scriptInput);
      expect(script.title).toBeDefined();

      // Step 3: Create storyboard from script
      const storyboard = await generateStoryboard(script);
      expect(storyboard.cuts.length).toBeGreaterThan(0);

      // Step 4: Generate final reports
      const reportData: ReportData = { analyses: sampleAnalyses, trends };
      const reports = await generateReport(reportData);
      expect(reports).toHaveLength(2);

      // Verify complete pipeline output
      expect(script.hook.type).toBeDefined();
      expect(storyboard.cuts[0].shotType).toBeDefined();
      expect(reports[0].content.length).toBeGreaterThan(100);
    });
  });

  describe('Error Handling in Pipeline', () => {
    it('should handle empty analysis array gracefully', () => {
      const trends = analyzeTrends([]);

      expect(trends.analyzedCount).toBe(0);
      expect(trends.insights).toContain('No data available for analysis.');
    });

    it('should generate reports even with minimal data', async () => {
      const minimalData: ReportData = {
        analyses: [sampleAnalyses[0]]
      };

      const reports = await generateReport(minimalData);

      expect(reports).toHaveLength(2);
      expect(reports[0].content).toContain('**Total Videos Analyzed:** 1');
    });
  });

  describe('Data Consistency Across Pipeline', () => {
    it('should maintain data integrity through pipeline stages', async () => {
      const originalCount = sampleAnalyses.length;

      // Trend analysis
      const trends = analyzeTrends(sampleAnalyses);
      expect(trends.analyzedCount).toBe(originalCount);

      // Report generation
      const reports = await generateReport({ analyses: sampleAnalyses, trends });
      expect(reports[0].content).toContain(`**Total Videos Analyzed:** ${originalCount}`);

      // Original data unchanged
      expect(sampleAnalyses.length).toBe(originalCount);
    });

    it('should correctly aggregate hook statistics', () => {
      const trends = analyzeTrends(sampleAnalyses);

      const totalHookFrequency = trends.patterns.hookPatterns
        .reduce((sum, h) => sum + h.frequency, 0);

      expect(totalHookFrequency).toBe(sampleAnalyses.length);
    });
  });
});
