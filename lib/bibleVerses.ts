type VerseRow = { chapter: number; verse: number; text: string };
type ChapterRange = { chapterStart: number; verseStart: number; chapterEnd: number; verseEnd: number };

// 장 범위(chapterStart~chapterEnd)로 넉넉하게 조회해온 구절들 중, 실제 시작/끝 절 밖의
// 것들을 잘라내고 하나의 텍스트로 합친다. 장이 걸치는 구절이면 절 번호 앞에 장 번호도 붙여서
// (예: "12:1. ...") 어느 장인지 구분되게 한다.
export function joinVerseRows(rows: VerseRow[], range: ChapterRange): string | null {
  const trimmed = rows.filter((row) => {
    if (row.chapter === range.chapterStart && row.verse < range.verseStart) return false;
    if (row.chapter === range.chapterEnd && row.verse > range.verseEnd) return false;
    return true;
  });

  if (trimmed.length === 0) return null;

  const crossesChapter = range.chapterStart !== range.chapterEnd;
  return trimmed
    .map((row) =>
      crossesChapter ? `${row.chapter}:${row.verse}. ${row.text}` : `${row.verse}. ${row.text}`
    )
    .join('\n');
}
