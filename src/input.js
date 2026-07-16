export const CONSONANT_MAP = {
  r: 'ㄱ', s: 'ㄴ', e: 'ㄷ', f: 'ㄹ',
  a: 'ㅁ', q: 'ㅂ', t: 'ㅅ', d: 'ㅇ',
  w: 'ㅈ', c: 'ㅊ', z: 'ㅋ', x: 'ㅌ',
  v: 'ㅍ', g: 'ㅎ',
};

export const VOWEL_MAP = {
  k: 'ㅏ', o: 'ㅐ', i: 'ㅑ', j: 'ㅓ',
  p: 'ㅔ', u: 'ㅕ', h: 'ㅗ', y: 'ㅛ',
  n: 'ㅜ', b: 'ㅠ', m: 'ㅡ', l: 'ㅣ',
};

export const DOUBLE_CONSONANT_MAP = {
  'ㄱ': 'ㄲ', 'ㄷ': 'ㄸ', 'ㅂ': 'ㅃ', 'ㅅ': 'ㅆ', 'ㅈ': 'ㅉ',
};

export function isConsonantKey(key) {
  return Object.prototype.hasOwnProperty.call(CONSONANT_MAP, key);
}

export function isVowelKey(key) {
  return Object.prototype.hasOwnProperty.call(VOWEL_MAP, key);
}

export function keyToJamo(key) {
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
  constructor(maxLength = Infinity) {
    this.maxLength = maxLength;
    this.slots = [];
    this.lastKey = null;
  }

  pushKey(key) {
    const jamo = keyToJamo(key);
    if (!jamo) return this.slots;

    const canDouble =
      isConsonantKey(key) &&
      this.lastKey === key &&
      this.slots.length > 0 &&
      this.slots[this.slots.length - 1] === CONSONANT_MAP[key] &&
      DOUBLE_CONSONANT_MAP[CONSONANT_MAP[key]];

    if (canDouble) {
      this.slots[this.slots.length - 1] = DOUBLE_CONSONANT_MAP[CONSONANT_MAP[key]];
      // 세 번째 연속 입력은 새 자모로 취급한다.
      this.lastKey = null;
      return this.slots;
    }

    if (this.slots.length >= this.maxLength) return this.slots;

    this.slots.push(jamo);
    this.lastKey = key;
    return this.slots;
  }

  backspace() {
    this.slots.pop();
    this.lastKey = null;
    return this.slots;
  }

  reset() {
    this.slots = [];
    this.lastKey = null;
  }
}
