import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'QT 나눔',
  description: '오늘의 말씀을 나누는 우리 모임 전용 공간',
  appleWebApp: {
    capable: true,
    title: 'QT 나눔',
    statusBarStyle: 'default',
  },
  icons: {
    apple: '/icons/apple-touch-icon.png',
  },
  other: {
    // Next.js는 표준 mobile-web-app-capable만 내려주는데, iOS 16.4 미만은 이 구식 태그가 있어야
    // 홈화면 아이콘 실행 시 사파리 주소창 없이 전체화면(standalone)으로 뜬다.
    'apple-mobile-web-app-capable': 'yes',
  },
};

export const viewport: Viewport = {
  themeColor: '#d97706',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-stone-50 text-stone-800">{children}</body>
    </html>
  );
}
