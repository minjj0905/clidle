import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { decomposeWord, isBlocked } from './jamo.ts';
import type { WordEntry } from '../src/types.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAW_PATH = path.join(__dirname, 'raw/words-raw.txt');
const DATA_DIR = path.join(__dirname, 'raw');

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
