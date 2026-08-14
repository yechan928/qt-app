'use client';

import { useState } from 'react';
import PostForm from '@/components/PostForm';
import PostActions from '@/components/PostActions';
import type { Post } from '@/types/database';

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export default function PostBody({
  post,
  authorNickname,
  qtTitle,
  isOwner,
  userId,
}: {
  post: Post;
  authorNickname: string;
  qtTitle: string | null;
  isOwner: boolean;
  userId: string;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return <PostForm mode="edit" post={post} userId={userId} onDone={() => setEditing(false)} />;
  }

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between text-xs text-stone-400">
        <span>
          {authorNickname} · {formatDate(post.qt_date)}
        </span>
        {isOwner && <PostActions postId={post.id} onEdit={() => setEditing(true)} />}
      </div>
      {qtTitle && <p className="mt-2 text-sm font-medium text-amber-700">{qtTitle}</p>}
      <div className="mt-2 whitespace-pre-line rounded-lg bg-amber-50 p-4 text-stone-800">
        {post.content}
      </div>
    </div>
  );
}
