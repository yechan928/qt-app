import { redirect } from 'next/navigation';

// 루트는 더 이상 피드가 아니라 그룹 목록(/groups)으로 넘긴다.
// NavBar의 "피드" 링크는 /groups를 직접 가리키므로 평소엔 이 라우트를 안 거치지만,
// 누군가 "/"로 직접 들어올 때를 위한 안전망으로 남겨둔다.
export default function RootPage() {
  redirect('/groups');
}
