import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase-admin';

interface StatsPayload {
  deviceId: string;
  seed: number;
  slot: number;
  won: boolean;
  attemptCount: number;
}

function isValidPayload(body: unknown): body is StatsPayload {
  if (!body || typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.deviceId === 'string' &&
    typeof b.seed === 'number' &&
    typeof b.slot === 'number' &&
    typeof b.won === 'boolean' &&
    typeof b.attemptCount === 'number'
  );
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!isValidPayload(body)) {
    return NextResponse.json({ error: '잘못된 요청 본문입니다.' }, { status: 400 });
  }

  const { error } = await supabaseAdmin()
    .from('play_events')
    .upsert(
      {
        device_id: body.deviceId,
        seed: body.seed,
        slot: body.slot,
        won: body.won,
        attempt_count: body.attemptCount,
      },
      { onConflict: 'device_id,seed', ignoreDuplicates: true },
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
