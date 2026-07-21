import { describe, it, expect, vi } from 'vitest';
import { Game, GAME_STATUS, type SubmitGuessResult } from '../src/game.js';
import { HINT } from '../src/hint.js';
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
    expect(game.status).toBe(GAME_STATUS.PLAYING);
    void expectedWord; // 정답 자체는 더 이상 공개 필드로 노출하지 않는다.
  });

  it('remote는 정답을 들고 있지 않고 guessResolver로 채점을 위임한다', async () => {
    const guessResolver = vi.fn().mockResolvedValue([HINT.EXACT, HINT.ABSENT]);
    const game = new Game({ remote: { seed: 20260716, slot: 2, maxAttempts: 6, guessResolver } });

    expect(game.seed).toBe(20260716);
    expect(game.slot).toBe(2);
    expect(game.maxAttempts).toBe(6);
    expect(game.status).toBe(GAME_STATUS.PLAYING);
    expect((game as unknown as { answer?: unknown }).answer).toBeUndefined();

    const result = await game.submitGuess(['ㄱ', 'ㅏ']);

    expect(guessResolver).toHaveBeenCalledWith(['ㄱ', 'ㅏ']);
    expect(result.hint).toEqual([HINT.EXACT, HINT.ABSENT]);
  });

  it('guessResolver가 reject하면(사전에 없는 단어 등) 시도가 기록되지 않는다', async () => {
    const guessResolver = vi.fn().mockRejectedValue(new Error('사전에 없는 단어예요.'));
    const game = new Game({ remote: { seed: 20260716, slot: 2, maxAttempts: 6, guessResolver } });

    await expect(game.submitGuess(['ㄱ', 'ㅏ'])).rejects.toThrow('사전에 없는 단어예요.');
    expect(game.attempts).toHaveLength(0);
    expect(game.status).toBe(GAME_STATUS.PLAYING);
  });

  it('words와 remote 둘 다 없으면 예외를 던진다', () => {
    expect(() => new Game({})).toThrow(/words 또는 remote/);
  });

  it('정답을 맞히면 WON 상태가 된다', async () => {
    const date = new Date('2026-05-07T15:00:00Z');
    const game = new Game({ words, date });
    const answer = getDailyWord(words[game.slot]!, game.seed);

    const { hint, status } = await game.submitGuess(answer.jamo);

    expect(hint.every((h) => h === 'exact')).toBe(true);
    expect(status).toBe(GAME_STATUS.WON);
  });

  it('최대 시도 횟수를 다 쓰면 LOST 상태가 된다', async () => {
    const date = new Date('2026-05-07T15:00:00Z');
    const game = new Game({ words, date });
    const wrongGuess = new Array(game.slot).fill('ㅁ');

    let last: SubmitGuessResult | undefined;
    for (let i = 0; i < game.maxAttempts; i++) {
      last = await game.submitGuess(wrongGuess);
    }

    expect(last?.status).toBe(GAME_STATUS.LOST);
    expect(game.remainingAttempts).toBe(0);
  });

  it('게임 종료 후 추가 제출은 에러를 던진다', async () => {
    const date = new Date('2026-05-07T15:00:00Z');
    const game = new Game({ words, date });
    const answer = getDailyWord(words[game.slot]!, game.seed);
    await game.submitGuess(answer.jamo);

    await expect(game.submitGuess(answer.jamo)).rejects.toThrow();
  });

  it('슬롯 길이와 다른 입력은 에러를 던진다', async () => {
    const date = new Date('2026-05-07T15:00:00Z');
    const game = new Game({ words, date });

    await expect(game.submitGuess(['ㄱ'])).rejects.toThrow();
  });

  it('resume으로 이전 시도 기록과 상태를 복원한다', async () => {
    const date = new Date('2026-05-07T15:00:00Z');
    const original = new Game({ words, date });
    await original.submitGuess(new Array(original.slot).fill('ㅁ'));

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
