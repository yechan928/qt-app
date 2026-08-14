'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { parseVerseRef, VERSE_REF_HELP_TEXT } from '@/lib/verseRef';

export type VerseLookupResult = { ref: string; text: string };

type Props = {
  initialRef?: string;
  onResolved: (result: VerseLookupResult | null) => void;
};

export default function VerseLookup({ initialRef = '', onResolved }: Props) {
  const [refInput, setRefInput] = useState(initialRef);
  const [verseText, setVerseText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function lookup(ref: string) {
    const parsed = parseVerseRef(ref);
    if (!parsed) {
      setError(VERSE_REF_HELP_TEXT);
      setVerseText(null);
      onResolved(null);
      return;
    }

    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data, error: dbError } = await supabase
      .from('bible_verses')
      .select('verse, text')
      .eq('book', parsed.book)
      .eq('chapter', parsed.chapter)
      .gte('verse', parsed.verseStart)
      .lte('verse', parsed.verseEnd)
      .order('verse', { ascending: true });

    setLoading(false);

    if (dbError || !data || data.length === 0) {
      setError('해당 구절을 찾을 수 없어요. 참조를 다시 확인해주세요.');
      setVerseText(null);
      onResolved(null);
      return;
    }

    const text = data.map((row) => `${row.verse}. ${row.text}`).join('\n');
    setVerseText(text);
    onResolved({ ref: ref.trim(), text });
  }

  useEffect(() => {
    if (initialRef) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 마운트 시 1회 조회, 결과를 state에 반영하는 정상적인 데이터 페칭 패턴
      lookup(initialRef);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleChange(next: string) {
    setRefInput(next);
    setVerseText(null);
    setError(null);
    onResolved(null);
  }

  return (
    <div>
      <div className="flex gap-2">
        <input
          type="text"
          value={refInput}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="예: 창세기 1:1-10"
          className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
        />
        <button
          type="button"
          onClick={() => lookup(refInput)}
          disabled={loading || !refInput.trim()}
          className="shrink-0 rounded-lg bg-stone-800 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          {loading ? '조회 중...' : '미리보기'}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {verseText && (
        <div className="mt-3 whitespace-pre-line rounded-lg bg-stone-100 p-4 text-sm leading-relaxed text-stone-700">
          {verseText}
        </div>
      )}
    </div>
  );
}
