'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type Member = { userId: string; nickname: string };

export default function GroupMembersPanel({
  groupId,
  groupName,
  userId,
  members,
}: {
  groupId: string;
  groupName: string;
  userId: string;
  members: Member[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);

  async function handleLeave() {
    if (!window.confirm(`"${groupName}" 그룹에서 나갈까요?`)) return;

    setLeaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', userId);

    setLeaving(false);
    if (error) {
      window.alert('그룹을 나가지 못했어요. 다시 시도해주세요.');
      return;
    }
    router.push('/groups');
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="그룹원 목록"
        className="rounded-lg border border-stone-300 px-3 py-2 text-stone-600"
      >
        ☰
      </button>

      {open && (
        <div className="fixed inset-0 z-20 bg-black/40" onClick={() => setOpen(false)}>
          <div
            className="absolute right-0 top-0 flex h-full w-64 max-w-[75%] flex-col bg-white p-5 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-stone-700">그룹원 {members.length}</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-stone-400 hover:text-stone-700"
              >
                ✕
              </button>
            </div>

            <ul className="mt-4 flex-1 space-y-3 overflow-y-auto">
              {members.map((m) => (
                <li key={m.userId} className="text-sm text-stone-700">
                  {m.nickname}
                  {m.userId === userId && <span className="ml-1 text-stone-400">(나)</span>}
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={handleLeave}
              disabled={leaving}
              className="mt-4 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 disabled:opacity-50"
            >
              {leaving ? '나가는 중...' : '그룹 나가기'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
