import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

// 회원 관리 화면(SPEC.md §4-12)의 "지금 접속 중" 표시용 — 앱 전체가 공유하는 Realtime
// Presence 채널 하나를 모듈 스코프에서 관리한다. PresenceTracker(모든 로그인 사용자,
// (protected)/layout.tsx)와 MembersAdminView(관리자 화면)가 동시에 마운트되는데, 각자
// 따로 `supabase.channel('app-presence')`를 만들면 Supabase 클라이언트가 브라우저에서
// 사실상 싱글턴이라 같은 채널 객체를 돌려주고, 이미 subscribe()된 채널에 두 번째 컴포넌트가
// `.on('presence', ...)`을 또 붙이려다 "cannot add presence callbacks ... after subscribe()"
// 에러가 났다 — 그래서 채널 생성·구독·리스너 등록을 전부 여기 한 곳으로 모았다.
let channel: RealtimeChannel | null = null;
let readyPromise: Promise<RealtimeChannel> | null = null;
const syncListeners = new Set<() => void>();

function getChannel(): Promise<RealtimeChannel> {
  if (!readyPromise) {
    const supabase = createClient();
    const ch = supabase.channel('app-presence');
    ch.on('presence', { event: 'sync' }, () => {
      syncListeners.forEach((listener) => listener());
    });
    readyPromise = new Promise((resolve) => {
      ch.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          channel = ch;
          resolve(ch);
        }
      });
    });
  }
  return readyPromise;
}

// "나 지금 여기 있음"을 알린다. user_id는 presence 키가 아니라 payload에 직접 담는다 —
// 채널을 누가 먼저 만드는지(레이아웃의 PresenceTracker vs 관리자 화면)에 따라 presence 키
// 설정이 달라지면 곤란해서, 식별은 항상 payload의 user_id로만 한다.
export async function trackPresence(userId: string) {
  const ch = await getChannel();
  await ch.track({ user_id: userId, online_at: new Date().toISOString() });
}

// presence 상태가 바뀔 때마다 호출된다. 이미 채널이 구독 중이면 등록 즉시 한 번도 불러줘서,
// 뒤늦게 마운트된 컴포넌트(회원 관리 화면)도 현재 상태를 바로 받을 수 있게 한다.
export function onPresenceSync(listener: () => void) {
  syncListeners.add(listener);
  if (channel) listener();
  return () => {
    syncListeners.delete(listener);
  };
}

export function getOnlineUserIds(): Set<string> {
  if (!channel) return new Set();
  const state = channel.presenceState() as Record<string, { user_id?: string }[]>;
  const ids = Object.values(state)
    .flat()
    .map((meta) => meta.user_id)
    .filter((id): id is string => Boolean(id));
  return new Set(ids);
}
