import type { SupabaseClient } from '@supabase/supabase-js';
import { getDailySlot, getDailyWord } from './seed';
import { fetchAllRows } from './fetch-all';

export const MAX_ATTEMPTS_BY_SLOT: Record<number, number> = { 5: 6, 6: 6, 7: 7 };

export interface DailyAnswer {
  seed: number;
  slot: number;
  jamo: string[];
  display: string;
}

/**
 * 오늘(또는 지정 시드)의 정답을 반환한다. daily_puzzles에 캐시가 있으면 그대로 쓰고,
 * 없으면 결정론적으로 골라 캐시에 저장한다. 이 함수의 반환값(jamo/display)은
 * API 응답으로 그대로 내보내면 안 된다 — 힌트 계산 등 서버 내부 용도로만 써야 한다.
 */
export async function resolveDailyAnswer(supabase: SupabaseClient, seed: number): Promise<DailyAnswer> {
  const slot = getDailySlot(seed);

  const { data: cached } = await supabase
    .from('daily_puzzles')
    .select('slot, words(display, jamo)')
    .eq('seed', seed)
    .maybeSingle();

  if (cached?.words) {
    const word = cached.words as unknown as { display: string; jamo: string[] };
    return { seed, slot: cached.slot, jamo: word.jamo, display: word.display };
  }

  // PostgREST 기본 응답 행 수 상한(1000)에 걸리면 후보군이 잘려 정답 선택이 어긋나므로 페이지네이션으로 전체를 모은다.
  const candidates = await fetchAllRows<{ id: number; display: string; jamo: string[] }>(
    (client, from, to) =>
      client
        .from('words')
        .select('id, display, jamo')
        .eq('slot', slot)
        .eq('is_active', true)
        .eq('is_answer_pool', true)
        .order('id', { ascending: true })
        .range(from, to),
    supabase,
  );
  if (candidates.length === 0) {
    throw new Error(`슬롯 ${slot}에 정답 후보 단어가 없습니다.`);
  }

  const word = getDailyWord(candidates, seed);

  // 동시 요청 경쟁 상태 대비: 이미 다른 요청이 먼저 넣었으면 무시(onConflict do nothing)하고 넘어간다.
  await supabase.from('daily_puzzles').upsert({ seed, slot, word_id: word.id }, { onConflict: 'seed', ignoreDuplicates: true });

  return { seed, slot, jamo: word.jamo, display: word.display };
}
