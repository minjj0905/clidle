import { describe, it, expect } from 'vitest';
import { getDateSeed, getDailySlot, getDailyWord, formatSeedDate, getMsUntilNextSeed } from '../src/seed.js';

describe('getDateSeed', () => {
  it('KST 기준 날짜를 yyyymmdd 숫자로 변환한다', () => {
    // UTC 2026-05-07 15:00 == KST 2026-05-08 00:00
    const date = new Date('2026-05-07T15:00:00Z');
    expect(getDateSeed(date)).toBe(20260508);
  });

  it('자정 경계에서도 KST 기준으로 계산한다', () => {
    // UTC 2026-05-07 14:59 == KST 2026-05-07 23:59
    const date = new Date('2026-05-07T14:59:00Z');
    expect(getDateSeed(date)).toBe(20260507);
  });
});

describe('getDailySlot', () => {
  it('시드를 3으로 나눈 나머지 + 5를 반환한다', () => {
    expect(getDailySlot(20260508)).toBe((20260508 % 3) + 5);
  });

  it('5~7 범위 안에서만 값을 반환한다', () => {
    for (let seed = 20260101; seed < 20260110; seed++) {
      const slot = getDailySlot(seed);
      expect(slot).toBeGreaterThanOrEqual(5);
      expect(slot).toBeLessThanOrEqual(7);
    }
  });
});

describe('getDailyWord', () => {
  it('시드를 단어 목록 길이로 나눈 나머지 인덱스의 단어를 반환한다', () => {
    const words = ['a', 'b', 'c'];
    expect(getDailyWord(words, 20260508)).toBe(words[20260508 % words.length]);
  });
});

describe('formatSeedDate', () => {
  it('시드 숫자를 yyyy-mm-dd 문자열로 변환한다', () => {
    expect(formatSeedDate(20260716)).toBe('2026-07-16');
  });

  it('한 자리 월/일도 0으로 패딩한다', () => {
    expect(formatSeedDate(20260105)).toBe('2026-01-05');
  });
});

describe('getMsUntilNextSeed', () => {
  it('KST 자정 직전에는 1분 미만이 남는다', () => {
    // UTC 2026-05-07 14:59:30 == KST 2026-05-07 23:59:30
    const date = new Date('2026-05-07T14:59:30Z');
    const ms = getMsUntilNextSeed(date);
    expect(ms).toBeGreaterThan(0);
    expect(ms).toBeLessThanOrEqual(30_000);
  });

  it('KST 자정 직후에는 거의 24시간이 남는다', () => {
    // UTC 2026-05-07 15:00:00 == KST 2026-05-08 00:00:00
    const date = new Date('2026-05-07T15:00:00Z');
    const ms = getMsUntilNextSeed(date);
    expect(ms).toBe(24 * 60 * 60 * 1000);
  });
});
