import { isBibleBook } from '@/lib/bibleBooks';

// "책 시작장:시작절" + 선택적으로 "-끝절"(같은 장) 또는 "-끝장:끝절"(장이 걸침).
const VERSE_REF_RE =
  /^([가-힣0-9]+)\s*(\d+)\s*:\s*(\d+)(?:\s*-\s*(?:(\d+)\s*:\s*)?(\d+))?$/;

export type ParsedRef = {
  book: string;
  chapterStart: number;
  verseStart: number;
  chapterEnd: number;
  verseEnd: number;
};

// "창세기 1:1-10"(같은 장) 또는 "신명기 11:26-12:7"(장이 걸침) 형식을 모두 허용.
// 형식이 안 맞거나 66권에 없는 책 이름이면 null — 호출부에서 에러 문구만 보여주고 절대 throw하지 않는다(SPEC §5).
export function parseVerseRef(raw: string): ParsedRef | null {
  const m = raw.trim().match(VERSE_REF_RE);
  if (!m) return null;

  const [, book, chapterStartRaw, verseStartRaw, chapterEndRaw, verseEndRaw] = m;
  if (!isBibleBook(book)) return null;

  const chapterStart = Number(chapterStartRaw);
  const verseStart = Number(verseStartRaw);
  const chapterEnd = chapterEndRaw ? Number(chapterEndRaw) : chapterStart;
  const verseEnd = verseEndRaw ? Number(verseEndRaw) : verseStart;

  if (chapterEnd < chapterStart) return null;
  if (chapterEnd === chapterStart && verseEnd < verseStart) return null;

  return { book, chapterStart, verseStart, chapterEnd, verseEnd };
}

export const VERSE_REF_HELP_TEXT =
  '구절 형식을 확인해주세요 (예: 창세기 1:1-10, 장이 걸치면 신명기 11:26-12:7)';

export type ParsedRange = { verseStart: number; verseEnd: number };

const VERSE_RANGE_RE = /^(\d+)(?:\s*-\s*(\d+))?$/;

// 소주제 구절이 전체 구절과 같은 장 안에 있을 때, 절 번호만 입력받는다 ("16-19" 또는 "16").
export function parseVerseRange(raw: string): ParsedRange | null {
  const m = raw.trim().match(VERSE_RANGE_RE);
  if (!m) return null;

  const [, vStart, vEnd] = m;
  const verseStart = Number(vStart);
  const verseEnd = vEnd ? Number(vEnd) : verseStart;
  if (verseEnd < verseStart) return null;

  return { verseStart, verseEnd };
}

export type ParsedChapterRange = {
  chapterStart: number;
  verseStart: number;
  chapterEnd: number;
  verseEnd: number;
};

const CHAPTER_VERSE_RANGE_RE = /^(\d+)\s*:\s*(\d+)(?:\s*-\s*(?:(\d+)\s*:\s*)?(\d+))?$/;

// 전체 구절이 장을 걸칠 때, 소주제 구절은 책 이름 없이 "장:절" 형식으로 입력받는다
// ("11:26-29" 같은 장, 또는 "11:26-12:7" 장이 걸침).
export function parseChapterVerseRange(raw: string): ParsedChapterRange | null {
  const m = raw.trim().match(CHAPTER_VERSE_RANGE_RE);
  if (!m) return null;

  const [, chapterStartRaw, verseStartRaw, chapterEndRaw, verseEndRaw] = m;
  const chapterStart = Number(chapterStartRaw);
  const verseStart = Number(verseStartRaw);
  const chapterEnd = chapterEndRaw ? Number(chapterEndRaw) : chapterStart;
  const verseEnd = verseEndRaw ? Number(verseEndRaw) : verseStart;

  if (chapterEnd < chapterStart) return null;
  if (chapterEnd === chapterStart && verseEnd < verseStart) return null;

  return { chapterStart, verseStart, chapterEnd, verseEnd };
}
