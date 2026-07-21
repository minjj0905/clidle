import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * PostgREST의 서버 측 기본 max-rows(1000)는 클라이언트의 limit()으로 넘을 수 없으므로,
 * range()로 페이지를 나눠 전체 결과를 모은다.
 */
export async function fetchAllRows<T>(
  buildQuery: (client: SupabaseClient, from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  client: SupabaseClient,
  pageSize = 1000,
): Promise<T[]> {
  const rows: T[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await buildQuery(client, from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;

    rows.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }

  return rows;
}
