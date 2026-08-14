'use client';

import { useState } from 'react';
import CreateGroupForm from '@/components/CreateGroupForm';

export default function CreateGroupSection() {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-2xl bg-white p-4 text-center text-sm font-medium text-amber-700 shadow-sm"
      >
        + 그룹 만들기
      </button>
    );
  }

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-stone-600">그룹 만들기</h2>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-stone-400">
          취소
        </button>
      </div>
      <CreateGroupForm />
    </div>
  );
}
