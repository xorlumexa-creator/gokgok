import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, X, ExternalLink, Loader2, MessageCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { withTimeout } from '@/lib/asyncTimeout';
import { buildWhatsAppLink } from '@/lib/whatsapp';

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
  request_type?: string;
  amount_tk?: number | null;
}

export default function SubscriptionRequests() {
  const [rows, setRows] = useState<ReqRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      // Rejected requests now live on their own page (/manager/subscriptions/rejected)
      // so this list only ever shows what still needs attention or is active.
      const { data, error } = await withTimeout(supabase
        .from('subscription_requests')
        .select('*')
        .neq('status', 'rejected')
        .order('created_at', { ascending: false }), 6000, 'manager.subscriptions.load');
      if (error) throw error;
      if (data && data.length) {
        const ids = [...new Set(data.map(r => r.user_id))];
        const { data: profs } = await withTimeout(supabase.from('profiles').select('user_id, shop_name').in('user_id', ids), 6000, 'manager.subscriptions.profiles');
        const map = new Map((profs || []).map(p => [p.user_id, p.shop_name]));
        setRows(data.map(r => ({ ...r, shop_name: map.get(r.user_id) || null })) as any);
      } else {
        setRows([]);
      }
    } catch (e: any) {
      toast({ title: e.message || 'লোড করতে সমস্যা', variant: 'destructive' });
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const approve = async (r: ReqRow) => {
    setBusy(r.id);
    try {
      // Approval logic lives in a single atomic Postgres function now —
      // see approve_subscription_request in the migrations. This avoids
      // the race condition where approving multiple pending requests for
      // the same user in quick succession could each read a stale expiry
      // and silently fail to stack correctly. It also enforces the
      // same-plan repurchase lock (30 days / credit exhaustion) server-side.
      const { error } = await withTimeout(
        supabase.rpc('approve_subscription_request', { p_request_id: r.id }),
        6000, 'manager.subscriptions.approve',
      );
      if (error) throw error;
      toast({ title: 'অনুমোদন করা হয়েছে ✓' });
      load();
    } catch (e: any) {
      toast({ title: e.message, variant: 'destructive' });
    } finally { setBusy(null); }
  };

  const reject = async (r: ReqRow) => {
    setBusy(r.id);
    try {
      await withTimeout(supabase.from('subscription_requests').update({
        status: 'rejected', resolved_at: new Date().toISOString(),
      }).eq('id', r.id), 6000, 'manager.subscriptions.reject');
      toast({ title: 'প্রত্যাখ্যান করা হয়েছে' });
      load();
    } catch (e: any) {
      toast({ title: e.message, variant: 'destructive' });
    } finally { setBusy(null); }
  };

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <h1 className="text-2xl font-bold">সাবস্ক্রিপশন রিকোয়েস্ট</h1>
        <Link to="/manager/subscriptions/rejected">
          <Button variant="outline" size="sm">
            <XCircle className="w-4 h-4 mr-2" /> প্রত্যাখ্যাত রিকোয়েস্ট দেখুন
          </Button>
        </Link>
      </div>
      {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : rows.length === 0 ? (
        <p className="text-muted-foreground">কোনো রিকোয়েস্ট নেই।</p>
      ) : (
        <div className="space-y-3">
          {rows.map(r => {
            const waLink = buildWhatsAppLink(r.user_phone);
            return (
              <div key={r.id} className="card-elevated p-5 rounded-2xl">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-1">
                    <p className="font-bold">{r.shop_name || 'অজানা দোকান'}</p>
                    <p className="text-sm text-muted-foreground">📞 {r.user_phone}</p>
                    <p className="text-sm">প্ল্যান: <span className="font-semibold capitalize">{r.plan_type}</span></p>
                    {r.request_type === 'upgrade' ? (
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                        আপগ্রেড {r.amount_tk ? `(+৳${r.amount_tk})` : ''} — মেয়াদ অপরিবর্তিত থাকবে
                      </span>
                    ) : (
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground">
                        নতুন প্ল্যান{r.amount_tk ? ` — ৳${r.amount_tk}` : ''}
                      </span>
                    )}
                    <p className="text-sm">পেমেন্ট: {r.payment_method}</p>
                    {r.transaction_id && <p className="text-sm">TXN: <code className="bg-muted px-1 rounded">{r.transaction_id}</code></p>}
                    {r.screenshot_url && (
                      <a href={r.screenshot_url} target="_blank" rel="noreferrer" className="text-sm text-primary inline-flex items-center gap-1">
                        স্ক্রিনশট দেখুন <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString('bn-BD')}</p>
                    <div className="flex items-center gap-2 flex-wrap mt-2">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        r.status === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>{r.status}</span>
                      {waLink && (
                        <a href={waLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100">
                          <MessageCircle className="w-3 h-3" /> WhatsApp
                        </a>
                      )}
                    </div>
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
            );
          })}
        </div>
      )}
    </div>
  );
    }
                      
