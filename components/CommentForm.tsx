'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function CommentForm({ postId, userId }: { postId: string; userId: string }) {
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;

    setSubmitting(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase
      .from('comments')
      .insert({ post_id: postId, user_id: userId, content: content.trim() });

    setSubmitting(false);

    if (error) {
      setError('댓글을 남기지 못했어요. 다시 시도해주세요.');
      return;
    }

    setContent('');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="댓글을 남겨보세요"
        className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
      />
      <button
        type="submit"
        disabled={submitting || !content.trim()}
        className="shrink-0 rounded-lg bg-stone-800 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
      >
        등록
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}
