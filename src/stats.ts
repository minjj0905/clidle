export interface Stats {
  totalPlayed: number;
  totalWon: number;
  currentStreak: number;
  maxStreak: number;
  /** 시도 횟수(1~) -> 해당 횟수로 정답을 맞힌 횟수 */
  distribution: Record<number, number>;
  /** 마지막으로 결과가 기록된 날짜 시드 (중복 기록 방지용) */
  lastSeed: number | null;
}

export const EMPTY_STATS: Stats = {
  totalPlayed: 0,
  totalWon: 0,
  currentStreak: 0,
  maxStreak: 0,
  distribution: {},
  lastSeed: null,
};

/**
 * 게임 결과를 통계에 반영한다. 같은 날짜 시드로는 한 번만 반영된다.
 */
export function recordResult(stats: Stats, seed: number, won: boolean, attemptCount: number): Stats {
  if (stats.lastSeed === seed) return stats;

  const currentStreak = won ? stats.currentStreak + 1 : 0;
  const distribution = { ...stats.distribution };
  if (won) {
    distribution[attemptCount] = (distribution[attemptCount] ?? 0) + 1;
  }

  return {
    totalPlayed: stats.totalPlayed + 1,
    totalWon: stats.totalWon + (won ? 1 : 0),
    currentStreak,
    maxStreak: Math.max(stats.maxStreak, currentStreak),
    distribution,
    lastSeed: seed,
  };
}

/**
 * 정답률(%)을 계산한다. 도전 기록이 없으면 0을 반환한다.
 */
export function winRate(stats: Stats): number {
  if (stats.totalPlayed === 0) return 0;
  return Math.round((stats.totalWon / stats.totalPlayed) * 100);
}
