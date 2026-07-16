import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import type { Attempt, GameStatus } from './game.js';
import { EMPTY_STATS, type Stats } from './stats.js';

export interface SavedState {
  seed: number;
  attempts: Attempt[];
  status: GameStatus;
}

export const DEFAULT_STATE_FILE = join(homedir(), '.clidle', 'state.json');
export const DEFAULT_STATS_FILE = join(homedir(), '.clidle', 'stats.json');

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
