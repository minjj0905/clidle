import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { WordEntry, WordsBySlot } from './types.js';

const dataDir = join(dirname(fileURLToPath(import.meta.url)), 'data');

function loadSlot(file: string): WordEntry[] {
  const raw = readFileSync(join(dataDir, file), 'utf-8');
  return JSON.parse(raw) as WordEntry[];
}

export function loadWords(): WordsBySlot {
  return {
    5: loadSlot('words_5.json'),
    6: loadSlot('words_6.json'),
    7: loadSlot('words_7.json'),
  };
}
