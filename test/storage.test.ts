import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadSavedState, saveState, loadStats, saveStats, getOrCreateDeviceId, loadConfig, saveConfig } from '../src/storage.js';
import { HINT } from '../src/hint.js';
import { GAME_STATUS } from '../src/game.js';
import { EMPTY_STATS, recordResult } from '../src/stats.js';

function tempFilePath(name = 'state.json'): string {
  const dir = mkdtempSync(join(tmpdir(), 'clidle-test-'));
  return join(dir, name);
}

describe('storage', () => {
  const createdFiles: string[] = [];

  afterEach(() => {
    for (const file of createdFiles.splice(0)) {
      rmSync(join(file, '..'), { recursive: true, force: true });
    }
  });

  it('저장한 상태를 같은 시드로 다시 불러온다', () => {
    const filePath = tempFilePath();
    createdFiles.push(filePath);

    const state = {
      seed: 20260716,
      attempts: [{ guess: ['ㄱ', 'ㅏ'], hint: [HINT.EXACT, HINT.ABSENT] }],
      status: GAME_STATUS.PLAYING,
    };
    saveState(state, filePath);

    expect(loadSavedState(20260716, filePath)).toEqual(state);
  });

  it('시드가 다르면(날짜가 바뀌면) null을 반환한다', () => {
    const filePath = tempFilePath();
    createdFiles.push(filePath);

    saveState({ seed: 20260716, attempts: [], status: GAME_STATUS.PLAYING }, filePath);

    expect(loadSavedState(20260717, filePath)).toBeNull();
  });

  it('파일이 없으면 null을 반환한다', () => {
    const filePath = tempFilePath();
    expect(loadSavedState(20260716, filePath)).toBeNull();
  });
});

describe('stats storage', () => {
  const createdFiles: string[] = [];

  afterEach(() => {
    for (const file of createdFiles.splice(0)) {
      rmSync(join(file, '..'), { recursive: true, force: true });
    }
  });

  it('저장한 통계를 그대로 다시 불러온다', () => {
    const filePath = tempFilePath('stats.json');
    createdFiles.push(filePath);

    const stats = recordResult(EMPTY_STATS, 20260716, true, 3);
    saveStats(stats, filePath);

    expect(loadStats(filePath)).toEqual(stats);
  });

  it('파일이 없으면 빈 통계를 반환한다', () => {
    const filePath = tempFilePath('stats.json');
    expect(loadStats(filePath)).toEqual(EMPTY_STATS);
  });
});

describe('device id storage', () => {
  const createdFiles: string[] = [];

  afterEach(() => {
    for (const file of createdFiles.splice(0)) {
      rmSync(join(file, '..'), { recursive: true, force: true });
    }
  });

  it('파일이 없으면 새 UUID를 생성해 저장한다', () => {
    const filePath = tempFilePath('device.json');
    createdFiles.push(filePath);

    const deviceId = getOrCreateDeviceId(filePath);
    expect(deviceId).toMatch(/^[0-9a-f-]{36}$/);
    expect(getOrCreateDeviceId(filePath)).toBe(deviceId);
  });
});

describe('config storage', () => {
  const createdFiles: string[] = [];

  afterEach(() => {
    for (const file of createdFiles.splice(0)) {
      rmSync(join(file, '..'), { recursive: true, force: true });
    }
  });

  it('파일이 없으면 기본값(알림 켜짐)을 반환한다', () => {
    const filePath = tempFilePath('config.json');
    expect(loadConfig(filePath)).toEqual({ nudgeEnabled: true });
  });

  it('저장한 설정을 그대로 다시 불러온다', () => {
    const filePath = tempFilePath('config.json');
    createdFiles.push(filePath);

    saveConfig({ nudgeEnabled: false }, filePath);

    expect(loadConfig(filePath)).toEqual({ nudgeEnabled: false });
  });
});
