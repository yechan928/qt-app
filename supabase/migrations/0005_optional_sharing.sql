-- 공유는 선택사항으로 변경 — 그룹을 하나도 안 골라도 나눔은 저장되고(개인 기록),
-- 작성자 본인은 공유 여부와 상관없이 항상 자기 글을 볼 수 있어야 한다.
-- SPEC.md §4-2 결정(2026-08-12 4차 수정) 참고.

create or replace function create_post_with_shares(
  p_qt_date date,
  p_verse_ref text,
  p_verse_text text,
  p_content text,
  p_group_ids uuid[] default '{}'::uuid[]
)
returns posts
language plpgsql
security definer set search_path = public
as $$
declare
  new_post posts;
  gid uuid;
begin
  if p_group_ids is not null then
    foreach gid in array p_group_ids loop
      if not exists (
        select 1 from group_members where group_id = gid and user_id = auth.uid()
      ) then
        raise exception '속하지 않은 그룹에는 공유할 수 없어요.';
      end if;
    end loop;
  end if;

  insert into posts (user_id, qt_date, verse_ref, verse_text, content)
  values (auth.uid(), p_qt_date, p_verse_ref, p_verse_text, p_content)
  returning * into new_post;

  if p_group_ids is not null and array_length(p_group_ids, 1) > 0 then
    insert into post_shares (post_id, group_id)
    select new_post.id, unnest(p_group_ids);
  end if;

  return new_post;
end;
$$;

-- posts: 작성자 본인은 공유 여부 상관없이 항상 조회 가능 + 공유받은 그룹 멤버도 조회 가능
drop policy "posts_select_shared_group_member" on posts;
create policy "posts_select_own_or_shared_group_member" on posts
  for select to authenticated using (
    user_id = auth.uid()
    or exists (
      select 1 from post_shares ps
      join group_members gm on gm.group_id = ps.group_id
      where ps.post_id = posts.id and gm.user_id = auth.uid()
    )
  );

-- comments: 글 작성자 본인 글이면(공유 안 했어도) 댓글 조회·작성 가능 + 공유받은 그룹 멤버도 가능
drop policy "comments_select_shared_group_member" on comments;
create policy "comments_select_own_post_or_shared_group_member" on comments
  for select to authenticated using (
    exists (
      select 1 from posts p
      where p.id = comments.post_id
        and (
          p.user_id = auth.uid()
          or exists (
            select 1 from post_shares ps
            join group_members gm on gm.group_id = ps.group_id
            where ps.post_id = p.id and gm.user_id = auth.uid()
          )
        )
    )
  );

drop policy "comments_insert_own_shared_group_member" on comments;
create policy "comments_insert_own_visible_post" on comments
  for insert to authenticated with check (
    user_id = auth.uid()
    and exists (
      select 1 from posts p
      where p.id = comments.post_id
        and (
          p.user_id = auth.uid()
          or exists (
            select 1 from post_shares ps
            join group_members gm on gm.group_id = ps.group_id
            where ps.post_id = p.id and gm.user_id = auth.uid()
          )
        )
    )
  );

-- reactions(아멘): comments와 동일한 패턴
drop policy "reactions_select_shared_group_member" on reactions;
create policy "reactions_select_own_post_or_shared_group_member" on reactions
  for select to authenticated using (
    exists (
      select 1 from posts p
      where p.id = reactions.post_id
        and (
          p.user_id = auth.uid()
          or exists (
            select 1 from post_shares ps
            join group_members gm on gm.group_id = ps.group_id
            where ps.post_id = p.id and gm.user_id = auth.uid()
          )
        )
    )
  );

drop policy "reactions_insert_own_shared_group_member" on reactions;
create policy "reactions_insert_own_visible_post" on reactions
  for insert to authenticated with check (
    user_id = auth.uid()
    and exists (
      select 1 from posts p
      where p.id = reactions.post_id
        and (
          p.user_id = auth.uid()
          or exists (
            select 1 from post_shares ps
            join group_members gm on gm.group_id = ps.group_id
            where ps.post_id = p.id and gm.user_id = auth.uid()
          )
        )
    )
  );
