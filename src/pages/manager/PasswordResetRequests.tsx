import { useEffect, useState } from 'react';
import { MessageCircle, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Row {
  id: string;
  user_id: string | null;
  user_phone: string;
  temp_password: string | null;
  status: string;
  created_at: string;
  shop_name?: string | null;
}

export default function PasswordResetRequests() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('password_reset_requests')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('[manager/passwords] load error', error);
      toast({ title: 'লোড করতে সমস্যা', description: error.message, variant: 'destructive' });
      setRows([]);
      setLoading(false);
      return;
    }
    if (data && data.length) {
      const ids = [...new Set(data.map(r => r.user_id).filter(Boolean) as string[])];
      let map = new Map<string, string | null>();
      if (ids.length) {
        const { data: profs } = await supabase.from('profiles').select('user_id, shop_name').in('user_id', ids);
        map = new Map((profs || []).map(p => [p.user_id, p.shop_name]));
      }
      setRows(data.map(r => ({ ...r, shop_name: r.user_id ? map.get(r.user_id) ?? null : null })) as any);
    } else setRows([]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const sendWhatsApp = async (r: Row) => {
    setBusy(r.id);
    const message =
`আসসালামুয়ালাইকুম।

আপনার Dukan 360 একাউন্টের নতুন অস্থায়ী পাসওয়ার্ড:

🔐 ${r.temp_password}

লগইন করার পর অনুগ্রহ করে নতুন পাসওয়ার্ড সেট করুন।

ধন্যবাদ ❤️`;
    const phone = r.user_phone.replace(/\D/g, '');
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
    try {
      await supabase.from('password_reset_requests').update({
        status: 'sent', resolved_at: new Date().toISOString(),
      }).eq('id', r.id);
      load();
    } finally { setBusy(null); }
  };

  const reject = async (r: Row) => {
    setBusy(r.id);
    try {
      await supabase.from('password_reset_requests').update({
        status: 'rejected', resolved_at: new Date().toISOString(),
      }).eq('id', r.id);
      toast({ title: 'রিকোয়েস্ট প্রত্যাখ্যান করা হয়েছে' });
      load();
    } finally { setBusy(null); }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">পাসওয়ার্ড রিসেট রিকোয়েস্ট</h1>
      {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : rows.length === 0 ? (
        <p className="text-muted-foreground">কোনো রিকোয়েস্ট নেই।</p>
      ) : (
        <div className="space-y-3">
          {rows.map(r => (
            <div key={r.id} className="card-elevated p-5 rounded-2xl">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-1">
                  <p className="font-bold">{r.shop_name || 'অজানা দোকান'}</p>
                  <p className="text-sm">📞 {r.user_phone}</p>
                  <p className="text-sm">অস্থায়ী পাসওয়ার্ড: <code className="bg-muted px-2 py-0.5 rounded font-mono">{r.temp_password}</code></p>
                  <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString('bn-BD')}</p>
                  <span className={`inline-block mt-2 px-2 py-0.5 rounded text-xs font-medium ${
                    r.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                    r.status === 'sent' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>{r.status}</span>
                </div>
                {r.status === 'pending' && (
                  <div className="flex flex-col gap-2">
                    <Button onClick={() => sendWhatsApp(r)} disabled={busy === r.id} size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                      <MessageCircle className="w-4 h-4 mr-1" /> WhatsApp
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
