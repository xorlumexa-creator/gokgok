import { X, AlertTriangle, Lock, TrendingUp, MessageCircle, Receipt } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSubscription, toBn, PLAN_BASE_PRICE, PLAN_LABEL, STORAGE_UNIT } from '@/context/SubscriptionContext';

export function SubscriptionLockModal() {
  const navigate = useNavigate();
  const { lockModal, closeLock, plan, storageLevel } = useSubscription();

  if (!lockModal) return null;

  const goUpgrade = () => {
    closeLock();
    navigate('/subscription?focus=upgrade');
  };
  const goRenew = () => {
    closeLock();
    navigate('/subscription?focus=renew');
  };

  const basePrice = PLAN_BASE_PRICE[plan];

  let content: React.ReactNode = null;

  if (lockModal.type === 'product_limit' || lockModal.type === 'baki_limit') {
    const isProduct = lockModal.type === 'product_limit';
    const extraPrice = basePrice; // extra storage costs one base price more
    content = (
      <>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/40 flex items-center justify-center">
            <Lock className="w-6 h-6 text-rose-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">
              🚫 {isProduct ? 'পণ্যের' : 'বাকি হিসাবের'} সীমা পূর্ণ হয়েছে
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">{PLAN_LABEL[plan]} প্ল্যান</p>
          </div>
        </div>

        <div className="rounded-xl bg-muted p-4 mb-4">
          <p className="text-sm text-foreground leading-relaxed">
            আপনার বর্তমান প্ল্যানে সর্বোচ্চ <b>{toBn(lockModal.limit.toLocaleString())} টি</b> {isProduct ? 'পণ্য' : 'বাকি হিসাব'} রাখা যাবে।
          </p>
          <p className="text-xs text-muted-foreground mt-2">বর্তমান ব্যবহার: {toBn(lockModal.current.toLocaleString())} / {toBn(lockModal.limit.toLocaleString())}</p>
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 p-5 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-foreground">🔥 দোকান বড় হচ্ছে?</h3>
          </div>
          <p className="text-sm text-foreground mb-3">
            আরও <b>{toBn(STORAGE_UNIT.toLocaleString())} টি পণ্য</b> এবং <b>{toBn(STORAGE_UNIT.toLocaleString())} টি বাকি হিসাব</b> যুক্ত করুন।
          </p>
          <div className="bg-background rounded-xl px-4 py-3 inline-block">
            <p className="text-2xl font-bold text-primary">মাত্র ৳{toBn(extraPrice)} <span className="text-sm font-normal text-muted-foreground">অতিরিক্ত/মাস</span></p>
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={goUpgrade} className="flex-1 py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition">
            এখনই আপগ্রেড করুন
          </button>
          <button onClick={closeLock} className="px-4 py-3.5 rounded-xl bg-muted text-foreground font-medium hover:bg-muted/70 transition">
            পরে করবো
          </button>
        </div>
      </>
    );
  } else if (lockModal.type === 'sales_credit') {
    content = (
      <>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">⚠️ মাসিক বিক্রির সীমা পূর্ণ হয়েছে</h2>
          </div>
        </div>
        <div className="rounded-xl bg-muted p-4 mb-4">
          <p className="text-sm text-foreground leading-relaxed">
            আপনার এই মাসের <b>{toBn(lockModal.limit.toLocaleString())} টি বিক্রির</b> সীমা পূর্ণ হয়েছে। ব্যবসা চালিয়ে যেতে প্ল্যান নবায়ন করুন অথবা আপগ্রেড করুন।
          </p>
          <p className="text-xs text-muted-foreground mt-2">ব্যবহার: {toBn(lockModal.used.toLocaleString())} / {toBn(lockModal.limit.toLocaleString())}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={goRenew} className="flex-1 py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold">প্ল্যান নবায়ন করুন</button>
          <button onClick={goUpgrade} className="flex-1 py-3.5 rounded-xl bg-foreground text-background font-semibold">প্ল্যান আপগ্রেড করুন</button>
        </div>
      </>
    );
  } else if (lockModal.type === 'feature_whatsapp') {
    const cur = PLAN_BASE_PRICE[plan];
    const next = PLAN_BASE_PRICE.standard;
    const diff = Math.max(0, next - cur);
    content = (
      <>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center">
            <MessageCircle className="w-6 h-6 text-emerald-600" />
          </div>
          <h2 className="text-lg font-bold text-foreground">🔒 WhatsApp ফিচার আনলক করুন</h2>
        </div>
        <p className="text-sm text-foreground leading-relaxed mb-4">
          এক ট্যাপে reminder পাঠান, কাস্টমারকে WhatsApp করুন এবং আরও সহজে হিসাব পরিচালনা করুন।
        </p>
        <div className="rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 p-4 mb-4">
          <p className="text-xs text-muted-foreground mb-2">Standard প্ল্যানে আনলক করুন</p>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-muted-foreground">Basic: ৳{toBn(PLAN_BASE_PRICE.basic)}/মাস {plan==='basic' && <em className="not-italic text-primary">(বর্তমান)</em>}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-foreground font-semibold">Standard: ৳{toBn(PLAN_BASE_PRICE.standard)}/মাস</span>
          </div>
          {diff > 0 && (
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-base font-bold text-primary">পার্থক্য: মাত্র ৳{toBn(diff)}/মাস</p>
              <p className="text-xs text-muted-foreground">≈ প্রতিদিন মাত্র ৳{toBn((diff/30).toFixed(1))} 😄</p>
            </div>
          )}
        </div>
        <button onClick={goUpgrade} className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold">এখনই আপগ্রেড করুন</button>
      </>
    );
  } else if (lockModal.type === 'feature_invoice') {
    const cur = PLAN_BASE_PRICE[plan];
    const next = PLAN_BASE_PRICE.pro;
    const diff = Math.max(0, next - cur);
    content = (
      <>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-violet-100 dark:bg-violet-950/40 flex items-center justify-center">
            <Receipt className="w-6 h-6 text-violet-600" />
          </div>
          <h2 className="text-lg font-bold text-foreground">🔒 Invoice ফিচার আনলক করুন</h2>
        </div>
        <p className="text-sm text-foreground leading-relaxed mb-4">
          প্রিন্টযোগ্য invoice, PDF export এবং পেশাদার receipt ব্যবহার করুন।
        </p>
        <div className="rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 p-4 mb-4">
          <p className="text-xs text-muted-foreground mb-2">Pro প্ল্যানে আনলক করুন</p>
          <p className="text-sm text-muted-foreground">বর্তমান প্ল্যান: ৳{toBn(cur)}/মাস</p>
          <p className="text-sm text-foreground font-semibold">Pro: ৳{toBn(PLAN_BASE_PRICE.pro)}/মাস</p>
          {diff > 0 && (
            <p className="text-base font-bold text-primary mt-3 pt-3 border-t border-border">মাত্র ৳{toBn(diff)} অতিরিক্ত/মাস</p>
          )}
        </div>
        <button onClick={goUpgrade} className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold">এখনই আপগ্রেড করুন</button>
      </>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-3 animate-in fade-in">
      <div className="w-full max-w-md bg-card rounded-3xl shadow-2xl p-6 relative animate-in slide-in-from-bottom">
        <button onClick={closeLock} className="absolute top-3 right-3 w-9 h-9 rounded-full bg-muted hover:bg-muted/70 flex items-center justify-center">
          <X className="w-4 h-4" />
        </button>
        {content}
      </div>
    </div>
  );
}
