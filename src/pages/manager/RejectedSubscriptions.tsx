import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Loader2, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { withTimeout } from '@/lib/asyncTimeout';
import { buildWhatsAppLink, DEFAULT_REJECTION_MESSAGE } from '@/lib/whatsapp';

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
  resolved_at?: string | null;
  shop_name?: string | null;
  request_type?: string;
  amount_tk?: number | null;
}

export default function RejectedSubscriptions() {
  const [rows, setRows] = useState<ReqRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await withTimeout(supabase
        .from('subscription_requests')
        .select('*')
        .eq('status', 'rejected')
        .order('resolved_at', { ascending: false }), 6000, 'manager.subscriptions.rejected.load');
      if (error) throw error;
      if (data && data.length) {
        const ids = [...new Set(data.map(r => r.user_id))];
        const { data: profs } = await withTimeout(supabase.from('profiles').select('user_id, shop_name').in('user_id', ids), 6000, 'manager.subscriptions.rejected.profiles');
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

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link to="/manager/subscriptions" className="p-2 -ml-2 rounded-full hover:bg-muted">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold">প্রত্যাখ্যাত সাবস্ক্রিপশন রিকোয়েস্ট</h1>
      </div>

      {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : rows.length === 0 ? (
        <p className="text-muted-foreground">কোনো প্রত্যাখ্যাত রিকোয়েস্ট নেই।</p>
      ) : (
        <div className="space-y-3">
          {rows.map(r => {
            const waLink = buildWhatsAppLink(r.user_phone, DEFAULT_REJECTION_MESSAGE);
            return (
              <div key={r.id} className="card-elevated p-5 rounded-2xl border border-rose-200/60 dark:border-rose-900/40">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-1">
                    <p className="font-bold">{r.shop_name || 'অজানা দোকান'}</p>
                    <p className="text-sm text-muted-foreground">📞 {r.user_phone}</p>
                    <p className="text-sm">প্ল্যান: <span className="font-semibold capitalize">{r.plan_type}</span></p>
                    <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground">
                      {r.request_type === 'upgrade' ? 'আপগ্রেড' : 'নতুন প্ল্যান'}{r.amount_tk ? ` — ৳${r.amount_tk}` : ''}
                    </span>
                    <p className="text-sm">পেমেন্ট: {r.payment_method}</p>
                    {r.transaction_id && <p className="text-sm">TXN: <code className="bg-muted px-1 rounded">{r.transaction_id}</code></p>}
                    {r.screenshot_url && (
                      <a href={r.screenshot_url} target="_blank" rel="noreferrer" className="text-sm text-primary inline-flex items-center gap-1">
                        স্ক্রিনশট দেখুন <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    <p className="text-xs text-muted-foreground">
                      প্রত্যাখ্যাত: {r.resolved_at ? new Date(r.resolved_at).toLocaleString('bn-BD') : new Date(r.created_at).toLocaleString('bn-BD')}
                    </p>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium bg-rose-100 text-rose-800">rejected</span>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    {waLink && (
                      <a href={waLink} target="_blank" rel="noreferrer">
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 w-full">
                          <MessageCircle className="w-4 h-4 mr-1" /> WhatsApp করুন
                        </Button>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
