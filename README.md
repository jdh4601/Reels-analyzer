# Reels Analyzer & Creator

> Reverse-engineer viral short-form content. Generate scripts that convert.

AI-powered CLI that analyzes Instagram Reels, TikToks, and YouTube Shorts to extract what makes them work—then generates new content based on proven patterns.

## What It Does

```
Your competitor's viral reel → AI Analysis → Your winning script
```

| Input | Output |
|-------|--------|
| Video URL | Hook type, structure breakdown, CTA analysis |
| Multiple URLs | Trend patterns across videos |
| Topic + Trends | Ready-to-shoot script & storyboard |

## Quick Start

```bash
# Install
npm install
# Create .env file with your API keys (see Configuration section)

# Analyze a viral reel
npx ts-node src/cli.ts analyze "https://www.instagram.com/reel/ABC123"

# Generate your own script based on what works
npx ts-node src/cli.ts generate "productivity tips for developers" --duration 30
```

## Prerequisites

| Requirement | Installation |
|-------------|--------------|
| Node.js 18+ | [nodejs.org](https://nodejs.org) |
| yt-dlp | `brew install yt-dlp` |
| ffmpeg | `brew install ffmpeg` |
| Anthropic API key | [console.anthropic.com](https://console.anthropic.com) |
| OpenAI API key | [platform.openai.com](https://platform.openai.com) |

## Configuration

Create a `.env` file in the project root:

```env
ANTHROPIC_API_KEY=sk-ant-...      # Required: Claude for analysis
OPENAI_API_KEY=sk-...             # Required: Whisper for transcription
OUTPUT_DIR=./output               # Where results are saved
MAX_CONCURRENT_DOWNLOADS=3        # Parallel processing limit
```

## Commands

### `analyze` - Single Video Analysis

Download, transcribe, and analyze a video's structure.

```bash
npx ts-node src/cli.ts analyze "https://www.instagram.com/reel/ABC123"
```

**Output:** `output/analysis-<video-id>.json`

```json
{
  "analysis": {
    "hookType": "question",
    "hookText": "Did you know 90% of reels fail in the first 2 seconds?",
    "hookTime": 3,
    "ctaType": "follow",
    "editingStyle": { "cutFrequency": "high", "textOverlay": true },
    "summary": "Educational content with question hook and rapid cuts"
  }
}
```

### `batch` - Process Multiple Videos

Analyze competitors at scale.

```bash
# Create urls.txt with one URL per line
npx ts-node src/cli.ts batch urls.txt -c 5
```

| Option | Description | Default |
|--------|-------------|---------|
| `-c, --concurrency` | Parallel downloads | 3 |
| `-o, --output` | Output directory | `./output` |

### `trends` - Find Patterns

Aggregate insights from multiple analyses.

```bash
npx ts-node src/cli.ts trends output/batch-results/analysis-*.json
```

**Discovers:**
- Most effective hook types
- Optimal video duration
- Common CTA strategies
- Editing style patterns

### `generate` - Create Content

Generate scripts based on trend data.

```bash
npx ts-node src/cli.ts generate "morning routine for entrepreneurs" \
  --duration 30 \
  --tone casual \
  --trend-file output/trends-*.json
```

| Option | Values | Default |
|--------|--------|---------|
| `-d, --duration` | 15, 30, 60, 90 seconds | 30 |
| `-t, --tone` | professional, casual, humorous, educational | casual |
| `--trend-file` | Path to trends JSON | - |

**Output:** Script + Storyboard with shot-by-shot breakdown.

### `report` - Generate Reports

Create visual dashboards from batch results.

```bash
npx ts-node src/cli.ts report output/batch-results
```

| Option | Description |
|--------|-------------|
| `-o, --output` | Report directory |
| `--no-html` | Markdown only |

**Generates:**
- `dashboard.html` - Interactive charts
- `latest.md` - Markdown summary

## Full Workflow Example

```bash
# 1. Collect URLs of top-performing reels in your niche
cat > urls.txt << EOF
https://www.instagram.com/reel/ABC123
https://www.instagram.com/reel/DEF456
https://www.tiktok.com/@creator/video/789
https://youtube.com/shorts/XYZ000
EOF

# 2. Batch analyze all videos
npx ts-node src/cli.ts batch urls.txt -c 3

# 3. Extract patterns
npx ts-node src/cli.ts trends output/batch-results/analysis-*.json

# 4. Generate your script
npx ts-node src/cli.ts generate "your topic here" \
  --trend-file output/trends-*.json \
  --duration 30

# 5. Create a report
npx ts-node src/cli.ts report output/batch-results

# 6. Review outputs
open output/reports/dashboard.html
cat output/project-*.md
```

## Output Structure

```
output/
├── downloads/              # Raw video files
├── batch-results/
│   ├── analysis-*.json     # Individual analyses
│   └── batch-summary-*.json
├── reports/
│   ├── dashboard.html      # Interactive dashboard
│   └── latest.md           # Summary report
├── trends-*.json           # Aggregated patterns
├── script-*.json           # Generated scripts
├── storyboard-*.json       # Shot breakdowns
└── project-*.md            # Combined output (script + storyboard)
```

## Analysis Schema

Each video analysis includes:

| Field | Description |
|-------|-------------|
| `hookType` | question, shock, empathy, list, promise, story |
| `hookTime` | Duration of hook in seconds |
| `sections` | Breakdown: hook → body → CTA |
| `ctaType` | follow, like, comment, save, share, link |
| `editingStyle` | Cut frequency, text overlays, transitions |
| `audioStyle` | Voiceover, trending sounds, subtitle dependency |
| `engagementHooks` | Key retention points throughout |

## Architecture

```
URL → Downloader → Transcriber → Analyzer → Generator
        (yt-dlp)    (Whisper)    (Claude)    (Claude)
```

| Module | Purpose |
|--------|---------|
| `src/downloader/` | yt-dlp wrapper with platform detection |
| `src/transcriber/` | ffmpeg + OpenAI Whisper |
| `src/analyzer/` | Claude-based structure & trend analysis |
| `src/generator/` | Script & storyboard generation |
| `src/reporter/` | HTML/Markdown report generation |
| `src/batch.ts` | Concurrent processing with worker pool |
| `src/llm.ts` | Claude/Ollama abstraction layer |

## Development

```bash
# Type check
npx tsc --noEmit

# Run all tests
npm test

# Run specific test
npm test -- --testPathPattern=analyzer

# Watch mode
npm run test:watch
```

## Troubleshooting

**"yt-dlp: command not found"**
```bash
brew install yt-dlp
# or: pip install yt-dlp
```

**"ffmpeg: command not found"**
```bash
brew install ffmpeg
```

**"Missing required environment variables"**
```bash
# Create .env file with required keys:
# ANTHROPIC_API_KEY=sk-ant-...
# OPENAI_API_KEY=sk-...
```

**Rate limits / API errors**
- Reduce concurrency: `-c 1`
- The tool automatically falls back to local Ollama if Claude fails

## Supported Platforms

| Platform | URL Format |
|----------|------------|
| Instagram | `instagram.com/reel/*`, `instagram.com/p/*` |
| TikTok | `tiktok.com/@*/video/*` |
| YouTube Shorts | `youtube.com/shorts/*` |

## License

MIT
