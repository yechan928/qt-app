import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import DailyNanum from '@/components/DailyNanum';

export default async function NewPostPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string }>;
}) {
  const { group } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-stone-800">나눔 쓰기</h1>
      <DailyNanum userId={user.id} preselectedGroupId={group} />
    </div>
  );
}
