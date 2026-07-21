import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase-admin';
import { resolveDailyAnswer } from '../../../lib/daily-answer';
import { calculateHint } from '../../../lib/hint';

interface GuessPayload {
  seed: number;
  guess: string[];
}

function isValidPayload(body: unknown): body is GuessPayload {
  if (!body || typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;
  return typeof b.seed === 'number' && Array.isArray(b.guess) && b.guess.every((j) => typeof j === 'string');
}

/** PostgREST의 .eq()는 배열 컬럼 값을 Postgres 배열 리터럴 문자열로 받아야 한다. */
function toPgTextArrayLiteral(values: string[]): string {
  const escaped = values.map((v) => `"${v.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`);
  return `{${escaped.join(',')}}`;
}

/**
 * 추측을 채점한다. 정답(자모/표시 텍스트)은 서버 내부에서만 쓰고 응답에는 절대 포함하지 않는다.
 * 사전 검증(입력한 조합이 실제 등재된 단어인지)도 항상 여기서만 수행한다.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!isValidPayload(body)) {
    return NextResponse.json({ error: '잘못된 요청 본문입니다.' }, { status: 400 });
  }

  const supabase = supabaseAdmin();

  let answer: Awaited<ReturnType<typeof resolveDailyAnswer>>;
  try {
    answer = await resolveDailyAnswer(supabase, body.seed);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }

  if (body.guess.length !== answer.slot) {
    return NextResponse.json({ error: `자모 ${answer.slot}개를 입력해야 합니다.` }, { status: 400 });
  }

  const { data: match, error: lookupError } = await supabase
    .from('words')
    .select('id')
    .eq('slot', answer.slot)
    .eq('is_active', true)
    .eq('jamo', toPgTextArrayLiteral(body.guess))
    .limit(1)
    .maybeSingle();

  if (lookupError) {
    return NextResponse.json({ error: lookupError.message }, { status: 500 });
  }
  if (!match) {
    return NextResponse.json({ error: '사전에 없는 단어예요.' }, { status: 400 });
  }

  const hint = calculateHint(body.guess, answer.jamo);
  const won = hint.every((h) => h === 'exact');

  return NextResponse.json({ hint, won });
}
