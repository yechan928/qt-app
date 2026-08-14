import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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
      return NextResponse.redirect(`${origin}/`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
