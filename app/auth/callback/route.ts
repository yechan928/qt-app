import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// 회원 관리 화면(SPEC.md §4-12)의 "최근 접속 기기" 표시용. 정밀한 기기 판별이 아니라
// 대략적인 참고용이라 모바일 UA 패턴만 확인하고 나머지는 전부 데스크톱으로 묶는다(PLAN.md §L).
function classifyDevice(userAgent: string | null): 'mobile' | 'desktop' {
  if (userAgent && /Mobi|Android|iPhone/i.test(userAgent)) return 'mobile';
  return 'desktop';
}

export async function GET(request: NextRequest) {
  const { searchParams, origin: rawOrigin } = new URL(request.url);
  const code = searchParams.get('code');
  // 로컬 next dev는 ngrok 같은 리버스 프록시 뒤에 있을 때 request.url을 그대로
  // localhost:3000으로 만들어버려서(Host 헤더를 무시), 실제 공개 도메인은
  // x-forwarded-host/x-forwarded-proto에서 가져와야 한다. Vercel 배포 시에도
  // 이 헤더들이 표준으로 붙으므로 그대로 안전하게 동작한다.
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto');
  const origin = forwardedHost ? `${forwardedProto ?? 'https'}://${forwardedHost}` : rawOrigin;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const device = classifyDevice(request.headers.get('user-agent'));
        // 실패해도 로그인 자체는 이미 성공했으니 막지 않는다(부가 정보일 뿐).
        await supabase.from('profiles').update({ last_device: device }).eq('id', user.id);
      }
      return NextResponse.redirect(`${origin}/`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
