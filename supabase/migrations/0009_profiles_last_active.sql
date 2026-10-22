-- 회원 관리 화면(SPEC.md §4-12, 2026-10-22)의 "최근 접속" 표시용.
-- auth.users.last_sign_in_at(실제 재인증 시점만 기록, 세션이 오래 유지되는 이 앱에서는
-- 며칠~몇 주씩 오래된 값일 수 있어 실제 사용 현황과 안 맞을 수 있음)을 대신해,
-- 이미 만들어둔 접속 중 표시(Presence)가 발생할 때마다 이 값을 직접 갱신해서 쓴다.
alter table profiles add column last_active_at timestamptz;

-- profiles 테이블에 애초에 UPDATE 정책이 전혀 없어서, 로그인 콜백에서
-- last_device를 저장하려던 것도 지금까지 조용히 실패하고 있었음(2026-10-22 발견).
-- 본인 행만 수정 가능하도록 정책 추가.
create policy "profiles_update_own" on profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);
