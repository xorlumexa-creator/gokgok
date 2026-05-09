import { useEffect, useMemo, useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Row {
  user_id: string;
  full_name: string | null;
  shop_name: string | null;
  phone: string | null;
  plan: string | null;
  subscription_status: string;
  role: string;
  created_at: string;
}

export default function UsersList() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('user_id, full_name, shop_name, phone, plan, subscription_status, role, created_at')
        .order('created_at', { ascending: false });
      setRows((data as any) || []);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter(r =>
      (r.phone || '').toLowerCase().includes(s) ||
      (r.shop_name || '').toLowerCase().includes(s) ||
      (r.full_name || '').toLowerCase().includes(s)
    );
  }, [rows, q]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">ইউজার তালিকা</h1>
      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="ফোন / নাম / দোকান খুঁজুন..." className="input-field pl-9" />
      </div>
      {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
        <div className="card-elevated rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="p-3">নাম</th>
                <th className="p-3">দোকান</th>
                <th className="p-3">ফোন</th>
                <th className="p-3">প্ল্যান</th>
                <th className="p-3">স্ট্যাটাস</th>
                <th className="p-3">রোল</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.user_id} className="border-t border-border">
                  <td className="p-3">{r.full_name || '—'}</td>
                  <td className="p-3">{r.shop_name || '—'}</td>
                  <td className="p-3 font-mono text-xs">{r.phone || '—'}</td>
                  <td className="p-3 capitalize">{r.plan || '—'}</td>
                  <td className="p-3">{r.subscription_status}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-xs ${r.role === 'manager' ? 'bg-primary/10 text-primary' : 'bg-muted'}`}>{r.role}</span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">কোনো ইউজার পাওয়া যায়নি</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
