import { HINT, type Hint } from './hint.js';
import { CONSONANT_MAP, VOWEL_MAP } from './input.js';
import type { Attempt } from './game.js';

export const ALL_CONSONANTS = [...new Set(Object.values(CONSONANT_MAP))] as string[];
export const ALL_VOWELS = [...new Set(Object.values(VOWEL_MAP))] as string[];

const PRIORITY: Record<Hint, number> = {
  [HINT.ABSENT]: 0,
  [HINT.PRESENT]: 1,
  [HINT.EXACT]: 2,
};

/**
 * 지금까지의 모든 시도를 종합해 자모별 최종 확정 상태를 계산한다.
 * 같은 자모가 여러 번 다른 힌트로 나왔다면 더 확실한 쪽(정확 > 위치 오류 > 없음)을 채택한다.
 * 아직 한 번도 등장하지 않은 자모는 결과에 포함되지 않는다(=미입력).
 */
export function computeKeyStatus(attempts: Attempt[]): Map<string, Hint> {
  const status = new Map<string, Hint>();

  for (const attempt of attempts) {
    attempt.guess.forEach((jamo, i) => {
      const hint = attempt.hint[i] as Hint;
      const current = status.get(jamo);
      if (!current || PRIORITY[hint] > PRIORITY[current]) {
        status.set(jamo, hint);
      }
    });
  }

  return status;
}
