import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import MembersAdminView from '@/components/MembersAdminView';
import type { MemberRow } from '@/components/MembersAdminView';

// 관리자 전용, 조회 전용 회원 관리 화면. SPEC.md §4-12 참고.
export default async function MembersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) {
    redirect('/');
  }

  // profiles/posts는 RLS가 이미 모든 로그인 사용자에게 select를 허용해서(PLAN.md §B)
  // 일반 클라이언트로 충분하다. group_members만 "내가 속한 그룹만" RLS라(PLAN.md §K),
  // 관리자가 속하지 않은 그룹까지 포함한 전체 소속 현황을 보려면 서비스 롤 키가 필요하다.
  // 이 요청자가 관리자인지는 위에서 이미 확인했다(SPEC.md §5).
  const admin = createAdminClient();

  const [{ data: profiles }, { data: memberships }, { data: posts }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, nickname, created_at, last_device, last_active_at')
      .order('created_at'),
    admin.from('group_members').select('user_id, groups(name)'),
    supabase.from('posts').select('user_id, qt_date'),
  ]);

  const groupsByUser = new Map<string, string[]>();
  for (const row of (memberships ?? []) as unknown as { user_id: string; groups: { name: string } | null }[]) {
    const list = groupsByUser.get(row.user_id) ?? [];
    if (row.groups?.name) list.push(row.groups.name);
    groupsByUser.set(row.user_id, list);
  }

  const postStatsByUser = new Map<string, { count: number; lastDate: string }>();
  for (const post of posts ?? []) {
    const prev = postStatsByUser.get(post.user_id);
    if (!prev) {
      postStatsByUser.set(post.user_id, { count: 1, lastDate: post.qt_date });
    } else {
      prev.count += 1;
      if (post.qt_date > prev.lastDate) prev.lastDate = post.qt_date;
    }
  }

  const members: MemberRow[] = (profiles ?? []).map((p) => ({
    id: p.id,
    nickname: p.nickname,
    createdAt: p.created_at,
    lastDevice: p.last_device,
    groups: groupsByUser.get(p.id) ?? [],
    postCount: postStatsByUser.get(p.id)?.count ?? 0,
    lastPostDate: postStatsByUser.get(p.id)?.lastDate ?? null,
    lastActiveAt: p.last_active_at,
  }));

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-stone-800">회원 관리</h1>
      <MembersAdminView members={members} currentUserId={user.id} />
    </div>
  );
}
