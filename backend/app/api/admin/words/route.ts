import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../lib/supabase-server';
import { supabaseAdmin } from '../../../../lib/supabase-admin';

const HANGUL_ONLY = /^[가-힣]+$/;

export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: '권한이 없습니다.' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const slot = searchParams.get('slot');
  const search = searchParams.get('search');

  let query = supabaseAdmin().from('words').select('id, display, jamo, slot, is_active, is_answer_pool, created_at').order('id', { ascending: false }).limit(200);
  if (slot) query = query.eq('slot', Number(slot));
  if (search) query = query.ilike('display', `%${search}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ words: data });
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: '권한이 없습니다.' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const display = typeof body?.display === 'string' ? body.display.trim() : '';
  if (!HANGUL_ONLY.test(display)) {
    return NextResponse.json({ error: '한글 단어만 입력할 수 있습니다.' }, { status: 400 });
  }

  const jamo = decomposeWord(display);
  if (!jamo || jamo.length < 5 || jamo.length > 7) {
    return NextResponse.json({ error: '자모 5~7개로 분해되는 단어만 등록할 수 있습니다.' }, { status: 400 });
  }

  // is_answer_pool을 지정하지 않으면 컬럼 기본값(true)이 들어가 바로 정답 후보가 된다.
  const isAnswerPool = typeof body?.isAnswerPool === 'boolean' ? body.isAnswerPool : true;

  const { data, error } = await supabaseAdmin()
    .from('words')
    .insert({ display, jamo, slot: jamo.length, is_answer_pool: isAnswerPool })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ word: data }, { status: 201 });
}

// --- scripts/preprocess.ts의 분해 로직과 동일 (server 쪽에서 새 단어 등록 시 재사용) ---
const CHOSEONG = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
const JUNGSEONG = ['ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ', 'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ'];
const JONGSEONG = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
const VOWEL_DECOMPOSE: Record<string, string[]> = {
  ㅐ: ['ㅏ', 'ㅣ'], ㅒ: ['ㅑ', 'ㅣ'], ㅔ: ['ㅓ', 'ㅣ'], ㅖ: ['ㅕ', 'ㅣ'],
  ㅘ: ['ㅗ', 'ㅏ'], ㅙ: ['ㅗ', 'ㅏ', 'ㅣ'], ㅚ: ['ㅗ', 'ㅣ'],
  ㅝ: ['ㅜ', 'ㅓ'], ㅞ: ['ㅜ', 'ㅓ', 'ㅣ'], ㅟ: ['ㅜ', 'ㅣ'],
  ㅢ: ['ㅡ', 'ㅣ'],
};
const JONGSEONG_DECOMPOSE: Record<string, string[]> = {
  ㄳ: ['ㄱ', 'ㅅ'], ㄵ: ['ㄴ', 'ㅈ'], ㄶ: ['ㄴ', 'ㅎ'],
  ㄺ: ['ㄹ', 'ㄱ'], ㄻ: ['ㄹ', 'ㅁ'], ㄼ: ['ㄹ', 'ㅂ'],
  ㄽ: ['ㄹ', 'ㅅ'], ㄾ: ['ㄹ', 'ㅌ'], ㄿ: ['ㄹ', 'ㅍ'],
  ㅀ: ['ㄹ', 'ㅎ'], ㅄ: ['ㅂ', 'ㅅ'],
};
// 쌍자음은 같은 단자음 키를 두 번 눌러 입력하므로 슬롯도 하나로 합치지 않고 둘로 풀어 쓴다.
const DOUBLE_TO_SINGLE: Record<string, [string, string]> = {
  ㄲ: ['ㄱ', 'ㄱ'], ㄸ: ['ㄷ', 'ㄷ'], ㅃ: ['ㅂ', 'ㅂ'], ㅆ: ['ㅅ', 'ㅅ'], ㅉ: ['ㅈ', 'ㅈ'],
};
const HANGUL_BASE = 0xac00;
const HANGUL_LAST = 0xd7a3;

function decomposeWord(word: string): string[] | null {
  const jamo: string[] = [];
  for (const char of word) {
    const code = char.charCodeAt(0);
    if (code < HANGUL_BASE || code > HANGUL_LAST) return null;
    const offset = code - HANGUL_BASE;
    const cho = CHOSEONG[Math.floor(offset / (21 * 28))];
    const jung = JUNGSEONG[Math.floor((offset % (21 * 28)) / 28)];
    const jong = JONGSEONG[offset % 28];
    jamo.push(...(DOUBLE_TO_SINGLE[cho] ?? [cho]), ...(VOWEL_DECOMPOSE[jung] ?? [jung]));
    if (jong) jamo.push(...(JONGSEONG_DECOMPOSE[jong] ?? DOUBLE_TO_SINGLE[jong] ?? [jong]));
  }
  return jamo;
}
