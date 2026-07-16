import { describe, it, expect } from 'vitest';
import { calculateHint, HINT } from '../src/hint.js';

describe('calculateHint', () => {
  it('완전히 일치하면 모두 EXACT를 반환한다', () => {
    const answer = ['ㄱ', 'ㅏ', 'ㄴ', 'ㅏ'];
    expect(calculateHint(answer, answer)).toEqual([
      HINT.EXACT, HINT.EXACT, HINT.EXACT, HINT.EXACT,
    ]);
  });

  it('없는 자모는 ABSENT를 반환한다', () => {
    const guess = ['ㅁ', 'ㅁ', 'ㅁ', 'ㅁ'];
    const answer = ['ㄱ', 'ㅏ', 'ㄴ', 'ㅏ'];
    expect(calculateHint(guess, answer)).toEqual([
      HINT.ABSENT, HINT.ABSENT, HINT.ABSENT, HINT.ABSENT,
    ]);
  });

  it('위치가 다르지만 포함된 자모는 PRESENT를 반환한다', () => {
    // answer: ㄱㅏㄴㅏ, guess: ㄴㅏㄱㅏ → 위치 뒤바뀐 ㄱ,ㄴ은 PRESENT, ㅏ는 둘 다 EXACT
    const answer = ['ㄱ', 'ㅏ', 'ㄴ', 'ㅏ'];
    const guess = ['ㄴ', 'ㅏ', 'ㄱ', 'ㅏ'];
    expect(calculateHint(guess, answer)).toEqual([
      HINT.PRESENT, HINT.EXACT, HINT.PRESENT, HINT.EXACT,
    ]);
  });

  it('중복 자모는 answer에 남은 개수만큼만 PRESENT로 처리한다', () => {
    // answer에는 ㄱ이 1개뿐인데 guess에는 2개 → 하나만 PRESENT, 나머지 ABSENT
    const answer = ['ㄱ', 'ㅏ', 'ㄴ', 'ㅏ'];
    const guess = ['ㄱ', 'ㄱ', 'ㅁ', 'ㅁ'];
    const result = calculateHint(guess, answer);
    expect(result[0]).toBe(HINT.EXACT); // 위치 일치
    expect(result[1]).toBe(HINT.ABSENT); // 이미 소진된 ㄱ
    expect(result[2]).toBe(HINT.ABSENT);
    expect(result[3]).toBe(HINT.ABSENT);
  });

  it('EXACT로 먼저 소진된 자모는 PRESENT 매칭에서 제외한다', () => {
    // answer: ㄱㄱㅏㅏ, guess: ㄱㅁㄱㅏ
    // index0 ㄱ=ㄱ EXACT, index2 ㄱ은 answer[1]의 남은 ㄱ과 매칭 PRESENT
    const answer = ['ㄱ', 'ㄱ', 'ㅏ', 'ㅏ'];
    const guess = ['ㄱ', 'ㅁ', 'ㄱ', 'ㅏ'];
    expect(calculateHint(guess, answer)).toEqual([
      HINT.EXACT, HINT.ABSENT, HINT.PRESENT, HINT.EXACT,
    ]);
  });

  it('길이가 다르면 에러를 던진다', () => {
    expect(() => calculateHint(['ㄱ'], ['ㄱ', 'ㅏ'])).toThrow();
  });
});
