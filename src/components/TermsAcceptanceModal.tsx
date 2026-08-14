import { useState } from 'react';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { withTimeout } from '@/lib/asyncTimeout';
import { useProfile } from '@/hooks/useProfile';
import logoImg from '@/assets/logo.png';

/**
 * Blocking terms-and-conditions gate — shown once, right after signup,
 * to any logged-in non-manager user whose profile.terms_accepted is still
 * false. Must be explicitly agreed to before the app underneath is usable;
 * "Disagree" signs the user out rather than silently letting them in.
 */
export function TermsAcceptanceModal() {
  const { profile, refresh } = useProfile();
  const [busy, setBusy] = useState<'agree' | 'disagree' | null>(null);

  if (!profile || profile.role === 'manager' || profile.terms_accepted) return null;

  const agree = async () => {
    setBusy('agree');
    try {
      const { error } = await withTimeout(
        supabase.from('profiles').update({
          terms_accepted: true,
          terms_accepted_at: new Date().toISOString(),
        }).eq('user_id', profile.user_id),
        6000, 'terms.accept',
      );
      if (error) throw error;
      await refresh();
      toast({ title: 'ধন্যবাদ — শর্তাবলী গ্রহণ করা হয়েছে ✓' });
    } catch (e: any) {
      toast({ title: e.message || 'সমস্যা হয়েছে, আবার চেষ্টা করুন', variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  };

  const disagree = async () => {
    setBusy('disagree');
    try {
      await withTimeout(supabase.auth.signOut(), 4000, 'terms.decline.signOut').catch(() => null);
    } finally {
      window.location.href = '/auth';
    }
  };

  return (
    <div className="fixed inset-0 z-[300] bg-black/60 flex items-end sm:items-center justify-center p-3">
      <div className="w-full max-w-lg bg-card rounded-3xl p-5 sm:p-6 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center gap-3 mb-4">
          <img src={logoImg} alt="" className="w-10 h-10 rounded-xl" />
          <div>
            <h2 className="text-lg font-bold text-foreground">ব্যবহারের শর্তাবলী</h2>
            <p className="text-xs text-muted-foreground">অ্যাকাউন্ট ব্যবহার করার আগে দয়া করে পড়ে সম্মতি দিন</p>
          </div>
        </div>

        <div className="space-y-4 text-sm leading-relaxed text-foreground/90 mb-5">
          <div className="flex gap-3">
            <span className="font-bold text-primary shrink-0">১.</span>
            <p>অ্যাপ আনইনস্টল করার কারণে যদি কোনো গুরুত্বপূর্ণ তথ্য সিঙ্ক হওয়ার আগেই মুছে যায়, তাহলে সেই তথ্য পুনরুদ্ধারের জন্য কোম্পানি দায়ী থাকবে না।</p>
          </div>
          <div className="flex gap-3">
            <span className="font-bold text-primary shrink-0">২.</span>
            <p>প্রতিদিন অন্তত একবার অ্যাপটি ইন্টারনেট সংযোগসহ (অনলাইন অবস্থায়) খুলতে হবে, যাতে তথ্য ঠিকমতো সিঙ্ক হয় এবং সাবস্ক্রিপশনের হিসাব সঠিক থাকে।</p>
          </div>
          <div className="flex gap-3">
            <span className="font-bold text-primary shrink-0">৩.</span>
            <p>আপনার সাবস্ক্রিপশন প্ল্যান অনুযায়ী অ্যাপের ফিচার ও সীমা কার্যকর হবে। মেয়াদ শেষ হলে বা প্ল্যানের সীমা পূর্ণ হলে নবায়ন/আপগ্রেড ছাড়া নির্দিষ্ট ফিচার ব্যবহার করা যাবে না।</p>
          </div>
          <div className="flex gap-3">
            <span className="font-bold text-primary shrink-0">৪.</span>
            <p>যদি কোনো অনাকাঙ্ক্ষিত কারণে (সার্ভার সমস্যা, রক্ষণাবেক্ষণ, প্রযুক্তিগত ত্রুটি ইত্যাদি) অ্যাপে সাময়িক সমস্যা দেখা দেয়, তাহলে সেবা কিছু দিনের জন্য স্থগিত (prosponed) থাকতে পারে — এর জন্য কোম্পানি ক্ষতিপূরণ দিতে বাধ্য নয়।</p>
          </div>
          <div className="flex gap-3">
            <span className="font-bold text-primary shrink-0">৫.</span>
            <p>এই অ্যাপ ও এর সেবা "যেমন আছে তেমন" (as-is) ভিত্তিতে দেওয়া হয়; নির্ভুলতা বা নিরবচ্ছিন্ন প্রাপ্যতার কোনো নিশ্চয়তা দেওয়া হয় না। ব্যবসায়িক সিদ্ধান্তের জন্য নিজ দায়িত্বে অ্যাপের তথ্য ব্যবহার করুন।</p>
          </div>
          <div className="flex gap-3">
            <span className="font-bold text-primary shrink-0">৬.</span>
            <p>প্রযোজ্য আইনের সীমার মধ্যে, পরোক্ষ, আনুষঙ্গিক বা ফলস্বরূপ কোনো ক্ষতির জন্য কোম্পানি দায়ী থাকবে না। কোনো পরিস্থিতিতেই কোম্পানির মোট দায় আপনার সর্বশেষ পরিশোধিত সাবস্ক্রিপশন ফি-এর বেশি হবে না।</p>
          </div>
          <div className="flex gap-3">
            <span className="font-bold text-primary shrink-0">৭.</span>
            <p>পরিশোধিত সাবস্ক্রিপশন ফি সাধারণত ফেরতযোগ্য নয়, তবে কোম্পানি একান্ত নিজস্ব বিবেচনায় ব্যতিক্রম হিসেবে ফেরত দিতে পারে।</p>
          </div>
          <div className="flex gap-3">
            <span className="font-bold text-primary shrink-0">৮.</span>
            <p>শর্তাবলী লঙ্ঘন, অপব্যবহার বা প্রতারণামূলক কার্যকলাপ পাওয়া গেলে কোম্পানি পূর্ব নোটিশ ছাড়াই অ্যাকাউন্ট স্থগিত বা বন্ধ করার অধিকার রাখে।</p>
          </div>
          <div className="flex gap-3">
            <span className="font-bold text-primary shrink-0">৯.</span>
            <p>প্রয়োজন অনুযায়ী কোম্পানি এই শর্তাবলী পরিবর্তন করতে পারে; পরিবর্তিত শর্তাবলী অ্যাপের মাধ্যমে জানানো হবে এবং পরবর্তী ব্যবহার তাতে সম্মতি হিসেবে গণ্য হবে।</p>
          </div>
          <div className="flex gap-3">
            <span className="font-bold text-primary shrink-0">১০.</span>
            <p>ট্রায়াল বা সাবস্ক্রিপশনের মেয়াদ শেষ হলে অ্যাপ লক হয়ে যাবে — শুধুমাত্র "বাকির খাতা" ও "ব্যক্তিগত হিসাব" পেজ দুটি শুধু দেখার জন্য (view-only) খোলা থাকবে, কোনো বাটন বা এডিট/ডিলিট ফিচার কাজ করবে না। সাবস্ক্রিপশন পরিশোধ না করে ৬০ দিন পার হয়ে গেলে আপনার অ্যাকাউন্ট, বাকির খাতা এবং ব্যক্তিগত হিসাবের সব তথ্য স্থায়ীভাবে মুছে ফেলা হবে — এই তথ্য পরে আর ফেরত দেওয়া সম্ভব হবে না। এই সময়ের মধ্যে প্রয়োজনীয় তথ্যের স্ক্রিনশট/ছবি নিজ দায়িত্বে সংরক্ষণ করে রাখার পরামর্শ দেওয়া হচ্ছে।</p>
          </div>
        </div>

        <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 rounded-xl p-3 mb-4">
          <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
          <p>"সম্মত" বাটনে চাপ দিলে আপনি উপরের সব শর্তাবলীর সাথে সম্মতি জানাচ্ছেন বলে গণ্য হবে।</p>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={disagree} disabled={busy !== null} className="flex-1 py-5 rounded-xl">
            {busy === 'disagree' ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            অসম্মত
          </Button>
          <Button onClick={agree} disabled={busy !== null} className="flex-1 py-5 rounded-xl">
            {busy === 'agree' ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            সম্মত
          </Button>
        </div>
      </div>
    </div>
  );
}
