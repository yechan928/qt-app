import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { createClient } from '@/lib/supabase/server';
import { todayDateString } from '@/lib/date';

// 오늘의 QT를 카카오톡으로 "사진처럼" 공유하기 위한 카드 이미지(PNG) 생성용 Route Handler.
// (protected)/today/page.tsx의 "공유하기" 버튼이 로그인된 브라우저에서 fetch로 이 이미지를
// 받아 navigator.share({ files: [...] })로 넘긴다 — 받는 사람은 이 서버를 전혀 거치지 않고
// 완성된 사진만 전달받으므로, 로그인 없이도 카톡 안에서 바로 내용을 볼 수 있다(2026-10-12 추가).
// 폰트는 모듈 스코프에서 한 번만 읽는다(요청마다 다시 읽지 않음, Next.js 권장 패턴).
const fontRegular = readFile(join(process.cwd(), 'public/fonts/Pretendard-Regular.otf'));
const fontBold = readFile(join(process.cwd(), 'public/fonts/Pretendard-Bold.otf'));

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${weekdays[d.getDay()]})`;
}

// 길면 그냥 max 글자에서 뚝 자르면 단어·문장 중간이 잘려 어색해 보여서(2026-10-13 피드백),
// max 안에서 가장 가까운 공백 지점까지만 자른다. 공백이 없으면 어쩔 수 없이 그대로 자름.
function truncate(text: string, max: number) {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  const cut = trimmed.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut}…`;
}

export async function GET() {
  // 인증 체크는 항상 서버에서(CLAUDE.md) — (protected)/layout.tsx는 페이지에만 적용되고
  // 같은 폴더의 route.tsx에는 적용 안 되므로 여기서 직접 확인한다.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response('로그인이 필요합니다.', { status: 401 });
  }

  const today = todayDateString();
  const { data: schedule } = await supabase
    .from('qt_schedule')
    .select('*')
    .eq('qt_date', today)
    .maybeSingle();

  const [regular, bold] = await Promise.all([fontRegular, fontBold]);

  if (!schedule) {
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#ffffff',
            fontFamily: 'Pretendard',
            fontSize: 32,
            color: '#78716c',
          }}
        >
          아직 등록된 QT가 없어요.
        </div>
      ),
      {
        width: 1080,
        height: 1080,
        fonts: [
          { name: 'Pretendard', data: regular, weight: 400, style: 'normal' },
          { name: 'Pretendard', data: bold, weight: 700, style: 'normal' },
        ],
      }
    );
  }

  // 본문 전체 구절은 절 번호가 섞여 있고 길어서 카드에 넣으면 중간에 끊겨 어색함(2026-10-13 피드백).
  // 제목 → 본문요약 → 중보기도 순으로 보여주고, 구절은 참조만 제목 아래 작게 표시.
  // 요약·중보기도가 둘 다 없는 날짜만 구절 일부를 대신 보여줌(카드가 비어 보이지 않도록 하는 안전망).
  const hasReflection = Boolean(schedule.summary || schedule.prayer);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: '#ffffff',
          fontFamily: 'Pretendard',
          padding: '80px 72px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingBottom: 28,
            borderBottom: '2px solid #e7e5e4',
          }}
        >
          <div style={{ fontSize: 28, color: '#a8a29e' }}>QT 나눔</div>
          <div style={{ fontSize: 28, color: '#d97706', fontWeight: 700 }}>
            {formatDate(today)}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: 40,
            marginTop: 96,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', fontSize: 52, fontWeight: 700, color: '#292524', lineHeight: 1.4 }}>
              {schedule.title}
            </div>
            <div style={{ display: 'flex', fontSize: 24, color: '#d97706' }}>{schedule.verse_ref}</div>
          </div>

          {schedule.summary && (
            <div style={{ display: 'flex', fontSize: 30, color: '#78716c', lineHeight: 1.7 }}>
              {truncate(schedule.summary, 110)}
            </div>
          )}

          {schedule.prayer && (
            <div style={{ display: 'flex', fontSize: 30, color: '#b45309', lineHeight: 1.7 }}>
              {truncate(schedule.prayer, 110)}
            </div>
          )}

          {!hasReflection && (
            <div style={{ display: 'flex', fontSize: 30, color: '#b45309', lineHeight: 1.7 }}>
              {truncate(schedule.verse_text, 110)}
            </div>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            paddingTop: 28,
            borderTop: '2px solid #e7e5e4',
            fontSize: 22,
            color: '#a8a29e',
          }}
        >
          오늘도 말씀과 함께 하루를 시작해요 · QT 나눔
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1080,
      fonts: [
        { name: 'Pretendard', data: regular, weight: 400, style: 'normal' },
        { name: 'Pretendard', data: bold, weight: 700, style: 'normal' },
      ],
    }
  );
}
