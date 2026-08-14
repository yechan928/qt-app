'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const LINKS = [
  { href: '/groups', label: '피드' },
  { href: '/posts/new', label: '나눔' },
  { href: '/today', label: '오늘의 QT' },
];

const ADMIN_LINK = { href: '/schedule', label: '말씀 등록' };

export default function NavBar({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const links = isAdmin ? [...LINKS, ADMIN_LINK] : LINKS;

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-10 border-b border-stone-200 bg-white/95 backdrop-blur">
      <nav className="mx-auto flex w-full max-w-2xl items-center justify-between px-4 py-3 text-sm">
        <div className="flex items-center gap-4">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={
                pathname === link.href || (link.href === '/groups' && pathname.startsWith('/groups'))
                  ? 'font-semibold text-amber-700'
                  : 'text-stone-500 hover:text-stone-800'
              }
            >
              {link.label}
            </Link>
          ))}
        </div>
        <button onClick={handleLogout} className="text-stone-400 hover:text-stone-700">
          로그아웃
        </button>
      </nav>
    </header>
  );
}
