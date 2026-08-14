-- 오늘의 QT 화면을 우리들교회달력 스타일(소주제별 절 구분 + 본문요약 + 중보기도)로
-- 확장하기 위한 컬럼 추가. PLAN.md §B, SPEC.md §4-7 갱신분.

alter table qt_schedule
  add column summary text not null default '',
  add column prayer text not null default '',
  add column sections jsonb not null default '[]'::jsonb;

comment on column qt_schedule.sections is
  '소주제별 절 구분. [{ "heading": string, "verse_ref": string, "verse_text": string }] 형태. 비어 있으면 기존처럼 verse_ref/verse_text 전체만 표시.';
