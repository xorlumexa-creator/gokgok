import { useState } from 'react';
import { LifeBuoy, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { withTimeout } from '@/lib/asyncTimeout';
import { PhoneInputWithCode } from '@/components/common/PhoneInputWithCode';

/**
 * Floating customer-support entry point on the sign-up/login page. Anyone —
 * logged in or not — can leave a message with a WhatsApp number; it lands
 * in the manager dashboard's Messages (CRM) inbox.
 */
export function CustomerSupportButton() {
  const [open, setOpen] = useState(false);
  const [whatsapp, setWhatsapp] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const reset = () => {
    setOpen(false);
    setSent(false);
    setWhatsapp('');
    setMessage('');
  };

  const submit = async () => {
    if (!whatsapp || whatsapp.replace(/\D/g, '').length < 8) {
      toast({ title: 'সঠিক WhatsApp নম্বর দিন (দেশের কোডসহ)', variant: 'destructive' });
      return;
    }
    if (!message.trim()) {
      toast({ title: 'আপনার সমস্যা/প্রশ্ন লিখুন', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const { data: { user } } = await withTimeout(supabase.auth.getUser(), 3000, 'support.getUser').catch(() => ({ data: { user: null } } as any));
      const { error } = await withTimeout(
        (supabase as any).from('support_messages').insert({
          user_id: user?.id ?? null,
          whatsapp_number: whatsapp,
          message: message.trim(),
          status: 'new',
        }),
        6000, 'support.submit',
      );
      if (error) throw error;
      setSent(true);
      toast({ title: 'মেসেজ পাঠানো হয়েছে ✓' });
    } catch (e: any) {
      toast({ title: e.message || 'মেসেজ পাঠাতে সমস্যা হয়েছে', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-[120] flex items-center gap-2 px-4 py-3 rounded-full bg-primary text-primary-foreground shadow-lg hover:brightness-105 active:scale-95 transition-transform"
      >
        <LifeBuoy className="w-5 h-5" />
        <span className="text-sm font-semibold hidden sm:inline">কাস্টমার সাপোর্ট</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[200] bg-black/50 flex items-end sm:items-center justify-center p-3">
          <div className="w-full max-w-md bg-card rounded-3xl p-5 max-h-[90vh] overflow-y-auto">
            {sent ? (
              <div className="text-center space-y-3 py-4">
                <CheckCircle2 className="w-14 h-14 text-profit mx-auto" />
                <h3 className="text-lg font-bold">মেসেজ পাঠানো হয়েছে</h3>
                <p className="text-sm text-muted-foreground">আমাদের টিম শীঘ্রই আপনার WhatsApp নম্বরে যোগাযোগ করবে।</p>
                <Button onClick={reset} className="w-full py-5 rounded-xl mt-2">ঠিক আছে</Button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-bold text-lg">কাস্টমার সাপোর্ট</h3>
                  <button onClick={reset} className="text-muted-foreground">✕</button>
                </div>
                <p className="text-sm text-muted-foreground mb-4">কোনো প্রশ্ন বা অসুবিধা থাকলে যোগাযোগ করুন — আমরা WhatsApp-এ রিপ্লাই দেব।</p>

                <div className="space-y-4">
                  <PhoneInputWithCode
                    value={whatsapp}
                    onChange={(fullPhone) => setWhatsapp(fullPhone)}
                    label="আপনার WhatsApp নম্বর"
                    placeholder="1XXXXXXXXX"
                    required
                  />
                  <div>
                    <label className="block text-sm font-medium mb-2">আপনার প্রশ্ন / সমস্যা</label>
                    <textarea
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      placeholder="এখানে লিখুন..."
                      rows={4}
                      className="input-field resize-none"
                    />
                  </div>
                  <Button onClick={submit} disabled={loading} className="w-full py-5 rounded-xl">
                    {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                    মেসেজ পাঠান
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
