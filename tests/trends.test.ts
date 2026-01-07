
import { analyzeTrends } from '../src/analyzer/trends';
import { ReelAnalysis } from '../src/types';

describe('Trend Analyzer', () => {
  // Helper to create mock analysis
  const createMockAnalysis = (overrides: Partial<ReelAnalysis>): ReelAnalysis => ({
    hookTime: 3,
    hookType: 'question',
    hookText: 'Did you know?',
    sections: [],
    ctaType: 'follow',
    ctaText: 'Follow me',
    editingStyle: {
      cutFrequency: 'medium',
      textOverlay: true,
      transitionEffects: ['zoom']
    },
    audioStyle: {
      hasVoiceover: true,
      hasTrendingSound: false,
      subtitleDependent: false
    },
    totalDuration: 30,
    engagementHooks: [],
    summary: 'Summary',
    ...overrides
  });

  it('should analyze a single reel correctly', () => {
    const analysis = createMockAnalysis({});
    const trends = analyzeTrends([analysis]);

    expect(trends.analyzedCount).toBe(1);
    expect(trends.patterns.averageDuration).toBe(30);
    expect(trends.patterns.hookPatterns[0].type).toBe('question');
    expect(trends.patterns.commonCTAs[0]).toBe('follow');
  });

  it('should aggregage statistics from multiple reels', () => {
    const analyses = [
      createMockAnalysis({ hookType: 'question', totalDuration: 10, ctaType: 'like' }),
      createMockAnalysis({ hookType: 'shock', totalDuration: 20, ctaType: 'comment' }),
      createMockAnalysis({ hookType: 'question', totalDuration: 60, ctaType: 'like' }), // Question is dominant
    ];

    const trends = analyzeTrends(analyses);

    expect(trends.analyzedCount).toBe(3);
    
    // Duration: (10+20+60)/3 = 30
    expect(trends.patterns.averageDuration).toBe(30);

    // Hook Patterns
    expect(trends.patterns.hookPatterns).toHaveLength(2); // question, shock
    expect(trends.patterns.hookPatterns[0].type).toBe('question');
    expect(trends.patterns.hookPatterns[0].frequency).toBe(2);

    // CTAs
    expect(trends.patterns.commonCTAs).toContain('like');
    expect(trends.patterns.commonCTAs[0]).toBe('like'); // dominant

    // Insights generated?
    expect(trends.insights.length).toBeGreaterThan(0);
    expect(trends.insights[0]).toContain('question');
  });

  it('should identify popular formats correctly', () => {
     const analyses = [
      createMockAnalysis({ totalDuration: 10 }), // Short & Snappy
      createMockAnalysis({ totalDuration: 12 }), // Short & Snappy
      createMockAnalysis({ totalDuration: 50, hookType: 'story' }), // Long-form
    ];
    
    const trends = analyzeTrends(analyses);
    
    expect(trends.patterns.popularFormats[0].name).toBe('Short & Snappy');
    expect(trends.patterns.popularFormats[0].frequency).toBe(2);
  });

  it('should handle empty input safely', () => {
    const trends = analyzeTrends([]);
    expect(trends.analyzedCount).toBe(0);
    expect(trends.patterns.hookPatterns).toEqual([]);
    expect(trends.insights[0]).toContain("No data");
  });
});
