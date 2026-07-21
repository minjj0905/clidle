import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { CONSONANT_MAP, VOWEL_MAP } from '../src/input.ts';
import type { WordEntry } from '../src/types.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAW_PATH = path.join(__dirname, 'raw/words-raw.txt');
const DATA_DIR = path.join(__dirname, '../src/data');

// 초성/중성/종성 유니코드 순서 (완성형 한글 조합 규칙)
const CHOSEONG = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
const JUNGSEONG = ['ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ', 'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ'];
const JONGSEONG = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];

// CLIDLE 입력 규칙(두벌식 단일 키 입력)에 맞춰 겹모음/겹받침을 게임에서 허용하는
// 기본 자모(단자음 14 + 쌍자음 5 + 단모음 12) 조합으로 풀어 쓴다.
const VOWEL_DECOMPOSE: Record<string, string[]> = {
  'ㅘ': ['ㅗ', 'ㅏ'], 'ㅙ': ['ㅗ', 'ㅐ'], 'ㅚ': ['ㅗ', 'ㅣ'],
  'ㅝ': ['ㅜ', 'ㅓ'], 'ㅞ': ['ㅜ', 'ㅔ'], 'ㅟ': ['ㅜ', 'ㅣ'],
  'ㅢ': ['ㅡ', 'ㅣ'],
};
// ㅒ, ㅖ는 두벌식 키 조합(VOWEL_MAP)에 대응 키가 없어 타이핑 불가 → 해당 단어는 제외
const UNSUPPORTED_VOWELS = new Set(['ㅒ', 'ㅖ']);

const JONGSEONG_DECOMPOSE: Record<string, string[]> = {
  'ㄳ': ['ㄱ', 'ㅅ'], 'ㄵ': ['ㄴ', 'ㅈ'], 'ㄶ': ['ㄴ', 'ㅎ'],
  'ㄺ': ['ㄹ', 'ㄱ'], 'ㄻ': ['ㄹ', 'ㅁ'], 'ㄼ': ['ㄹ', 'ㅂ'],
  'ㄽ': ['ㄹ', 'ㅅ'], 'ㄾ': ['ㄹ', 'ㅌ'], 'ㄿ': ['ㄹ', 'ㅍ'],
  'ㅀ': ['ㄹ', 'ㅎ'], 'ㅄ': ['ㅂ', 'ㅅ'],
};

const ALLOWED_JAMO = new Set([...Object.values(CONSONANT_MAP), ...Object.values(VOWEL_MAP), 'ㄲ', 'ㄸ', 'ㅃ', 'ㅆ', 'ㅉ']);

// 욕설/비속어/성적 표현 및 게임에 부적합한 민감 소재(자살, 살인, 마약 등) 어근 차단
const BLOCKED_ROOTS = [
  '씨발', '시발', '개새', '병신', '좆', '섹스', '성기', '자지', '보지', '걸레', '쌍놈', '쌍년',
  '지랄', '미친놈', '미친년', '창녀', '강간', '폭행', '살인', '자살', '마약', '히로뽕',
  '변태', '성폭행', '성추행', '매춘', '윤간', '근친', '자위', '포르노', '음란', '시체', '살해',
  '테러', '폭탄', '고문', '학살', '자해',
];

function isBlocked(word: string): boolean {
  return BLOCKED_ROOTS.some((root) => word.includes(root));
}

const HANGUL_BASE = 0xac00;
const HANGUL_LAST = 0xd7a3;

/** 완성형 한글 한 글자를 CLIDLE 입력 규칙 기준의 평면 자모 배열로 분해한다. 분해 불가 시 null. */
function decomposeSyllable(char: string): string[] | null {
  const code = char.charCodeAt(0);
  if (code < HANGUL_BASE || code > HANGUL_LAST) return null;

  const offset = code - HANGUL_BASE;
  const cho = CHOSEONG[Math.floor(offset / (21 * 28))];
  const jung = JUNGSEONG[Math.floor((offset % (21 * 28)) / 28)];
  const jong = JONGSEONG[offset % 28];

  if (UNSUPPORTED_VOWELS.has(jung)) return null;

  const jamo = [cho, ...(VOWEL_DECOMPOSE[jung] ?? [jung])];
  if (jong) jamo.push(...(JONGSEONG_DECOMPOSE[jong] ?? [jong]));

  return jamo.every((j) => ALLOWED_JAMO.has(j)) ? jamo : null;
}

function decomposeWord(word: string): string[] | null {
  const jamo: string[] = [];
  for (const char of word) {
    const decomposed = decomposeSyllable(char);
    if (!decomposed) return null;
    jamo.push(...decomposed);
  }
  return jamo;
}

function loadExisting(slot: number): WordEntry[] {
  try {
    return JSON.parse(readFileSync(path.join(DATA_DIR, `words_${slot}.json`), 'utf-8'));
  } catch {
    return [];
  }
}

function main() {
  const rawWords = readFileSync(RAW_PATH, 'utf-8')
    .split('\n')
    .map((w) => w.trim())
    .filter(Boolean);

  const bySlot: Record<number, Map<string, WordEntry>> = { 5: new Map(), 6: new Map(), 7: new Map() };

  for (const slot of [5, 6, 7]) {
    for (const entry of loadExisting(slot)) bySlot[slot].set(entry.display, entry);
  }

  let skipped = 0;
  for (const word of rawWords) {
    if (isBlocked(word)) {
      skipped++;
      continue;
    }
    const jamo = decomposeWord(word);
    if (!jamo || jamo.length < 5 || jamo.length > 7) {
      skipped++;
      continue;
    }
    const slot = jamo.length;
    bySlot[slot].set(word, { display: word, jamo, slot });
  }

  for (const slot of [5, 6, 7]) {
    const entries = [...bySlot[slot].values()].sort((a, b) => a.display.localeCompare(b.display, 'ko'));
    writeFileSync(path.join(DATA_DIR, `words_${slot}.json`), JSON.stringify(entries, null, 2) + '\n');
    console.log(`words_${slot}.json: ${entries.length}개`);
  }
  console.log(`제외됨(자모 5~7 범위 밖 또는 미지원 자모): ${skipped}개`);
}

main();
