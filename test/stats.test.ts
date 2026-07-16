import { describe, it, expect } from 'vitest';
import { EMPTY_STATS, recordResult, winRate } from '../src/stats.js';

describe('recordResult', () => {
  it('정답 시 승리/연속기록/분포를 갱신한다', () => {
    const updated = recordResult(EMPTY_STATS, 20260716, true, 3);

    expect(updated.totalPlayed).toBe(1);
    expect(updated.totalWon).toBe(1);
    expect(updated.currentStreak).toBe(1);
    expect(updated.maxStreak).toBe(1);
    expect(updated.distribution).toEqual({ 3: 1 });
    expect(updated.lastSeed).toBe(20260716);
  });

  it('실패 시 연속기록이 0으로 초기화된다', () => {
    const won = recordResult(EMPTY_STATS, 20260716, true, 3);
    const lost = recordResult(won, 20260717, false, 6);

    expect(lost.totalPlayed).toBe(2);
    expect(lost.totalWon).toBe(1);
    expect(lost.currentStreak).toBe(0);
    expect(lost.maxStreak).toBe(1);
  });

  it('같은 날짜 시드는 중복 기록되지 않는다', () => {
    const first = recordResult(EMPTY_STATS, 20260716, true, 3);
    const second = recordResult(first, 20260716, true, 3);

    expect(second).toEqual(first);
  });

  it('최다 연속 기록은 감소하지 않는다', () => {
    let stats = EMPTY_STATS;
    stats = recordResult(stats, 1, true, 3);
    stats = recordResult(stats, 2, true, 4);
    stats = recordResult(stats, 3, false, 6);

    expect(stats.currentStreak).toBe(0);
    expect(stats.maxStreak).toBe(2);
  });
});

describe('winRate', () => {
  it('도전 기록이 없으면 0을 반환한다', () => {
    expect(winRate(EMPTY_STATS)).toBe(0);
  });

  it('정답률을 반올림한 퍼센트로 반환한다', () => {
    const stats = recordResult(recordResult(EMPTY_STATS, 1, true, 3), 2, false, 6);
    expect(winRate(stats)).toBe(50);
  });
});
