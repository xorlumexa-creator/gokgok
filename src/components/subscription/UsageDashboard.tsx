import { useStore } from '@/context/StoreContext';
import { useSubscription, toBn, PLAN_LABEL } from '@/context/SubscriptionContext';
import { AlertTriangle } from 'lucide-react';

function Bar({ used, limit }: { used: number; limit: number }) {
  const pct = Math.min(100, Math.round((used / Math.max(1, limit)) * 100));
  const color = pct >= 90 ? 'bg-rose-500' : pct >= 70 ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
      <div className={`${color} h-full rounded-full transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function UsageDashboard() {
  const { products, customers } = useStore();
  const { plan, monthlyPrice, productLimit, bakiLimit, salesCreditLimit, salesCreditUsed, trialActive, hasActivePaidPlan } = useSubscription();

  const productPct = Math.round((products.length / productLimit) * 100);
  const salesPct = Math.round((salesCreditUsed / salesCreditLimit) * 100);
  const remainingSales = Math.max(0, salesCreditLimit - salesCreditUsed);

  return (
    <div className="card-elevated rounded-2xl p-5 bg-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-foreground flex items-center gap-2">📊 আপনার ব্যবহারের হিসাব</h3>
      </div>
      <div className="rounded-xl bg-muted/60 px-4 py-3 mb-4">
        <p className="text-xs text-muted-foreground">বর্তমান প্ল্যান</p>
        <p className="font-bold text-foreground">
          {trialActive ? 'ফ্রি ট্রায়াল (সব ফিচার আনলক)' : hasActivePaidPlan ? `${PLAN_LABEL[plan]} — ৳${toBn(monthlyPrice)}/মাস` : 'কোনো সক্রিয় প্ল্যান নেই'}
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between text-sm mb-1.5">
            <span className="text-foreground font-medium">পণ্য</span>
            <span className="text-muted-foreground text-xs">{toBn(products.length.toLocaleString())} / {toBn(productLimit.toLocaleString())}</span>
          </div>
          <Bar used={products.length} limit={productLimit} />
          {productPct >= 80 && productPct < 100 && (
            <p className="text-[11px] text-amber-700 mt-1.5 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {toBn(productPct)}% ব্যবহার হয়েছে — আরও জায়গা লাগতে পারে 😄</p>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between text-sm mb-1.5">
            <span className="text-foreground font-medium">বাকি হিসাব</span>
            <span className="text-muted-foreground text-xs">{toBn(customers.length.toLocaleString())} / {toBn(bakiLimit.toLocaleString())}</span>
          </div>
          <Bar used={customers.length} limit={bakiLimit} />
        </div>

        <div>
          <div className="flex items-center justify-between text-sm mb-1.5">
            <span className="text-foreground font-medium">মাসিক বিক্রি + বাকি আপডেট</span>
            <span className="text-muted-foreground text-xs">{toBn(salesCreditUsed.toLocaleString())} / {toBn(salesCreditLimit.toLocaleString())}</span>
          </div>
          <Bar used={salesCreditUsed} limit={salesCreditLimit} />
          <p className="text-[11px] text-muted-foreground mt-1.5">বাকি: {toBn(remainingSales.toLocaleString())} (বিক্রি ও বাকি খাতার পরিবর্তন — দুটো মিলিয়ে)</p>
          {salesPct >= 80 && salesPct < 100 && (
            <p className="text-[11px] text-amber-700 mt-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {toBn(salesPct)}% ব্যবহার হয়ে গেছে — প্ল্যান নবায়নের জন্য প্রস্তুত থাকুন।</p>
          )}
        </div>
      </div>

    </div>
  );
}
