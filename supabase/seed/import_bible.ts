// 성경 원문 1회성 시딩 스크립트.
// 실행: npx tsx supabase/seed/import_bible.ts
// service role 키가 필요하므로 사용자가 로컬에서 1회만 실행한다(CLAUDE.md 참조).
//
// 소스: MaatheusGois/bible(MIT) 저장소의 한국어 개역한글 JSON.
// 구조: [{ id: "gn", chapters: [["절1", "절2", ...], [...]] }, ...] — 66권, 정경 순서.
// lib/bibleBooks.ts의 BIBLE_BOOKS 배열과 같은 인덱스 순서이므로 위치로 그대로 매핑한다.

import 'dotenv/config';
import { config as loadEnv } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { BIBLE_BOOKS } from '../../lib/bibleBooks';

loadEnv({ path: '.env.local' });

const SOURCE_URL =
  'https://raw.githubusercontent.com/MaatheusGois/bible/main/versions/ko/ko.json';
const VERSION = '개역한글';
const BATCH_SIZE = 1000;

type SourceBook = { id: string; chapters: string[][] };
type VerseRow = {
  book: string;
  chapter: number;
  verse: number;
  text: string;
  version: string;
};

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      '.env.local에 NEXT_PUBLIC_SUPABASE_URL과 SUPABASE_SERVICE_ROLE_KEY가 필요합니다.'
    );
  }

  console.log(`성경 원문 다운로드 중: ${SOURCE_URL}`);
  const res = await fetch(SOURCE_URL);
  if (!res.ok) {
    throw new Error(`다운로드 실패: HTTP ${res.status}`);
  }
  const raw = (await res.text()).replace(/^﻿/, ''); // UTF-8 BOM 제거
  const books: SourceBook[] = JSON.parse(raw);

  if (books.length !== BIBLE_BOOKS.length) {
    throw new Error(
      `원본 책 수(${books.length})가 BIBLE_BOOKS 길이(${BIBLE_BOOKS.length})와 다릅니다. ` +
        '원본 구조가 바뀐 것으로 보이니 직접 확인 후 매핑을 수정하세요.'
    );
  }

  const rows: VerseRow[] = [];
  books.forEach((book, bookIndex) => {
    const koreanName = BIBLE_BOOKS[bookIndex];
    book.chapters.forEach((chapter, chapterIndex) => {
      chapter.forEach((text, verseIndex) => {
        rows.push({
          book: koreanName,
          chapter: chapterIndex + 1,
          verse: verseIndex + 1,
          // 원본 소스에 "!"/"?"가 문장 부호가 아니라 데이터 변환 과정에서 섞여든 잡음으로 보여 제거한다.
          text: text.replace(/\s*[!?]+\s*/g, ' ').trim(),
          version: VERSION,
        });
      });
    });
  });

  console.log(`총 ${rows.length}개 구절 파싱 완료. Supabase에 upsert 시작...`);

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from('bible_verses')
      .upsert(batch, { onConflict: 'book,chapter,verse,version' });

    if (error) {
      throw new Error(`upsert 실패 (${i}~${i + batch.length}행): ${error.message}`);
    }
    console.log(`  ${Math.min(i + BATCH_SIZE, rows.length)} / ${rows.length}`);
  }

  console.log('시딩 완료.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
