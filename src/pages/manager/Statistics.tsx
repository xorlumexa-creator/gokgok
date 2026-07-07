import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { withTimeout } from '@/lib/asyncTimeout';

export default function Statistics() {
  const [data, setData] = useState({ basic: 0, standard: 0, pro: 0, trial: 0, signupsLast7: 0 });

  useEffect(() => {
    (async () => {
      try {
        const { data: profs } = await withTimeout(supabase.from('profiles').select('plan, subscription_status, created_at'), 6000, 'manager.statistics.load');
        const list = profs || [];
        const counts = { basic: 0, standard: 0, pro: 0, trial: 0, signupsLast7: 0 };
        const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        list.forEach((p: any) => {
          if (p.plan === 'basic') counts.basic++;
          else if (p.plan === 'standard') counts.standard++;
          else if (p.plan === 'pro') counts.pro++;
          else counts.trial++;
          if (new Date(p.created_at).getTime() > weekAgo) counts.signupsLast7++;
        });
        setData(counts);
      } catch (e) {
        console.warn('[manager/statistics] load failed:', e);
      }
    })();
  }, []);

  const total = data.basic + data.standard + data.pro;
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
            <div className="flex items-center gap-3"><span className="w-20">Basic</span>{bar(data.basic, 'bg-blue-500')}<span className="w-8 text-right">{data.basic}</span></div>
            <div className="flex items-center gap-3"><span className="w-20">Standard</span>{bar(data.standard, 'bg-amber-500')}<span className="w-8 text-right">{data.standard}</span></div>
            <div className="flex items-center gap-3"><span className="w-20">Pro</span>{bar(data.pro, 'bg-emerald-500')}<span className="w-8 text-right">{data.pro}</span></div>
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
