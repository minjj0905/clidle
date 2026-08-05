import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { decomposeWord, isBlocked } from './jamo.ts';
import type { WordEntry } from '../src/types.ts';

/**
 * 단어 풀을 명사 중심으로 재구축한다. 두 갈래를 모두 만든다.
 *
 *  - 정답 풀(raw/words_5/6/7.json) — 오늘의 정답으로 출제되는 보편적 명사
 *  - 입력 풀(raw/input-pool.txt)        — 정답으로는 안 나오지만 제출은 허용되는 나머지 명사
 *
 * 소스
 *  - raw/common-nouns.txt : 국립국어원 한국어 학습용 어휘 목록의 명사 (일상성 보장)
 *  - raw/noun-freq.tsv    : 현대 국어 사용 빈도 조사 2의 명사별 빈도 (실사용 보편성 보장)
 *  - raw/curated-nouns.txt: 게임용으로 직접 고른 구체 명사 (음식/동물/사물 등)
 *  - raw/all-nouns.txt, raw/nouns-raw.txt : 표준국어대사전·형태소 사전 명사 (입력 풀 확장용)
 *  - 기존 words_*.json    : 위 소스로 명사 확인된 것만 유지
 *
 * 품사 판정은 raw/pos-map.tsv(빈도 조사의 품사 태그)를 기준으로 하며,
 * 동사·형용사·부사·관형사 등 비명사는 정답 풀과 입력 풀 양쪽 모두에서 제외한다.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAW_DIR = path.join(__dirname, 'raw');

/** 빈도 조사에서 이 값 이상인 명사는 보편적이라고 보고 정답 풀에 포함한다. */
const FREQ_CUTOFF = 50;

/**
 * '다'로 끝나는 단어는 용언으로 보고 일괄 제외하되, 여기 적힌 명사만 살려둔다.
 * (품사 태그상 명사여도 '저마다'처럼 실제로는 부사인 경우가 섞여 있어 화이트리스트로 관리한다.)
 */
const NOUN_ENDING_DA = new Set(['바다', '앞바다', '판다', '사이다', '최다']);

function readLines(file: string): string[] {
  return readFileSync(path.join(RAW_DIR, file), 'utf-8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));
}

function loadPosMap(): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const line of readLines('pos-map.tsv')) {
    const [word, tags] = line.split('\t');
    if (word && tags) map.set(word, new Set(tags.split(',')));
  }
  return map;
}

function loadNounFreq(): Map<string, number> {
  const map = new Map<string, number>();
  for (const line of readLines('noun-freq.tsv')) {
    const [word, freq] = line.split('\t');
    if (word) map.set(word, Number(freq) || 0);
  }
  return map;
}

function loadExisting(slot: number): WordEntry[] {
  try {
    return JSON.parse(readFileSync(path.join(RAW_DIR, `words_${slot}.json`), 'utf-8'));
  } catch {
    return [];
  }
}

function main() {
  const posMap = loadPosMap();
  const nounFreq = loadNounFreq();
  const common = new Set(readLines('common-nouns.txt'));
  const curated = new Set(readLines('curated-nouns.txt'));
  const dictNouns = new Set(readLines('all-nouns.txt'));

  /** 명사로 인정할 수 있는 단어인지. 품사 태그가 있으면 그것이 우선, 없으면 사전 등재 여부로 본다. */
  function isNoun(word: string): boolean {
    if (word.endsWith('다')) return NOUN_ENDING_DA.has(word);
    const tags = posMap.get(word);
    if (tags) return tags.has('명');
    return dictNouns.has(word) || curated.has(word);
  }

  const previous = [5, 6, 7].flatMap((slot) => loadExisting(slot).map((e) => e.display));

  const candidates = new Set<string>([
    ...common,
    ...curated,
    ...[...nounFreq].filter(([, f]) => f >= FREQ_CUTOFF).map(([w]) => w),
    ...previous,
  ]);

  const bySlot: Record<number, WordEntry[]> = { 5: [], 6: [], 7: [] };
  const removed: string[] = [];
  const reasons = { notNoun: 0, slot: 0, blocked: 0 };

  for (const word of [...candidates].sort((a, b) => a.localeCompare(b, 'ko'))) {
    if (isBlocked(word)) {
      removed.push(word);
      reasons.blocked++;
      continue;
    }
    if (!isNoun(word)) {
      removed.push(word);
      reasons.notNoun++;
      continue;
    }
    const jamo = decomposeWord(word);
    if (!jamo || jamo.length < 5 || jamo.length > 7) {
      removed.push(word);
      reasons.slot++;
      continue;
    }
    bySlot[jamo.length].push({ display: word, jamo, slot: jamo.length });
  }

  for (const slot of [5, 6, 7]) {
    writeFileSync(path.join(RAW_DIR, `words_${slot}.json`), JSON.stringify(bySlot[slot], null, 2) + '\n');
    console.log(`words_${slot}.json: ${bySlot[slot].length}개`);
  }

  // 기존 정답 풀에 있었지만 이번에 빠진 단어 = DB에서도 정리해야 할 대상
  const kept = new Set([...bySlot[5], ...bySlot[6], ...bySlot[7]].map((e) => e.display));
  const dropped = previous.filter((w) => !kept.has(w));

  writeFileSync(path.join(RAW_DIR, 'dropped-from-pool.txt'), dropped.sort((a, b) => a.localeCompare(b, 'ko')).join('\n') + '\n');

  console.log(`정답 풀 총 ${kept.size}개 (후보 ${candidates.size}개 중 제외 ${removed.length}개 — 비명사 ${reasons.notNoun} / 슬롯범위 ${reasons.slot} / 차단어 ${reasons.blocked})`);
  console.log(`기존 정답 풀에서 빠진 단어: ${dropped.length}개 → raw/dropped-from-pool.txt`);

  // 입력 풀: 사전 전체에서 슬롯에 맞는 명사를 모으되 정답 풀과 겹치는 것은 뺀다.
  // 정답 풀보다 기준이 느슨해 저빈도·전문어도 받아들이지만, 명사가 아닌 것은 여기서도 걸러낸다.
  const inputPool: string[] = [];
  for (const word of new Set([...readLines('all-nouns.txt'), ...readLines('nouns-raw.txt')])) {
    if (kept.has(word) || isBlocked(word) || !isNoun(word)) continue;
    const jamo = decomposeWord(word);
    if (!jamo || jamo.length < 5 || jamo.length > 7) continue;
    inputPool.push(word);
  }
  inputPool.sort((a, b) => a.localeCompare(b, 'ko'));
  writeFileSync(path.join(RAW_DIR, 'input-pool.txt'), inputPool.join('\n') + '\n');
  console.log(`입력 전용 풀: ${inputPool.length}개 → raw/input-pool.txt`);
}

main();
