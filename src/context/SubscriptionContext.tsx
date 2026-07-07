import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/context/StoreContext';
import { withTimeout } from '@/lib/asyncTimeout';

export type PlanId = 'basic' | 'standard' | 'pro';

export const PLAN_BASE_PRICE: Record<PlanId, number> = { basic: 80, standard: 120, pro: 180 };
export const PLAN_LABEL: Record<PlanId, string> = { basic: 'Basic', standard: 'Standard', pro: 'Pro' };
export const PLAN_FEATURES = {
  whatsapp: ['standard', 'pro'] as PlanId[],
  invoice: ['pro'] as PlanId[],
};
export const SALES_CREDIT_LIMIT = 12000;
export const STORAGE_UNIT = 1000;

export type LockReason =
  | { type: 'product_limit'; current: number; limit: number }
  | { type: 'baki_limit'; current: number; limit: number }
  | { type: 'sales_credit'; used: number; limit: number }
  | { type: 'feature_whatsapp' }
  | { type: 'feature_invoice' };

interface SubscriptionState {
  plan: PlanId;
  storageLevel: number;
  startedAt: string | null;
  expiresAt: string | null;
  salesCreditUsed: number;
  salesCreditPeriod: string;
}

interface SubscriptionContextType extends SubscriptionState {
  productLimit: number;
  bakiLimit: number;
  salesCreditLimit: number;
  monthlyPrice: number;
  hasFeature: (feature: 'whatsapp' | 'invoice') => boolean;
  isPlanActive: boolean;
  canAddProduct: () => boolean;
  canAddCustomer: () => boolean;
  canRecordSale: (count?: number) => boolean;
  guardAddProduct: () => boolean;
  guardAddCustomer: () => boolean;
  guardRecordSale: (count?: number) => boolean;
  guardFeature: (feature: 'whatsapp' | 'invoice') => boolean;
  incrementSalesCredit: (n?: number) => void;
  setPlan: (plan: PlanId) => Promise<void>;
  setStorageLevel: (level: number) => Promise<void>;
  renewPlan: (plan?: PlanId) => Promise<void>;
  lockModal: LockReason | null;
  openLock: (reason: LockReason) => void;
  closeLock: () => void;
  refresh: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);
const LS_KEY = 'subscriptionState';

function currentPeriod(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function defaultState(): SubscriptionState {
  return { plan: 'basic', storageLevel: 1, startedAt: null, expiresAt: null, salesCreditUsed: 0, salesCreditPeriod: currentPeriod() };
}

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { products, customers } = useStore();
  const [state, setState] = useState<SubscriptionState>(() => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as SubscriptionState;
        const period = currentPeriod();
        if (parsed.salesCreditPeriod !== period) { parsed.salesCreditPeriod = period; parsed.salesCreditUsed = 0; }
        return { ...defaultState(), ...parsed };
      }
    } catch {}
    return defaultState();
  });
  const [lockModal, setLockModal] = useState<LockReason | null>(null);

  // FIX 4: Cache the user ID so we never call getUser() twice per operation
  const cachedUserIdRef = useRef<string | null>(null);

  const getUserId = useCallback(async (): Promise<string | null> => {
    if (cachedUserIdRef.current) return cachedUserIdRef.current;
    try {
      const { data: { user } } = await withTimeout(supabase.auth.getUser(), 4000, 'subscription.getUser');
      cachedUserIdRef.current = user?.id ?? null;
      return cachedUserIdRef.current;
    } catch { return null; }
  }, []);

  // FIX 4: Clear cached user on auth change
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      cachedUserIdRef.current = session?.user?.id ?? null;
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  }, [state]);

  const refresh = useCallback(async () => {
    try {
      // FIX 4: Use cached userId — was calling getUser() fresh every time
      const userId = await getUserId();
      if (!userId) return;
      const { data, error } = await withTimeout(supabase
        .from('profiles')
        .select('subscription_plan, subscription_started_at, subscription_expires_at, storage_level, sales_credit_used, sales_credit_period')
        .eq('user_id', userId)
        .maybeSingle(), 5000, 'subscription.refresh');
      if (error) throw error;
      if (data) {
        setState(prev => {
          const period = currentPeriod();
          const samePeriod = (data.sales_credit_period || prev.salesCreditPeriod) === period;
          return {
            plan: (data.subscription_plan as PlanId) || prev.plan,
            storageLevel: data.storage_level || prev.storageLevel || 1,
            startedAt: data.subscription_started_at || prev.startedAt,
            expiresAt: data.subscription_expires_at || prev.expiresAt,
            salesCreditPeriod: period,
            salesCreditUsed: samePeriod ? (data.sales_credit_used ?? prev.salesCreditUsed) : 0,
          };
        });
      }
    } catch (e) { console.warn('Subscription refresh failed', e); }
  }, [getUserId]);

  useEffect(() => { refresh(); }, [refresh]);

  const persistRemote = useCallback(async (patch: Partial<Record<string, any>>) => {
    try {
      // FIX 4: Use cached userId — was calling getUser() fresh every persist call
      const userId = await getUserId();
      if (!userId) return;
      await withTimeout(supabase.from('profiles').update(patch).eq('user_id', userId), 5000, 'subscription.persist');
    } catch (e) { console.warn('Subscription persist failed', e); }
  }, [getUserId]);

  const productLimit = state.storageLevel * STORAGE_UNIT;
  const bakiLimit = state.storageLevel * STORAGE_UNIT;
  const salesCreditLimit = SALES_CREDIT_LIMIT;
  const monthlyPrice = PLAN_BASE_PRICE[state.plan] * state.storageLevel;

  const isPlanActive = useMemo(() => {
    if (!state.expiresAt) return true;
    return new Date(state.expiresAt).getTime() > Date.now();
  }, [state.expiresAt]);

  const hasFeature = useCallback((feature: 'whatsapp' | 'invoice') => PLAN_FEATURES[feature].includes(state.plan), [state.plan]);
  const bakiHolders = useMemo(() => customers.filter(c => c.totalDue > 0).length, [customers]);
  const canAddProduct = useCallback(() => products.length < productLimit, [products.length, productLimit]);
  const canAddCustomer = useCallback(() => customers.length < bakiLimit, [customers.length, bakiLimit]);
  const canRecordSale = useCallback((count = 1) => (state.salesCreditUsed + count) <= salesCreditLimit, [state.salesCreditUsed, salesCreditLimit]);
  const openLock = useCallback((reason: LockReason) => setLockModal(reason), []);
  const closeLock = useCallback(() => setLockModal(null), []);

  const guardAddProduct = useCallback(() => {
    if (products.length >= productLimit) { openLock({ type: 'product_limit', current: products.length, limit: productLimit }); return false; }
    return true;
  }, [products.length, productLimit, openLock]);

  const guardAddCustomer = useCallback(() => {
    if (customers.length >= bakiLimit) { openLock({ type: 'baki_limit', current: customers.length, limit: bakiLimit }); return false; }
    return true;
  }, [customers.length, bakiLimit, openLock]);

  const guardRecordSale = useCallback((count = 1) => {
    if ((state.salesCreditUsed + count) > salesCreditLimit) { openLock({ type: 'sales_credit', used: state.salesCreditUsed, limit: salesCreditLimit }); return false; }
    return true;
  }, [state.salesCreditUsed, salesCreditLimit, openLock]);

  const guardFeature = useCallback((feature: 'whatsapp' | 'invoice') => {
    if (!hasFeature(feature)) { openLock({ type: feature === 'whatsapp' ? 'feature_whatsapp' : 'feature_invoice' }); return false; }
    return true;
  }, [hasFeature, openLock]);

  const incrementSalesCredit = useCallback((n = 1) => {
    setState(prev => {
      const period = currentPeriod();
      const used = (prev.salesCreditPeriod === period ? prev.salesCreditUsed : 0) + n;
      const next = { ...prev, salesCreditPeriod: period, salesCreditUsed: used };
      persistRemote({ sales_credit_used: used, sales_credit_period: period });
      return next;
    });
  }, [persistRemote]);

  const setPlan = useCallback(async (plan: PlanId) => {
    setState(prev => ({ ...prev, plan }));
    await persistRemote({ subscription_plan: plan });
  }, [persistRemote]);

  const setStorageLevel = useCallback(async (level: number) => {
    const safe = Math.max(1, Math.min(10, Math.floor(level)));
    setState(prev => ({ ...prev, storageLevel: safe }));
    await persistRemote({ storage_level: safe });
  }, [persistRemote]);

  const renewPlan = useCallback(async (plan?: PlanId) => {
    const start = new Date();
    const end = new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);
    const period = currentPeriod();
    setState(prev => ({ ...prev, plan: plan || prev.plan, startedAt: start.toISOString(), expiresAt: end.toISOString(), salesCreditUsed: 0, salesCreditPeriod: period }));
    await persistRemote({ subscription_plan: plan, subscription_started_at: start.toISOString(), subscription_expires_at: end.toISOString(), sales_credit_used: 0, sales_credit_period: period });
  }, [persistRemote]);

  return (
    <SubscriptionContext.Provider value={{
      ...state, productLimit, bakiLimit, salesCreditLimit, monthlyPrice, hasFeature, isPlanActive,
      canAddProduct, canAddCustomer, canRecordSale, guardAddProduct, guardAddCustomer, guardRecordSale,
      guardFeature, incrementSalesCredit, setPlan, setStorageLevel, renewPlan, lockModal, openLock, closeLock, refresh,
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error('useSubscription must be used within SubscriptionProvider');
  return ctx;
}

const BN_DIGITS = ['০','১','২','৩','৪','৫','৬','৭','৮','৯'];
export function toBn(n: number | string): string {
  return String(n).replace(/[0-9]/g, d => BN_DIGITS[parseInt(d)]);
                         }
    
