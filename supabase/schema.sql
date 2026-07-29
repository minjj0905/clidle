-- CLIDLE 백엔드 스키마
-- Supabase SQL Editor에서 그대로 실행하면 된다.

create table if not exists words (
  id bigint generated always as identity primary key,
  display text not null unique,
  jamo text[] not null,
  slot int not null check (slot in (5, 6, 7)),
  is_active boolean not null default true,
  -- true: 오늘의 정답 후보 (큐레이션된 학습용 단어). false: 입력은 허용하지만
  -- 너무 희귀해 정답으로는 부적합한 단어(대량 사전 이관분 등).
  is_answer_pool boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists words_slot_active_idx on words (slot, is_active);
create index if not exists words_slot_answer_pool_idx on words (slot, is_answer_pool) where is_answer_pool;

-- 하루치 정답을 고정 캐시한다. words 테이블이 나중에 바뀌어도
-- 이미 지나간 날짜의 정답은 절대 바뀌지 않도록 하기 위함.
create table if not exists daily_puzzles (
  seed int primary key,
  slot int not null,
  word_id bigint not null references words (id),
  created_at timestamptz not null default now()
);

create table if not exists play_events (
  id bigint generated always as identity primary key,
  device_id uuid not null,
  seed int not null,
  slot int not null,
  won boolean not null,
  attempt_count int not null,
  created_at timestamptz not null default now(),
  unique (device_id, seed)
);

create index if not exists play_events_seed_idx on play_events (seed);

-- /api/guess 제한 판정용. 하루 시도 횟수는 device_id+시드 기준으로 세어 같은 공유기를 쓰는
-- 사용자끼리 서로의 횟수를 깎아먹지 않게 한다. device_id는 클라이언트가 새로 만들어 우회할 수
-- 있으므로 IP 기준으로는 훨씬 느슨한 상한(버스트/일일 총량)만 별도로 건다.
create table if not exists guess_attempts (
  id bigint generated always as identity primary key,
  ip text not null,
  device_id uuid,
  seed int not null,
  valid boolean not null,
  created_at timestamptz not null default now()
);

create index if not exists guess_attempts_ip_seed_idx on guess_attempts (ip, seed);
create index if not exists guess_attempts_ip_created_idx on guess_attempts (ip, created_at);
create index if not exists guess_attempts_device_seed_idx on guess_attempts (device_id, seed);
create index if not exists guess_attempts_device_created_idx on guess_attempts (device_id, created_at);

-- Supabase Auth로 로그인은 누구나 가능하지만,
-- 실제 백오피스 API는 여기 등록된 이메일만 통과시킨다.
create table if not exists admins (
  email text primary key
);

-- RLS: 서버(서비스 롤 키)만 직접 쓰기 가능, 익명 클라이언트는 today API를 통해서만 조회
alter table words enable row level security;
alter table daily_puzzles enable row level security;
alter table play_events enable row level security;
alter table guess_attempts enable row level security;
alter table admins enable row level security;
