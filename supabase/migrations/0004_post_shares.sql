-- 나눔 글 하나를 여러 그룹에 동시에 공유할 수 있도록(카톡 공유하기처럼) 구조 변경.
-- posts.group_id(1:1 소속)를 없애고, post_shares(N:M "이 글이 어느 그룹들에 보이는지")로 교체.
-- SPEC.md §4-2·§4-8 참고(2026-08-12 3차 결정).

create table post_shares (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  group_id uuid not null references groups(id) on delete cascade,
  shared_at timestamptz not null default now(),
  unique (post_id, group_id)
);

create index post_shares_group_id_idx on post_shares (group_id);
create index post_shares_post_id_idx on post_shares (post_id);

-- ============================================================
-- 글 작성 + 공유를 한 트랜잭션으로 — 클라이언트가 posts/post_shares에 직접 insert하지 않음.
-- (둘을 따로 insert하면 두 번째가 실패했을 때 "아무 그룹에도 공유 안 된 유령 글"이 생길 수 있어서 원자적으로 처리)
-- ============================================================

create or replace function create_post_with_shares(
  p_qt_date date,
  p_verse_ref text,
  p_verse_text text,
  p_content text,
  p_group_ids uuid[]
)
returns posts
language plpgsql
security definer set search_path = public
as $$
declare
  new_post posts;
  gid uuid;
begin
  if p_group_ids is null or array_length(p_group_ids, 1) is null then
    raise exception '공유할 그룹을 하나 이상 선택해주세요.';
  end if;

  foreach gid in array p_group_ids loop
    if not exists (
      select 1 from group_members where group_id = gid and user_id = auth.uid()
    ) then
      raise exception '속하지 않은 그룹에는 공유할 수 없어요.';
    end if;
  end loop;

  insert into posts (user_id, qt_date, verse_ref, verse_text, content)
  values (auth.uid(), p_qt_date, p_verse_ref, p_verse_text, p_content)
  returning * into new_post;

  insert into post_shares (post_id, group_id)
  select new_post.id, unnest(p_group_ids);

  return new_post;
end;
$$;

grant execute on function create_post_with_shares(date, text, text, text, uuid[]) to authenticated;

-- ============================================================
-- RLS
-- ============================================================

alter table post_shares enable row level security;

create policy "post_shares_select_group_member" on post_shares
  for select to authenticated using (
    exists (select 1 from group_members gm where gm.group_id = post_shares.group_id and gm.user_id = auth.uid())
  );

-- posts: 기존 group_id 기반 정책부터 지워야 group_id 컬럼을 드롭할 수 있음(아래에서 드롭).
drop policy if exists "posts_select_group_member" on posts;
create policy "posts_select_shared_group_member" on posts
  for select to authenticated using (
    exists (
      select 1 from post_shares ps
      join group_members gm on gm.group_id = ps.group_id
      where ps.post_id = posts.id and gm.user_id = auth.uid()
    )
  );

drop policy if exists "posts_insert_own_group_member" on posts;

-- comments: 그룹 체크 기준을 posts.group_id 대신 post_shares 경유로 변경
drop policy "comments_select_group_member" on comments;
create policy "comments_select_shared_group_member" on comments
  for select to authenticated using (
    exists (
      select 1 from post_shares ps
      join group_members gm on gm.group_id = ps.group_id
      where ps.post_id = comments.post_id and gm.user_id = auth.uid()
    )
  );

drop policy "comments_insert_own_group_member" on comments;
create policy "comments_insert_own_shared_group_member" on comments
  for insert to authenticated with check (
    user_id = auth.uid()
    and exists (
      select 1 from post_shares ps
      join group_members gm on gm.group_id = ps.group_id
      where ps.post_id = comments.post_id and gm.user_id = auth.uid()
    )
  );

-- reactions(아멘): 위와 동일하게 교체
drop policy "reactions_select_group_member" on reactions;
create policy "reactions_select_shared_group_member" on reactions
  for select to authenticated using (
    exists (
      select 1 from post_shares ps
      join group_members gm on gm.group_id = ps.group_id
      where ps.post_id = reactions.post_id and gm.user_id = auth.uid()
    )
  );

drop policy "reactions_insert_own_group_member" on reactions;
create policy "reactions_insert_own_shared_group_member" on reactions
  for insert to authenticated with check (
    user_id = auth.uid()
    and exists (
      select 1 from post_shares ps
      join group_members gm on gm.group_id = ps.group_id
      where ps.post_id = reactions.post_id and gm.user_id = auth.uid()
    )
  );

-- 이제 group_id를 참조하는 정책이 하나도 안 남았으니 안전하게 컬럼 드롭 가능.
alter table posts drop column if exists group_id;
