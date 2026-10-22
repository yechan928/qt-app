'use client';

import { useEffect, useState } from 'react';
import { getOnlineUserIds, onPresenceSync } from '@/lib/presence';

export type MemberRow = {
  id: string;
  nickname: string;
  createdAt: string;
  lastDevice: 'mobile' | 'desktop' | null;
  groups: string[];
  postCount: number;
  lastPostDate: string | null;
  lastSignInAt: string | null;
};

function formatDate(iso: string | null) {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const DEVICE_LABEL: Record<'mobile' | 'desktop', string> = {
  mobile: '모바일',
  desktop: 'PC',
};

// 관리자 전용 회원 관리 화면(SPEC.md §4-12). 조회 전용 — 멤버 추방·역할 변경 등
// 상태를 바꾸는 조작은 이 화면에 없다. 나머지 데이터는 서버(page.tsx)가 내려준 그대로
// 보여주고, "지금 접속 중"만 여기서 Realtime Presence 채널을 구독해 실시간으로 얹는다
// (PresenceTracker.tsx가 같은 채널에 모든 로그인 사용자를 track하고 있음, PLAN.md §L).
export default function MembersAdminView({
  members,
  currentUserId,
}: {
  members: MemberRow[];
  currentUserId: string;
}) {
  // 관리자 본인의 접속 추적은 이미 (protected)/layout.tsx의 PresenceTracker가 모든
  // 로그인 사용자에 대해 처리하므로, 여기서는 상태를 구독만 한다(lib/presence.ts 참고).
  const [onlineIds, setOnlineIds] = useState<Set<string>>(() => getOnlineUserIds());

  useEffect(() => {
    return onPresenceSync(() => setOnlineIds(getOnlineUserIds()));
  }, []);

  return (
    <div className="space-y-3">
      <p className="text-xs text-stone-400">전체 {members.length}명 · 조회 전용(역할 변경·추방 기능 없음)</p>
      {members.map((m) => {
        const online = onlineIds.has(m.id);
        return (
          <div key={m.id} className="space-y-2 rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full ${online ? 'bg-green-500' : 'bg-stone-300'}`}
                  aria-label={online ? '접속 중' : '접속 중 아님'}
                />
                <span className="font-medium text-stone-800">
                  {m.nickname}
                  {m.id === currentUserId && <span className="ml-1 text-xs text-stone-400">(나)</span>}
                </span>
                {online && <span className="text-xs font-medium text-green-600">접속 중</span>}
              </div>
              {m.lastDevice && (
                <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-500">
                  {DEVICE_LABEL[m.lastDevice]}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-stone-500">
              <p>가입일: {formatDate(m.createdAt)}</p>
              <p>최근 로그인: {formatDate(m.lastSignInAt)}</p>
              <p>
                나눔: {m.postCount}개
                {m.lastPostDate && ` · 최근 ${m.lastPostDate}`}
              </p>
              <p>소속 그룹: {m.groups.length > 0 ? m.groups.join(', ') : '없음'}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
