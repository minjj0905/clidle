import { describe, it, expect } from 'vitest';
import { Game, GAME_STATUS, type SubmitGuessResult } from '../src/game.js';
import { getDateSeed, getDailySlot, getDailyWord } from '../src/seed.js';
import type { WordsBySlot } from '../src/types.js';

const words: WordsBySlot = {
  5: [{ display: '가을', jamo: ['ㄱ', 'ㅏ', 'ㅇ', 'ㅡ', 'ㄹ'], slot: 5 }],
  6: [{ display: '국밥', jamo: ['ㄱ', 'ㅜ', 'ㄱ', 'ㅂ', 'ㅏ', 'ㅂ'], slot: 6 }],
  7: [{ display: '고양이', jamo: ['ㄱ', 'ㅗ', 'ㅇ', 'ㅑ', 'ㅇ', 'ㅇ', 'ㅣ'], slot: 7 }],
};

describe('Game', () => {
  it('날짜 시드로 슬롯과 정답을 결정한다', () => {
    const date = new Date('2026-05-07T15:00:00Z'); // KST 2026-05-08
    const seed = getDateSeed(date);
    const expectedSlot = getDailySlot(seed);
    const expectedWord = getDailyWord(words[expectedSlot]!, seed);

    const game = new Game({ words, date });

    expect(game.slot).toBe(expectedSlot);
    expect(game.answer).toBe(expectedWord);
    expect(game.status).toBe(GAME_STATUS.PLAYING);
  });

  it('정답을 맞히면 WON 상태가 된다', () => {
    const date = new Date('2026-05-07T15:00:00Z');
    const game = new Game({ words, date });

    const { hint, status } = game.submitGuess(game.answer.jamo);

    expect(hint.every((h) => h === 'exact')).toBe(true);
    expect(status).toBe(GAME_STATUS.WON);
  });

  it('최대 시도 횟수를 다 쓰면 LOST 상태가 된다', () => {
    const date = new Date('2026-05-07T15:00:00Z');
    const game = new Game({ words, date });
    const wrongGuess = new Array(game.slot).fill('ㅁ');

    let last: SubmitGuessResult | undefined;
    for (let i = 0; i < game.maxAttempts; i++) {
      last = game.submitGuess(wrongGuess);
    }

    expect(last?.status).toBe(GAME_STATUS.LOST);
    expect(game.remainingAttempts).toBe(0);
  });

  it('게임 종료 후 추가 제출은 에러를 던진다', () => {
    const date = new Date('2026-05-07T15:00:00Z');
    const game = new Game({ words, date });
    game.submitGuess(game.answer.jamo);

    expect(() => game.submitGuess(game.answer.jamo)).toThrow();
  });

  it('슬롯 길이와 다른 입력은 에러를 던진다', () => {
    const date = new Date('2026-05-07T15:00:00Z');
    const game = new Game({ words, date });

    expect(() => game.submitGuess(['ㄱ'])).toThrow();
  });

  it('resume으로 이전 시도 기록과 상태를 복원한다', () => {
    const date = new Date('2026-05-07T15:00:00Z');
    const original = new Game({ words, date });
    original.submitGuess(new Array(original.slot).fill('ㅁ'));

    const resumed = new Game({
      words,
      date,
      resume: { attempts: original.attempts, status: original.status },
    });

    expect(resumed.attempts).toEqual(original.attempts);
    expect(resumed.status).toBe(GAME_STATUS.PLAYING);
    expect(resumed.remainingAttempts).toBe(resumed.maxAttempts - 1);
  });
});
