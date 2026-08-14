import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ScheduleAdminView from '@/components/ScheduleAdminView';

export default async function ScheduleAdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) {
    redirect('/');
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-stone-800">말씀 등록</h1>
      <ScheduleAdminView userId={user.id} />
    </div>
  );
}
