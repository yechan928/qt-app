'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function KakaoLoginButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        // 카카오 앱에 닉네임만 동의항목으로 등록해뒀으므로, 요청 스코프도 닉네임만으로 제한한다.
        // (지정 안 하면 Supabase가 이메일 등 다른 스코프도 함께 요청해 KOE004 에러가 남)
        scopes: 'profile_nickname',
      },
    });
    if (error) {
      setError('로그인에 실패했어요. 잠시 후 다시 시도해주세요.');
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleLogin}
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#FEE500] px-6 py-3 font-medium text-[#191919] shadow-sm transition hover:brightness-95 disabled:opacity-60"
      >
        {loading ? '이동 중...' : '카카오로 로그인'}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
