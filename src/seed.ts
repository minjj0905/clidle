const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/**
 * 날짜를 KST 기준 시드 숫자로 변환한다.
 * @returns 예: 20260716
 */
export function getDateSeed(date: Date = new Date()): number {
  const kst = new Date(date.getTime() + KST_OFFSET_MS);
  const yyyy = kst.getUTCFullYear();
  const mm = kst.getUTCMonth() + 1;
  const dd = kst.getUTCDate();
  return yyyy * 10000 + mm * 100 + dd;
}

/**
 * 시드로 오늘의 슬롯 수(5~7)를 결정한다.
 */
export function getDailySlot(seed: number): number {
  return (seed % 3) + 5;
}

/**
 * 시드로 오늘의 단어를 결정한다.
 * @param words 슬롯에 해당하는 단어 목록
 */
export function getDailyWord<T>(words: T[], seed: number): T {
  return words[seed % words.length] as T;
}

/**
 * 시드 숫자를 화면 표시용 날짜 문자열로 변환한다.
 * @example formatSeedDate(20260716) // "2026-07-16"
 */
export function formatSeedDate(seed: number): string {
  const yyyy = Math.floor(seed / 10000);
  const mm = Math.floor((seed % 10000) / 100);
  const dd = seed % 100;
  return `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
}

/**
 * 다음 KST 자정(=다음 문제 출제 시각)까지 남은 밀리초를 반환한다.
 */
export function getMsUntilNextSeed(date: Date = new Date()): number {
  const kst = new Date(date.getTime() + KST_OFFSET_MS);
  const nextMidnightKst = Date.UTC(
    kst.getUTCFullYear(),
    kst.getUTCMonth(),
    kst.getUTCDate() + 1,
  );
  return nextMidnightKst - kst.getTime();
}
