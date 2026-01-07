/**
 * Report Generator Module
 * Generates beautiful Markdown and HTML reports from batch analysis data
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  ReelAnalysis,
  TrendAnalysis,
  BatchResult,
  Report,
  ReportOptions
} from '../types';
import { config } from '../config';
import { analyzeTrends } from '../analyzer/trends';

/** Input data structure for report generation */
export interface ReportData {
  analyses: ReelAnalysis[];
  trends?: TrendAnalysis;
  batchResult?: BatchResult;
}

/**
 * Generate reports from analysis data
 * Creates both Markdown (latest.md) and HTML dashboard (dashboard.html)
 */
export async function generateReport(
  data: ReportData,
  options: Partial<ReportOptions> = {}
): Promise<Report[]> {
  const reports: Report[] = [];
  const outputDir = options.outputPath || path.join(config.outputDir, 'reports');

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Auto-generate trends if not provided
  if (!data.trends && data.analyses.length > 0) {
    data.trends = await analyzeTrends(data.analyses);
  }

  // Generate Markdown report
  const mdReport = generateMarkdownReport(data, outputDir);
  reports.push(mdReport);

  // Generate HTML report with charts
  if (options.includeCharts !== false) {
    const htmlReport = generateHtmlReport(data, outputDir);
    reports.push(htmlReport);
  }

  return reports;
}

/**
 * Generate Markdown summary report (reports/latest.md)
 */
export function generateMarkdownReport(data: ReportData, outputDir: string): Report {
  const { analyses, trends, batchResult } = data;

  let md = `# Reels Analysis Report\n\n`;
  md += `**Generated:** ${new Date().toLocaleString()}\n\n`;
  md += `---\n\n`;

  // Summary Section
  md += `## Summary\n\n`;
  md += `- **Total Videos Analyzed:** ${analyses.length}\n`;

  if (batchResult) {
    md += `- **Successful:** ${batchResult.successful}\n`;
    md += `- **Failed:** ${batchResult.failed}\n`;
  }

  if (trends) {
    md += `- **Average Duration:** ${trends.patterns.averageDuration}s\n`;
    md += `- **Text Overlay Usage:** ${trends.patterns.editingTrends.textOverlayUsage}%\n`;
  }

  md += `\n---\n\n`;

  // Hook Analysis
  if (trends && trends.patterns.hookPatterns.length > 0) {
    md += `## Hook Types Distribution\n\n`;
    md += `| Hook Type | Count | Percentage |\n`;
    md += `|-----------|-------|------------|\n`;

    const total = analyses.length;
    trends.patterns.hookPatterns.forEach(h => {
      const pct = total > 0 ? Math.round((h.frequency / total) * 100) : 0;
      md += `| ${h.type} | ${h.frequency} | ${pct}% |\n`;
    });

    md += `\n### Top Hook Examples\n\n`;
    trends.patterns.hookPatterns.slice(0, 3).forEach(h => {
      if (h.examples.length > 0) {
        md += `**${h.type}:**\n`;
        h.examples.forEach(ex => md += `> "${ex}"\n\n`);
      }
    });

    md += `---\n\n`;
  }

  // Popular Formats
  if (trends && trends.patterns.popularFormats.length > 0) {
    md += `## Popular Formats\n\n`;
    trends.patterns.popularFormats.forEach((f, i) => {
      md += `${i + 1}. **${f.name}** (${f.frequency} videos)\n`;
      md += `   - ${f.description}\n`;
    });
    md += `\n---\n\n`;
  }

  // CTA Analysis
  if (trends && trends.patterns.commonCTAs.length > 0) {
    md += `## Common CTAs\n\n`;
    trends.patterns.commonCTAs.forEach((cta, i) => {
      md += `${i + 1}. **${cta}**\n`;
    });
    md += `\n---\n\n`;
  }

  // Editing Trends
  if (trends) {
    md += `## Editing Trends\n\n`;
    md += `- **Average Cut Frequency:** ${trends.patterns.editingTrends.averageCutFrequency}\n`;
    md += `- **Text Overlay Usage:** ${trends.patterns.editingTrends.textOverlayUsage}%\n`;

    if (trends.patterns.editingTrends.popularTransitions.length > 0) {
      md += `- **Popular Transitions:** ${trends.patterns.editingTrends.popularTransitions.join(', ')}\n`;
    }
    md += `\n---\n\n`;
  }

  // Insights
  if (trends && trends.insights.length > 0) {
    md += `## Key Insights\n\n`;
    trends.insights.forEach(insight => {
      md += `- ${insight}\n`;
    });
    md += `\n---\n\n`;
  }

  // Recommendations
  if (trends && trends.recommendations.length > 0) {
    md += `## Recommendations\n\n`;
    trends.recommendations.forEach(rec => {
      md += `- ${rec}\n`;
    });
    md += `\n---\n\n`;
  }

  // Individual Video Details (collapsed for brevity)
  if (analyses.length > 0) {
    md += `## Individual Video Analysis\n\n`;
    md += `<details>\n<summary>Click to expand (${analyses.length} videos)</summary>\n\n`;

    analyses.forEach((a, i) => {
      md += `### Video ${i + 1}\n\n`;
      md += `- **Hook Type:** ${a.hookType}\n`;
      md += `- **Hook:** "${a.hookText}"\n`;
      md += `- **Duration:** ${a.totalDuration}s\n`;
      md += `- **CTA:** ${a.ctaType}${a.ctaText ? ` ("${a.ctaText}")` : ''}\n`;
      md += `- **Summary:** ${a.summary}\n\n`;
    });

    md += `</details>\n\n`;
  }

  md += `---\n\n*Generated by Reels Analyzer*\n`;

  // Save file
  const filePath = path.join(outputDir, 'latest.md');
  fs.writeFileSync(filePath, md);

  return {
    title: 'Markdown Summary Report',
    format: 'markdown',
    content: md,
    filePath,
    generatedAt: new Date()
  };
}

/**
 * Generate HTML dashboard with Chart.js charts (reports/dashboard.html)
 */
export function generateHtmlReport(data: ReportData, outputDir: string): Report {
  const { analyses, trends } = data;

  // Prepare chart data
  const hookData = prepareHookChartData(analyses, trends);
  const durationData = prepareDurationChartData(analyses);
  const ctaData = prepareCtaChartData(analyses);
  const editingData = prepareEditingChartData(analyses);

  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reels Analysis Dashboard</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      min-height: 100vh;
      color: #fff;
      padding: 2rem;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    header {
      text-align: center;
      margin-bottom: 3rem;
    }
    header h1 {
      font-size: 2.5rem;
      background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin-bottom: 0.5rem;
    }
    header p {
      color: #888;
      font-size: 0.9rem;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1.5rem;
      margin-bottom: 3rem;
    }
    .stat-card {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 16px;
      padding: 1.5rem;
      text-align: center;
      border: 1px solid rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
    }
    .stat-card .number {
      font-size: 2.5rem;
      font-weight: bold;
      background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .stat-card .label {
      color: #888;
      font-size: 0.85rem;
      margin-top: 0.5rem;
    }
    .charts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
      gap: 2rem;
      margin-bottom: 3rem;
    }
    .chart-card {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 16px;
      padding: 1.5rem;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    .chart-card h3 {
      margin-bottom: 1rem;
      font-size: 1.1rem;
      color: #ccc;
    }
    .chart-container {
      position: relative;
      height: 250px;
    }
    .insights-section {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 16px;
      padding: 2rem;
      border: 1px solid rgba(255, 255, 255, 0.1);
      margin-bottom: 2rem;
    }
    .insights-section h2 {
      margin-bottom: 1.5rem;
      color: #667eea;
    }
    .insight-item {
      display: flex;
      align-items: flex-start;
      margin-bottom: 1rem;
      padding: 1rem;
      background: rgba(255, 255, 255, 0.03);
      border-radius: 8px;
    }
    .insight-item .icon {
      font-size: 1.5rem;
      margin-right: 1rem;
    }
    .insight-item p {
      color: #ccc;
      line-height: 1.5;
    }
    .recommendations-section {
      background: rgba(102, 126, 234, 0.1);
      border-radius: 16px;
      padding: 2rem;
      border: 1px solid rgba(102, 126, 234, 0.3);
    }
    .recommendations-section h2 {
      margin-bottom: 1.5rem;
      color: #667eea;
    }
    .rec-item {
      display: flex;
      align-items: center;
      margin-bottom: 0.75rem;
      color: #ccc;
    }
    .rec-item::before {
      content: "→";
      color: #667eea;
      margin-right: 0.75rem;
      font-weight: bold;
    }
    footer {
      text-align: center;
      margin-top: 3rem;
      color: #666;
      font-size: 0.8rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>Reels Analysis Dashboard</h1>
      <p>Generated: ${new Date().toLocaleString()}</p>
    </header>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="number">${analyses.length}</div>
        <div class="label">Videos Analyzed</div>
      </div>
      <div class="stat-card">
        <div class="number">${trends?.patterns.averageDuration || 0}s</div>
        <div class="label">Avg Duration</div>
      </div>
      <div class="stat-card">
        <div class="number">${trends?.patterns.editingTrends.textOverlayUsage || 0}%</div>
        <div class="label">Text Overlay Usage</div>
      </div>
      <div class="stat-card">
        <div class="number">${trends?.patterns.hookPatterns[0]?.type || 'N/A'}</div>
        <div class="label">Top Hook Type</div>
      </div>
    </div>

    <div class="charts-grid">
      <div class="chart-card">
        <h3>Hook Types Distribution</h3>
        <div class="chart-container">
          <canvas id="hookChart"></canvas>
        </div>
      </div>
      <div class="chart-card">
        <h3>Video Duration Distribution</h3>
        <div class="chart-container">
          <canvas id="durationChart"></canvas>
        </div>
      </div>
      <div class="chart-card">
        <h3>CTA Types</h3>
        <div class="chart-container">
          <canvas id="ctaChart"></canvas>
        </div>
      </div>
      <div class="chart-card">
        <h3>Editing Style</h3>
        <div class="chart-container">
          <canvas id="editingChart"></canvas>
        </div>
      </div>
    </div>

    ${trends && trends.insights.length > 0 ? `
    <div class="insights-section">
      <h2>Key Insights</h2>
      ${trends.insights.map(insight => `
        <div class="insight-item">
          <span class="icon">💡</span>
          <p>${escapeHtml(insight)}</p>
        </div>
      `).join('')}
    </div>
    ` : ''}

    ${trends && trends.recommendations.length > 0 ? `
    <div class="recommendations-section">
      <h2>Recommendations</h2>
      ${trends.recommendations.map(rec => `
        <div class="rec-item">${escapeHtml(rec)}</div>
      `).join('')}
    </div>
    ` : ''}

    <footer>
      <p>Generated by Reels Analyzer | Powered by Claude AI</p>
    </footer>
  </div>

  <script>
    // Chart.js configuration
    const chartColors = {
      primary: ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe'],
      gradient: (ctx, color1, color2) => {
        const gradient = ctx.createLinearGradient(0, 0, 0, 250);
        gradient.addColorStop(0, color1);
        gradient.addColorStop(1, color2);
        return gradient;
      }
    };

    Chart.defaults.color = '#888';
    Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.1)';

    // Hook Types Chart (Doughnut)
    const hookCtx = document.getElementById('hookChart').getContext('2d');
    new Chart(hookCtx, {
      type: 'doughnut',
      data: {
        labels: ${JSON.stringify(hookData.labels)},
        datasets: [{
          data: ${JSON.stringify(hookData.values)},
          backgroundColor: chartColors.primary,
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: { padding: 15 }
          }
        }
      }
    });

    // Duration Chart (Bar)
    const durationCtx = document.getElementById('durationChart').getContext('2d');
    new Chart(durationCtx, {
      type: 'bar',
      data: {
        labels: ${JSON.stringify(durationData.labels)},
        datasets: [{
          label: 'Videos',
          data: ${JSON.stringify(durationData.values)},
          backgroundColor: chartColors.gradient(durationCtx, '#667eea', '#764ba2'),
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1 } }
        }
      }
    });

    // CTA Chart (Pie)
    const ctaCtx = document.getElementById('ctaChart').getContext('2d');
    new Chart(ctaCtx, {
      type: 'pie',
      data: {
        labels: ${JSON.stringify(ctaData.labels)},
        datasets: [{
          data: ${JSON.stringify(ctaData.values)},
          backgroundColor: chartColors.primary,
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: { padding: 15 }
          }
        }
      }
    });

    // Editing Style Chart (Polar Area)
    const editingCtx = document.getElementById('editingChart').getContext('2d');
    new Chart(editingCtx, {
      type: 'polarArea',
      data: {
        labels: ${JSON.stringify(editingData.labels)},
        datasets: [{
          data: ${JSON.stringify(editingData.values)},
          backgroundColor: chartColors.primary.map(c => c + '80')
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: { padding: 10 }
          }
        }
      }
    });
  </script>
</body>
</html>`;

  // Save file
  const filePath = path.join(outputDir, 'dashboard.html');
  fs.writeFileSync(filePath, html);

  return {
    title: 'HTML Dashboard Report',
    format: 'html',
    content: html,
    filePath,
    generatedAt: new Date()
  };
}

/**
 * Load analysis files from a directory (batch-results folder)
 */
export function loadAnalysesFromDirectory(dirPath: string): ReelAnalysis[] {
  if (!fs.existsSync(dirPath)) {
    return [];
  }

  const files = fs.readdirSync(dirPath)
    .filter(f => f.startsWith('analysis-') && f.endsWith('.json'));

  const analyses: ReelAnalysis[] = [];

  for (const file of files) {
    try {
      const content = JSON.parse(fs.readFileSync(path.join(dirPath, file), 'utf-8'));
      if (content.analysis) {
        analyses.push(content.analysis);
      }
    } catch {
      // Skip invalid files
    }
  }

  return analyses;
}

/**
 * Load batch result summary from a directory
 */
export function loadBatchResult(dirPath: string): BatchResult | undefined {
  if (!fs.existsSync(dirPath)) {
    return undefined;
  }

  const files = fs.readdirSync(dirPath)
    .filter(f => f.startsWith('batch-summary-') && f.endsWith('.json'))
    .sort()
    .reverse(); // Most recent first

  if (files.length === 0) {
    return undefined;
  }

  try {
    return JSON.parse(fs.readFileSync(path.join(dirPath, files[0]), 'utf-8'));
  } catch {
    return undefined;
  }
}

// ============================================
// Chart Data Preparation Helpers
// ============================================

function prepareHookChartData(analyses: ReelAnalysis[], trends?: TrendAnalysis) {
  if (trends && trends.patterns.hookPatterns.length > 0) {
    return {
      labels: trends.patterns.hookPatterns.map(h => h.type),
      values: trends.patterns.hookPatterns.map(h => h.frequency)
    };
  }

  // Fallback: calculate from raw analyses
  const counts: Record<string, number> = {};
  analyses.forEach(a => {
    counts[a.hookType] = (counts[a.hookType] || 0) + 1;
  });

  const labels = Object.keys(counts);
  const values = Object.values(counts);

  return {
    labels: labels.length > 0 ? labels : ['No Data'],
    values: values.length > 0 ? values : [1]
  };
}

function prepareDurationChartData(analyses: ReelAnalysis[]) {
  const buckets: Record<string, number> = {
    '0-15s': 0,
    '16-30s': 0,
    '31-60s': 0,
    '60s+': 0
  };

  analyses.forEach(a => {
    const d = a.totalDuration;
    if (d <= 15) buckets['0-15s']++;
    else if (d <= 30) buckets['16-30s']++;
    else if (d <= 60) buckets['31-60s']++;
    else buckets['60s+']++;
  });

  return {
    labels: Object.keys(buckets),
    values: Object.values(buckets)
  };
}

function prepareCtaChartData(analyses: ReelAnalysis[]) {
  const counts: Record<string, number> = {};
  analyses.forEach(a => {
    if (a.ctaType !== 'none') {
      counts[a.ctaType] = (counts[a.ctaType] || 0) + 1;
    }
  });

  if (Object.keys(counts).length === 0) {
    return { labels: ['No CTA'], values: [analyses.length || 1] };
  }

  return {
    labels: Object.keys(counts),
    values: Object.values(counts)
  };
}

function prepareEditingChartData(analyses: ReelAnalysis[]) {
  if (analyses.length === 0) {
    return { labels: ['No Data'], values: [1] };
  }

  const cutCounts = { low: 0, medium: 0, high: 0 };
  let textOverlayCount = 0;

  analyses.forEach(a => {
    cutCounts[a.editingStyle.cutFrequency]++;
    if (a.editingStyle.textOverlay) textOverlayCount++;
  });

  return {
    labels: ['Low Cuts', 'Medium Cuts', 'High Cuts', 'Text Overlay'],
    values: [cutCounts.low, cutCounts.medium, cutCounts.high, textOverlayCount]
  };
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
