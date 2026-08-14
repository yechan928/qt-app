'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// 사파리 등에서 뒤로가기를 누르면 서버에 새로 요청하지 않고 떠나기 전 화면을
// 그대로 복원하는 bfcache 때문에, 아멘·그룹 나가기처럼 다른 화면에서 바뀐 데이터가
// 뒤로 돌아왔을 때 반영 안 된 것처럼 보인다. pageshow의 persisted가 true면
// bfcache 복원이라는 뜻이므로 그때만 서버 데이터를 다시 가져오게 한다.
export default function BfcacheRefresh() {
  const router = useRouter();

  useEffect(() => {
    function handlePageShow(e: PageTransitionEvent) {
      if (e.persisted) {
        router.refresh();
      }
    }
    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, [router]);

  return null;
}
