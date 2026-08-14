import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import BackButton from '@/components/BackButton';
import PostFeedView from '@/components/PostFeedView';
import GroupMembersPanel from '@/components/GroupMembersPanel';
import type { PostWithAuthor, PostWithProfile } from '@/types/database';

export default async function GroupFeedPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: groupId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // RLS가 멤버 아닌 그룹은 조회 자체를 막으므로, 결과 없음 = 그룹이 없거나 멤버가 아님.
  const { data: group } = await supabase
    .from('groups')
    .select('id, name')
    .eq('id', groupId)
    .maybeSingle();

  if (!group) {
    redirect('/groups');
  }

  const { data: memberRows } = await supabase
    .from('group_members')
    .select('user_id, profiles(nickname)')
    .eq('group_id', groupId);
  const members = (
    (memberRows ?? []) as unknown as { user_id: string; profiles: { nickname: string } }[]
  ).map((m) => ({ userId: m.user_id, nickname: m.profiles.nickname }));

  const { data: shares } = await supabase
    .from('post_shares')
    .select('post_id')
    .eq('group_id', groupId);
  const postIds = (shares ?? []).map((s) => s.post_id);

  const [{ data: posts }, { data: reactions }] = await Promise.all([
    postIds.length > 0
      ? supabase
          .from('posts')
          .select('*, profiles(nickname, avatar_url)')
          .in('id', postIds)
          .order('qt_date', { ascending: false })
          .order('created_at', { ascending: true })
      : Promise.resolve({ data: [] as PostWithProfile[] }),
    supabase.from('reactions').select('post_id, user_id'),
  ]);

  // 댓글 기능 비활성화 중 (2026-08-12 사용자 요청) — 복구 시 위 Promise.all에
  // supabase.from('comments').select('post_id') 추가하고 아래 집계 로직 복원
  // const commentCounts = new Map<string, number>();
  // for (const c of comments ?? []) {
  //   commentCounts.set(c.post_id, (commentCounts.get(c.post_id) ?? 0) + 1);
  // }

  const amenCounts = new Map<string, number>();
  const amenedByMe = new Set<string>();
  for (const r of reactions ?? []) {
    amenCounts.set(r.post_id, (amenCounts.get(r.post_id) ?? 0) + 1);
    if (r.user_id === user.id) amenedByMe.add(r.post_id);
  }

  const postsWithMeta: PostWithAuthor[] = (
    (posts ?? []) as unknown as PostWithProfile[]
  ).map((p) => ({
    ...p,
    comment_count: 0, // 댓글 기능 비활성화 중
    amen_count: amenCounts.get(p.id) ?? 0,
    amened_by_me: amenedByMe.has(p.id),
  }));

  const dates = [...new Set(postsWithMeta.map((p) => p.qt_date))];
  const { data: schedules } =
    dates.length > 0
      ? await supabase.from('qt_schedule').select('qt_date, title').in('qt_date', dates)
      : { data: [] as { qt_date: string; title: string }[] };

  const titleByDate: Record<string, string> = {};
  for (const s of schedules ?? []) {
    titleByDate[s.qt_date] = s.title;
  }

  return (
    <div className="space-y-4">
      <BackButton />
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-stone-800">{group.name}</h1>
        <div className="flex items-center gap-2">
          <Link
            href={`/posts/new?group=${groupId}`}
            className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white"
          >
            나눔 쓰기
          </Link>
          <GroupMembersPanel
            groupId={groupId}
            groupName={group.name}
            userId={user.id}
            members={members}
          />
        </div>
      </div>

      <PostFeedView posts={postsWithMeta} titleByDate={titleByDate} />
    </div>
  );
}
