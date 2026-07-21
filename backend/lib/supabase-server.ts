import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { supabaseAdmin } from './supabase-admin';

type CookieToSet = { name: string; value: string; options: CookieOptions };

/** 관리자 백오피스 요청의 로그인 세션을 쿠키에서 읽는 서버 클라이언트. */
export async function supabaseServer() {
  const cookieStore = await cookies();
  const url = process.env.SUPABASE_URL!;
  const anonKey = process.env.SUPABASE_ANON_KEY!;

  return createServerClient(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet: CookieToSet[]) => {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Component에서 호출되면 쓰기가 무시된다 (middleware가 세션 갱신을 담당).
        }
      },
    },
  });
}

/**
 * 현재 세션의 이메일이 admins 화이트리스트에 있는지 확인한다.
 * admins 조회는 RLS를 우회하는 서비스 롤로 수행한다 (세션 클라이언트는 auth 확인 용도만).
 */
export async function requireAdmin() {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return null;

  const { data } = await supabaseAdmin().from('admins').select('email').eq('email', user.email).maybeSingle();
  return data ? user : null;
}
