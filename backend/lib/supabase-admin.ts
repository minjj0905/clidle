import { createClient } from '@supabase/supabase-js';

/** 서비스 롤 키를 쓰는 서버 전용 클라이언트. RLS를 우회하므로 API 라우트 밖으로 내보내면 안 된다. */
export function supabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 환경변수가 필요합니다.');
  return createClient(url, key, { auth: { persistSession: false } });
}
