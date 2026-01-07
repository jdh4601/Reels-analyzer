# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is Ralph Wiggum?

AI 코딩 에이전트를 단순한 for 루프로 돌리는 자동화 기법. 복잡한 멀티 에이전트 오케스트레이션 대신, 한 번에 하나의 태스크만 처리하고 피드백 루프(타입 체크, 테스트)로 검증.

## Project: Reels Analyzer & Creator

CLI tool for analyzing viral short-form content (Instagram/TikTok/YouTube Shorts) and generating scripts/storyboards using AI.

### External Dependencies
- **yt-dlp**: Video downloading (`brew install yt-dlp`)
- **ffmpeg**: Audio extraction (`brew install ffmpeg`)
- **Anthropic API**: Claude for structure analysis and content generation
- **OpenAI API**: Whisper for audio transcription

## Commands

```bash
# Development
npx ts-node src/cli.ts <command>    # Run CLI in development
npm run dev                          # Same as above

# Verification (run before completing any task)
npx tsc --noEmit                     # Type check
npm test                             # All tests
npm test -- --testPathPattern=<name> # Single test file

# Build
npm run build                        # Compile TypeScript

# Ralph Wiggum workflow
./ralph-once.sh                      # Single iteration
./ralph.sh 20                        # AFK mode (max N iterations)
```

## Architecture

### Data Flow Pipeline
```
URL → Downloader (yt-dlp) → Transcriber (ffmpeg + Whisper) → Analyzer (Claude) → Output JSON
                                                                    ↓
                                                        Generator (Claude) → Script + Storyboard
```

### Core Modules

| Module | Purpose |
|--------|---------|
| `src/downloader/` | yt-dlp wrapper, URL validation (supports instagram/tiktok/youtube) |
| `src/transcriber/` | ffmpeg audio extraction + OpenAI Whisper API |
| `src/analyzer/structure.ts` | Claude-based hook/body/CTA analysis |
| `src/analyzer/trends.ts` | Pattern aggregation across multiple videos |
| `src/generator/` | Script and storyboard generation from trends |
| `src/reporter/` | HTML dashboard and Markdown report generation |
| `src/batch.ts` | Concurrent URL processing with worker pool |
| `src/llm.ts` | Claude/Ollama abstraction with JSON parsing |

### LLM Integration (`src/llm.ts`)
- `callAI()`: Primary interface, tries Claude first then falls back to local Ollama
- `parseJsonFromLlmLiteral<T>()`: Extracts JSON from LLM responses (handles markdown code blocks, trailing commas)
- Claude model: `claude-3-haiku-20240307`

### CLI Commands (`src/cli.ts`)
- `analyze <url>`: Single video analysis pipeline
- `batch <file>`: Concurrent processing from URL list
- `trends <files...>`: Aggregate patterns from analysis JSONs
- `generate <topic>`: Create script + storyboard
- `report [dir]`: Generate HTML/Markdown reports

## Ralph Wiggum Workflow

| File | Role |
|------|------|
| `prd.json` | Task list. `passes: false` = incomplete |
| `prompt.md` | LLM prompt template |
| `progress.txt` | Iteration history and learnings |

### Task Processing
1. Select lowest priority task with `passes: false` from `prd.json`
2. Implement and verify (tsc, test)
3. On pass: set `passes: true` in `prd.json`
4. Record iteration in `progress.txt`
5. Git commit

### prd.json Task Format
```json
{
  "id": 1,
  "title": "Task title",
  "description": "Details",
  "acceptance_criteria": ["Criterion 1", "Criterion 2"],
  "priority": 1,
  "passes": false
}
```

### progress.txt Format
```
## Iteration [N] - [datetime]
### Completed: [task title]
### Implementation
- [file]: [description]
### Hints for next task
- [notes]
---
```

## Key Types (`src/types/index.ts`)

- `ReelMetadata`: URL, platform, videoId, filePath
- `Transcript`: segments with timestamps, fullText, duration
- `ReelAnalysis`: hookType, sections, ctaType, editingStyle, audioStyle
- `TrendAnalysis`: patterns, insights, recommendations
- `Script` / `Storyboard`: Generated content structures
- `BatchResult` / `BatchItem`: Batch processing state tracking
