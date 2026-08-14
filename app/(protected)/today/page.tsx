import { createClient } from '@/lib/supabase/server';
import { todayDateString } from '@/lib/date';
import QTDayView from '@/components/QTDayView';

export default async function TodayPage() {
  const supabase = await createClient();
  const today = todayDateString();

  const { data: schedule } = await supabase
    .from('qt_schedule')
    .select('*')
    .eq('qt_date', today)
    .maybeSingle();

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-stone-800">오늘의 QT</h1>
      <QTDayView date={today} schedule={schedule} />
    </div>
  );
}
