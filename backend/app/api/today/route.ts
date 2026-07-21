import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase-admin';
import { getDateSeed } from '../../../lib/seed';
import { resolveDailyAnswer, MAX_ATTEMPTS_BY_SLOT } from '../../../lib/daily-answer';

/**
 * 항상 서버 기준 "진짜 오늘"만 계산한다. 과거 버전에는 ?date= 파라미터로 임의의
 * 날짜를 조회할 수 있었는데, 이는 미래 날짜를 넣어 앞으로의 정답을 미리 캐시에
 * 확정지어 알아낼 수 있는 구멍이었다.
 */
export async function GET() {
  const seed = getDateSeed(new Date());

  try {
    // 정답(jamo/display)은 서버 내부 계산용일 뿐, 응답에는 절대 포함하지 않는다.
    const { slot } = await resolveDailyAnswer(supabaseAdmin(), seed);
    return NextResponse.json({ seed, slot, maxAttempts: MAX_ATTEMPTS_BY_SLOT[slot] });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
