import { describe, it, expect, vi } from 'vitest';
import { fetchTodayWord, postStats } from '../src/api.js';

describe('fetchTodayWord', () => {
  it('응답 본문을 그대로 반환한다', async () => {
    const body = { seed: 20260716, slot: 6, jamo: ['ㄱ', 'ㅏ'], display: '가', maxAttempts: 6 };
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => body });

    const result = await fetchTodayWord('https://example.com', fetchImpl);

    expect(result).toEqual(body);
    expect(fetchImpl).toHaveBeenCalledWith(new URL('/api/today', 'https://example.com'));
  });

  it('응답이 실패하면 예외를 던진다', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 500 });

    await expect(fetchTodayWord('https://example.com', fetchImpl)).rejects.toThrow(/500/);
  });
});

describe('postStats', () => {
  it('이벤트를 JSON으로 POST한다', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true });
    const event = { deviceId: 'device-1', seed: 20260716, slot: 6, won: true, attemptCount: 3 };

    await postStats(event, 'https://example.com', fetchImpl);

    expect(fetchImpl).toHaveBeenCalledWith(
      new URL('/api/stats', 'https://example.com'),
      expect.objectContaining({ method: 'POST', body: JSON.stringify(event) }),
    );
  });

  it('네트워크 실패 시 예외를 던지지 않는다', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('network down'));
    const event = { deviceId: 'device-1', seed: 20260716, slot: 6, won: true, attemptCount: 3 };

    await expect(postStats(event, 'https://example.com', fetchImpl)).resolves.toBeUndefined();
  });
});
