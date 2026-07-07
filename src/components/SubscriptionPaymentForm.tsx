import { useState } from 'react';
import { Upload, Loader2, CheckCircle2, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { withTimeout } from '@/lib/asyncTimeout';

const PAYMENT_NUMBER = '01305969812';

interface Props {
  userId: string;
  userPhone: string;
  plan: 'basic' | 'standard' | 'pro';
  amount: string;
  onDone?: () => void;
}

export function SubscriptionPaymentForm({ userId, userPhone, plan, amount, onDone }: Props) {
  const [method, setMethod] = useState<'bkash' | 'nagad'>('bkash');
  const [txn, setTxn] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (!txn.trim() && !file) {
      toast({ title: 'স্ক্রিনশট অথবা ট্রানজেকশন আইডি দিন', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      let screenshot_url: string | null = null;
      if (file) {
        const path = `${userId}/${Date.now()}-${file.name}`;
        const { error: upErr } = await withTimeout(supabase.storage.from('payment-screenshots').upload(path, file, { upsert: false }), 8000, 'payment.upload');
        if (upErr) throw upErr;
        const { data } = supabase.storage.from('payment-screenshots').getPublicUrl(path);
        screenshot_url = data.publicUrl;
      }
      const { error } = await withTimeout(supabase.from('subscription_requests').insert({
        user_id: userId,
        user_phone: userPhone,
        plan_type: plan,
        transaction_id: txn.trim() || null,
        screenshot_url,
        payment_method: method,
        status: 'pending',
      }), 6000, 'payment.request');
      if (error) throw error;

      // Grant 2-day temporary access while manager reviews
      const expiry = new Date(); expiry.setDate(expiry.getDate() + 2);
      await withTimeout(supabase.from('profiles').update({
        temporary_access: true,
        temporary_expiry: expiry.toISOString(),
      }).eq('user_id', userId), 6000, 'payment.tempAccess');

      setDone(true);
      toast({ title: 'রিকোয়েস্ট জমা হয়েছে — ২ দিনের অস্থায়ী অ্যাক্সেস চালু হলো 🎉' });
      onDone?.();
    } catch (e: any) {
      toast({ title: e.message || 'সমস্যা হয়েছে', variant: 'destructive' });
    } finally { setLoading(false); }
  };

  if (done) {
    return (
      <div className="card-elevated p-6 rounded-2xl text-center space-y-3">
        <CheckCircle2 className="w-14 h-14 text-profit mx-auto" />
        <h3 className="text-lg font-bold">রিকোয়েস্ট জমা হয়েছে</h3>
        <p className="text-sm text-muted-foreground">
          ম্যানেজার আপনার পেমেন্ট যাচাই করবেন। অনুমোদনের আগ পর্যন্ত ১ দিনের ফ্রি অ্যাক্সেস চালু রইলো।
        </p>
      </div>
    );
  }

  return (
    <div className="card-elevated p-6 rounded-2xl space-y-4">
      <div>
        <h3 className="font-bold text-lg">পেমেন্ট তথ্য</h3>
        <p className="text-sm text-muted-foreground">
          পরিমাণ <span className="font-bold text-foreground">{amount}</span> পাঠান নিচের নম্বরে
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => setMethod('bkash')} className={`p-3 rounded-xl border-2 ${method === 'bkash' ? 'border-primary bg-primary/5' : 'border-border'}`}>
          <Smartphone className="w-5 h-5 mx-auto mb-1 text-pink-600" />
          <p className="text-sm font-medium">bKash</p>
        </button>
        <button onClick={() => setMethod('nagad')} className={`p-3 rounded-xl border-2 ${method === 'nagad' ? 'border-primary bg-primary/5' : 'border-border'}`}>
          <Smartphone className="w-5 h-5 mx-auto mb-1 text-orange-600" />
          <p className="text-sm font-medium">Nagad</p>
        </button>
      </div>

      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-center">
        <p className="text-xs text-muted-foreground">{method === 'bkash' ? 'bKash' : 'Nagad'} নম্বর</p>
        <p className="text-xl font-bold tracking-wider">{PAYMENT_NUMBER}</p>
        <p className="text-xs text-muted-foreground mt-1">"Send Money" ব্যবহার করুন</p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">স্ক্রিনশট আপলোড (ঐচ্ছিক)</label>
        <label className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-border rounded-xl cursor-pointer hover:bg-muted/50">
          <Upload className="w-4 h-4" />
          <span className="text-sm">{file ? file.name : 'ছবি বাছাই করুন'}</span>
          <input type="file" accept="image/*" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">ট্রানজেকশন আইডি</label>
        <input value={txn} onChange={e => setTxn(e.target.value)} placeholder="যেমন: TXN12345ABC" className="input-field" />
        <p className="text-xs text-muted-foreground mt-1">স্ক্রিনশট না থাকলে অবশ্যই ট্রানজেকশন আইডি দিন।</p>
      </div>

      <Button onClick={submit} disabled={loading} className="w-full py-5 rounded-xl">
        {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
        রিকোয়েস্ট জমা দিন
      </Button>
    </div>
  );
}
