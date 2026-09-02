'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { parseVerseRef, parseVerseRange, parseChapterVerseRange } from '@/lib/verseRef';
import { joinVerseRows } from '@/lib/bibleVerses';
import type { QtSection } from '@/types/database';

type Props = {
  sections: QtSection[];
  onChange: (sections: QtSection[]) => void;
  // 전체 구절이 장을 하나만 걸치면 소주제 구절은 절 번호만 입력받아 책/장을 자동으로 붙인다
  // (매번 "신명기 6:16-19"를 통째로 안 쳐도 됨). 전체 구절이 여러 장에 걸치면(예: 11:26-12:7)
  // 어느 장인지 알 수 없어서 소주제마다 "장:절" 형식으로 직접 입력받는다.
  overallRef: string;
};

function initialRangeInput(section: QtSection, singleChapter: boolean) {
  const parsed = parseVerseRef(section.verse_ref);
  if (!parsed) return '';
  if (singleChapter) {
    return parsed.verseStart === parsed.verseEnd
      ? String(parsed.verseStart)
      : `${parsed.verseStart}-${parsed.verseEnd}`;
  }
  const start = `${parsed.chapterStart}:${parsed.verseStart}`;
  if (parsed.chapterStart === parsed.chapterEnd && parsed.verseStart === parsed.verseEnd) return start;
  const end =
    parsed.chapterStart === parsed.chapterEnd ? String(parsed.verseEnd) : `${parsed.chapterEnd}:${parsed.verseEnd}`;
  return `${start}-${end}`;
}

export default function QtSectionEditor({ sections, onChange, overallRef }: Props) {
  const overall = parseVerseRef(overallRef);
  const singleChapter = !!overall && overall.chapterStart === overall.chapterEnd;
  const [rangeInputs, setRangeInputs] = useState<string[]>(() =>
    sections.map((s) => initialRangeInput(s, singleChapter))
  );
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

  function updateQuestion(index: number, question: string) {
    onChange(sections.map((s, i) => (i === index ? { ...s, question } : s)));
  }

  function updateRangeInput(index: number, value: string) {
    setRangeInputs((prev) => prev.map((v, i) => (i === index ? value : v)));
    setErrors((prev) => prev.map((e, i) => (i === index ? null : e)));
    onChange(sections.map((s, i) => (i === index ? { ...s, verse_ref: '', verse_text: '' } : s)));
  }

  async function lookupRange(index: number) {
    if (!overall) return;

    // 장이 하나면 절 번호만("16-19"), 여러 장에 걸치면 "장:절" 형식을 파싱.
    const range = singleChapter
      ? (() => {
          const r = parseVerseRange(rangeInputs[index] ?? '');
          return r && { chapterStart: overall.chapterStart, chapterEnd: overall.chapterStart, ...r };
        })()
      : parseChapterVerseRange(rangeInputs[index] ?? '');

    if (!range) {
      const hint = singleChapter ? '예: 16-19' : '예: 11:26-29 또는 11:26-12:7';
      setErrors((prev) => prev.map((e, i) => (i === index ? `구절 형식을 확인해주세요 (${hint})` : e)));
      return;
    }

    if (singleChapter) {
      const r = range as { verseStart: number; verseEnd: number };
      if (r.verseStart < overall.verseStart || r.verseEnd > overall.verseEnd) {
        setErrors((prev) =>
          prev.map((e, i) =>
            i === index ? `전체 구절 범위(${overall.verseStart}~${overall.verseEnd}) 안에서 입력해주세요.` : e
          )
        );
        return;
      }
    }

    setLoadingIndex(index);
    const supabase = createClient();
    const { data, error: dbError } = await supabase
      .from('bible_verses')
      .select('chapter, verse, text')
      .eq('book', overall.book)
      .gte('chapter', range.chapterStart)
      .lte('chapter', range.chapterEnd)
      .order('chapter', { ascending: true })
      .order('verse', { ascending: true });
    setLoadingIndex(null);

    const text = !dbError && data ? joinVerseRows(data, range) : null;
    if (!text) {
      setErrors((prev) => prev.map((e, i) => (i === index ? '해당 구절을 찾을 수 없어요.' : e)));
      return;
    }

    const crossesChapter = range.chapterStart !== range.chapterEnd;
    const ref = crossesChapter
      ? `${overall.book} ${range.chapterStart}:${range.verseStart}-${range.chapterEnd}:${range.verseEnd}`
      : range.verseStart === range.verseEnd
        ? `${overall.book} ${range.chapterStart}:${range.verseStart}`
        : `${overall.book} ${range.chapterStart}:${range.verseStart}-${range.verseEnd}`;
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
            {singleChapter && (
              <span className="flex shrink-0 items-center text-sm text-stone-500">
                {overall ? `${overall.book} ${overall.chapterStart}:` : '절'}
              </span>
            )}
            {!singleChapter && overall && (
              <span className="flex shrink-0 items-center text-sm text-stone-500">{overall.book}</span>
            )}
            <input
              type="text"
              value={rangeInputs[index] ?? ''}
              onChange={(e) => updateRangeInput(index, e.target.value)}
              placeholder={singleChapter ? '예: 16-19' : '예: 11:26-29 또는 11:26-12:7'}
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
          <textarea
            value={section.question ?? ''}
            onChange={(e) => updateQuestion(index, e.target.value)}
            placeholder="적용 질문 (선택, 입력하면 '?' 버튼을 눌러야 보이는 형태로 표시됨)"
            rows={2}
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
          />
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
