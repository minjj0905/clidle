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
 * 쌍자음(ㄲㄸㅃㅆㅉ)은 같은 자음 키를 두 번 눌러 만들지만, 슬롯 데이터상으로는
 * 하나로 합치지 않고 단자음 두 개(예: ㄱ, ㄱ)가 각각 슬롯을 차지한다.
 * 매핑되지 않은 키(한글 IME 완성형, Shift+자음 등)는 무시한다.
 */
export class RomanizationInput {
  maxLength: number;
  slots: string[];

  constructor(maxLength: number = Infinity) {
    this.maxLength = maxLength;
    this.slots = [];
  }

  pushKey(key: string): string[] {
    const jamo = keyToJamo(key);
    if (!jamo) return this.slots;
    if (this.slots.length >= this.maxLength) return this.slots;

    this.slots.push(jamo);
    return this.slots;
  }

  backspace(): string[] {
    this.slots.pop();
    return this.slots;
  }

  reset(): void {
    this.slots = [];
  }
}
