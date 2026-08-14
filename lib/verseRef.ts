import { isBibleBook } from '@/lib/bibleBooks';

const VERSE_REF_RE = /^([가-힣0-9]+)\s*(\d+)\s*:\s*(\d+)(?:\s*-\s*(\d+))?$/;

export type ParsedRef = {
  book: string;
  chapter: number;
  verseStart: number;
  verseEnd: number;
};

// "창세기 1:1-10" 또는 "창세기 1:1" 형식만 허용.
// 형식이 안 맞거나 66권에 없는 책 이름이면 null — 호출부에서 에러 문구만 보여주고 절대 throw하지 않는다(SPEC §5).
export function parseVerseRef(raw: string): ParsedRef | null {
  const m = raw.trim().match(VERSE_REF_RE);
  if (!m) return null;

  const [, book, chapter, vStart, vEnd] = m;
  if (!isBibleBook(book)) return null;

  const verseStart = Number(vStart);
  const verseEnd = vEnd ? Number(vEnd) : verseStart;
  if (verseEnd < verseStart) return null;

  return { book, chapter: Number(chapter), verseStart, verseEnd };
}

export const VERSE_REF_HELP_TEXT = '구절 형식을 확인해주세요 (예: 창세기 1:1-10)';

export type ParsedRange = { verseStart: number; verseEnd: number };

const VERSE_RANGE_RE = /^(\d+)(?:\s*-\s*(\d+))?$/;

// 소주제별 구절은 전체 구절과 책/장이 항상 같으므로 절 번호만 입력받는다 ("16-19" 또는 "16").
export function parseVerseRange(raw: string): ParsedRange | null {
  const m = raw.trim().match(VERSE_RANGE_RE);
  if (!m) return null;

  const [, vStart, vEnd] = m;
  const verseStart = Number(vStart);
  const verseEnd = vEnd ? Number(vEnd) : verseStart;
  if (verseEnd < verseStart) return null;

  return { verseStart, verseEnd };
}
