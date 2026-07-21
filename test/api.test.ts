import { describe, it, expect, vi } from 'vitest';
import { fetchToday, submitGuess, postStats } from '../src/api.js';
import { HINT } from '../src/hint.js';

describe('fetchToday', () => {
  it('응답 본문을 그대로 반환한다 (정답은 포함되지 않는다)', async () => {
    const body = { seed: 20260716, slot: 6, maxAttempts: 6 };
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => body });

    const result = await fetchToday('https://example.com', fetchImpl);

    expect(result).toEqual(body);
    expect(fetchImpl).toHaveBeenCalledWith(new URL('/api/today', 'https://example.com'));
  });

  it('응답이 실패하면 예외를 던진다', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 500 });

    await expect(fetchToday('https://example.com', fetchImpl)).rejects.toThrow(/500/);
  });
});

describe('submitGuess', () => {
  it('시드와 추측을 POST하고 힌트/승리 여부를 반환한다', async () => {
    const body = { hint: [HINT.EXACT, HINT.ABSENT], won: false };
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => body });

    const result = await submitGuess(20260716, ['ㄱ', 'ㅏ'], 'device-1', 'https://example.com', fetchImpl);

    expect(result).toEqual(body);
    expect(fetchImpl).toHaveBeenCalledWith(
      new URL('/api/guess', 'https://example.com'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ seed: 20260716, guess: ['ㄱ', 'ㅏ'], deviceId: 'device-1' }),
      }),
    );
  });

  it('서버가 거부하면(사전에 없는 단어 등) 서버 메시지로 예외를 던진다', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 400, json: async () => ({ error: '사전에 없는 단어예요.' }) });

    await expect(
      submitGuess(20260716, ['ㄱ', 'ㅏ'], 'device-1', 'https://example.com', fetchImpl),
    ).rejects.toThrow('사전에 없는 단어예요.');
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
