import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import type { WordEntry } from '../src/types.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../src/data');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 환경변수가 필요합니다.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function loadSlot(slot: number): WordEntry[] {
  return JSON.parse(readFileSync(path.join(DATA_DIR, `words_${slot}.json`), 'utf-8'));
}

async function main() {
  const entries = [5, 6, 7].flatMap(loadSlot);
  console.log(`이관 대상: ${entries.length}개`);

  const rows = entries.map((e) => ({ display: e.display, jamo: e.jamo, slot: e.slot }));
  const CHUNK = 500;

  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const { error } = await supabase.from('words').upsert(chunk, { onConflict: 'display' });
    if (error) {
      console.error(`업로드 실패 (${i}~${i + chunk.length}):`, error.message);
      process.exit(1);
    }
    console.log(`${i + chunk.length}/${rows.length} 완료`);
  }

  console.log('이관 완료');
}

main();
