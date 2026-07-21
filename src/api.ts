export interface TodayWordResponse {
  seed: number;
  slot: number;
  jamo: string[];
  display: string;
  maxAttempts: number;
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
 * 오늘의 단어를 서버에서 받아온다. 실패 시 예외를 던진다(게임을 시작할 수 없으므로).
 */
export async function fetchTodayWord(
  baseUrl: string = DEFAULT_API_URL,
  fetchImpl: typeof fetch = fetch,
): Promise<TodayWordResponse> {
  const res = await fetchImpl(new URL('/api/today', baseUrl));
  if (!res.ok) {
    throw new Error(`오늘의 단어를 가져오지 못했습니다 (HTTP ${res.status}). 네트워크 연결을 확인해주세요.`);
  }
  return (await res.json()) as TodayWordResponse;
}

/**
 * 슬롯(자모 개수)에 해당하는 유효 단어 목록의 자모 배열을 받아온다.
 * 사전에 없는 자모 조합의 제출을 막는 데 사용한다. 실패 시 예외를 던진다.
 */
export async function fetchValidWords(
  slot: number,
  baseUrl: string = DEFAULT_API_URL,
  fetchImpl: typeof fetch = fetch,
): Promise<string[][]> {
  const url = new URL('/api/words', baseUrl);
  url.searchParams.set('slot', String(slot));
  const res = await fetchImpl(url);
  if (!res.ok) {
    throw new Error(`단어 목록을 가져오지 못했습니다 (HTTP ${res.status}). 네트워크 연결을 확인해주세요.`);
  }
  const body = (await res.json()) as { jamo: string[][] };
  return body.jamo;
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
