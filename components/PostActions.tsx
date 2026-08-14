'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function PostActions({
  postId,
  onEdit,
}: {
  postId: string;
  onEdit: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    if (!window.confirm('이 나눔을 삭제할까요?')) return;

    setDeleting(true);
    const supabase = createClient();
    const { error } = await supabase.from('posts').delete().eq('id', postId);
    setDeleting(false);

    if (error) {
      window.alert('삭제하지 못했어요. 다시 시도해주세요.');
      return;
    }
    router.push('/');
    router.refresh();
  }

  return (
    <div className="flex gap-3 text-sm text-stone-400">
      <button onClick={onEdit} className="hover:text-stone-700">
        수정
      </button>
      <button onClick={handleDelete} disabled={deleting} className="hover:text-red-600">
        삭제
      </button>
    </div>
  );
}
