import { useEffect, useState } from 'react';
import { Loader2, MessageCircle, Phone, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { withTimeout } from '@/lib/asyncTimeout';
import { buildWhatsAppLink } from '@/lib/whatsapp';

interface MsgRow {
  id: string;
  user_id: string | null;
  shop_name: string | null;
  whatsapp_number: string;
  message: string;
  status: string; // new | read | replied
  created_at: string;
}

export default function Messages() {
  const [rows, setRows] = useState<MsgRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await withTimeout(
        (supabase as any).from('support_messages').select('*').order('created_at', { ascending: false }),
        6000, 'manager.messages.load',
      );
      if (error) throw error;
      setRows((data || []) as MsgRow[]);
    } catch (e: any) {
      toast({ title: e.message || 'লোড করতে সমস্যা', variant: 'destructive' });
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const toggleOpen = async (r: MsgRow) => {
    const nowOpen = openId === r.id ? null : r.id;
    setOpenId(nowOpen);
    if (nowOpen && r.status === 'new') {
      try {
        await withTimeout((supabase as any).from('support_messages').update({ status: 'read' }).eq('id', r.id), 6000, 'manager.messages.markRead');
        setRows(prev => prev.map(row => row.id === r.id ? { ...row, status: 'read' } : row));
      } catch { /* non-fatal */ }
    }
  };

  const statusBadge = (status: string) => {
    if (status === 'new') return <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-primary/15 text-primary">নতুন</span>;
    if (status === 'replied') return <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">রিপ্লাই হয়েছে</span>;
    return <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground">দেখা হয়েছে</span>;
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">মেসেজ (কাস্টমার সাপোর্ট)</h1>
      <p className="text-sm text-muted-foreground mb-6">সাইন-আপ পেজ থেকে পাঠানো সাপোর্ট মেসেজ এখানে জমা হয়।</p>

      {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : rows.length === 0 ? (
        <p className="text-muted-foreground">কোনো মেসেজ নেই।</p>
      ) : (
        <div className="space-y-3">
          {rows.map(r => {
            const isOpen = openId === r.id;
            const waLink = buildWhatsAppLink(r.whatsapp_number);
            return (
              <div key={r.id} className="card-elevated rounded-2xl overflow-hidden">
                <button onClick={() => toggleOpen(r)} className="w-full text-left p-4 flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="font-bold truncate">{r.shop_name || 'অজানা ইউজার'}</p>
                      {statusBadge(r.status)}
                    </div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {r.whatsapp_number}</p>
                    {!isOpen && <p className="text-sm text-foreground/80 mt-1 line-clamp-1">{r.message}</p>}
                    <p className="text-xs text-muted-foreground mt-1">{new Date(r.created_at).toLocaleString('bn-BD')}</p>
                  </div>
                  {isOpen ? <ChevronUp className="w-5 h-5 text-muted-foreground shrink-0" /> : <ChevronDown className="w-5 h-5 text-muted-foreground shrink-0" />}
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 border-t border-border pt-3">
                    <p className="text-sm whitespace-pre-wrap mb-4">{r.message}</p>
                    {waLink && (
                      <a href={waLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium">
                        <MessageCircle className="w-4 h-4" /> WhatsApp-এ রিপ্লাই দিন
                      </a>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
                }
