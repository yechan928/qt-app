-- QT 나눔 — 초기 스키마
-- PLAN.md §B 기준. Supabase SQL Editor 또는 `supabase db push`로 적용.

-- ============================================================
-- 테이블
-- ============================================================

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null,
  avatar_url text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table bible_verses (
  id bigserial primary key,
  book text not null,
  chapter int not null,
  verse int not null,
  text text not null,
  version text not null default '개역한글',
  unique (book, chapter, verse, version)
);

create table posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  qt_date date not null default current_date,
  verse_ref text not null,
  verse_text text not null,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create table reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

create table qt_schedule (
  id uuid primary key default gen_random_uuid(),
  qt_date date not null unique,
  title text not null,
  verse_ref text not null,
  verse_text text not null,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 조회 성능용 인덱스 (모임 규모상 필수는 아니지만 비용 없음)
create index posts_created_at_idx on posts (created_at desc);
create index comments_post_id_idx on comments (post_id);
create index reactions_post_id_idx on reactions (post_id);
create index bible_verses_lookup_idx on bible_verses (book, chapter, verse, version);

-- ============================================================
-- updated_at 자동 갱신
-- ============================================================

create function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger posts_set_updated_at
  before update on posts
  for each row execute function set_updated_at();

create trigger qt_schedule_set_updated_at
  before update on qt_schedule
  for each row execute function set_updated_at();

-- ============================================================
-- 카카오 로그인 시 profiles 자동 생성
-- ============================================================

create function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, nickname, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nickname', new.raw_user_meta_data ->> 'name', '이름 없음'),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================
-- RLS
-- ============================================================

alter table profiles enable row level security;
alter table bible_verses enable row level security;
alter table posts enable row level security;
alter table comments enable row level security;
alter table reactions enable row level security;
alter table qt_schedule enable row level security;

-- profiles: 로그인한 모임원 전원이 서로의 프로필을 볼 수 있음
create policy "profiles_select_authenticated" on profiles
  for select to authenticated using (true);

-- bible_verses: 로그인한 모임원 전원 조회 가능, 쓰기는 클라이언트 권한 없음(시딩은 service role)
create policy "bible_verses_select_authenticated" on bible_verses
  for select to authenticated using (true);

-- posts: 전원 조회, 본인만 작성/수정/삭제
create policy "posts_select_authenticated" on posts
  for select to authenticated using (true);

create policy "posts_insert_own" on posts
  for insert to authenticated with check (user_id = auth.uid());

create policy "posts_update_own" on posts
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "posts_delete_own" on posts
  for delete to authenticated using (user_id = auth.uid());

-- comments: 전원 조회, 본인만 작성/삭제(수정 없음 — SPEC §5 "가장 단순한 쪽")
create policy "comments_select_authenticated" on comments
  for select to authenticated using (true);

create policy "comments_insert_own" on comments
  for insert to authenticated with check (user_id = auth.uid());

create policy "comments_delete_own" on comments
  for delete to authenticated using (user_id = auth.uid());

-- reactions(아멘): 전원 조회, 본인만 추가/삭제(토글)
create policy "reactions_select_authenticated" on reactions
  for select to authenticated using (true);

create policy "reactions_insert_own" on reactions
  for insert to authenticated with check (user_id = auth.uid());

create policy "reactions_delete_own" on reactions
  for delete to authenticated using (user_id = auth.uid());

-- qt_schedule: 전원 조회, 쓰기는 관리자만(SPEC §5 인증·권한 예외 조항)
create policy "qt_schedule_select_authenticated" on qt_schedule
  for select to authenticated using (true);

create policy "qt_schedule_insert_admin" on qt_schedule
  for insert to authenticated with check (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

create policy "qt_schedule_update_admin" on qt_schedule
  for update to authenticated using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  ) with check (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

create policy "qt_schedule_delete_admin" on qt_schedule
  for delete to authenticated using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );
