import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/context/StoreContext';
import { withTimeout } from '@/lib/asyncTimeout';

// ─────────────────────────────────────────────────────────────────────────
// THREE FEATURE TIERS. Price and limits both scale with `storageLevel`
// (1 = base, 2 = double capacity for double price, etc.) — same idea as
// before, just applied uniformly across all three limits now.
// ─────────────────────────────────────────────────────────────────────────
export type PlanId = 'basic' | 'standard' | 'premium';

export const PLAN_BASE_PRICE: Record<PlanId, number> = { basic: 100, standard: 120, premium: 130 };
export const PLAN_LABEL: Record<PlanId, string> = { basic: 'Basic', standard: 'Standard', premium: 'Premium' };
export const PLAN_FEATURES: Record<'whatsapp' | 'invoice', PlanId[]> = {
  whatsapp: ['standard', 'premium'],
  invoice: ['premium'],
};
export const PLAN_ORDER: PlanId[] = ['basic', 'standard', 'premium'];

// Base (level 1) monthly limits — all three plans share the same limits,
// the only difference between plans is which features are unlocked.
export const PRODUCT_UNIT = 1000;
export const BAKI_UNIT = 1000;
export const SALES_CREDIT_UNIT = 10000; // sales + baki-page updates, combined
// Kept for older components that still import STORAGE_UNIT (products/baki scale the same way).
export const STORAGE_UNIT = PRODUCT_UNIT;
export const SALES_CREDIT_LIMIT = SALES_CREDIT_UNIT;

export const TRIAL_DAYS = 3;

export type LockReason =
  | { type: 'product_limit'; current: number; limit: number }
  | { type: 'baki_limit'; current: number; limit: number }
  | { type: 'sales_credit'; used: number; limit: number }
  | { type: 'feature_whatsapp' }
  | { type: 'feature_invoice' }
  | { type: 'subscription_needed' };

interface SubscriptionState {
  plan: PlanId;
  storageLevel: number;
  planExpiry: string | null;
  subscriptionStatus: string; // 'trial' | 'active'
  trialStartDate: string | null;
  temporaryAccess: boolean;
  temporaryExpiry: string | null;
  salesCreditUsed: number;
  salesCreditPeriod: string;
}

interface SubscriptionContextType extends SubscriptionState {
  productLimit: number;
  bakiLimit: number;
  salesCreditLimit: number;
  monthlyPrice: number;
  expiresAt: string | null; // alias of planExpiry — kept for pages already using this name
  trialActive: boolean;
  trialDaysLeft: number;
  trialExpiresAt: string | null;
  hasActivePaidPlan: boolean;
  creditExhausted: boolean;
  isLocked: boolean; // trial over AND no active paid plan AND no temp bridge — full lockout
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
  renewPlan: (plan?: PlanId, storageLevel?: number) => Promise<void>;
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
  return {
    plan: 'basic', storageLevel: 1, planExpiry: null, subscriptionStatus: 'trial',
    trialStartDate: null, temporaryAccess: false, temporaryExpiry: null,
    salesCreditUsed: 0, salesCreditPeriod: currentPeriod(),
  };
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

  const cachedUserIdRef = useRef<string | null>(null);

  const getUserId = useCallback(async (): Promise<string | null> => {
    if (cachedUserIdRef.current) return cachedUserIdRef.current;
    try {
      const { data: { user } } = await withTimeout(supabase.auth.getUser(), 4000, 'subscription.getUser');
      cachedUserIdRef.current = user?.id ?? null;
      return cachedUserIdRef.current;
    } catch { return null; }
  }, []);

  // Reset on a genuine account switch mid-session (logout → different
  // login, or a brand-new signup) so a previous account's cached plan
  // never leaks onto a fresh account sharing the same device.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const newUserId = session?.user?.id ?? null;
      const prevUserId = cachedUserIdRef.current;
      if (prevUserId !== null && newUserId !== prevUserId) {
        setState(defaultState());
        try { localStorage.removeItem(LS_KEY); } catch {}
      }
      cachedUserIdRef.current = newUserId;
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  }, [state]);

  // The single source of truth is `profiles.plan` / `plan_expiry` /
  // `subscription_status` / `trial_start_date` / `temporary_access` —
  // the SAME columns SubscriptionLock, TrialWarningBanner and the
  // manager dashboard already read. storage_level + sales_credit_* are
  // this context's own columns (already present on profiles).
  const refresh = useCallback(async () => {
    try {
      const userId = await getUserId();
      if (!userId) return;
      const { data, error } = await withTimeout(supabase
        .from('profiles')
        .select('plan, plan_expiry, subscription_status, trial_start_date, temporary_access, temporary_expiry, storage_level, sales_credit_used, sales_credit_period')
        .eq('user_id', userId)
        .maybeSingle(), 5000, 'subscription.refresh');
      if (error) throw error;
      if (data) {
        setState(() => {
          const period = currentPeriod();
          const samePeriod = (data.sales_credit_period || period) === period;
          // Once the DB read succeeds, it is the source of truth for THIS
          // account — including nulls (meaning "never subscribed"). Do not
          // fall back to the previous in-memory/localStorage value here.
          return {
            plan: ((data.plan as PlanId) && PLAN_ORDER.includes(data.plan as PlanId)) ? (data.plan as PlanId) : 'basic',
            storageLevel: data.storage_level || 1,
            planExpiry: data.plan_expiry || null,
            subscriptionStatus: data.subscription_status || 'trial',
            trialStartDate: data.trial_start_date || null,
            temporaryAccess: !!data.temporary_access,
            temporaryExpiry: data.temporary_expiry || null,
            salesCreditPeriod: period,
            salesCreditUsed: samePeriod ? (data.sales_credit_used ?? 0) : 0,
          };
        });
      }
    } catch (e) { console.warn('Subscription refresh failed', e); }
  }, [getUserId]);

  useEffect(() => { refresh(); }, [refresh]);

  const persistRemote = useCallback(async (patch: Partial<Record<string, any>>) => {
    try {
      const userId = await getUserId();
      if (!userId) return;
      await withTimeout(supabase.from('profiles').update(patch).eq('user_id', userId), 5000, 'subscription.persist');
    } catch (e) { console.warn('Subscription persist failed', e); }
  }, [getUserId]);

  // ── Derived access state ──────────────────────────────────────────────
  const trialExpiresAt = useMemo(() => {
    if (!state.trialStartDate) return null;
    return new Date(new Date(state.trialStartDate).getTime() + TRIAL_DAYS * 86400000).toISOString();
  }, [state.trialStartDate]);

  const hasActivePaidPlan = useMemo(() => {
    return state.subscriptionStatus === 'active' && !!state.planExpiry && new Date(state.planExpiry).getTime() > Date.now();
  }, [state.subscriptionStatus, state.planExpiry]);

  const trialActive = useMemo(() => {
    if (hasActivePaidPlan) return false;
    if (!trialExpiresAt) return false;
    return new Date(trialExpiresAt).getTime() > Date.now();
  }, [hasActivePaidPlan, trialExpiresAt]);

  const trialDaysLeft = useMemo(() => {
    if (!trialExpiresAt) return 0;
    return Math.max(0, Math.ceil((new Date(trialExpiresAt).getTime() - Date.now()) / 86400000));
  }, [trialExpiresAt]);

  const tempBridgeActive = useMemo(() => {
    return state.temporaryAccess && !!state.temporaryExpiry && new Date(state.temporaryExpiry).getTime() > Date.now();
  }, [state.temporaryAccess, state.temporaryExpiry]);

  // Trial over, no active paid plan, and no pending-approval bridge — full lockout.
  // (Baki page stays viewable — that's enforced separately in SubscriptionLock's allow-list.)
  const isLocked = !trialActive && !hasActivePaidPlan && !tempBridgeActive;

  // Trial / temp-bridge users get full base-level limits and every feature,
  // so they see the whole app before deciding what to pay for.
  const productLimit = isLocked ? 0 : (hasActivePaidPlan ? state.storageLevel * PRODUCT_UNIT : PRODUCT_UNIT);
  const bakiLimit = isLocked ? 0 : (hasActivePaidPlan ? state.storageLevel * BAKI_UNIT : BAKI_UNIT);
  // Sales+baki credit stays fixed at 10,000 regardless of storage level —
  // only product/baki capacity scales with level, not the monthly credit.
  const salesCreditLimit = isLocked ? 0 : SALES_CREDIT_UNIT;
  const monthlyPrice = PLAN_BASE_PRICE[state.plan] * state.storageLevel;

  const creditExhausted = hasActivePaidPlan && state.salesCreditUsed >= salesCreditLimit;

  const isPlanActive = !isLocked;

  const hasFeature = useCallback((feature: 'whatsapp' | 'invoice') => {
    if (isLocked) return false;
    if (trialActive || tempBridgeActive) return true;
    return PLAN_FEATURES[feature].includes(state.plan);
  }, [isLocked, trialActive, tempBridgeActive, state.plan]);

  const canAddProduct = useCallback(() => !isLocked && products.length < productLimit, [isLocked, products.length, productLimit]);
  const canAddCustomer = useCallback(() => !isLocked && customers.length < bakiLimit, [isLocked, customers.length, bakiLimit]);
  const canRecordSale = useCallback((count = 1) => !isLocked && (state.salesCreditUsed + count) <= salesCreditLimit, [isLocked, state.salesCreditUsed, salesCreditLimit]);
  const openLock = useCallback((reason: LockReason) => setLockModal(reason), []);
  const closeLock = useCallback(() => setLockModal(null), []);

  const guardAddProduct = useCallback(() => {
    if (isLocked) { openLock({ type: 'subscription_needed' }); return false; }
    if (products.length >= productLimit) { openLock({ type: 'product_limit', current: products.length, limit: productLimit }); return false; }
    return true;
  }, [isLocked, products.length, productLimit, openLock]);

  const guardAddCustomer = useCallback(() => {
    if (isLocked) { openLock({ type: 'subscription_needed' }); return false; }
    if (customers.length >= bakiLimit) { openLock({ type: 'baki_limit', current: customers.length, limit: bakiLimit }); return false; }
    return true;
  }, [isLocked, customers.length, bakiLimit, openLock]);

  const guardRecordSale = useCallback((count = 1) => {
    if (isLocked) { openLock({ type: 'subscription_needed' }); return false; }
    if ((state.salesCreditUsed + count) > salesCreditLimit) { openLock({ type: 'sales_credit', used: state.salesCreditUsed, limit: salesCreditLimit }); return false; }
    return true;
  }, [isLocked, state.salesCreditUsed, salesCreditLimit, openLock]);

  const guardFeature = useCallback((feature: 'whatsapp' | 'invoice') => {
    if (isLocked) { openLock({ type: 'subscription_needed' }); return false; }
    if (!hasFeature(feature)) { openLock({ type: feature === 'whatsapp' ? 'feature_whatsapp' : 'feature_invoice' }); return false; }
    return true;
  }, [isLocked, hasFeature, openLock]);

  const incrementSalesCredit = useCallback((n = 1) => {
    setState(prev => {
      const period = currentPeriod();
      const used = (prev.salesCreditPeriod === period ? prev.salesCreditUsed : 0) + n;
      const next = { ...prev, salesCreditPeriod: period, salesCreditUsed: used };
      persistRemote({ sales_credit_used: used, sales_credit_period: period });
      return next;
    });
  }, [persistRemote]);

  // Manual tier/level change without touching billing dates — used rarely
  // outside the payment flow (e.g. admin correction).
  const setPlan = useCallback(async (plan: PlanId) => {
    setState(prev => ({ ...prev, plan }));
    await persistRemote({ plan });
  }, [persistRemote]);

  const setStorageLevel = useCallback(async (level: number) => {
    const safe = Math.max(1, Math.min(10, Math.floor(level)));
    setState(prev => ({ ...prev, storageLevel: safe }));
    await persistRemote({ storage_level: safe });
  }, [persistRemote]);

  // Fresh 30-day cycle — first subscription after trial, or a renewal.
  // (Tier/level *upgrades* mid-cycle are applied by the manager-approval
  // RPC directly in the DB, which keeps the expiry/credit untouched.)
  const renewPlan = useCallback(async (plan?: PlanId, storageLevel?: number) => {
    const start = new Date();
    const end = new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);
    const period = currentPeriod();
    setState(prev => ({
      ...prev,
      plan: plan || prev.plan,
      storageLevel: storageLevel || prev.storageLevel,
      planExpiry: end.toISOString(),
      subscriptionStatus: 'active',
      salesCreditUsed: 0,
      salesCreditPeriod: period,
      temporaryAccess: false,
      temporaryExpiry: null,
    }));
    await persistRemote({
      plan, storage_level: storageLevel, plan_expiry: end.toISOString(),
      subscription_status: 'active', sales_credit_used: 0, sales_credit_period: period,
      temporary_access: false, temporary_expiry: null,
    });
  }, [persistRemote]);

  return (
    <SubscriptionContext.Provider value={{
      ...state,
      expiresAt: state.planExpiry,
      productLimit, bakiLimit, salesCreditLimit, monthlyPrice, hasFeature, isPlanActive,
      trialActive, trialDaysLeft, trialExpiresAt, hasActivePaidPlan, creditExhausted, isLocked,
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

const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
export function toBn(n: number | string): string {
  return String(n).replace(/[0-9]/g, d => BN_DIGITS[parseInt(d)]);
}
