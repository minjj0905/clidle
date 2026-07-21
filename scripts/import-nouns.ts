import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import WebSocket from 'ws';
import { createClient } from '@supabase/supabase-js';
import { decomposeWord, isBlocked } from './jamo.ts';
import type { WordEntry } from '../src/types.ts';

// Node 20에는 전역 WebSocket이 없어 @supabase/supabase-js의 realtime 클라이언트 초기화가 실패한다.
if (!globalThis.WebSocket) {
  (globalThis as unknown as { WebSocket: typeof WebSocket }).WebSocket = WebSocket;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../src/data');
const RAW_PATH = path.join(__dirname, 'raw/nouns-raw.txt');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 환경변수가 필요합니다.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function loadCuratedDisplays(): Set<string> {
  const displays = new Set<string>();
  for (const slot of [5, 6, 7]) {
    const entries: WordEntry[] = JSON.parse(readFileSync(path.join(DATA_DIR, `words_${slot}.json`), 'utf-8'));
    for (const e of entries) displays.add(e.display);
  }
  return displays;
}

async function main() {
  const curated = loadCuratedDisplays();
  const rawWords = readFileSync(RAW_PATH, 'utf-8')
    .split('\n')
    .map((w) => w.trim())
    .filter(Boolean);

  const seen = new Set<string>();
  const rows: { display: string; jamo: string[]; slot: number; is_active: boolean; is_answer_pool: boolean }[] = [];
  let skipped = 0;

  for (const word of rawWords) {
    // 이미 큐레이션된 정답 후보 단어는 건드리지 않는다 (is_answer_pool을 false로 덮어쓰지 않기 위해 스킵).
    if (curated.has(word) || seen.has(word) || isBlocked(word)) {
      skipped++;
      continue;
    }
    const jamo = decomposeWord(word);
    if (!jamo || jamo.length < 5 || jamo.length > 7) {
      skipped++;
      continue;
    }
    seen.add(word);
    rows.push({ display: word, jamo, slot: jamo.length, is_active: true, is_answer_pool: false });
  }

  console.log(`이관 대상: ${rows.length}개 (스킵: ${skipped}개)`);

  const CHUNK = 500;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const { error } = await supabase.from('words').upsert(chunk, { onConflict: 'display' });
    if (error) {
      console.error(`업로드 실패 (${i}~${i + chunk.length}):`, error.message);
      process.exit(1);
    }
    if ((i / CHUNK) % 10 === 0) console.log(`${i + chunk.length}/${rows.length} 완료`);
  }

  console.log('이관 완료');
}

main();
