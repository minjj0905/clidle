import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import WebSocket from 'ws';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { decomposeWord } from './jamo.ts';
import type { WordEntry } from '../src/types.ts';

/**
 * build-answer-pool.ts가 만든 결과를 Supabase words 테이블에 반영한다.
 *
 *  - 정답 풀(raw/words_*.json) → is_answer_pool = true
 *  - 입력 풀(raw/input-pool.txt)    → is_answer_pool = false
 *  - 양쪽 어디에도 없는 단어(동사·부사 등 비명사) → 삭제.
 *    단 daily_puzzles가 참조하는 단어는 과거 정답이 깨지므로 삭제하지 않고 is_active=false로 내린다.
 *
 * 실행: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/sync-words.ts [--dry-run]
 */

// Node 20에는 전역 WebSocket이 없어 @supabase/supabase-js의 realtime 클라이언트 초기화가 실패한다.
if (!globalThis.WebSocket) {
  (globalThis as unknown as { WebSocket: typeof WebSocket }).WebSocket = WebSocket;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAW_DIR = path.join(__dirname, 'raw');

const DRY_RUN = process.argv.includes('--dry-run');
const CHUNK = 500;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 환경변수가 필요합니다.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface WordRow {
  display: string;
  jamo: string[];
  slot: number;
  is_active: boolean;
  is_answer_pool: boolean;
}

/** PostgREST 기본 응답 상한(1000행)을 넘기기 위해 페이지네이션으로 전체를 읽는다. */
async function fetchAll<T>(
  build: (client: SupabaseClient, from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const PAGE = 1000;
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await build(supabase, from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < PAGE) break;
  }
  return rows;
}

function loadAnswerPool(): WordRow[] {
  const rows: WordRow[] = [];
  for (const slot of [5, 6, 7]) {
    const entries: WordEntry[] = JSON.parse(readFileSync(path.join(RAW_DIR, `words_${slot}.json`), 'utf-8'));
    for (const e of entries) rows.push({ display: e.display, jamo: e.jamo, slot: e.slot, is_active: true, is_answer_pool: true });
  }
  return rows;
}

function loadInputPool(): WordRow[] {
  const words = readFileSync(path.join(RAW_DIR, 'input-pool.txt'), 'utf-8')
    .split('\n')
    .map((w) => w.trim())
    .filter(Boolean);
  const rows: WordRow[] = [];
  for (const display of words) {
    const jamo = decomposeWord(display);
    if (!jamo) continue;
    rows.push({ display, jamo, slot: jamo.length, is_active: true, is_answer_pool: false });
  }
  return rows;
}

async function upsertRows(rows: WordRow[], label: string) {
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const { error } = await supabase.from('words').upsert(chunk, { onConflict: 'display' });
    if (error) throw new Error(`${label} 업로드 실패 (${i}~${i + chunk.length}): ${error.message}`);
    if ((i / CHUNK) % 20 === 0) console.log(`  ${label} ${i + chunk.length}/${rows.length}`);
  }
}

async function main() {
  const answerRows = loadAnswerPool();
  const inputRows = loadInputPool();
  const desired = new Map<string, WordRow>();
  for (const r of [...inputRows, ...answerRows]) desired.set(r.display, r); // 겹치면 정답 풀이 이긴다

  console.log(`목표 상태 — 정답 풀 ${answerRows.length}개 / 입력 풀 ${inputRows.length}개 (합계 ${desired.size}개)`);

  const existing = await fetchAll<{ id: number; display: string; is_answer_pool: boolean; is_active: boolean }>((c, from, to) =>
    c.from('words').select('id, display, is_answer_pool, is_active').order('id', { ascending: true }).range(from, to),
  );
  console.log(`현재 DB: ${existing.length}개`);

  const existingMap = new Map(existing.map((r) => [r.display, r]));

  // 신규이거나 플래그가 달라진 것만 골라 upsert 부담을 줄인다.
  const toUpsert = [...desired.values()].filter((r) => {
    const cur = existingMap.get(r.display);
    return !cur || cur.is_answer_pool !== r.is_answer_pool || !cur.is_active;
  });

  const obsolete = existing.filter((r) => !desired.has(r.display));

  // 과거 정답으로 이미 출제된 단어는 daily_puzzles가 참조하므로 지울 수 없다.
  const puzzles = await fetchAll<{ word_id: number }>((c, from, to) =>
    c.from('daily_puzzles').select('word_id').range(from, to),
  );
  const usedIds = new Set(puzzles.map((p) => p.word_id));
  const toDelete = obsolete.filter((r) => !usedIds.has(r.id));
  const toDeactivate = obsolete.filter((r) => usedIds.has(r.id) && r.is_active);

  console.log(`반영 예정 — upsert ${toUpsert.length}개 / 삭제 ${toDelete.length}개 / 비활성화 ${toDeactivate.length}개(과거 출제분)`);
  console.log(`삭제 예시: ${toDelete.slice(0, 20).map((r) => r.display).join(' ')}`);

  if (DRY_RUN) {
    console.log('--dry-run 이므로 실제 반영은 하지 않았습니다.');
    return;
  }

  const answerSet = new Set(answerRows.map((r) => r.display));
  await upsertRows(toUpsert.filter((r) => answerSet.has(r.display)), '정답 풀');
  await upsertRows(toUpsert.filter((r) => !answerSet.has(r.display)), '입력 풀');

  for (let i = 0; i < toDeactivate.length; i += CHUNK) {
    const ids = toDeactivate.slice(i, i + CHUNK).map((r) => r.id);
    const { error } = await supabase.from('words').update({ is_active: false, is_answer_pool: false }).in('id', ids);
    if (error) throw new Error(`비활성화 실패: ${error.message}`);
  }

  for (let i = 0; i < toDelete.length; i += CHUNK) {
    const ids = toDelete.slice(i, i + CHUNK).map((r) => r.id);
    const { error } = await supabase.from('words').delete().in('id', ids);
    if (error) throw new Error(`삭제 실패: ${error.message}`);
    if ((i / CHUNK) % 20 === 0) console.log(`  삭제 ${i + ids.length}/${toDelete.length}`);
  }

  console.log('동기화 완료');
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
