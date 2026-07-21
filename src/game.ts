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
  /** 로컬 단어 DB로부터 오늘의 정답을 직접 계산한다 (테스트/오프라인용). remote와 동시 사용 불가. */
  words?: WordsBySlot;
  date?: Date;
  /** 서버(/api/today)가 이미 계산해 내려준 오늘의 정답을 그대로 사용한다. */
  remote?: { seed: number; slot: number; answer: WordEntry; maxAttempts: number };
  /** 이전 세션에서 저장된 진행 상황을 복원한다 (같은 날짜 시드일 때만 유효). */
  resume?: { attempts: Attempt[]; status: GameStatus };
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

  constructor({ words, date = new Date(), remote, resume }: GameOptions) {
    if (remote) {
      this.seed = remote.seed;
      this.slot = remote.slot;
      this.maxAttempts = remote.maxAttempts;
      this.answer = remote.answer;
    } else {
      if (!words) throw new Error('words 또는 remote 중 하나는 반드시 지정해야 합니다.');
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
    }
    this.attempts = resume?.attempts ?? [];
    this.status = resume?.status ?? GAME_STATUS.PLAYING;
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
