'use client';

import { useEffect } from 'react';
import { trackPresence } from '@/lib/presence';

// 회원 관리 화면(SPEC.md §4-12)의 "지금 접속 중" 표시용. 로그인한 모든 사용자가 (protected)
// 영역에 있는 동안 공용 Realtime Presence 채널에 자신의 존재를 알린다. 화면에는 아무것도
// 렌더하지 않는다 — `components/MembersAdminView.tsx`가 같은 채널을 구독해서 읽는다
// (채널 자체는 `lib/presence.ts`가 앱 전체에 공유 — 여러 곳에서 각자 채널을 만들면
// Supabase 클라이언트 제약 때문에 에러가 났던 문제 참고, PLAN.md §L).
// 탭을 닫거나 로그아웃하면 Realtime이 연결 종료를 감지해 자동으로 빠지므로 명시적 untrack은 불필요.
export default function PresenceTracker({ userId }: { userId: string }) {
  useEffect(() => {
    trackPresence(userId);
  }, [userId]);

  return null;
}
