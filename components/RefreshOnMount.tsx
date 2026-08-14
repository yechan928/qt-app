'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Next.js는 뒤로가기/앞으로가기 탐색에서는 staleTimes 설정과 무관하게 항상 캐시된
// 화면을 재사용한다(레이아웃 이동 시 스크롤 위치·상태 보존 목적). 그래서 아멘처럼
// 다른 화면에서 바뀐 값이 뒤로 돌아왔을 때 반영 안 된 것처럼 보인다. 이 화면이 마운트될
// 때마다(뒤로가기로 다시 보여질 때 포함) 서버 데이터를 강제로 새로 가져오게 한다.
export default function RefreshOnMount() {
  const router = useRouter();

  useEffect(() => {
    router.refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
