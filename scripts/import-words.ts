import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import WebSocket from 'ws';
import { createClient } from '@supabase/supabase-js';
import type { WordEntry } from '../src/types.ts';

// Node 20에는 전역 WebSocket이 없어 @supabase/supabase-js의 realtime 클라이언트 초기화가 실패한다.
// 이 스크립트는 realtime을 쓰지 않지만 생성자에서 무조건 초기화하므로 폴리필로 우회한다.
if (!globalThis.WebSocket) {
  (globalThis as unknown as { WebSocket: typeof WebSocket }).WebSocket = WebSocket;
}

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

  // 로컬 자모 분해 규칙이 바뀌면(예: 쌍자음 슬롯 처리 변경) 자모 5~7개 범위를 벗어나
  // 더 이상 로컬 파일에 없는 단어가 생길 수 있다 — DB에서도 함께 제거해 동기화한다.
  // is_answer_pool=false(대량 명사 사전)는 이 로컬 파일과 무관하므로 건드리지 않는다.
  // PostgREST 기본 응답 행 수 상한(1000)에 걸리지 않도록 페이지네이션으로 전체를 가져온다.
  const localDisplays = new Set(entries.map((e) => e.display));
  const existing: { id: number; display: string }[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error: fetchError } = await supabase
      .from('words')
      .select('id, display')
      .eq('is_answer_pool', true)
      .range(from, from + 999);
    if (fetchError) {
      console.error('기존 단어 목록 조회 실패:', fetchError.message);
      process.exit(1);
    }
    if (!data || data.length === 0) break;
    existing.push(...data);
    if (data.length < 1000) break;
  }
  const staleIds = existing.filter((w) => !localDisplays.has(w.display)).map((w) => w.id);

  if (staleIds.length > 0) {
    // 정답 캐시가 삭제될 단어를 참조하고 있으면 FK 제약에 걸리므로 먼저 비운다.
    // 아직 사용자가 없는 사전 검증 단계라 안전하게 초기화 가능.
    const { error: clearCacheError } = await supabase.from('daily_puzzles').delete().neq('seed', 0);
    if (clearCacheError) {
      console.error('daily_puzzles 초기화 실패:', clearCacheError.message);
      process.exit(1);
    }
    // URL 길이 제한(414)에 걸리지 않도록 청크 단위로 삭제한다.
    const DELETE_CHUNK = 200;
    for (let i = 0; i < staleIds.length; i += DELETE_CHUNK) {
      const chunk = staleIds.slice(i, i + DELETE_CHUNK);
      const { error: deleteError } = await supabase.from('words').delete().in('id', chunk);
      if (deleteError) {
        console.error(`불필요 단어 삭제 실패 (${i}~${i + chunk.length}):`, deleteError.message);
        process.exit(1);
      }
    }
    console.log(`더 이상 조건에 맞지 않는 단어 ${staleIds.length}개 삭제, 정답 캐시 초기화`);
  }

  console.log('이관 완료');
}

main();
