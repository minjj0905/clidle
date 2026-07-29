import { describe, it, expect } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { checkGuessAllowed, normalizeDeviceId } from '../backend/lib/rate-limit.js';

interface Attempt {
  ip: string;
  device_id: string | null;
  seed: number;
  valid: boolean;
  created_at: string;
}

/** guess_attempts 테이블만 흉내 내는 최소 스텁. .eq()/.gte() 체인을 메모리 필터로 처리한다. */
function fakeSupabase(rows: Attempt[]): SupabaseClient {
  const builder = (filtered: Attempt[]) => {
    const self = {
      select: () => self,
      eq: (col: keyof Attempt, value: unknown) =>
        builder(filtered.filter((r) => r[col] === value)),
      gte: (col: keyof Attempt, value: string) =>
        builder(filtered.filter((r) => String(r[col]) >= value)),
      then: (resolve: (v: { count: number; error: null }) => unknown) =>
        resolve({ count: filtered.length, error: null }),
    };
    return self;
  };
  return { from: () => builder(rows) } as unknown as SupabaseClient;
}

const DEVICE_A = '11111111-1111-4111-8111-111111111111';
const DEVICE_B = '22222222-2222-4222-8222-222222222222';

function attempt(over: Partial<Attempt> = {}): Attempt {
  return {
    ip: '1.2.3.4',
    device_id: DEVICE_A,
    seed: 20260729,
    valid: true,
    created_at: new Date(0).toISOString(),
    ...over,
  };
}

describe('normalizeDeviceId', () => {
  it('UUID 형식만 통과시킨다', () => {
    expect(normalizeDeviceId(DEVICE_A)).toBe(DEVICE_A);
    expect(normalizeDeviceId('not-a-uuid')).toBeNull();
    expect(normalizeDeviceId(undefined)).toBeNull();
  });
});

describe('checkGuessAllowed', () => {
  const base = { ip: '1.2.3.4', seed: 20260729, maxAttempts: 6 };

  it('같은 IP라도 다른 기기의 시도 횟수는 깎이지 않는다', async () => {
    const rows = Array.from({ length: 6 }, () => attempt({ device_id: DEVICE_A }));

    expect(await checkGuessAllowed(fakeSupabase(rows), { ...base, deviceId: DEVICE_A })).toEqual({
      allowed: false,
      reason: '오늘 시도 횟수를 모두 사용했습니다.',
    });
    expect(await checkGuessAllowed(fakeSupabase(rows), { ...base, deviceId: DEVICE_B })).toEqual({
      allowed: true,
    });
  });

  it('같은 기기가 시도 횟수를 다 쓰면 막는다', async () => {
    const rows = Array.from({ length: 5 }, () => attempt());
    expect(await checkGuessAllowed(fakeSupabase(rows), { ...base, deviceId: DEVICE_A })).toEqual({
      allowed: true,
    });

    rows.push(attempt());
    expect(await checkGuessAllowed(fakeSupabase(rows), { ...base, deviceId: DEVICE_A }).then((r) => r.allowed)).toBe(
      false,
    );
  });

  it('유효하지 않은 시도(사전에 없는 단어 등)는 횟수에서 제외한다', async () => {
    const rows = Array.from({ length: 20 }, () => attempt({ valid: false }));
    expect(await checkGuessAllowed(fakeSupabase(rows), { ...base, deviceId: DEVICE_A })).toEqual({
      allowed: true,
    });
  });

  it('deviceId가 없으면 예전처럼 IP 기준으로 센다', async () => {
    const rows = Array.from({ length: 6 }, () => attempt({ device_id: null }));
    expect(await checkGuessAllowed(fakeSupabase(rows), base).then((r) => r.allowed)).toBe(false);
  });

  it('한 기기가 짧은 시간에 몰아치면 버스트 제한에 걸린다', async () => {
    const now = new Date().toISOString();
    const rows = Array.from({ length: 5 }, () => attempt({ valid: false, created_at: now }));
    expect(await checkGuessAllowed(fakeSupabase(rows), { ...base, deviceId: DEVICE_A })).toEqual({
      allowed: false,
      reason: '요청이 너무 잦습니다. 잠시 후 다시 시도해주세요.',
    });
  });

  it('IP 일일 상한(500)을 넘기면 막는다', async () => {
    const rows = Array.from({ length: 500 }, (_, i) => attempt({ device_id: `d${i}` }));
    expect(await checkGuessAllowed(fakeSupabase(rows), { ...base, deviceId: DEVICE_A })).toEqual({
      allowed: false,
      reason: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
    });
  });
});
