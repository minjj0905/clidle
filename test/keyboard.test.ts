import { describe, it, expect } from 'vitest';
import { computeKeyStatus, ALL_CONSONANTS, ALL_VOWELS } from '../src/keyboard.js';
import { HINT } from '../src/hint.js';

describe('computeKeyStatus', () => {
  it('시도가 없으면 빈 상태를 반환한다', () => {
    expect(computeKeyStatus([]).size).toBe(0);
  });

  it('각 자모의 힌트를 기록한다', () => {
    const status = computeKeyStatus([
      { guess: ['ㄱ', 'ㅏ'], hint: [HINT.EXACT, HINT.ABSENT] },
    ]);
    expect(status.get('ㄱ')).toBe(HINT.EXACT);
    expect(status.get('ㅏ')).toBe(HINT.ABSENT);
    expect(status.has('ㄴ')).toBe(false);
  });

  it('같은 자모가 여러 번 나오면 더 확실한 힌트(정확 > 위치오류 > 없음)를 채택한다', () => {
    const status = computeKeyStatus([
      { guess: ['ㄱ', 'ㅏ'], hint: [HINT.ABSENT, HINT.ABSENT] },
      { guess: ['ㄱ', 'ㄴ'], hint: [HINT.PRESENT, HINT.ABSENT] },
      { guess: ['ㄱ', 'ㄷ'], hint: [HINT.EXACT, HINT.ABSENT] },
    ]);
    expect(status.get('ㄱ')).toBe(HINT.EXACT);
  });

  it('더 낮은 확실성의 힌트가 나중에 와도 기존 값을 덮어쓰지 않는다', () => {
    const status = computeKeyStatus([
      { guess: ['ㄱ'], hint: [HINT.EXACT] },
      { guess: ['ㄱ'], hint: [HINT.ABSENT] },
    ]);
    expect(status.get('ㄱ')).toBe(HINT.EXACT);
  });
});

describe('키 목록', () => {
  it('자음 14개, 모음 10개를 포함한다', () => {
    expect(ALL_CONSONANTS).toHaveLength(14);
    expect(ALL_VOWELS).toHaveLength(10);
  });
});
