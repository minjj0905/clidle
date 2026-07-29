import type { SupabaseClient } from '@supabase/supabase-js';

const BURST_WINDOW_MS = 10_000;
/** 기기 단위 버스트 제한. 사람이 손으로 칠 수 있는 속도보다 넉넉하다. */
const DEVICE_BURST_LIMIT = 5;
/** 같은 공유기(사무실 등)에서 여러 명이 동시에 플레이할 수 있게 IP 버스트는 크게 잡는다. */
const IP_BURST_LIMIT = 60;
/** IP 단위 하루 유효 시도 상한. 정상 사용자 여럿이 걸릴 일은 없고, 대량 브루트포스만 막는 값. */
const IP_DAILY_LIMIT = 500;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Vercel 등 프록시 뒤에서 실제 클라이언트 IP를 추출한다. 못 찾으면 'unknown'(공용 버킷)으로 묶인다. */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]!.trim();
  return request.headers.get('x-real-ip') ?? 'unknown';
}

/** device_id 컬럼이 uuid 타입이라 형식이 맞지 않으면 조회 자체가 실패한다. 검증 후에만 기기 기준으로 센다. */
export function normalizeDeviceId(deviceId?: string | null): string | null {
  return deviceId && UUID_RE.test(deviceId) ? deviceId.toLowerCase() : null;
}

export interface GuessLimitCheck {
  allowed: boolean;
  reason?: string;
}

async function countAttempts(
  supabase: SupabaseClient,
  build: (q: ReturnType<SupabaseClient['from']>) => PromiseLike<{ count: number | null; error: unknown }>,
): Promise<number> {
  const { count, error } = await build(supabase.from('guess_attempts'));
  // 조회 실패 시 0으로 보면 제한이 통째로 뚫린다. 보수적으로 상한을 넘긴 것으로 취급한다.
  if (error) return Number.POSITIVE_INFINITY;
  return count ?? 0;
}

/**
 * 시도 횟수는 기기(deviceId) 단위로 센다. 같은 공유기를 쓰는 사용자끼리 서로의 횟수를
 * 깎아먹지 않게 하기 위함이다. deviceId는 클라이언트가 새로 만들어 우회할 수 있으므로,
 * IP 단위로는 훨씬 느슨한 상한(버스트 / 일일 총량)만 별도로 걸어 대량 브루트포스를 막는다.
 * deviceId가 없거나 형식이 잘못된 요청은 예전처럼 IP를 기기 키 대신 쓴다.
 */
export async function checkGuessAllowed(
  supabase: SupabaseClient,
  {
    ip,
    deviceId,
    seed,
    maxAttempts,
  }: { ip: string; deviceId?: string | null; seed: number; maxAttempts: number },
): Promise<GuessLimitCheck> {
  const since = new Date(Date.now() - BURST_WINDOW_MS).toISOString();
  const device = normalizeDeviceId(deviceId);

  const [deviceBurst, ipBurst] = await Promise.all([
    device
      ? countAttempts(supabase, (q) =>
          q.select('*', { count: 'exact', head: true }).eq('device_id', device).gte('created_at', since),
        )
      : Promise.resolve(0),
    countAttempts(supabase, (q) =>
      q.select('*', { count: 'exact', head: true }).eq('ip', ip).gte('created_at', since),
    ),
  ]);
  if (deviceBurst >= DEVICE_BURST_LIMIT || ipBurst >= IP_BURST_LIMIT) {
    return { allowed: false, reason: '요청이 너무 잦습니다. 잠시 후 다시 시도해주세요.' };
  }

  const [deviceDaily, ipDaily] = await Promise.all([
    countAttempts(supabase, (q) => {
      const base = q.select('*', { count: 'exact', head: true }).eq('seed', seed).eq('valid', true);
      return device ? base.eq('device_id', device) : base.eq('ip', ip);
    }),
    device
      ? countAttempts(supabase, (q) =>
          q.select('*', { count: 'exact', head: true }).eq('ip', ip).eq('seed', seed).eq('valid', true),
        )
      : Promise.resolve(0),
  ]);
  if (deviceDaily >= maxAttempts) {
    return { allowed: false, reason: '오늘 시도 횟수를 모두 사용했습니다.' };
  }
  if (ipDaily >= IP_DAILY_LIMIT) {
    return { allowed: false, reason: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' };
  }

  return { allowed: true };
}

export async function recordGuessAttempt(
  supabase: SupabaseClient,
  { ip, deviceId, seed, valid }: { ip: string; deviceId?: string | null; seed: number; valid: boolean },
): Promise<void> {
  await supabase
    .from('guess_attempts')
    .insert({ ip, device_id: normalizeDeviceId(deviceId), seed, valid });
}
