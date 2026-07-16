import { calculateHint, HINT } from './hint.js';
import { getDateSeed, getDailySlot, getDailyWord } from './seed.js';

const MAX_ATTEMPTS_BY_SLOT = { 5: 6, 6: 6, 7: 7 };

export const GAME_STATUS = {
  PLAYING: 'playing',
  WON: 'won',
  LOST: 'lost',
};

/**
 * 오늘의 단어 게임 상태를 관리한다.
 * @param {Object} options
 * @param {Object<number, Array>} options.words 슬롯 수(5|6|7)별 단어 목록
 * @param {Date} [options.date] 기준 날짜 (기본값: 현재 시각)
 */
export class Game {
  constructor({ words, date = new Date() }) {
    const seed = getDateSeed(date);
    const slot = getDailySlot(seed);
    const wordList = words[slot];
    if (!wordList || wordList.length === 0) {
      throw new Error(`슬롯 ${slot}에 해당하는 단어가 없습니다.`);
    }

    this.seed = seed;
    this.slot = slot;
    this.maxAttempts = MAX_ATTEMPTS_BY_SLOT[slot];
    this.answer = getDailyWord(wordList, seed);
    this.attempts = [];
    this.status = GAME_STATUS.PLAYING;
  }

  submitGuess(jamoArray) {
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

  get remainingAttempts() {
    return this.maxAttempts - this.attempts.length;
  }
}
