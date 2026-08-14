'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { CommentWithAuthor } from '@/types/database';

function formatDateTime(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${String(d.getHours()).padStart(2, '0')}:${String(
    d.getMinutes()
  ).padStart(2, '0')}`;
}

export default function CommentList({
  comments,
  userId,
}: {
  comments: CommentWithAuthor[];
  userId: string;
}) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(commentId: string) {
    if (!window.confirm('이 댓글을 삭제할까요?')) return;

    setDeletingId(commentId);
    const supabase = createClient();
    const { error } = await supabase.from('comments').delete().eq('id', commentId);
    setDeletingId(null);

    if (error) {
      window.alert('삭제하지 못했어요. 다시 시도해주세요.');
      return;
    }
    router.refresh();
  }

  if (comments.length === 0) {
    return <p className="text-sm text-stone-400">아직 댓글이 없어요.</p>;
  }

  return (
    <ul className="space-y-3">
      {comments.map((comment) => (
        <li key={comment.id} className="rounded-lg bg-stone-100 p-3">
          <div className="flex items-center justify-between text-xs text-stone-400">
            <span className="font-medium text-stone-600">{comment.profiles.nickname}</span>
            <div className="flex items-center gap-2">
              <span>{formatDateTime(comment.created_at)}</span>
              {comment.user_id === userId && (
                <button
                  onClick={() => handleDelete(comment.id)}
                  disabled={deletingId === comment.id}
                  className="text-stone-400 hover:text-red-600"
                >
                  삭제
                </button>
              )}
            </div>
          </div>
          <p className="mt-1 whitespace-pre-line text-sm text-stone-700">{comment.content}</p>
        </li>
      ))}
    </ul>
  );
}
