'use client';

import { useState } from 'react';
import GroupShareSelect from '@/components/GroupShareSelect';

export default function ShareGroupModal({
  initialSelected,
  submitting,
  onConfirm,
  onClose,
}: {
  initialSelected: string[];
  submitting: boolean;
  onConfirm: (groupIds: string[]) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState(initialSelected);

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
      </div>
    </div>
  );
}
