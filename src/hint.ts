export const HINT = {
  EXACT: 'exact',
  PRESENT: 'present',
  ABSENT: 'absent',
} as const;

export type Hint = (typeof HINT)[keyof typeof HINT];

/**
 * 자모 배열 두 개를 인덱스 기준으로 비교해 힌트를 계산한다.
 * 1. 정확 일치(EXACT) 먼저 처리
 * 2. 나머지에서 포함 여부(PRESENT) 처리 (중복 자모는 남은 개수만큼만 매칭)
 * 3. 그 외 없음(ABSENT)
 * @returns guess와 같은 길이의 HINT 배열
 */
export function calculateHint(guess: string[], answer: string[]): Hint[] {
  if (guess.length !== answer.length) {
    throw new Error('guess와 answer의 길이가 일치해야 합니다.');
  }

  const length = answer.length;
  const result: Hint[] = new Array(length).fill(HINT.ABSENT);
  const remaining: (string | null)[] = [...answer];

  for (let i = 0; i < length; i++) {
    if (guess[i] === answer[i]) {
      result[i] = HINT.EXACT;
      remaining[i] = null;
    }
  }

  for (let i = 0; i < length; i++) {
    if (result[i] === HINT.EXACT) continue;
    const idx = remaining.indexOf(guess[i] as string);
    if (idx !== -1) {
      result[i] = HINT.PRESENT;
      remaining[idx] = null;
    }
  }

  return result;
}
