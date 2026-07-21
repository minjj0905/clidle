// CLI(src/seed.ts)와 동일한 로직. 두 곳에서 같은 결과가 나와야 하므로 수정 시 함께 반영할 것.
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

export function getDateSeed(date: Date = new Date()): number {
  const kst = new Date(date.getTime() + KST_OFFSET_MS);
  const yyyy = kst.getUTCFullYear();
  const mm = kst.getUTCMonth() + 1;
  const dd = kst.getUTCDate();
  return yyyy * 10000 + mm * 100 + dd;
}

export function getDailySlot(seed: number): number {
  return (seed % 3) + 5;
}

export function getDailyWord<T>(words: T[], seed: number): T {
  return words[seed % words.length] as T;
}
