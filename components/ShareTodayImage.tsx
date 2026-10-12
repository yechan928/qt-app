'use client';

import { useEffect, useState } from 'react';

// 오늘의 QT 카드 이미지를 카카오톡 등으로 공유하는 버튼.
// iOS Safari는 navigator.share()를 사용자 클릭에 곧바로(비동기 네트워크 요청 없이) 호출해야만
// 허용한다. 클릭 시점에 fetch로 이미지를 받아오면 그 사이 "사용자 제스처"가 끊겨 공유창이
// 안 뜰 수 있어서, 페이지가 열릴 때 미리 이미지를 받아 블롭으로 들고 있다가 클릭하면
// 그 자리에서 바로 navigator.share를 호출한다.
export default function ShareTodayImage({ date }: { date: string }) {
  const [imageBlob, setImageBlob] = useState<Blob | null>(null);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/today/image')
      .then((res) => (res.ok ? res.blob() : null))
      .then((blob) => {
        if (!cancelled) setImageBlob(blob);
      })
      .catch(() => {
        if (!cancelled) setImageBlob(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function handleShare() {
    if (!imageBlob) return;
    setError(null);
    const file = new File([imageBlob], `오늘의QT-${date}.png`, { type: 'image/png' });

    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      setSharing(true);
      navigator
        .share({ files: [file] })
        .catch((e) => {
          if (e instanceof DOMException && e.name === 'AbortError') return;
          setError('공유하지 못했어요. 다시 시도해주세요.');
        })
        .finally(() => setSharing(false));
      return;
    }

    // 파일 공유를 지원하지 않는 환경(PC 등)에서는 이미지 다운로드로 대체.
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleShare}
        disabled={!imageBlob || sharing}
        className="rounded-lg bg-amber-600 px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {!imageBlob ? '이미지 준비 중...' : sharing ? '공유 중...' : '공유하기'}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
