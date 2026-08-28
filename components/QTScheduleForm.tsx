'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import VerseLookup, { type VerseLookupResult } from '@/components/VerseLookup';
import QtSectionEditor from '@/components/QtSectionEditor';
import type { QtSchedule, QtSection } from '@/types/database';

export default function QTScheduleForm({
  date,
  existing,
  editing,
  userId,
  onStartEdit,
  onCancelEdit,
  onSaved,
  onCancel,
}: {
  date: string;
  existing: QtSchedule | null;
  // 읽기 전용 ↔ 편집 폼 전환은 부모(ScheduleAdminView)가 들고 있는 상태로 제어한다.
  // 예전엔 이 컴포넌트 내부에서 useState(existing === null)로 마운트 시점에만 한 번
  // 정했는데, 저장 직후 재조회되는 과정에서 이 컴포넌트가 "아직 최신 값이 도착하기 전"
  // 타이밍에 다시 마운트되면 그 순간의 낡은(existing=null) 값으로 편집 모드가 굳어버리는
  // 문제가 있었다(로컬은 타이밍이 빨라 눈에 안 띄고, 배포 환경은 네트워크 지연 때문에
  // 그대로 고정되어 보임). 부모가 항상 "최신 조회 결과가 도착한 시점"에만 이 값을 정하므로
  // 이 컴포넌트가 언제 다시 마운트되든 항상 올바른 값을 받는다.
  editing: boolean;
  userId: string;
  onStartEdit: () => void;
  onCancelEdit: () => void;
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

  function handleCancel() {
    if (existing) {
      onCancelEdit();
      return;
    }
    onCancel();
  }

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

  if (!editing && existing) {
    return (
      <div className="space-y-4 rounded-2xl bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-stone-600">{date} QT 일정</h2>
          <button
            type="button"
            onClick={onStartEdit}
            className="rounded-lg border border-stone-300 px-4 py-2 text-sm text-stone-600 hover:bg-stone-50"
          >
            수정하기
          </button>
        </div>
        <div>
          <p className="text-sm font-medium text-stone-800">{existing.title}</p>
          <p className="mt-1 text-xs text-stone-400">{existing.verse_ref}</p>
          <p className="mt-2 whitespace-pre-line rounded-lg bg-stone-100 p-4 text-sm leading-relaxed text-stone-700">
            {existing.verse_text}
          </p>
        </div>
        {existing.sections.length > 0 && (
          <div className="space-y-3">
            {existing.sections.map((section, i) => (
              <div key={i} className="rounded-lg border border-stone-200 p-3">
                <p className="text-sm font-medium text-stone-700">{section.heading}</p>
                <p className="mt-1 text-xs text-stone-400">{section.verse_ref}</p>
                <p className="mt-2 whitespace-pre-line text-sm text-stone-600">{section.verse_text}</p>
              </div>
            ))}
          </div>
        )}
        {existing.summary && (
          <div>
            <p className="mb-1 text-sm font-medium text-stone-600">본문요약</p>
            <p className="whitespace-pre-line text-sm text-stone-700">{existing.summary}</p>
          </div>
        )}
        {existing.prayer && (
          <div>
            <p className="mb-1 text-sm font-medium text-stone-600">중보기도</p>
            <p className="whitespace-pre-line text-sm text-stone-700">{existing.prayer}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-stone-600">
        {date} QT 일정 {existing ? '수정' : '등록'}
      </h2>
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
          onClick={handleCancel}
          className="rounded-lg border border-stone-300 px-5 py-2 text-sm text-stone-600"
        >
          취소
        </button>
      </div>
    </form>
  );
}
