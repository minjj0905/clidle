import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../lib/supabase-server';
import { supabaseAdmin } from '../../../../lib/supabase-admin';

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: '권한이 없습니다.' }, { status: 401 });

  const supabase = supabaseAdmin();

  const { data: events, error: eventsError } = await supabase
    .from('play_events')
    .select('seed, slot, won, attempt_count')
    .order('seed', { ascending: false })
    .limit(5000);

  if (eventsError) return NextResponse.json({ error: eventsError.message }, { status: 500 });

  const bySeed = new Map<number, { seed: number; slot: number; plays: number; wins: number }>();
  let totalPlays = 0;
  let totalWins = 0;

  for (const e of events ?? []) {
    totalPlays++;
    if (e.won) totalWins++;
    const entry = bySeed.get(e.seed) ?? { seed: e.seed, slot: e.slot, plays: 0, wins: 0 };
    entry.plays++;
    if (e.won) entry.wins++;
    bySeed.set(e.seed, entry);
  }

  const seeds = [...bySeed.keys()];
  const { data: puzzles } = await supabase
    .from('daily_puzzles')
    .select('seed, words(display)')
    .in('seed', seeds.length > 0 ? seeds : [0]);

  const displayBySeed = new Map<number, string>();
  for (const p of puzzles ?? []) {
    const word = p.words as unknown as { display: string } | null;
    if (word) displayBySeed.set(p.seed, word.display);
  }

  const perDay = seeds
    .sort((a, b) => b - a)
    .map((seed) => {
      const entry = bySeed.get(seed)!;
      return {
        seed,
        display: displayBySeed.get(seed) ?? null,
        slot: entry.slot,
        plays: entry.plays,
        wins: entry.wins,
        winRate: entry.plays > 0 ? Math.round((entry.wins / entry.plays) * 100) : 0,
      };
    });

  return NextResponse.json({
    totalPlays,
    totalWins,
    winRate: totalPlays > 0 ? Math.round((totalWins / totalPlays) * 100) : 0,
    perDay,
  });
}
