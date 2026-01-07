
import { 
  ReelAnalysis, 
  TrendAnalysis, 
  TrendPattern, 
  HookType, 
  CTAType 
} from '../types';
import { generateAIInsights } from './insights';

/**
 * Analyzes multiple reel analyses to find common trends and patterns
 */
export async function analyzeTrends(analyses: ReelAnalysis[]): Promise<TrendAnalysis> {
  if (analyses.length === 0) {
    return createEmptyTrendAnalysis();
  }

  const patterns = extractPatterns(analyses);
  
  // Generate insights and recommendations using AI
  const { insights, recommendations } = await generateAIInsights(analyses);

  return {
    analyzedCount: analyses.length,
    patterns,
    insights,
    recommendations,
    analyzedAt: new Date()
  };
}

function extractPatterns(analyses: ReelAnalysis[]): TrendPattern {
  return {
    hookPatterns: calculateHookStats(analyses),
    popularFormats: identifyPopularFormats(analyses),
    averageDuration: calculateAverage(analyses.map(a => a.totalDuration)),
    commonCTAs: calculateCommonCTAs(analyses),
    editingTrends: calculateEditingTrends(analyses)
  };
}

function calculateHookStats(analyses: ReelAnalysis[]) {
  const counts: Record<string, { count: number; examples: string[] }> = {};

  analyses.forEach(a => {
    if (!counts[a.hookType]) {
      counts[a.hookType] = { count: 0, examples: [] };
    }
    counts[a.hookType].count++;
    if (counts[a.hookType].examples.length < 3) {
      counts[a.hookType].examples.push(a.hookText);
    }
  });

  return Object.entries(counts)
    .map(([type, data]) => ({
      type: type as HookType,
      frequency: data.count,
      examples: data.examples
    }))
    .sort((a, b) => b.frequency - a.frequency);
}

function identifyPopularFormats(analyses: ReelAnalysis[]) {
  // Simple heuristic based on duration and hook type
  const formats: Record<string, number> = {};

  analyses.forEach(a => {
    let formatName = 'Standard Reel';
    if (a.totalDuration <= 15) formatName = 'Short & Snappy';
    else if (a.totalDuration > 45) formatName = 'Long-form Story';
    else if (a.hookType === 'list') formatName = 'Listicle/Tips';
    else if (a.hookType === 'question') formatName = 'Q&A / Engagement';

    formats[formatName] = (formats[formatName] || 0) + 1;
  });

  return Object.entries(formats)
    .map(([name, count]) => ({
      name,
      description: getFormatDescription(name),
      frequency: count
    }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 3);
}

function getFormatDescription(name: string): string {
  switch (name) {
    case 'Short & Snappy': return 'Under 15s videos focusing on quick impact';
    case 'Long-form Story': return 'Over 45s videos with narrative depth';
    case 'Listicle/Tips': return 'Educational content structured as a list';
    case 'Q&A / Engagement': return 'Videos starting with a question to drive comments';
    default: return 'General purpose reel format';
  }
}

function calculateCommonCTAs(analyses: ReelAnalysis[]): CTAType[] {
  const counts: Record<string, number> = {};
  analyses.forEach(a => {
    if (a.ctaType !== 'none') {
      counts[a.ctaType] = (counts[a.ctaType] || 0) + 1;
    }
  });

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([type]) => type as CTAType)
    .slice(0, 3);
}

function calculateEditingTrends(analyses: ReelAnalysis[]) {
  const cutScores = { low: 1, medium: 2, high: 3 };
  const totalScore = analyses.reduce((sum, a) => sum + cutScores[a.editingStyle.cutFrequency], 0);
  const avgScore = totalScore / analyses.length;

  let averageCutFrequency = 'medium';
  if (avgScore < 1.5) averageCutFrequency = 'low';
  else if (avgScore > 2.5) averageCutFrequency = 'high';

  const textOverlayCount = analyses.filter(a => a.editingStyle.textOverlay).length;

  // Flatten all transition effects and count them
  const allTransitions = analyses.flatMap(a => a.editingStyle.transitionEffects);
  const transitionCounts: Record<string, number> = {};
  allTransitions.forEach(t => transitionCounts[t] = (transitionCounts[t] || 0) + 1);
  
  const popularTransitions = Object.entries(transitionCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([t]) => t)
    .slice(0, 5);

  return {
    averageCutFrequency,
    textOverlayUsage: Math.round((textOverlayCount / analyses.length) * 100),
    popularTransitions
  };
}

function calculateAverage(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  return Math.round(numbers.reduce((a, b) => a + b, 0) / numbers.length);
}

function createEmptyTrendAnalysis(): TrendAnalysis {
  return {
    analyzedCount: 0,
    patterns: {
      hookPatterns: [],
      popularFormats: [],
      averageDuration: 0,
      commonCTAs: [],
      editingTrends: {
        averageCutFrequency: 'medium',
        textOverlayUsage: 0,
        popularTransitions: []
      }
    },
    insights: ["No data available for analysis."],
    recommendations: ["Collect more reels to analyze."],
    analyzedAt: new Date()
  };
}
