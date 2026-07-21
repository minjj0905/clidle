import type { Hint } from './hint.js';

export interface TodayResponse {
  seed: number;
  slot: number;
  maxAttempts: number;
}

export interface GuessResponse {
  hint: Hint[];
  won: boolean;
}

export interface StatsEvent {
  deviceId: string;
  seed: number;
  slot: number;
  won: boolean;
  attemptCount: number;
}

/** 배포된 백엔드 URL. 로컬 개발/테스트 시 CLIDLE_API_URL 환경변수로 덮어쓸 수 있다. */
export const DEFAULT_API_URL = process.env.CLIDLE_API_URL ?? 'https://clidle.vercel.app';

/**
 * 오늘의 슬롯/시도 횟수를 서버에서 받아온다. 정답은 절대 내려오지 않는다.
 * 실패 시 예외를 던진다(게임을 시작할 수 없으므로).
 */
export async function fetchToday(
  baseUrl: string = DEFAULT_API_URL,
  fetchImpl: typeof fetch = fetch,
): Promise<TodayResponse> {
  const res = await fetchImpl(new URL('/api/today', baseUrl));
  if (!res.ok) {
    throw new Error(`오늘의 문제를 가져오지 못했습니다 (HTTP ${res.status}). 네트워크 연결을 확인해주세요.`);
  }
  return (await res.json()) as TodayResponse;
}

/**
 * 추측을 서버에 보내 채점 받는다. 사전 검증(등재된 단어인지)과 정답 비교 모두 서버에서만
 * 이뤄지며, 정답 자체는 응답에 포함되지 않는다. 사전에 없는 단어 등 서버가 거부한 경우
 * 서버가 준 메시지로 예외를 던진다.
 */
export async function submitGuess(
  seed: number,
  guess: string[],
  baseUrl: string = DEFAULT_API_URL,
  fetchImpl: typeof fetch = fetch,
): Promise<GuessResponse> {
  const res = await fetchImpl(new URL('/api/guess', baseUrl), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ seed, guess }),
  });
  const body = await res.json().catch(() => null) as (GuessResponse & { error?: string }) | null;
  if (!res.ok) {
    throw new Error(body?.error ?? `채점에 실패했습니다 (HTTP ${res.status}). 네트워크 연결을 확인해주세요.`);
  }
  return body as GuessResponse;
}

/**
 * 게임 결과를 서버 통계로 전송한다. 실패해도 로컬 통계/게임 진행에는 영향을 주지 않는다.
 */
export async function postStats(
  event: StatsEvent,
  baseUrl: string = DEFAULT_API_URL,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  try {
    await fetchImpl(new URL('/api/stats', baseUrl), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });
  } catch {
    // 네트워크 실패는 무시한다.
  }
}
