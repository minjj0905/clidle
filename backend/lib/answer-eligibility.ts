/**
 * 단어가 "오늘의 정답"으로 쓸 수 있는 상태인지 판정하는 규칙.
 * resolveDailyAnswer()가 정답 후보를 고르는 조건(slot 일치 + is_active + is_answer_pool)과
 * 같은 기준이어야 하므로, 한쪽만 바꾸지 말 것.
 */

export interface AnswerCandidate {
  display: string;
  slot: number;
  is_active: boolean;
  is_answer_pool: boolean;
}

/** 슬롯과 무관하게 정답 풀 자격이 있는지 (관리자 목록의 "정답 가능" 표시용). */
export function isAnswerEligible(word: Pick<AnswerCandidate, 'is_active' | 'is_answer_pool'>): boolean {
  return word.is_active && word.is_answer_pool;
}

/**
 * 특정 슬롯의 정답으로 지정할 수 있는지 검증한다.
 * 문제가 없으면 null, 있으면 관리자에게 보여줄 사유 문자열을 반환한다.
 */
export function validateAnswerWord(word: AnswerCandidate | null | undefined, slot: number): string | null {
  if (!word) return '없는 단어입니다.';
  if (word.slot !== slot) return `오늘은 슬롯 ${slot} 단어만 쓸 수 있습니다 ("${word.display}"는 슬롯 ${word.slot}).`;
  if (!word.is_active) return `"${word.display}"는 비활성 단어라 정답으로 쓸 수 없습니다.`;
  if (!word.is_answer_pool) return `"${word.display}"는 입력 전용 단어라 정답으로 쓸 수 없습니다.`;
  return null;
}
