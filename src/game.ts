import { calculateHint, HINT, type Hint } from './hint.js';
import { getDateSeed, getDailySlot, getDailyWord } from './seed.js';
import type { WordEntry, WordsBySlot } from './types.js';

const MAX_ATTEMPTS_BY_SLOT: Record<number, number> = { 5: 6, 6: 6, 7: 7 };

export const GAME_STATUS = {
  PLAYING: 'playing',
  WON: 'won',
  LOST: 'lost',
} as const;

export type GameStatus = (typeof GAME_STATUS)[keyof typeof GAME_STATUS];

export interface Attempt {
  guess: string[];
  hint: Hint[];
}

export interface GameOptions {
  words: WordsBySlot;
  date?: Date;
}

export interface SubmitGuessResult {
  hint: Hint[];
  status: GameStatus;
}

/**
 * 오늘의 단어 게임 상태를 관리한다.
 */
export class Game {
  seed: number;
  slot: number;
  maxAttempts: number;
  answer: WordEntry;
  attempts: Attempt[];
  status: GameStatus;

  constructor({ words, date = new Date() }: GameOptions) {
    const seed = getDateSeed(date);
    const slot = getDailySlot(seed);
    const wordList = words[slot];
    if (!wordList || wordList.length === 0) {
      throw new Error(`슬롯 ${slot}에 해당하는 단어가 없습니다.`);
    }

    this.seed = seed;
    this.slot = slot;
    this.maxAttempts = MAX_ATTEMPTS_BY_SLOT[slot] as number;
    this.answer = getDailyWord(wordList, seed);
    this.attempts = [];
    this.status = GAME_STATUS.PLAYING;
  }

  submitGuess(jamoArray: string[]): SubmitGuessResult {
    if (this.status !== GAME_STATUS.PLAYING) {
      throw new Error('게임이 이미 종료되었습니다.');
    }
    if (jamoArray.length !== this.slot) {
      throw new Error(`자모 ${this.slot}개를 입력해야 합니다.`);
    }

    const hint = calculateHint(jamoArray, this.answer.jamo);
    this.attempts.push({ guess: jamoArray, hint });

    if (hint.every((h) => h === HINT.EXACT)) {
      this.status = GAME_STATUS.WON;
    } else if (this.attempts.length >= this.maxAttempts) {
      this.status = GAME_STATUS.LOST;
    }

    return { hint, status: this.status };
  }

  get remainingAttempts(): number {
    return this.maxAttempts - this.attempts.length;
  }
}
