import { useEffect, useState } from 'react';
import { Users, CreditCard, KeyRound, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function ManagerDashboard() {
  const [stats, setStats] = useState({ users: 0, pendingSubs: 0, pendingPw: 0, activeSubs: 0 });

  useEffect(() => {
    (async () => {
      const [u, ps, pp, asu] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('subscription_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('password_reset_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('subscription_status', 'active'),
      ]);
      setStats({
        users: u.count || 0,
        pendingSubs: ps.count || 0,
        pendingPw: pp.count || 0,
        activeSubs: asu.count || 0,
      });
    })();
  }, []);

  const cards = [
    { label: 'মোট ইউজার', value: stats.users, icon: Users, color: 'bg-blue-500' },
    { label: 'অপেক্ষমাণ সাবস্ক্রিপশন', value: stats.pendingSubs, icon: CreditCard, color: 'bg-amber-500' },
    { label: 'পাসওয়ার্ড রিকোয়েস্ট', value: stats.pendingPw, icon: KeyRound, color: 'bg-rose-500' },
    { label: 'সক্রিয় সাবস্ক্রিপশন', value: stats.activeSubs, icon: CheckCircle2, color: 'bg-emerald-500' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">ম্যানেজার ড্যাশবোর্ড</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(c => (
          <div key={c.label} className="card-elevated p-5 rounded-2xl flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl ${c.color} text-white flex items-center justify-center`}>
              <c.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <p className="text-2xl font-bold">{c.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
