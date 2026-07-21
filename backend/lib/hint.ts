// CLI(src/hint.ts)와 동일한 로직. 두 곳에서 같은 결과가 나와야 하므로 수정 시 함께 반영할 것.
export const HINT = {
  EXACT: 'exact',
  PRESENT: 'present',
  ABSENT: 'absent',
} as const;

export type Hint = (typeof HINT)[keyof typeof HINT];

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
