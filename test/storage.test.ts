import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadSavedState, saveState } from '../src/storage.js';
import { HINT } from '../src/hint.js';
import { GAME_STATUS } from '../src/game.js';

function tempFilePath(): string {
  const dir = mkdtempSync(join(tmpdir(), 'clidle-test-'));
  return join(dir, 'state.json');
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
