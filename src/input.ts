export const CONSONANT_MAP = {
  r: 'ㄱ', s: 'ㄴ', e: 'ㄷ', f: 'ㄹ',
  a: 'ㅁ', q: 'ㅂ', t: 'ㅅ', d: 'ㅇ',
  w: 'ㅈ', c: 'ㅊ', z: 'ㅋ', x: 'ㅌ',
  v: 'ㅍ', g: 'ㅎ',
} as const;

export const VOWEL_MAP = {
  k: 'ㅏ', o: 'ㅐ', i: 'ㅑ', j: 'ㅓ',
  p: 'ㅔ', u: 'ㅕ', h: 'ㅗ', y: 'ㅛ',
  n: 'ㅜ', b: 'ㅠ', m: 'ㅡ', l: 'ㅣ',
} as const;

export const DOUBLE_CONSONANT_MAP: Record<string, string> = {
  'ㄱ': 'ㄲ', 'ㄷ': 'ㄸ', 'ㅂ': 'ㅃ', 'ㅅ': 'ㅆ', 'ㅈ': 'ㅉ',
};

type ConsonantKey = keyof typeof CONSONANT_MAP;
type VowelKey = keyof typeof VOWEL_MAP;

export function isConsonantKey(key: string): key is ConsonantKey {
  return Object.prototype.hasOwnProperty.call(CONSONANT_MAP, key);
}

export function isVowelKey(key: string): key is VowelKey {
  return Object.prototype.hasOwnProperty.call(VOWEL_MAP, key);
}

export function keyToJamo(key: string): string | null {
  if (isConsonantKey(key)) return CONSONANT_MAP[key];
  if (isVowelKey(key)) return VOWEL_MAP[key];
  return null;
}

/**
 * 두벌식 로마자 키 입력을 받아 자모 슬롯 배열을 누적하는 입력기.
 * 같은 자음 키를 연속 두 번 누르면 직전 슬롯을 쌍자음으로 교체한다.
 * 매핑되지 않은 키(한글 IME 완성형, Shift+자음 등)는 무시한다.
 */
export class RomanizationInput {
  maxLength: number;
  slots: string[];
  lastKey: string | null;

  constructor(maxLength: number = Infinity) {
    this.maxLength = maxLength;
    this.slots = [];
    this.lastKey = null;
  }

  pushKey(key: string): string[] {
    const jamo = keyToJamo(key);
    if (!jamo) return this.slots;

    if (isConsonantKey(key)) {
      const canDouble =
        this.lastKey === key &&
        this.slots.length > 0 &&
        this.slots[this.slots.length - 1] === CONSONANT_MAP[key] &&
        DOUBLE_CONSONANT_MAP[CONSONANT_MAP[key]];

      if (canDouble) {
        this.slots[this.slots.length - 1] = DOUBLE_CONSONANT_MAP[CONSONANT_MAP[key]] as string;
        // 세 번째 연속 입력은 새 자모로 취급한다.
        this.lastKey = null;
        return this.slots;
      }
    }

    if (this.slots.length >= this.maxLength) return this.slots;

    this.slots.push(jamo);
    this.lastKey = key;
    return this.slots;
  }

  backspace(): string[] {
    this.slots.pop();
    this.lastKey = null;
    return this.slots;
  }

  reset(): void {
    this.slots = [];
    this.lastKey = null;
  }
}
