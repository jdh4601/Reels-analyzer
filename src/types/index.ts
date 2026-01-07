/**
 * Core type definitions for Reels Analyzer
 */

// ============================================
// Reel Types
// ============================================

/** 지원하는 플랫폼 */
export type Platform = 'instagram' | 'tiktok' | 'youtube';

/** 릴스 메타데이터 */
export interface ReelMetadata {
  url: string;
  platform: Platform;
  videoId: string;
  title?: string;
  author?: string;
  duration?: number; // seconds
  downloadedAt: Date;
  filePath: string;
}

/** 다운로드된 릴스 정보 */
export interface Reel {
  metadata: ReelMetadata;
  audioPath?: string;
  transcript?: Transcript;
  analysis?: ReelAnalysis;
}

// ============================================
// Transcript Types
// ============================================

/** 타임스탬프가 포함된 텍스트 세그먼트 */
export interface TranscriptSegment {
  start: number; // seconds
  end: number;
  text: string;
}

/** 전체 트랜스크립트 */
export interface Transcript {
  segments: TranscriptSegment[];
  fullText: string;
  language?: string;
  duration: number;
}

// ============================================
// Analysis Types
// ============================================

/** 훅 타입 */
export type HookType = 'question' | 'shock' | 'empathy' | 'list' | 'promise' | 'story' | 'other';

/** CTA 타입 */
export type CTAType = 'follow' | 'like' | 'comment' | 'save' | 'share' | 'link' | 'none';

/** 편집 스타일 */
export interface EditingStyle {
  cutFrequency: 'low' | 'medium' | 'high'; // cuts per 10 seconds
  textOverlay: boolean;
  transitionEffects: string[];
}

/** 오디오 스타일 */
export interface AudioStyle {
  hasVoiceover: boolean;
  hasTrendingSound: boolean;
  subtitleDependent: boolean;
  soundType?: string;
}

/** 릴스 섹션 */
export interface ReelSection {
  name: 'hook' | 'body' | 'cta';
  startTime: number;
  endTime: number;
  content: string;
  purpose: string;
}

/** 릴스 구조 분석 결과 */
export interface ReelAnalysis {
  hookTime: number; // 훅 지속 시간 (seconds)
  hookType: HookType;
  hookText: string;
  sections: ReelSection[];
  ctaType: CTAType;
  ctaText?: string;
  editingStyle: EditingStyle;
  audioStyle: AudioStyle;
  totalDuration: number;
  engagementHooks: string[]; // 주요 시청자 유지 포인트
  summary: string;
}

// ============================================
// Trend Analysis Types
// ============================================

/** 트렌드 패턴 */
export interface TrendPattern {
  hookPatterns: {
    type: HookType;
    frequency: number;
    examples: string[];
  }[];
  popularFormats: {
    name: string;
    description: string;
    frequency: number;
  }[];
  averageDuration: number;
  commonCTAs: CTAType[];
  editingTrends: {
    averageCutFrequency: string;
    textOverlayUsage: number; // percentage
    popularTransitions: string[];
  };
}

/** 트렌드 분석 결과 */
export interface TrendAnalysis {
  analyzedCount: number;
  patterns: TrendPattern;
  insights: string[];
  recommendations: string[];
  analyzedAt: Date;
}

// ============================================
// Script Generation Types
// ============================================

/** 스크립트 생성 입력 */
export interface ScriptInput {
  topic: string;
  targetDuration: 15 | 30 | 60 | 90; // seconds
  trendAnalysis?: TrendAnalysis;
  hookType?: HookType;
  ctaType?: CTAType;
  tone?: 'professional' | 'casual' | 'humorous' | 'educational';
  targetAudience?: string;
}

/** 생성된 스크립트 */
export interface Script {
  title: string;
  hook: {
    type: HookType;
    text: string;
    duration: number;
  };
  body: {
    sections: {
      text: string;
      duration: number;
      visualNotes?: string;
    }[];
  };
  cta: {
    type: CTAType;
    text: string;
    duration: number;
  };
  totalDuration: number;
  notes: string[];
  generatedAt: Date;
}

// ============================================
// Storyboard Types
// ============================================

/** 샷 타입 */
export type ShotType = 'closeup' | 'medium' | 'wide' | 'pov' | 'broll' | 'text-only' | 'split-screen';

/** 스토리보드 컷 */
export interface StoryboardCut {
  cutNumber: number;
  startTime: number;
  endTime: number;
  shotType: ShotType;
  description: string;
  script: string;
  textOverlay?: string;
  transition?: string;
  audioNotes?: string;
}

/** 스토리보드 */
export interface Storyboard {
  title: string;
  cuts: StoryboardCut[];
  totalDuration: number;
  audioTrack?: string;
  notes: string[];
  generatedAt: Date;
}

// ============================================
// Batch Processing Types
// ============================================

/** 배치 작업 상태 */
export type BatchStatus = 'pending' | 'downloading' | 'transcribing' | 'analyzing' | 'completed' | 'failed';

/** 배치 작업 항목 */
export interface BatchItem {
  url: string;
  status: BatchStatus;
  reel?: Reel;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
}

/** 배치 작업 결과 */
export interface BatchResult {
  items: BatchItem[];
  successful: number;
  failed: number;
  startedAt: Date;
  completedAt?: Date;
}

// ============================================
// Report Types
// ============================================

/** 리포트 형식 */
export type ReportFormat = 'html' | 'markdown' | 'json';

/** 리포트 옵션 */
export interface ReportOptions {
  format: ReportFormat;
  includeCharts: boolean;
  includeSummary: boolean;
  outputPath?: string;
}

/** 생성된 리포트 */
export interface Report {
  title: string;
  format: ReportFormat;
  content: string;
  filePath: string;
  generatedAt: Date;
}
