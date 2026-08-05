import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../lib/supabase-server';
import { supabaseAdmin } from '../../../../lib/supabase-admin';
import { getDateSeed, getDailySlot } from '../../../../lib/seed';
import { fetchAllRows } from '../../../../lib/fetch-all';
import { validateAnswerWord } from '../../../../lib/answer-eligibility';

/**
 * 오늘의 문제(daily_puzzles 캐시)를 관리자에게 보여준다.
 * 정답을 그대로 노출하므로 requireAdmin을 통과한 요청에만 응답한다.
 */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: '권한이 없습니다.' }, { status: 401 });

  const seed = getDateSeed(new Date());
  const slot = getDailySlot(seed);

  const { data, error } = await supabaseAdmin()
    .from('daily_puzzles')
    .select('word_id, words(display)')
    .eq('seed', seed)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { count } = await supabaseAdmin()
    .from('words')
    .select('*', { count: 'exact', head: true })
    .eq('slot', slot)
    .eq('is_active', true)
    .eq('is_answer_pool', true);

  const word = data?.words as unknown as { display: string } | null | undefined;
  return NextResponse.json({
    seed,
    slot,
    wordId: data?.word_id ?? null,
    display: word?.display ?? null,
    poolCount: count ?? 0,
  });
}

/**
 * 오늘의 정답을 교체한다. body.wordId가 있으면 그 단어로, 없으면 정답 풀에서 무작위로 고른다.
 *
 * daily_puzzles 행을 지우는 것으로는 교체되지 않는다. 정답 선택(getDailyWord)이 시드 기반
 * 결정론이라 캐시를 비워도 같은 단어가 다시 뽑히기 때문에, 반드시 word_id를 덮어써야 한다.
 *
 * 이미 오늘 문제를 푼 사용자에게는 정답이 바뀌어 보이므로 운영 중 사용에 주의해야 한다.
 */
export async function PATCH(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: '권한이 없습니다.' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const wordId = body?.wordId;
  if (wordId !== undefined && (typeof wordId !== 'number' || !Number.isInteger(wordId))) {
    return NextResponse.json({ error: 'wordId는 정수여야 합니다.' }, { status: 400 });
  }

  const seed = getDateSeed(new Date());
  const slot = getDailySlot(seed);
  const supabase = supabaseAdmin();

  const { data: current } = await supabase
    .from('daily_puzzles')
    .select('word_id')
    .eq('seed', seed)
    .maybeSingle();

  let nextId: number;

  if (typeof wordId === 'number') {
    const { data: word, error } = await supabase
      .from('words')
      .select('id, display, slot, is_active, is_answer_pool')
      .eq('id', wordId)
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const invalid = validateAnswerWord(word, slot);
    if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

    nextId = word!.id;
  } else {
    // 정답 풀 전체를 모아 현재 단어를 뺀 나머지에서 고른다.
    const candidates = await fetchAllRows<{ id: number }>(
      (client, from, to) =>
        client
          .from('words')
          .select('id')
          .eq('slot', slot)
          .eq('is_active', true)
          .eq('is_answer_pool', true)
          .order('id', { ascending: true })
          .range(from, to),
      supabase,
    );
    const pool = candidates.map((c) => c.id).filter((id) => id !== current?.word_id);
    if (pool.length === 0) {
      return NextResponse.json({ error: `슬롯 ${slot}에 교체할 정답 후보가 없습니다.` }, { status: 400 });
    }
    nextId = pool[Math.floor(Math.random() * pool.length)];
  }

  const { error: upsertError } = await supabase
    .from('daily_puzzles')
    .upsert({ seed, slot, word_id: nextId }, { onConflict: 'seed' });
  if (upsertError) return NextResponse.json({ error: upsertError.message }, { status: 500 });

  const { data: next } = await supabase.from('words').select('display').eq('id', nextId).maybeSingle();
  return NextResponse.json({ seed, slot, wordId: nextId, display: next?.display ?? null });
}
