/**
 * Configuration management
 * 환경변수 로드 및 검증
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// .env 파일 로드
dotenv.config();

/** 필수 환경변수 목록 */
const REQUIRED_ENV_VARS = ['ANTHROPIC_API_KEY'] as const;
const API_ENV_VARS = ['OPENAI_API_KEY'] as const;

/** 선택적 환경변수와 기본값 */
const OPTIONAL_ENV_VARS = {
  OUTPUT_DIR: './output',
  DOWNLOAD_DIR: './output/downloads',
  REPORTS_DIR: './output/reports',
  WHISPER_MODEL: 'base', // tiny, base, small, medium, large
  MAX_CONCURRENT_DOWNLOADS: '3',
  LOG_LEVEL: 'info', // debug, info, warn, error
} as const;

/** 설정 인터페이스 */
export interface Config {
  version: string;

  // API Keys
  anthropicApiKey: string;
  openaiApiKey?: string;

  // Directories
  outputDir: string;
  downloadDir: string;
  reportsDir: string;

  // Whisper settings
  whisperModel: 'tiny' | 'base' | 'small' | 'medium' | 'large';

  // Processing settings
  maxConcurrentDownloads: number;

  // Logging
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * 환경변수 검증
 * @throws Error 필수 환경변수가 없는 경우
 */
function validateEnv(): void {
  const missing: string[] = [];

  for (const key of REQUIRED_ENV_VARS) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please create a .env file based on .env.example'
    );
  }
}

/**
 * 환경변수에서 값을 가져오거나 기본값 반환
 */
function getEnv(key: keyof typeof OPTIONAL_ENV_VARS): string {
  return process.env[key] || OPTIONAL_ENV_VARS[key];
}

/**
 * 디렉토리 경로를 절대 경로로 변환하고 존재하지 않으면 생성
 */
function ensureDir(dirPath: string): string {
  const absolutePath = path.isAbsolute(dirPath)
    ? dirPath
    : path.resolve(process.cwd(), dirPath);

  if (!fs.existsSync(absolutePath)) {
    fs.mkdirSync(absolutePath, { recursive: true });
  }

  return absolutePath;
}

/**
 * 설정 로드
 * 개발/테스트 환경에서는 API 키 검증을 건너뜀
 */
function loadConfig(): Config {
  const isTest = process.env.NODE_ENV === 'test';

  // 테스트 환경이 아닌 경우에만 필수 환경변수 검증
  if (!isTest) {
    validateEnv();
  }

  const outputDir = getEnv('OUTPUT_DIR');
  const downloadDir = getEnv('DOWNLOAD_DIR');
  const reportsDir = getEnv('REPORTS_DIR');

  return {
    version: '1.0.0',

    // API Keys (테스트 환경에서는 더미 값 사용)
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || 'test-key',
    openaiApiKey: process.env.OPENAI_API_KEY,

    // Directories
    outputDir,
    downloadDir,
    reportsDir,

    // Whisper settings
    whisperModel: getEnv('WHISPER_MODEL') as Config['whisperModel'],

    // Processing settings
    maxConcurrentDownloads: parseInt(getEnv('MAX_CONCURRENT_DOWNLOADS'), 10),

    // Logging
    logLevel: getEnv('LOG_LEVEL') as Config['logLevel'],
  };
}

/**
 * 디렉토리 초기화 (실제 파일 시스템 조작)
 * CLI나 앱 시작 시 명시적으로 호출
 */
export function initDirectories(cfg: Config): void {
  ensureDir(cfg.outputDir);
  ensureDir(cfg.downloadDir);
  ensureDir(cfg.reportsDir);
}

/** 전역 설정 객체 */
export const config: Config = loadConfig();

/**
 * 설정 확인 (디버깅용)
 * API 키는 마스킹 처리
 */
export function printConfig(): void {
  const masked = {
    ...config,
    anthropicApiKey: config.anthropicApiKey
      ? `${config.anthropicApiKey.slice(0, 10)}...`
      : 'NOT SET',
    openaiApiKey: config.openaiApiKey
      ? `${config.openaiApiKey.slice(0, 10)}...`
      : 'NOT SET',
  };
  console.log('Current configuration:', masked);
}

export default config;
