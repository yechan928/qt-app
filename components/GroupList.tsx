import Link from 'next/link';
import CopyInviteCode from '@/components/CopyInviteCode';
import type { Group } from '@/types/database';

export default function GroupList({
  groups,
}: {
  groups: Pick<Group, 'id' | 'name' | 'invite_code'>[];
}) {
  if (groups.length === 0) {
    return (
      <p className="rounded-2xl bg-white p-6 text-center text-sm text-stone-400 shadow-sm">
        아직 속한 그룹이 없어요. 아래에서 만들거나 초대 코드로 참여해보세요.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {groups.map((g) => (
        <li key={g.id} className="rounded-2xl bg-white p-4 shadow-sm transition hover:shadow-md">
          <Link href={`/groups/${g.id}`} className="flex items-center justify-between">
            <p className="font-medium text-stone-800">{g.name}</p>
            <span className="text-stone-300">›</span>
          </Link>
          <div className="mt-1 flex items-center gap-2 text-xs text-stone-400">
            <span>초대 코드: {g.invite_code}</span>
            <CopyInviteCode code={g.invite_code} />
          </div>
        </li>
      ))}
    </ul>
  );
}
