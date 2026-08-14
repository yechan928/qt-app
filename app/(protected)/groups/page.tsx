import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import GroupList from '@/components/GroupList';
import CreateGroupSection from '@/components/CreateGroupSection';
import JoinGroupSection from '@/components/JoinGroupSection';
import type { GroupMembership } from '@/types/database';

export default async function GroupsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  const { data } = await supabase
    .from('group_members')
    .select('group_id, groups(id, name, invite_code)')
    .eq('user_id', user.id);

  const memberships = (data ?? []) as unknown as GroupMembership[];
  const groups = memberships.map((m) => m.groups);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-stone-800">내 그룹</h1>
        <p className="mt-1 text-sm text-stone-500">
          카톡방처럼 여러 그룹에 동시에 속할 수 있어요. 그룹을 골라 들어가거나, 새로 만들거나,
          초대 코드로 참여해보세요.
        </p>
      </div>

      <GroupList groups={groups} />

      <CreateGroupSection />
      <JoinGroupSection />
    </div>
  );
}
