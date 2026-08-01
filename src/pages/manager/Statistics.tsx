import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { withTimeout } from '@/lib/asyncTimeout';
import { PLAN_ORDER, PLAN_LABEL, PlanId } from '@/context/SubscriptionContext';

export default function Statistics() {
  const [data, setData] = useState<{ counts: Record<PlanId, number>; trial: number; signupsLast7: number }>({
    counts: { basic: 0, standard: 0, premium: 0 }, trial: 0, signupsLast7: 0,
  });

  useEffect(() => {
    (async () => {
      try {
        const { data: profs } = await withTimeout(supabase.from('profiles').select('plan, subscription_status, created_at'), 6000, 'manager.statistics.load');
        const list = profs || [];
        const counts: Record<PlanId, number> = { basic: 0, standard: 0, premium: 0 };
        let trial = 0, signupsLast7 = 0;
        const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        list.forEach((p: any) => {
          if (p.subscription_status === 'active' && counts[p.plan as PlanId] !== undefined) counts[p.plan as PlanId]++;
          else trial++;
          if (new Date(p.created_at).getTime() > weekAgo) signupsLast7++;
        });
        setData({ counts, trial, signupsLast7 });
      } catch (e) {
        console.warn('[manager/statistics] load failed:', e);
      }
    })();
  }, []);

  const total = PLAN_ORDER.reduce((s, p) => s + data.counts[p], 0);
  const barColor: Record<PlanId, string> = { basic: 'bg-blue-500', standard: 'bg-amber-500', premium: 'bg-emerald-500' };
  const bar = (v: number, color: string) => (
    <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
      <div className={`h-full ${color}`} style={{ width: `${total ? (v / total) * 100 : 0}%` }} />
    </div>
  );

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">পরিসংখ্যান</h1>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="card-elevated p-5 rounded-2xl">
          <h3 className="font-semibold mb-3">প্ল্যান বিতরণ</h3>
          <div className="space-y-3 text-sm">
            {PLAN_ORDER.map(p => (
              <div key={p} className="flex items-center gap-3">
                <span className="w-20">{PLAN_LABEL[p]}</span>
                {bar(data.counts[p], barColor[p])}
                <span className="w-8 text-right">{data.counts[p]}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card-elevated p-5 rounded-2xl">
          <h3 className="font-semibold mb-3">সারসংক্ষেপ</h3>
          <p className="text-sm">গত ৭ দিনে নতুন ইউজার: <span className="font-bold">{data.signupsLast7}</span></p>
          <p className="text-sm mt-2">ট্রায়াল ইউজার: <span className="font-bold">{data.trial}</span></p>
          <p className="text-sm mt-2">সক্রিয় সাবস্ক্রাইবার: <span className="font-bold">{total}</span></p>
        </div>
      </div>
    </div>
  );
}
