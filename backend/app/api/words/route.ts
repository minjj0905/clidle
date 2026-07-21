import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase-admin';
import { fetchAllRows } from '../../../lib/fetch-all';

/**
 * 슬롯(자모 개수)에 해당하는 유효 단어 목록의 자모 배열만 내려준다.
 * 오늘의 정답이 어느 것인지는 알 수 없으므로(전체 후보 중 하나) 스포일러가 아니다.
 * 클라이언트가 "사전에 없는 자모 조합" 제출을 막는 데 사용한다.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slot = Number(searchParams.get('slot'));
  if (![5, 6, 7].includes(slot)) {
    return NextResponse.json({ error: 'slot은 5, 6, 7 중 하나여야 합니다.' }, { status: 400 });
  }

  try {
    const rows = await fetchAllRows<{ jamo: string[] }>(
      (client, from, to) =>
        client.from('words').select('jamo').eq('slot', slot).eq('is_active', true).order('id', { ascending: true }).range(from, to),
      supabaseAdmin(),
    );
    return NextResponse.json({ jamo: rows.map((w) => w.jamo) });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
