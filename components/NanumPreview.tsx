'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import ShareGroupModal from '@/components/ShareGroupModal';
import type { Post, QtSection } from '@/types/database';

// "나눔 쓰기" 화면에서 이미 그 날짜에 쓴 글이 있을 때 보여주는 읽기 전용 카드.
// 내용 수정은 상세 페이지로 넘기고, 공유만 여기서 add_shares_to_post로 바로 처리한다.
// 구절 표시는 글 저장 시점의 스냅샷(post.verse_text) 대신, 그 날짜 qt_schedule의 현재 소주제 구성을
// 그대로 써서 작성 폼(PostForm)과 똑같은 모양으로 보여준다(2026-08-13, DailyNanum이 이미 들고 있는
// 스케줄 정보를 재사용 — 관리자가 나중에 소주제를 바꾸면 이 화면도 최신 구성을 따라감).
export default function NanumPreview({
  post,
  title,
  sections,
}: {
  post: Post;
  title: string;
  sections: QtSection[];
}) {
  const [showShareModal, setShowShareModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shared, setShared] = useState(false);

  async function handleShare(groupIds: string[]) {
    setSubmitting(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.rpc('add_shares_to_post', {
      p_post_id: post.id,
      p_group_ids: groupIds,
    });

    setSubmitting(false);
    if (error) {
      setError('공유하지 못했어요. 다시 시도해주세요.');
      return;
    }
    setShowShareModal(false);
    setShared(true);
  }

  return (
    <div className="space-y-3 rounded-2xl bg-white p-5 shadow-sm">
      {title && <h2 className="text-lg font-semibold text-stone-800">{title}</h2>}
      <p className="text-sm font-medium text-amber-700">{post.verse_ref}</p>
      {sections.length > 0 ? (
        <div className="space-y-4">
          {sections.map((section, i) => (
            <div key={i}>
              <h4 className="mb-1 text-sm font-medium text-amber-700">{section.heading}</h4>
              <div className="whitespace-pre-line rounded-lg bg-stone-100 p-4 text-sm leading-relaxed text-stone-600">
                {section.verse_text}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="whitespace-pre-line rounded-lg bg-stone-100 p-4 text-sm leading-relaxed text-stone-600">
          {post.verse_text}
        </div>
      )}
      <p className="text-sm font-medium text-amber-700">나눔</p>
      <div className="whitespace-pre-line rounded-lg bg-amber-50 p-4 text-stone-800">
        {post.content}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {shared && <p className="text-sm text-amber-700">공유했어요.</p>}
      <div className="flex gap-2">
        <Link
          href={`/posts/${post.id}`}
          className="rounded-lg border border-stone-300 px-5 py-2 text-sm font-medium text-stone-700"
        >
          수정하기
        </Link>
        <button
          type="button"
          onClick={() => setShowShareModal(true)}
          className="rounded-lg bg-amber-600 px-5 py-2 text-sm font-medium text-white"
        >
          공유하기
        </button>
      </div>

      {showShareModal && (
        <ShareGroupModal
          initialSelected={[]}
          submitting={submitting}
          onConfirm={handleShare}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
}
