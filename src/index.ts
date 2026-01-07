/**
 * Reels Analyzer & Creator
 * 최신 릴스 트렌드를 분석하고, 스크립트/스토리보드를 자동 생성하는 CLI 도구
 */

export const VERSION = '1.0.0';

// Configuration
export { config, initDirectories, printConfig } from './config';
export type { Config } from './config';

// Types
export * from './types';
