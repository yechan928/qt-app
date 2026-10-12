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

const CARD_WIDTH = 1080;
const CONTENT_WIDTH = CARD_WIDTH - 72 * 2;

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${weekdays[d.getDay()]})`;
}

// ImageResponse는 캔버스 크기를 고정으로 지정해야 해서(콘텐츠에 맞춰 자동으로 안 늘어남),
// 본문요약·중보기도를 절대 안 잘리게 하려면 글자 수를 보고 카드 높이를 미리 계산해야 한다
// (2026-10-13 피드백: "아무리 길어도 잘리면 안 됨"). 완벽한 측정은 아니고 한글 기준 대략적인
// 추정치 — 실제 폭보다 넉넉하게 잡아서 줄바꿈이 예상보다 한 줄 더 생겨도 잘리지 않게 한다.
function estimateLines(text: string, fontSize: number, maxWidth: number) {
  const charsPerLine = Math.max(1, Math.floor(maxWidth / (fontSize * 1.05)));
  return text
    .split('\n')
    .reduce((sum, line) => sum + Math.max(1, Math.ceil(line.length / charsPerLine)), 0);
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
  const fonts = [
    { name: 'Pretendard', data: regular, weight: 400 as const, style: 'normal' as const },
    { name: 'Pretendard', data: bold, weight: 700 as const, style: 'normal' as const },
  ];

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
      { width: CARD_WIDTH, height: 1080, fonts }
    );
  }

  // 본문 전체 구절은 절 번호가 섞여 있고 길어서 카드에 넣으면 중간에 끊겨 어색함(2026-10-13 피드백).
  // 제목 → 본문요약 → 중보기도 순으로 보여주고, 구절은 참조만 제목 아래 작게 표시.
  // 요약·중보기도가 둘 다 없는 날짜만 구절 일부를 대신 보여줌(카드가 비어 보이지 않도록 하는 안전망).
  const hasReflection = Boolean(schedule.summary || schedule.prayer);
  const summaryFontSize = 30;
  // 중보기도는 본문요약과 구분되도록 라벨("오늘의 기도")을 달고 글씨도 좀 더 작게(2026-10-13 2차 피드백).
  const prayerFontSize = 26;
  const fallbackVerseFontSize = 30;

  // 헤더+제목+구절참조+여백+푸터 등 고정 요소 높이(대략) + 본문 내용 줄 수만큼 더해 전체 카드 높이를 정한다.
  const fixedHeight = 420;
  const summaryLines = schedule.summary ? estimateLines(schedule.summary, summaryFontSize, CONTENT_WIDTH) : 0;
  const prayerLines = schedule.prayer ? estimateLines(schedule.prayer, prayerFontSize, CONTENT_WIDTH) : 0;
  const fallbackLines = !hasReflection
    ? estimateLines(schedule.verse_text, fallbackVerseFontSize, CONTENT_WIDTH)
    : 0;
  const contentHeight =
    summaryLines * summaryFontSize * 1.8 +
    prayerLines * prayerFontSize * 1.8 +
    fallbackLines * fallbackVerseFontSize * 1.8 +
    (schedule.summary ? 40 : 0) +
    (schedule.prayer ? 80 : 0); // "오늘의 기도" 라벨 한 줄만큼 여유 추가
  // 글자 수 기반 추정이라 실제 줄바꿈과 완전히 일치하진 않는다 — 모자라서 잘리는 것보다
  // 여백이 조금 남는 쪽이 안전해서 80px 여유를 더 둔다.
  const cardHeight = Math.max(900, Math.round(fixedHeight + contentHeight + 80));

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
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
          <div style={{ fontSize: 28, color: '#d97706', fontWeight: 700 }}>{formatDate(today)}</div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 36,
            marginTop: 64,
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', fontSize: 52, fontWeight: 700, color: '#292524', lineHeight: 1.4 }}>
              {schedule.title}
            </div>
            <div style={{ display: 'flex', fontSize: 24, color: '#d97706' }}>{schedule.verse_ref}</div>
          </div>

          {/* whiteSpace: pre-line으로 관리자가 입력한 줄바꿈은 그대로 살리되, 가운데 정렬이 더 보기
              좋다는 피드백(2026-10-13 2차)으로 되돌림. */}
          {schedule.summary && (
            <div
              style={{
                display: 'flex',
                width: '100%',
                fontSize: summaryFontSize,
                color: '#b45309',
                lineHeight: 1.8,
                textAlign: 'center',
                whiteSpace: 'pre-line',
              }}
            >
              {schedule.summary.trim()}
            </div>
          )}

          {schedule.prayer && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                width: '100%',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', fontSize: 22, fontWeight: 700, color: '#a8a29e' }}>
                오늘의 기도
              </div>
              <div
                style={{
                  display: 'flex',
                  width: '100%',
                  fontSize: prayerFontSize,
                  color: '#78716c',
                  lineHeight: 1.8,
                  textAlign: 'center',
                  whiteSpace: 'pre-line',
                }}
              >
                {schedule.prayer.trim()}
              </div>
            </div>
          )}

          {!hasReflection && (
            <div
              style={{
                display: 'flex',
                width: '100%',
                fontSize: fallbackVerseFontSize,
                color: '#b45309',
                lineHeight: 1.8,
                textAlign: 'center',
                whiteSpace: 'pre-line',
              }}
            >
              {schedule.verse_text.trim()}
            </div>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            marginTop: 'auto',
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
    { width: CARD_WIDTH, height: cardHeight, fonts }
  );
}
