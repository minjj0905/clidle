import type { SupabaseClient } from '@supabase/supabase-js';

const BURST_WINDOW_MS = 10_000;
const BURST_LIMIT = 5;

/** Vercel 등 프록시 뒤에서 실제 클라이언트 IP를 추출한다. 못 찾으면 'unknown'(공용 버킷)으로 묶인다. */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]!.trim();
  return request.headers.get('x-real-ip') ?? 'unknown';
}

export interface GuessLimitCheck {
  allowed: boolean;
  reason?: string;
}

/**
 * deviceId는 클라이언트가 자유롭게 새로 생성할 수 있어 신뢰하지 않는다.
 * IP 기준으로 1) 짧은 시간 내 과도한 요청(버스트), 2) 해당 시드에 대해 이미 다 쓴
 * 유효 시도 횟수를 확인한다. 같은 공유기를 쓰는 여러 사용자는 시도 횟수를 나눠
 * 쓰게 되는 트레이드오프가 있다.
 */
export async function checkGuessAllowed(
  supabase: SupabaseClient,
  { ip, seed, maxAttempts }: { ip: string; seed: number; maxAttempts: number },
): Promise<GuessLimitCheck> {
  const since = new Date(Date.now() - BURST_WINDOW_MS).toISOString();
  const { count: burstCount } = await supabase
    .from('guess_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('ip', ip)
    .gte('created_at', since);
  if ((burstCount ?? 0) >= BURST_LIMIT) {
    return { allowed: false, reason: '요청이 너무 잦습니다. 잠시 후 다시 시도해주세요.' };
  }

  const { count: dailyCount } = await supabase
    .from('guess_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('ip', ip)
    .eq('seed', seed)
    .eq('valid', true);
  if ((dailyCount ?? 0) >= maxAttempts) {
    return { allowed: false, reason: '오늘 시도 횟수를 모두 사용했습니다.' };
  }

  return { allowed: true };
}

export async function recordGuessAttempt(
  supabase: SupabaseClient,
  { ip, deviceId, seed, valid }: { ip: string; deviceId?: string | null; seed: number; valid: boolean },
): Promise<void> {
  await supabase.from('guess_attempts').insert({ ip, device_id: deviceId ?? null, seed, valid });
}
