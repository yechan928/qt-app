import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import BackButton from '@/components/BackButton';
import RefreshOnMount from '@/components/RefreshOnMount';
import PostBody from '@/components/PostBody';
// 댓글 기능 비활성화 (2026-08-12 사용자 요청) — 복구 시 아래 두 줄 주석 해제
// import CommentList from '@/components/CommentList';
// import CommentForm from '@/components/CommentForm';
import AmenButton from '@/components/AmenButton';
import type { PostWithProfile } from '@/types/database';

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  const { data: postData } = await supabase
    .from('posts')
    .select('*, profiles(nickname, avatar_url)')
    .eq('id', id)
    .single();

  if (!postData) {
    notFound();
  }
  const post = postData as unknown as PostWithProfile;

  const { data: schedule } = await supabase
    .from('qt_schedule')
    .select('title')
    .eq('qt_date', post.qt_date)
    .maybeSingle();

  // 댓글 기능 비활성화 중 — 복구 시 Promise.all에 comments 쿼리 다시 추가
  const { data: reactions } = await supabase
    .from('reactions')
    .select('user_id')
    .eq('post_id', id);

  const amenCount = reactions?.length ?? 0;
  const amenedByMe = (reactions ?? []).some((r) => r.user_id === user.id);

  return (
    <div className="space-y-4">
      <RefreshOnMount />
      <BackButton />
      <PostBody
        post={post}
        authorNickname={post.profiles.nickname}
        qtTitle={schedule?.title ?? null}
        isOwner={post.user_id === user.id}
        userId={user.id}
      />

      <div className="flex justify-center">
        <AmenButton
          postId={id}
          userId={user.id}
          initialAmened={amenedByMe}
          initialCount={amenCount}
        />
      </div>

      {/* 댓글 기능 비활성화 (2026-08-12 사용자 요청) — 복구 시 주석 해제
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-stone-600">댓글</h2>
        <CommentList
          comments={(comments ?? []) as unknown as CommentWithAuthor[]}
          userId={user.id}
        />
        <div className="mt-4">
          <CommentForm postId={id} userId={user.id} />
        </div>
      </div>
      */}
    </div>
  );
}
