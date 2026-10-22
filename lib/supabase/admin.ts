import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

// 서비스 롤 키로 RLS를 완전히 우회하는 클라이언트 — auth.users(last_sign_in_at 등)처럼
// 일반 RLS 클라이언트로는 조회 불가능한 Supabase Auth 내부 데이터를 위해서만 존재한다
// (SPEC.md §4-12·§5, PLAN.md §L). 반드시 서버 전용 코드에서, 그것도 요청자가 관리자인지
// 먼저 확인한 뒤에만 호출할 것 — 현재는 app/(protected)/members/page.tsx에서만 쓴다.
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
