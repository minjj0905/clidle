import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase-admin';
import { getDateSeed } from '../../../lib/seed';
import { resolveDailyAnswer, MAX_ATTEMPTS_BY_SLOT } from '../../../lib/daily-answer';

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

  try {
    // 정답(jamo/display)은 서버 내부 계산용일 뿐, 응답에는 절대 포함하지 않는다.
    const { slot } = await resolveDailyAnswer(supabaseAdmin(), seed);
    return NextResponse.json({ seed, slot, maxAttempts: MAX_ATTEMPTS_BY_SLOT[slot] });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
