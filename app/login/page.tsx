import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import KakaoLoginButton from '@/components/KakaoLoginButton';

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect('/');
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-50 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-stone-800">QT 나눔</h1>
        <p className="mt-2 text-sm text-stone-500">
          오늘의 말씀을 나누는 우리 모임 전용 공간
        </p>
        <div className="mt-8">
          <KakaoLoginButton />
        </div>
      </div>
    </main>
  );
}
