import { useEffect, useState } from 'react';
import { Check, X, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface ReqRow {
  id: string;
  user_id: string;
  user_phone: string;
  plan_type: string;
  transaction_id: string | null;
  screenshot_url: string | null;
  payment_method: string;
  status: string;
  created_at: string;
  shop_name?: string | null;
}

export default function SubscriptionRequests() {
  const [rows, setRows] = useState<ReqRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('subscription_requests')
      .select('*')
      .order('created_at', { ascending: false });
    if (data && data.length) {
      const ids = [...new Set(data.map(r => r.user_id))];
      const { data: profs } = await supabase.from('profiles').select('user_id, shop_name').in('user_id', ids);
      const map = new Map((profs || []).map(p => [p.user_id, p.shop_name]));
      setRows(data.map(r => ({ ...r, shop_name: map.get(r.user_id) || null })) as any);
    } else {
      setRows([]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const approve = async (r: ReqRow) => {
    setBusy(r.id);
    try {
      const expiry = new Date(); expiry.setDate(expiry.getDate() + 30);
      await supabase.from('profiles').update({
        subscription_status: 'active',
        plan: r.plan_type,
        plan_expiry: expiry.toISOString(),
        temporary_access: false,
      }).eq('user_id', r.user_id);
      await supabase.from('subscription_requests').update({
        status: 'approved', resolved_at: new Date().toISOString(),
      }).eq('id', r.id);
      toast({ title: 'অনুমোদন করা হয়েছে ✓' });
      load();
    } catch (e: any) {
      toast({ title: e.message, variant: 'destructive' });
    } finally { setBusy(null); }
  };

  const reject = async (r: ReqRow) => {
    setBusy(r.id);
    try {
      await supabase.from('subscription_requests').update({
        status: 'rejected', resolved_at: new Date().toISOString(),
      }).eq('id', r.id);
      toast({ title: 'প্রত্যাখ্যান করা হয়েছে' });
      load();
    } catch (e: any) {
      toast({ title: e.message, variant: 'destructive' });
    } finally { setBusy(null); }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">সাবস্ক্রিপশন রিকোয়েস্ট</h1>
      {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : rows.length === 0 ? (
        <p className="text-muted-foreground">কোনো রিকোয়েস্ট নেই।</p>
      ) : (
        <div className="space-y-3">
          {rows.map(r => (
            <div key={r.id} className="card-elevated p-5 rounded-2xl">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-1">
                  <p className="font-bold">{r.shop_name || 'অজানা দোকান'}</p>
                  <p className="text-sm text-muted-foreground">📞 {r.user_phone}</p>
                  <p className="text-sm">প্ল্যান: <span className="font-semibold capitalize">{r.plan_type}</span></p>
                  <p className="text-sm">পেমেন্ট: {r.payment_method}</p>
                  {r.transaction_id && <p className="text-sm">TXN: <code className="bg-muted px-1 rounded">{r.transaction_id}</code></p>}
                  {r.screenshot_url && (
                    <a href={r.screenshot_url} target="_blank" rel="noreferrer" className="text-sm text-primary inline-flex items-center gap-1">
                      স্ক্রিনশট দেখুন <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString('bn-BD')}</p>
                  <span className={`inline-block mt-2 px-2 py-0.5 rounded text-xs font-medium ${
                    r.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                    r.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>{r.status}</span>
                </div>
                {r.status === 'pending' && (
                  <div className="flex flex-col gap-2">
                    <Button onClick={() => approve(r)} disabled={busy === r.id} size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                      <Check className="w-4 h-4 mr-1" /> Approve
                    </Button>
                    <Button onClick={() => reject(r)} disabled={busy === r.id} size="sm" variant="destructive">
                      <X className="w-4 h-4 mr-1" /> Reject
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
