const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/**
 * 날짜를 KST 기준 시드 숫자로 변환한다.
 * @param {Date} date
 * @returns {number} 예: 20260716
 */
export function getDateSeed(date = new Date()) {
  const kst = new Date(date.getTime() + KST_OFFSET_MS);
  const yyyy = kst.getUTCFullYear();
  const mm = kst.getUTCMonth() + 1;
  const dd = kst.getUTCDate();
  return yyyy * 10000 + mm * 100 + dd;
}

/**
 * 시드로 오늘의 슬롯 수(5~7)를 결정한다.
 * @param {number} seed
 * @returns {number}
 */
export function getDailySlot(seed) {
  return (seed % 3) + 5;
}

/**
 * 시드로 오늘의 단어를 결정한다.
 * @param {Array} words 슬롯에 해당하는 단어 목록
 * @param {number} seed
 * @returns {*}
 */
export function getDailyWord(words, seed) {
  return words[seed % words.length];
}
