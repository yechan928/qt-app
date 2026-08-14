'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Group } from '@/types/database';

type GroupOption = Pick<Group, 'id' | 'name'>;

export default function GroupShareSelect({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (groupIds: string[]) => void;
}) {
  const [groups, setGroups] = useState<GroupOption[]>([]);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('group_members')
      .select('groups(id, name)')
      .then(({ data }) => {
        const rows = (data ?? []) as unknown as { groups: GroupOption }[];
        setGroups(rows.map((r) => r.groups));
      });
  }, []);

  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((g) => g !== id) : [...selected, id]);
  }

  if (groups.length === 0) {
    return (
      <p className="text-sm text-stone-400">
        아직 속한 그룹이 없어요. 지금은 나만 보는 개인 기록으로 저장돼요.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {groups.map((g) => (
        <label key={g.id} className="flex items-center gap-2 text-sm text-stone-700">
          <input
            type="checkbox"
            checked={selected.includes(g.id)}
            onChange={() => toggle(g.id)}
            className="h-4 w-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500"
          />
          {g.name}
        </label>
      ))}
    </div>
  );
}
