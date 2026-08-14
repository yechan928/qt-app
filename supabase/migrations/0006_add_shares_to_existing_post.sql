-- 나눔 쓰기가 "하루에 하나" 개념으로 바뀜 — 오늘(또는 고른 날짜)에 이미 쓴 글이 있으면
-- 그 글을 이어서 수정하고, 그 상태에서 "공유하기"를 누르면 새 글이 아니라 "이미 있는 글에
-- 그룹을 추가로 공유"해야 한다. create_post_with_shares는 새 글 생성 전용이라 별도 함수 필요.
-- SPEC.md §4-2 결정(2026-08-12 7차 수정) 참고.

create or replace function add_shares_to_post(p_post_id uuid, p_group_ids uuid[])
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  gid uuid;
begin
  if not exists (select 1 from posts where id = p_post_id and user_id = auth.uid()) then
    raise exception '본인 글만 공유할 수 있어요.';
  end if;

  if p_group_ids is null or array_length(p_group_ids, 1) is null then
    return;
  end if;

  foreach gid in array p_group_ids loop
    if not exists (
      select 1 from group_members where group_id = gid and user_id = auth.uid()
    ) then
      raise exception '속하지 않은 그룹에는 공유할 수 없어요.';
    end if;
  end loop;

  insert into post_shares (post_id, group_id)
  select p_post_id, unnest(p_group_ids)
  on conflict (post_id, group_id) do nothing;
end;
$$;

grant execute on function add_shares_to_post(uuid, uuid[]) to authenticated;
