import { useEffect, useMemo, useState } from 'react';
import { Search, Loader2, Trash2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

interface Row {
  user_id: string;
  full_name: string | null;
  shop_name: string | null;
  phone: string | null;
  plan: string | null;
  subscription_status: string;
  role: string;
  created_at: string;
  trial_start_date: string | null;
  temporary_access: boolean;
}

const TRIAL_DAYS = 3;
const GRACE_DAYS = 90; // 3 months no-attempt → delete

export default function UsersList() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'all' | 'trial' | 'subscribed' | 'expiring'>('all');
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('user_id, full_name, shop_name, phone, plan, subscription_status, role, created_at, trial_start_date, temporary_access')
      .order('created_at', { ascending: false });
    setRows((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const enriched = useMemo(() => {
    const today = Date.now();
    return rows.map(r => {
      const start = new Date(r.trial_start_date || r.created_at).getTime();
      const daysSince = Math.floor((today - start) / (1000 * 60 * 60 * 24));
      const isTrial = r.subscription_status !== 'active' && !r.plan;
      const willDeleteIn = Math.max(0, TRIAL_DAYS + GRACE_DAYS - daysSince);
      return { ...r, daysSince, isTrial, willDeleteIn };
    });
  }, [rows]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return enriched.filter(r => {
      const matchSearch = !s || (r.phone || '').toLowerCase().includes(s) ||
        (r.shop_name || '').toLowerCase().includes(s) || (r.full_name || '').toLowerCase().includes(s);
      if (!matchSearch) return false;
      if (filter === 'trial') return r.isTrial && r.role !== 'manager';
      if (filter === 'subscribed') return r.subscription_status === 'active';
      if (filter === 'expiring') return r.isTrial && r.role !== 'manager' && r.willDeleteIn <= 7;
      return true;
    });
  }, [enriched, q, filter]);

  const deleteUser = async (r: Row) => {
    if (r.role === 'manager') { toast({ title: 'ম্যানেজার মুছে ফেলা যাবে না', variant: 'destructive' }); return; }
    if (!confirm(`আপনি কি নিশ্চিত? ${r.shop_name || r.phone || ''} এর সব ডাটা চিরতরে মুছে যাবে।`)) return;
    setBusy(r.user_id);
    try {
      const { data, error } = await supabase.functions.invoke('manager-admin', {
        body: { action: 'delete_user', user_id: r.user_id },
      });
      if (error || !data?.ok) throw new Error(data?.error || error?.message || 'failed');
      toast({ title: 'অ্যাকাউন্ট মুছে ফেলা হয়েছে ✓' });
      setRows(prev => prev.filter(p => p.user_id !== r.user_id));
    } catch (e: any) {
      toast({ title: e.message, variant: 'destructive' });
    } finally { setBusy(null); }
  };

  const purgeExpired = async () => {
    if (!confirm('৩৫ দিনের বেশি পুরনো ফ্রি ট্রায়াল অ্যাকাউন্ট সব মুছে ফেলা হবে?')) return;
    const { data, error } = await supabase.functions.invoke('manager-admin', {
      body: { action: 'purge_expired_trials' },
    });
    if (error || !data?.ok) { toast({ title: error?.message || 'সমস্যা', variant: 'destructive' }); return; }
    toast({ title: `${data.deleted} টি অ্যাকাউন্ট মুছে ফেলা হয়েছে` });
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <h1 className="text-2xl font-bold">ইউজার তালিকা</h1>
        <Button variant="destructive" onClick={purgeExpired}>
          <Trash2 className="w-4 h-4 mr-2" /> মেয়াদোত্তীর্ণ ট্রায়াল মুছুন
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        {([
          { k: 'all', l: 'সব' },
          { k: 'trial', l: 'ফ্রি ট্রায়াল' },
          { k: 'subscribed', l: 'সাবস্ক্রাইবড' },
          { k: 'expiring', l: 'শীঘ্রই মুছে যাবে' },
        ] as const).map(t => (
          <button key={t.k} onClick={() => setFilter(t.k as any)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${filter === t.k ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground hover:bg-muted/70'}`}>
            {t.l}
          </button>
        ))}
      </div>

      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="ফোন / নাম / দোকান খুঁজুন..." className="input-field pl-9" />
      </div>

      {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
        <div className="card-elevated rounded-2xl overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="p-3">দোকান / নাম</th>
                <th className="p-3">ফোন</th>
                <th className="p-3">প্ল্যান</th>
                <th className="p-3">স্ট্যাটাস</th>
                <th className="p-3">সাইনআপ</th>
                <th className="p-3">মুছে যাবে</th>
                <th className="p-3">কাজ</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.user_id} className="border-t border-border">
                  <td className="p-3">
                    <p className="font-medium">{r.shop_name || '—'}</p>
                    <p className="text-xs text-muted-foreground">{r.full_name || '—'}</p>
                  </td>
                  <td className="p-3 font-mono text-xs">{r.phone || '—'}</td>
                  <td className="p-3 capitalize">{r.plan || <span className="text-muted-foreground">trial</span>}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-xs ${r.subscription_status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {r.subscription_status}
                    </span>
                    {r.role === 'manager' && <span className="ml-1 px-2 py-0.5 rounded text-xs bg-primary/10 text-primary">manager</span>}
                  </td>
                  <td className="p-3 text-xs">{r.daysSince} দিন আগে</td>
                  <td className="p-3 text-xs">
                    {r.isTrial && r.role !== 'manager' ? (
                      r.willDeleteIn === 0 ? (
                        <span className="text-rose-700 font-bold flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> এখনই
                        </span>
                      ) : (
                        <span className={r.willDeleteIn <= 7 ? 'text-rose-600 font-bold' : 'text-muted-foreground'}>
                          {r.willDeleteIn} দিনে
                        </span>
                      )
                    ) : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="p-3">
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={r.role === 'manager' || busy === r.user_id}
                      onClick={() => deleteUser(r)}
                    >
                      {busy === r.user_id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                    </Button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">কোনো ইউজার পাওয়া যায়নি</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
