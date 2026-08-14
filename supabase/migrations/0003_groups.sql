-- 그룹(방) 단위 나눔 분리. 카톡 단톡방처럼 한 사람이 여러 그룹에 속할 수 있고,
-- 나눔/댓글/아멘은 그룹별로 분리되지만 오늘의 QT(qt_schedule)는 그룹 상관없이 전체 공유한다.
-- SPEC.md §4-8, TODO.md §2 참고. 이 마이그레이션 전에 만들어둔 테스트 글은 group_id가 없어
-- 아무 그룹에도 속하지 않게 되므로(RLS상 아무도 못 봄) 필요하면 직접 지우거나 무시해도 된다.

create table groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now()
);

create table group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  unique (group_id, user_id)
);

alter table posts add column group_id uuid references groups(id) on delete cascade;

create index group_members_user_id_idx on group_members (user_id);
create index posts_group_id_idx on posts (group_id);

-- ============================================================
-- 그룹 생성 / 초대 코드로 참여 — RLS를 우회하는 security definer 함수로만 가능.
-- 클라이언트가 groups/group_members에 직접 insert하지 않는다(그룹 목록 무단 조회·무단 가입 방지).
-- ============================================================

create or replace function create_group(p_name text)
returns groups
language plpgsql
security definer set search_path = public
as $$
declare
  g groups;
  new_code text;
begin
  new_code := substr(md5(random()::text || clock_timestamp()::text), 1, 8);

  insert into groups (name, invite_code, created_by)
  values (p_name, new_code, auth.uid())
  returning * into g;

  insert into group_members (group_id, user_id)
  values (g.id, auth.uid());

  return g;
end;
$$;

create or replace function join_group_by_code(p_code text)
returns groups
language plpgsql
security definer set search_path = public
as $$
declare
  g groups;
begin
  select * into g from groups where invite_code = p_code;
  if not found then
    raise exception '유효하지 않은 초대 코드예요.';
  end if;

  insert into group_members (group_id, user_id)
  values (g.id, auth.uid())
  on conflict (group_id, user_id) do nothing;

  return g;
end;
$$;

grant execute on function create_group(text) to authenticated;
grant execute on function join_group_by_code(text) to authenticated;

-- ============================================================
-- RLS
-- ============================================================

alter table groups enable row level security;
alter table group_members enable row level security;

-- groups: 내가 속한 그룹만 조회 가능 (초대 코드로 임의 그룹을 찾아보는 건 위 함수로만 가능)
create policy "groups_select_member" on groups
  for select to authenticated using (
    exists (select 1 from group_members gm where gm.group_id = groups.id and gm.user_id = auth.uid())
  );

-- group_members: 내 소속만 조회 가능
create policy "group_members_select_own" on group_members
  for select to authenticated using (user_id = auth.uid());

-- posts: 전원 조회 → 같은 그룹 멤버만 조회로 변경
drop policy "posts_select_authenticated" on posts;
create policy "posts_select_group_member" on posts
  for select to authenticated using (
    exists (
      select 1 from group_members gm
      where gm.group_id = posts.group_id and gm.user_id = auth.uid()
    )
  );

drop policy "posts_insert_own" on posts;
create policy "posts_insert_own_group_member" on posts
  for insert to authenticated with check (
    user_id = auth.uid()
    and exists (
      select 1 from group_members gm
      where gm.group_id = posts.group_id and gm.user_id = auth.uid()
    )
  );

-- comments: 전원 조회/작성 → 글이 속한 그룹의 멤버만 조회/작성으로 변경
drop policy "comments_select_authenticated" on comments;
create policy "comments_select_group_member" on comments
  for select to authenticated using (
    exists (
      select 1 from posts p
      join group_members gm on gm.group_id = p.group_id
      where p.id = comments.post_id and gm.user_id = auth.uid()
    )
  );

drop policy "comments_insert_own" on comments;
create policy "comments_insert_own_group_member" on comments
  for insert to authenticated with check (
    user_id = auth.uid()
    and exists (
      select 1 from posts p
      join group_members gm on gm.group_id = p.group_id
      where p.id = comments.post_id and gm.user_id = auth.uid()
    )
  );

-- reactions(아멘): 전원 조회/작성 → 글이 속한 그룹의 멤버만 조회/작성으로 변경
drop policy "reactions_select_authenticated" on reactions;
create policy "reactions_select_group_member" on reactions
  for select to authenticated using (
    exists (
      select 1 from posts p
      join group_members gm on gm.group_id = p.group_id
      where p.id = reactions.post_id and gm.user_id = auth.uid()
    )
  );

drop policy "reactions_insert_own" on reactions;
create policy "reactions_insert_own_group_member" on reactions
  for insert to authenticated with check (
    user_id = auth.uid()
    and exists (
      select 1 from posts p
      join group_members gm on gm.group_id = p.group_id
      where p.id = reactions.post_id and gm.user_id = auth.uid()
    )
  );

-- qt_schedule은 의도적으로 그대로 둠(그룹 상관없이 전체 공유, SPEC.md §4-8 결정).
