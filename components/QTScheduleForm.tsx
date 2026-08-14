'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import VerseLookup, { type VerseLookupResult } from '@/components/VerseLookup';
import QtSectionEditor from '@/components/QtSectionEditor';
import type { QtSchedule, QtSection } from '@/types/database';

export default function QTScheduleForm({
  date,
  existing,
  userId,
  onSaved,
  onCancel,
}: {
  date: string;
  existing: QtSchedule | null;
  userId: string;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(existing?.title ?? '');
  const [resolved, setResolved] = useState<VerseLookupResult | null>(
    existing ? { ref: existing.verse_ref, text: existing.verse_text } : null
  );
  const [sections, setSections] = useState<QtSection[]>(existing?.sections ?? []);
  const [summary, setSummary] = useState(existing?.summary ?? '');
  const [prayer, setPrayer] = useState(existing?.prayer ?? '');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError('주제를 입력해주세요.');
      return;
    }
    if (!resolved) {
      setError('구절을 먼저 확인해주세요.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.from('qt_schedule').upsert(
      {
        qt_date: date,
        title: title.trim(),
        verse_ref: resolved.ref,
        verse_text: resolved.text,
        summary: summary.trim(),
        prayer: prayer.trim(),
        sections: sections.filter((s) => s.heading.trim() && s.verse_ref.trim()),
        created_by: userId,
      },
      { onConflict: 'qt_date' }
    );

    setSubmitting(false);
    if (error) {
      setError('저장하지 못했어요. 다시 시도해주세요.');
      return;
    }
    onSaved();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-stone-600">{date} QT 일정 등록</h2>
      <div>
        <label className="mb-1 block text-sm font-medium text-stone-600">주제</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="예: 좌로나 우로나 치우치지 말고"
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-stone-600">전체 말씀 구절</label>
        <VerseLookup initialRef={existing?.verse_ref ?? ''} onResolved={setResolved} />
      </div>

      <QtSectionEditor sections={sections} onChange={setSections} overallRef={resolved?.ref ?? ''} />

      <div>
        <label className="mb-1 block text-sm font-medium text-stone-600">본문요약 (선택)</label>
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-stone-600">중보기도 (선택)</label>
        <textarea
          value={prayer}
          onChange={(e) => setPrayer(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-amber-600 px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {submitting ? '저장 중...' : '저장'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-stone-300 px-5 py-2 text-sm text-stone-600"
        >
          취소
        </button>
      </div>
    </form>
  );
}
