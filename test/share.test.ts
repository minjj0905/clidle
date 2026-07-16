import { describe, it, expect, vi } from 'vitest';
import { HINT } from '../src/hint.js';
import type { Attempt } from '../src/game.js';

vi.mock('node:child_process', () => ({
  execFileSync: vi.fn(() => {
    throw new Error('command not found');
  }),
}));

const { buildShareText, copyToClipboard } = await import('../src/share.js');

describe('buildShareText', () => {
  it('정답인 경우 시도 횟수/6 형태의 헤더와 이모지 그리드를 만든다', () => {
    const attempts: Attempt[] = [
      { guess: ['ㄱ', 'ㅏ'], hint: [HINT.PRESENT, HINT.EXACT] },
      { guess: ['ㄱ', 'ㅏ'], hint: [HINT.EXACT, HINT.EXACT] },
    ];

    const text = buildShareText(20260716, attempts, 6, true);

    expect(text).toBe('CLIDLE 20260716 2/6\n\n🟪🟦\n🟦🟦');
  });

  it('실패한 경우 헤더에 X를 표시한다', () => {
    const attempts: Attempt[] = [{ guess: ['ㄱ'], hint: [HINT.ABSENT] }];
    const text = buildShareText(20260716, attempts, 6, false);

    expect(text.startsWith('CLIDLE 20260716 X/6')).toBe(true);
  });
});

describe('copyToClipboard', () => {
  it('클립보드 명령이 실패하면 false를 반환한다', () => {
    expect(copyToClipboard('hello')).toBe(false);
  });
});
