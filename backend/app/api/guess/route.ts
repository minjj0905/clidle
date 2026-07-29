import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase-admin';
import { getDateSeed } from '../../../lib/seed';
import { resolveDailyAnswer, MAX_ATTEMPTS_BY_SLOT } from '../../../lib/daily-answer';
import { calculateHint } from '../../../lib/hint';
import { checkGuessAllowed, getClientIp, recordGuessAttempt } from '../../../lib/rate-limit';

interface GuessPayload {
  seed: number;
  guess: string[];
  deviceId?: string;
}

function isValidPayload(body: unknown): body is GuessPayload {
  if (!body || typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.seed === 'number' &&
    Array.isArray(b.guess) &&
    b.guess.every((j) => typeof j === 'string') &&
    (b.deviceId === undefined || typeof b.deviceId === 'string')
  );
}

/** PostgREST의 .eq()는 배열 컬럼 값을 Postgres 배열 리터럴 문자열로 받아야 한다. */
function toPgTextArrayLiteral(values: string[]): string {
  const escaped = values.map((v) => `"${v.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`);
  return `{${escaped.join(',')}}`;
}

/**
 * 추측을 채점한다. 정답(자모/표시 텍스트)은 서버 내부에서만 쓰고 응답에는 절대 포함하지 않는다.
 * 사전 검증, 정답 비교, 시도 횟수/속도 제한 모두 여기서만 수행한다(클라이언트를 신뢰하지 않음).
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!isValidPayload(body)) {
    return NextResponse.json({ error: '잘못된 요청 본문입니다.' }, { status: 400 });
  }

  // 미래/과거 시드로 미리 정답을 확정 지어 알아내는 것을 막기 위해 항상 "진짜 오늘"만 허용한다.
  const todaySeed = getDateSeed(new Date());
  if (body.seed !== todaySeed) {
    return NextResponse.json({ error: '오늘의 문제만 풀 수 있습니다.' }, { status: 400 });
  }

  const supabase = supabaseAdmin();
  const ip = getClientIp(request);

  let answer: Awaited<ReturnType<typeof resolveDailyAnswer>>;
  try {
    answer = await resolveDailyAnswer(supabase, body.seed);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }

  const maxAttempts = MAX_ATTEMPTS_BY_SLOT[answer.slot]!;
  const limitCheck = await checkGuessAllowed(supabase, {
    ip,
    deviceId: body.deviceId,
    seed: body.seed,
    maxAttempts,
  });
  if (!limitCheck.allowed) {
    return NextResponse.json({ error: limitCheck.reason }, { status: 429 });
  }

  if (body.guess.length !== answer.slot) {
    await recordGuessAttempt(supabase, { ip, deviceId: body.deviceId, seed: body.seed, valid: false });
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
    await recordGuessAttempt(supabase, { ip, deviceId: body.deviceId, seed: body.seed, valid: false });
    return NextResponse.json({ error: '사전에 없는 단어예요.' }, { status: 400 });
  }

  await recordGuessAttempt(supabase, { ip, deviceId: body.deviceId, seed: body.seed, valid: true });

  const hint = calculateHint(body.guess, answer.jamo);
  const won = hint.every((h) => h === 'exact');

  return NextResponse.json({ hint, won });
}
