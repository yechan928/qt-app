'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type Props = {
  postId: string;
  userId: string;
  initialAmened: boolean;
  initialCount: number;
};

export default function AmenButton({ postId, userId, initialAmened, initialCount }: Props) {
  const [amened, setAmened] = useState(initialAmened);
  const [count, setCount] = useState(initialCount);
  const [pending, setPending] = useState(false);

  async function toggle() {
    if (pending) return;
    setPending(true);

    const next = !amened;
    setAmened(next);
    setCount((c) => c + (next ? 1 : -1));

    const supabase = createClient();
    const { error } = next
      ? await supabase.from('reactions').insert({ post_id: postId, user_id: userId })
      : await supabase.from('reactions').delete().eq('post_id', postId).eq('user_id', userId);

    if (error) {
      // 실패 시 낙관적 업데이트 롤백
      setAmened(!next);
      setCount((c) => c + (next ? -1 : 1));
    }
    setPending(false);
  }

  return (
    <button
      onClick={toggle}
      disabled={pending}
      className={
        amened
          ? 'rounded-full bg-amber-500 px-4 py-2 text-sm font-medium text-white'
          : 'rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-600 hover:border-amber-400'
      }
    >
      아멘 🙌 {count}
    </button>
  );
}
