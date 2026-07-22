import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import type { Attempt, GameStatus } from './game.js';
import { EMPTY_STATS, type Stats } from './stats.js';

export interface SavedState {
  seed: number;
  attempts: Attempt[];
  status: GameStatus;
}

export interface Config {
  nudgeEnabled: boolean;
}

export const DEFAULT_STATE_FILE = join(homedir(), '.clidle', 'state.json');
export const DEFAULT_STATS_FILE = join(homedir(), '.clidle', 'stats.json');
export const DEFAULT_DEVICE_FILE = join(homedir(), '.clidle', 'device.json');
export const DEFAULT_CONFIG_FILE = join(homedir(), '.clidle', 'config.json');

const DEFAULT_CONFIG: Config = { nudgeEnabled: true };

/**
 * 저장된 진행 상황을 불러온다. 시드가 다르거나(=날짜가 바뀜) 파일이 없거나
 * 손상된 경우 null을 반환해 새 게임으로 시작하게 한다.
 */
export function loadSavedState(seed: number, filePath: string = DEFAULT_STATE_FILE): SavedState | null {
  try {
    if (!existsSync(filePath)) return null;
    const raw = readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw) as SavedState;
    if (parsed.seed !== seed) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * 진행 상황을 저장한다. 저장 실패는 게임 진행에 영향을 주지 않는다.
 */
export function saveState(state: SavedState, filePath: string = DEFAULT_STATE_FILE): void {
  try {
    const dir = dirname(filePath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(filePath, JSON.stringify(state), 'utf-8');
  } catch {
    // 저장 실패는 무시한다.
  }
}

/**
 * 누적 통계를 불러온다. 파일이 없거나 손상된 경우 빈 통계를 반환한다.
 */
export function loadStats(filePath: string = DEFAULT_STATS_FILE): Stats {
  try {
    if (!existsSync(filePath)) return EMPTY_STATS;
    const raw = readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as Stats;
  } catch {
    return EMPTY_STATS;
  }
}

/**
 * 누적 통계를 저장한다. 저장 실패는 게임 진행에 영향을 주지 않는다.
 */
export function saveStats(stats: Stats, filePath: string = DEFAULT_STATS_FILE): void {
  try {
    const dir = dirname(filePath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(filePath, JSON.stringify(stats), 'utf-8');
  } catch {
    // 저장 실패는 무시한다.
  }
}

/**
 * 서버 통계 집계용 기기 식별자를 반환한다. 없으면 새로 생성해 저장한다.
 * 저장에 실패해도(읽기 전용 파일시스템 등) 매 실행마다 새 UUID를 반환할 뿐 게임에는 영향 없다.
 */
export function getOrCreateDeviceId(filePath: string = DEFAULT_DEVICE_FILE): string {
  try {
    if (existsSync(filePath)) {
      const parsed = JSON.parse(readFileSync(filePath, 'utf-8')) as { deviceId: string };
      if (parsed.deviceId) return parsed.deviceId;
    }
  } catch {
    // 손상된 경우 새로 생성한다.
  }

  const deviceId = randomUUID();
  try {
    const dir = dirname(filePath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(filePath, JSON.stringify({ deviceId }), 'utf-8');
  } catch {
    // 저장 실패는 무시한다.
  }
  return deviceId;
}

/**
 * 사용자 설정을 불러온다. 파일이 없거나 손상된 경우 기본값을 반환한다.
 */
export function loadConfig(filePath: string = DEFAULT_CONFIG_FILE): Config {
  try {
    if (!existsSync(filePath)) return DEFAULT_CONFIG;
    const raw = readFileSync(filePath, 'utf-8');
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_CONFIG;
  }
}

/**
 * 사용자 설정을 저장한다. 저장 실패는 게임 진행에 영향을 주지 않는다.
 */
export function saveConfig(config: Config, filePath: string = DEFAULT_CONFIG_FILE): void {
  try {
    const dir = dirname(filePath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(filePath, JSON.stringify(config), 'utf-8');
  } catch {
    // 저장 실패는 무시한다.
  }
}
