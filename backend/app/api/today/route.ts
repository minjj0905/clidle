import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase-admin';
import { getDateSeed, getDailySlot, getDailyWord } from '../../../lib/seed';
import { fetchAllRows } from '../../../lib/fetch-all';

const MAX_ATTEMPTS_BY_SLOT: Record<number, number> = { 5: 6, 6: 6, 7: 7 };

function seedFromDateParam(dateParam: string | null): number {
  if (!dateParam) return getDateSeed(new Date());
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateParam);
  if (!m) throw new Error('date는 YYYY-MM-DD 형식이어야 합니다.');
  return Number(m[1]) * 10000 + Number(m[2]) * 100 + Number(m[3]);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  let seed: number;
  try {
    seed = seedFromDateParam(searchParams.get('date'));
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }

  const slot = getDailySlot(seed);
  const supabase = supabaseAdmin();

  const { data: cached } = await supabase
    .from('daily_puzzles')
    .select('slot, words(display, jamo)')
    .eq('seed', seed)
    .maybeSingle();

  if (cached?.words) {
    const word = cached.words as unknown as { display: string; jamo: string[] };
    return NextResponse.json({
      seed,
      slot: cached.slot,
      jamo: word.jamo,
      display: word.display,
      maxAttempts: MAX_ATTEMPTS_BY_SLOT[cached.slot],
    });
  }

  // PostgREST 기본 응답 행 수 상한(1000)에 걸리면 후보군이 잘려 정답 선택이 어긋나므로 페이지네이션으로 전체를 모은다.
  let candidates: { id: number; display: string; jamo: string[] }[];
  try {
    candidates = await fetchAllRows(
      (client, from, to) =>
        client.from('words').select('id, display, jamo').eq('slot', slot).eq('is_active', true).order('id', { ascending: true }).range(from, to),
      supabase,
    );
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
  if (candidates.length === 0) {
    return NextResponse.json({ error: `슬롯 ${slot}에 활성화된 단어가 없습니다.` }, { status: 500 });
  }

  const word = getDailyWord(candidates, seed);

  // 동시 요청 경쟁 상태 대비: 이미 다른 요청이 먼저 넣었으면 무시(onConflict do nothing)하고 넘어간다.
  await supabase.from('daily_puzzles').upsert({ seed, slot, word_id: word.id }, { onConflict: 'seed', ignoreDuplicates: true });

  return NextResponse.json({
    seed,
    slot,
    jamo: word.jamo,
    display: word.display,
    maxAttempts: MAX_ATTEMPTS_BY_SLOT[slot],
  });
}
