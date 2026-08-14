'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { parseVerseRef, parseVerseRange } from '@/lib/verseRef';
import type { QtSection } from '@/types/database';

type Props = {
  sections: QtSection[];
  onChange: (sections: QtSection[]) => void;
  // 소주제 구절은 항상 이 전체 구절과 같은 책/장 안에서 나뉘므로, 절 번호만 입력받고
  // 책/장은 여기서 파싱해 자동으로 붙인다(매번 "신명기 6:16-19"를 통째로 안 쳐도 됨).
  overallRef: string;
};

function initialRangeInput(section: QtSection) {
  const parsed = parseVerseRef(section.verse_ref);
  if (!parsed) return '';
  return parsed.verseStart === parsed.verseEnd
    ? String(parsed.verseStart)
    : `${parsed.verseStart}-${parsed.verseEnd}`;
}

export default function QtSectionEditor({ sections, onChange, overallRef }: Props) {
  const overall = parseVerseRef(overallRef);
  const [rangeInputs, setRangeInputs] = useState<string[]>(() => sections.map(initialRangeInput));
  const [errors, setErrors] = useState<(string | null)[]>(() => sections.map(() => null));
  const [loadingIndex, setLoadingIndex] = useState<number | null>(null);

  function addSection() {
    onChange([...sections, { heading: '', verse_ref: '', verse_text: '' }]);
    setRangeInputs((prev) => [...prev, '']);
    setErrors((prev) => [...prev, null]);
  }

  function removeSection(index: number) {
    onChange(sections.filter((_, i) => i !== index));
    setRangeInputs((prev) => prev.filter((_, i) => i !== index));
    setErrors((prev) => prev.filter((_, i) => i !== index));
  }

  function updateHeading(index: number, heading: string) {
    onChange(sections.map((s, i) => (i === index ? { ...s, heading } : s)));
  }

  function updateRangeInput(index: number, value: string) {
    setRangeInputs((prev) => prev.map((v, i) => (i === index ? value : v)));
    setErrors((prev) => prev.map((e, i) => (i === index ? null : e)));
    onChange(sections.map((s, i) => (i === index ? { ...s, verse_ref: '', verse_text: '' } : s)));
  }

  async function lookupRange(index: number) {
    if (!overall) return;
    const range = parseVerseRange(rangeInputs[index] ?? '');
    if (!range) {
      setErrors((prev) => prev.map((e, i) => (i === index ? '절 번호를 확인해주세요 (예: 16-19)' : e)));
      return;
    }
    if (range.verseStart < overall.verseStart || range.verseEnd > overall.verseEnd) {
      setErrors((prev) =>
        prev.map((e, i) =>
          i === index ? `전체 구절 범위(${overall.verseStart}~${overall.verseEnd}) 안에서 입력해주세요.` : e
        )
      );
      return;
    }

    setLoadingIndex(index);
    const supabase = createClient();
    const { data, error: dbError } = await supabase
      .from('bible_verses')
      .select('verse, text')
      .eq('book', overall.book)
      .eq('chapter', overall.chapter)
      .gte('verse', range.verseStart)
      .lte('verse', range.verseEnd)
      .order('verse', { ascending: true });
    setLoadingIndex(null);

    if (dbError || !data || data.length === 0) {
      setErrors((prev) => prev.map((e, i) => (i === index ? '해당 구절을 찾을 수 없어요.' : e)));
      return;
    }

    const text = data.map((row) => `${row.verse}. ${row.text}`).join('\n');
    const ref =
      range.verseStart === range.verseEnd
        ? `${overall.book} ${overall.chapter}:${range.verseStart}`
        : `${overall.book} ${overall.chapter}:${range.verseStart}-${range.verseEnd}`;
    onChange(sections.map((s, i) => (i === index ? { ...s, verse_ref: ref, verse_text: text } : s)));
  }

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-stone-600">
        소주제별 구절 (선택, 비워두면 위 전체 구절만 표시)
      </label>
      {!overall && (
        <p className="text-sm text-stone-400">먼저 위에서 전체 말씀 구절을 입력해주세요.</p>
      )}
      {sections.map((section, index) => (
        <div key={index} className="space-y-2 rounded-lg border border-stone-200 p-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={section.heading}
              onChange={(e) => updateHeading(index, e.target.value)}
              placeholder="소주제 (예: 듣고 행하겠나이다)"
              className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => removeSection(index)}
              className="shrink-0 px-2 text-sm text-stone-400 hover:text-red-600"
            >
              삭제
            </button>
          </div>

          <div className="flex gap-2">
            <span className="flex shrink-0 items-center text-sm text-stone-500">
              {overall ? `${overall.book} ${overall.chapter}:` : '절'}
            </span>
            <input
              type="text"
              value={rangeInputs[index] ?? ''}
              onChange={(e) => updateRangeInput(index, e.target.value)}
              placeholder="예: 16-19"
              disabled={!overall}
              className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none disabled:bg-stone-50"
            />
            <button
              type="button"
              onClick={() => lookupRange(index)}
              disabled={!overall || loadingIndex === index || !rangeInputs[index]?.trim()}
              className="shrink-0 rounded-lg bg-stone-800 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              {loadingIndex === index ? '조회 중...' : '미리보기'}
            </button>
          </div>
          {errors[index] && <p className="text-sm text-red-600">{errors[index]}</p>}
          {section.verse_text && (
            <div className="whitespace-pre-line rounded-lg bg-stone-100 p-4 text-sm leading-relaxed text-stone-700">
              {section.verse_text}
            </div>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={addSection}
        disabled={!overall}
        className="w-full rounded-lg border border-dashed border-stone-300 py-2 text-sm text-stone-500 hover:border-amber-400 hover:text-amber-700 disabled:opacity-40"
      >
        + 소주제 추가
      </button>
    </div>
  );
}
