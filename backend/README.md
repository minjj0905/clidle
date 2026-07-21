# CLIDLE 백엔드

Vercel(Next.js API + 관리자 백오피스) + Supabase(Postgres)로 오늘의 단어 제공, 통계 수집, 단어 관리를 담당한다.

## 최초 설정

1. **Supabase 프로젝트 생성** (https://supabase.com) 후 SQL Editor에서 `../supabase/schema.sql` 실행
2. **관리자 계정 등록**
   - Supabase Dashboard → Authentication → Users에서 본인 이메일로 유저 생성(비밀번호 지정)
   - SQL Editor에서 `insert into admins (email) values ('본인이메일');`
3. **환경변수 설정** — `.env.example` 참고해 `.env.local` 생성 (로컬용) + Vercel 프로젝트 환경변수에도 동일하게 등록
   - `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`: Supabase 프로젝트 설정 → API에서 확인
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`: 위와 동일한 값 (브라우저 로그인 페이지용)
4. **단어 데이터 이관** (루트 디렉토리에서 실행)
   ```
   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run import-words
   ```
5. **(선택) 입력 가능 단어 확충** — `words.is_answer_pool` 컬럼이 필요하므로 먼저 SQL Editor에서
   ```sql
   alter table words add column if not exists is_answer_pool boolean not null default true;
   ```
   실행 후:
   ```
   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/import-nouns.ts
   ```
   `scripts/raw/nouns-raw.txt`(오픈소스 형태소 사전에서 추출한 대량 명사 목록)를 `is_answer_pool=false`로 이관해
   입력(제출)은 되지만 오늘의 정답 후보로는 쓰이지 않는 단어 풀을 넓힌다.

## 로컬 실행

```
npm install
npm run dev   # http://localhost:3000
```

CLI 쪽에서 로컬 백엔드를 바라보게 하려면 루트에서:
```
CLIDLE_API_URL=http://localhost:3000 npm start
```

## Vercel 배포

Vercel 프로젝트 생성 시 **Root Directory를 `backend`로 지정**. 환경변수는 위 4가지를 모두 등록.
배포 후 실제 URL을 `src/api.ts`의 `DEFAULT_API_URL`에 반영해 CLI가 기본으로 그 주소를 쓰도록 갱신할 것.

## 엔드포인트

- `GET /api/today?date=YYYY-MM-DD` — 오늘(또는 지정 날짜)의 슬롯/시도 횟수만 반환 (`{ seed, slot, maxAttempts }`). **정답은 절대 포함하지 않는다.** 최초 조회 시 `daily_puzzles`에 고정 캐시되어 이후 `words` 테이블이 바뀌어도 과거 정답은 변하지 않는다.
- `POST /api/guess` — 추측 채점 (`{ seed, guess }` → `{ hint, won }`). 사전 검증(등재된 단어인지)과 정답 비교 모두 서버에서만 수행하며, 응답에 정답은 절대 포함되지 않는다.
- `POST /api/stats` — 게임 결과 기록 (`{ deviceId, seed, slot, won, attemptCount }`)
- `/admin/login`, `/admin/words`, `/admin/stats` — 관리자 백오피스 (Supabase Auth 이메일 로그인 + `admins` 화이트리스트)
