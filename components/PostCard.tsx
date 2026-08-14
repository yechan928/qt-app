import Link from 'next/link';
import type { PostWithAuthor } from '@/types/database';

export default function PostCard({ post }: { post: PostWithAuthor }) {
  const excerpt =
    post.content.length > 80 ? `${post.content.slice(0, 80)}...` : post.content;

  return (
    <Link
      href={`/posts/${post.id}`}
      className="block rounded-2xl bg-white p-4 shadow-sm transition hover:shadow-md"
    >
      <p className="text-sm font-medium text-stone-800">{post.profiles.nickname}</p>
      <p className="mt-1 text-stone-700">{excerpt}</p>
      <div className="mt-2 flex gap-4 text-xs text-stone-400">
        {/* 댓글 기능 비활성화 (2026-08-12 사용자 요청) <span>댓글 {post.comment_count}</span> */}
        <span>아멘 {post.amen_count}</span>
      </div>
    </Link>
  );
}
