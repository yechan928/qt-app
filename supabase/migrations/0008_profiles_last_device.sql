-- 회원 관리 화면(SPEC.md §4-12, 2026-10-22)의 "최근 접속 기기" 표시용.
-- 로그인 콜백(app/auth/callback/route.ts)에서 User-Agent로 분류해 매번 갱신한다.
alter table profiles add column last_device text;
