'use client';

import { useState } from 'react';
import GroupShareSelect from '@/components/GroupShareSelect';

export default function ShareGroupModal({
  initialSelected,
  submitting,
  kakaoShare,
  onConfirm,
  onClose,
}: {
  initialSelected: string[];
  submitting: boolean;
  // 카카오톡(휴대폰 공유창)으로 보낼 나눔 텍스트. 보낸 뒤 onShared로 저장·그룹 공유를 이어서 처리한다.
  kakaoShare?: { text: string; onShared: (groupIds: string[]) => void };
  onConfirm: (groupIds: string[]) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState(initialSelected);
  const [shareError, setShareError] = useState<string | null>(null);

  // navigator.share는 클릭 직후에만 호출 가능해서(await 뒤에 부르면 iOS에서 거부됨)
  // 저장보다 먼저 공유창을 띄우고, 사용자가 공유창을 닫지 않고 끝냈을 때만 저장을 이어간다.
  async function handleKakaoShare() {
    if (!kakaoShare) return;
    setShareError(null);
    try {
      if (navigator.share) {
        await navigator.share({ text: kakaoShare.text });
      } else {
        await navigator.clipboard.writeText(kakaoShare.text);
        window.alert('나눔 내용을 복사했어요. 카카오톡에 붙여넣어 보내주세요.');
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      setShareError('공유하지 못했어요. 다시 시도해주세요.');
      return;
    }
    kakaoShare.onShared(selected);
  }

  return (
    <div
      className="fixed inset-0 z-20 flex items-end justify-center bg-black/40 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-t-2xl bg-white p-5 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-3 text-sm font-semibold text-stone-700">공유할 그룹 선택</h2>
        <GroupShareSelect selected={selected} onChange={setSelected} />
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => onConfirm(selected)}
            disabled={submitting || selected.length === 0}
            className="flex-1 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {submitting ? '공유 중...' : selected.length > 0 ? `${selected.length}개 그룹에 공유` : '공유하기'}
          </button>
          <button
            onClick={onClose}
            className="rounded-lg border border-stone-300 px-4 py-2 text-sm text-stone-600"
          >
            취소
          </button>
        </div>
        {kakaoShare && (
          <div className="mt-3 border-t border-stone-200 pt-3">
            <button
              type="button"
              onClick={handleKakaoShare}
              disabled={submitting}
              className="w-full rounded-lg bg-yellow-300 px-4 py-2 text-sm font-medium text-stone-900 disabled:opacity-50"
            >
              카카오톡으로 보내기
            </button>
            {shareError && <p className="mt-2 text-sm text-red-600">{shareError}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
