'use client';

import { useState } from 'react';

// 소주제별 구절 + (있으면) 적용 질문을 "?" 버튼 뒤에 숨겨뒀다가 눌러야 보여주는 카드.
// 오늘의 QT·나눔 쓰기·나눔 미리보기 화면이 같은 sections 데이터를 각자 다른 스타일로
// 그려서(제목 태그·여백·색 차이) 스타일은 그대로 props로 받고 토글 동작만 여기서 공유한다.
export default function QtSectionCard({
  heading,
  headingClassName,
  verseText,
  verseBoxClassName,
  question,
}: {
  heading: string;
  headingClassName: string;
  verseText: string;
  verseBoxClassName: string;
  question?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <h3 className={headingClassName}>{heading}</h3>
      <div className={verseBoxClassName}>{verseText}</div>
      {question && (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-label="적용 질문 보기"
            className="flex h-6 w-6 items-center justify-center rounded-full border border-amber-300 text-xs font-semibold text-amber-600 hover:bg-amber-50"
          >
            ?
          </button>
          {open && (
            <p className="mt-2 whitespace-pre-line rounded-lg bg-amber-50 p-3 text-sm leading-relaxed text-amber-800">
              {question}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
