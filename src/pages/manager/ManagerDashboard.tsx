import { useEffect, useState } from 'react';
import { Users, CreditCard, KeyRound, CheckCircle2, Wallet, Cloud, TrendingUp, KeyRound as KeyIcon, Loader2, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

const PLAN_PRICE: Record<string, number> = { basic: 80, standard: 140, pro: 200 };

export default function ManagerDashboard() {
  const [stats, setStats] = useState({ users: 0, pendingSubs: 0, pendingPw: 0, activeSubs: 0 });
  const [earnings, setEarnings] = useState(0);
  const [planBreakdown, setPlanBreakdown] = useState<Record<string, { count: number; total: number }>>({});
  const [cloudCost, setCloudCost] = useState(0);
  const [costInput, setCostInput] = useState('');
  const [savingCost, setSavingCost] = useState(false);
  const [bootBusy, setBootBusy] = useState(false);

  const load = async () => {
    const [u, ps, pp, asu, approved, settings] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('subscription_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('password_reset_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('subscription_status', 'active'),
      supabase.from('subscription_requests').select('plan_type').eq('status', 'approved'),
      supabase.from('app_settings').select('cloud_cost_monthly').eq('id', 1).maybeSingle(),
    ]);
    setStats({
      users: u.count || 0,
      pendingSubs: ps.count || 0,
      pendingPw: pp.count || 0,
      activeSubs: asu.count || 0,
    });
    const breakdown: Record<string, { count: number; total: number }> = {
      basic: { count: 0, total: 0 }, standard: { count: 0, total: 0 }, pro: { count: 0, total: 0 },
    };
    let total = 0;
    (approved.data || []).forEach((r: any) => {
      const price = PLAN_PRICE[r.plan_type] || 0;
      if (breakdown[r.plan_type]) { breakdown[r.plan_type].count++; breakdown[r.plan_type].total += price; }
      total += price;
    });
    setEarnings(total);
    setPlanBreakdown(breakdown);
    const cc = Number(settings.data?.cloud_cost_monthly || 0);
    setCloudCost(cc);
    setCostInput(String(cc));
  };

  useEffect(() => { load(); }, []);

  const saveCost = async () => {
    setSavingCost(true);
    const v = Number(costInput || 0);
    const { error } = await supabase.from('app_settings').update({ cloud_cost_monthly: v, updated_at: new Date().toISOString() }).eq('id', 1);
    if (error) toast({ title: error.message, variant: 'destructive' });
    else { toast({ title: 'খরচ সংরক্ষিত হয়েছে ✓' }); setCloudCost(v); }
    setSavingCost(false);
  };

  const bootstrapPw = async () => {
    setBootBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('manager-admin', { body: { action: 'bootstrap_manager_password' } });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || 'failed');
      toast({ title: 'ম্যানেজার পাসওয়ার্ড সেট হয়েছে ✓', description: 'ফোন: 01920051662' });
    } catch (e: any) {
      toast({ title: e.message, variant: 'destructive' });
    } finally { setBootBusy(false); }
  };

  const profit = earnings - cloudCost;
  const cards = [
    { label: 'মোট ইউজার', value: stats.users, icon: Users, color: 'bg-blue-500' },
    { label: 'অপেক্ষমাণ সাবস্ক্রিপশন', value: stats.pendingSubs, icon: CreditCard, color: 'bg-amber-500' },
    { label: 'পাসওয়ার্ড রিকোয়েস্ট', value: stats.pendingPw, icon: KeyRound, color: 'bg-rose-500' },
    { label: 'সক্রিয় সাবস্ক্রিপশন', value: stats.activeSubs, icon: CheckCircle2, color: 'bg-emerald-500' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">ম্যানেজার ড্যাশবোর্ড</h1>
        <Button variant="outline" onClick={bootstrapPw} disabled={bootBusy}>
          {bootBusy ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <KeyIcon className="w-4 h-4 mr-2" />}
          ম্যানেজার পাসওয়ার্ড সেট
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(c => (
          <div key={c.label} className="card-elevated p-5 rounded-2xl flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl ${c.color} text-white flex items-center justify-center`}><c.icon className="w-6 h-6" /></div>
            <div>
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <p className="text-2xl font-bold">{c.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Money */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card-elevated p-5 rounded-2xl">
          <div className="flex items-center gap-3 mb-2">
            <Wallet className="w-5 h-5 text-emerald-600" />
            <p className="text-sm font-medium">মোট আয় (অনুমোদিত)</p>
          </div>
          <p className="text-3xl font-extrabold text-emerald-600">৳{earnings.toLocaleString('bn-BD')}</p>
          <div className="mt-3 space-y-1 text-xs text-muted-foreground">
            {Object.entries(planBreakdown).map(([k, v]) => (
              <p key={k}>{k}: {v.count} × ৳{PLAN_PRICE[k]} = ৳{v.total}</p>
            ))}
          </div>
        </div>

        <div className="card-elevated p-5 rounded-2xl">
          <div className="flex items-center gap-3 mb-2">
            <Cloud className="w-5 h-5 text-sky-600" />
            <p className="text-sm font-medium">Lovable Cloud খরচ (মাসিক)</p>
          </div>
          <p className="text-3xl font-extrabold text-sky-600">৳{cloudCost.toLocaleString('bn-BD')}</p>
          <div className="mt-3 flex gap-2">
            <input
              type="number"
              value={costInput}
              onChange={e => setCostInput(e.target.value)}
              className="input-field flex-1"
              placeholder="টাকা"
            />
            <Button size="sm" onClick={saveCost} disabled={savingCost}>
              {savingCost ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        <div className="card-elevated p-5 rounded-2xl">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className={`w-5 h-5 ${profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`} />
            <p className="text-sm font-medium">নেট লাভ</p>
          </div>
          <p className={`text-3xl font-extrabold ${profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            ৳{profit.toLocaleString('bn-BD')}
          </p>
          <p className="text-xs text-muted-foreground mt-3">আয় − Lovable Cloud খরচ</p>
        </div>
      </div>
    </div>
  );
}
