-- 그룹원 목록 사이드 패널 + 그룹 나가기 기능(2026-08-14 사용자 요청, SPEC.md §4-11 참고).
--
-- 기존 group_members_select_own 정책은 "내 소속 행만" 조회 가능해서, 같은 그룹의
-- 다른 멤버 목록을 가져올 방법이 없었다. "내가 속한 그룹이면 그 그룹의 다른 멤버도
-- 볼 수 있다"로 넓혀야 하는데, group_members 정책 안에서 group_members를 직접
-- 셀프 조회하면 무한 재귀 에러가 나므로(Postgres RLS 알려진 함정), security definer
-- 함수로 멤버십 체크를 우회한다.

create or replace function is_group_member(p_group_id uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from group_members
    where group_id = p_group_id and user_id = auth.uid()
  );
$$;

grant execute on function is_group_member(uuid) to authenticated;

drop policy "group_members_select_own" on group_members;
create policy "group_members_select_fellow_members" on group_members
  for select to authenticated using (
    is_group_member(group_members.group_id)
  );

-- 그룹 나가기: 본인 소속 행만 삭제 가능. 그룹 삭제·멤버 추방 기능은 여전히 없음(SPEC §6).
create policy "group_members_delete_own" on group_members
  for delete to authenticated using (user_id = auth.uid());
