import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { Product, Sale, Customer, StoreInfo, DashboardStats, Expense, PersonalAccountStats, UnitType, PreOrder, PreOrderStatus, BulkSaleRecord, BakiPaymentRecord, CustomEarning, Supplier } from '@/types/store';
import { supabase } from '@/integrations/supabase/client';
import { markDirty, restoreFromCloud } from '@/lib/syncEngine';
import { putAll, scheduleMirror, setMeta } from '@/lib/idb';
import { withTimeout } from '@/lib/asyncTimeout';


interface StoreContextType {
  storeInfo: StoreInfo | null;
  products: Product[];
  sales: Sale[];
  customers: Customer[];
  expenses: Expense[];
  preOrders: PreOrder[];
  bulkSaleRecords: BulkSaleRecord[];
  bakiPaymentRecords: BakiPaymentRecord[];
  customEarnings: CustomEarning[];
  suppliers: Supplier[];
  isOnboarded: boolean;
  setStoreInfo: (info: StoreInfo) => void;
  addProduct: (product: Omit<Product, 'id' | 'createdAt'>) => void;
  updateProduct: (id: string, product: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  addSale: (sale: Omit<Sale, 'id' | 'createdAt'>) => void;
  addMultipleSales: (sales: Omit<Sale, 'id' | 'createdAt'>[], customerId?: string, customerName?: string, isPaid?: boolean) => void;
  addCustomer: (customer: Omit<Customer, 'id' | 'createdAt' | 'displayName' | 'pendingProfit' | 'lastPaymentDate'>) => Customer;
  updateCustomer: (id: string, customer: Partial<Customer>) => void;
  updateCustomerDue: (id: string, amount: number, profitAmount?: number) => void;
  payCustomerDue: (id: string, paymentAmount: number) => number;
  completeOnboarding: (storeName: string, initialProducts: Omit<Product, 'id' | 'createdAt'>[]) => void;
  getDashboardStats: () => DashboardStats;
  getPersonalAccountStats: () => PersonalAccountStats;
  addExpense: (expense: Omit<Expense, 'id' | 'createdAt'>) => void;
  addCustomEarning: (earning: Omit<CustomEarning, 'id' | 'createdAt'>) => void;
  getProductSuggestions: (query: string) => Product[];
  generateCustomerDisplayName: (name: string) => string;
  getExistingCustomersByName: (name: string) => Customer[];
  searchCustomersByPhone: (phone: string) => Customer[];
  searchCustomersByName: (name: string) => Customer[];
  getUnpaidCustomers: () => Customer[];
  getCustomersDueFor30Days: () => Customer[];
  addPreOrder: (preOrder: Omit<PreOrder, 'id' | 'createdAt'>) => void;
  updatePreOrderStatus: (id: string, status: PreOrderStatus) => void;
  markPreOrderAsSold: (id: string) => void;
  getWeeklyBulkSales: () => BulkSaleRecord[];
  getTodaysSalesSerial: () => number;
  addSupplier: (supplier: Omit<Supplier, 'id' | 'createdAt'>) => void;
  updateSupplier: (id: string, supplier: Partial<Supplier>) => void;
  deleteSupplier: (id: string) => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);
const generateId = () => Math.random().toString(36).substr(2, 9);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [storeInfo, setStoreInfoState] = useState<StoreInfo | null>(() => {
    const saved = localStorage.getItem('storeInfo');
    return saved ? JSON.parse(saved) : null;
  });

  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('products');
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed.map((p: any) => ({ ...p, unitType: p.unitType || (p.productType === 'weight' ? (p.weightUnit || 'kg') : 'piece') }));
    }
    return [];
  });

  const [sales, setSales] = useState<Sale[]>(() => {
    const saved = localStorage.getItem('sales');
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed.map((s: any) => ({ ...s, unitType: s.unitType || 'piece' }));
    }
    return [];
  });

  const [customers, setCustomers] = useState<Customer[]>(() => {
    const saved = localStorage.getItem('customers');
    return saved ? JSON.parse(saved) : [];
  });

  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem('expenses');
    return saved ? JSON.parse(saved) : [];
  });

  const [preOrders, setPreOrders] = useState<PreOrder[]>(() => {
    const saved = localStorage.getItem('preOrders');
    return saved ? JSON.parse(saved) : [];
  });

  const [bulkSaleRecords, setBulkSaleRecords] = useState<BulkSaleRecord[]>(() => {
    const saved = localStorage.getItem('bulkSaleRecords');
    if (saved) {
      const parsed = JSON.parse(saved);
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      return parsed.filter((r: BulkSaleRecord) => new Date(r.createdAt) > oneWeekAgo);
    }
    return [];
  });

  const [bakiPaymentRecords, setBakiPaymentRecords] = useState<BakiPaymentRecord[]>(() => {
    const saved = localStorage.getItem('bakiPaymentRecords');
    return saved ? JSON.parse(saved) : [];
  });

  const [customEarnings, setCustomEarnings] = useState<CustomEarning[]>(() => {
    const saved = localStorage.getItem('customEarnings');
    return saved ? JSON.parse(saved) : [];
  });

  const [suppliers, setSuppliers] = useState<Supplier[]>(() => {
    const saved = localStorage.getItem('suppliers');
    return saved ? JSON.parse(saved) : [];
  });

  const isOnboarded = storeInfo?.isOnboarded === true || !!storeInfo?.name || !!localStorage.getItem('storeInfo');

  // FIX 5: Batch all localStorage + IndexedDB writes into ONE useEffect
  // Old: 9 separate useEffects — each state change triggered its own write
  // New: single effect that only runs when any of the states change
  // This reduces unnecessary writes and scheduleMirror calls significantly
  useEffect(() => {
    if (storeInfo) {
      localStorage.setItem('storeInfo', JSON.stringify(storeInfo));
      scheduleMirror(() => void setMeta('storeInfo', storeInfo));
    }
    localStorage.setItem('products', JSON.stringify(products));
    localStorage.setItem('sales', JSON.stringify(sales));
    localStorage.setItem('customers', JSON.stringify(customers));
    localStorage.setItem('expenses', JSON.stringify(expenses));
    localStorage.setItem('preOrders', JSON.stringify(preOrders));
    localStorage.setItem('bulkSaleRecords', JSON.stringify(bulkSaleRecords));
    localStorage.setItem('bakiPaymentRecords', JSON.stringify(bakiPaymentRecords));
    localStorage.setItem('customEarnings', JSON.stringify(customEarnings));
    localStorage.setItem('suppliers', JSON.stringify(suppliers));

    // FIX 5: Mirror to IndexedDB in one batch call per category
    scheduleMirror(() => {
      void putAll('products', products as any);
      void putAll('sales', sales as any);
      void putAll('customers', customers as any);
      void putAll('expenses', expenses as any);
      void putAll('preOrders', preOrders as any);
      void putAll('bulkSaleRecords', bulkSaleRecords as any);
      void putAll('bakiPaymentRecords', bakiPaymentRecords as any);
      void putAll('customEarnings', customEarnings as any);
      void putAll('suppliers', suppliers as any);
    });
  }, [storeInfo, products, sales, customers, expenses, preOrders, bulkSaleRecords, bakiPaymentRecords, customEarnings, suppliers]);

  // Sync dirty flags — keep separate so they only fire on specific changes
  const mountedBakiRef = useRef(false);
  useEffect(() => {
    if (!mountedBakiRef.current) { mountedBakiRef.current = true; return; }
    markDirty('baki');
  }, [customers, bakiPaymentRecords]);

  const mountedProductsRef = useRef(false);
  useEffect(() => {
    if (!mountedProductsRef.current) { mountedProductsRef.current = true; return; }
    markDirty('products');
  }, [products]);

  const mountedHisabRef = useRef(false);
  useEffect(() => {
    if (!mountedHisabRef.current) { mountedHisabRef.current = true; return; }
    markDirty('hisab');
  }, [expenses, customEarnings]);

  // ── Cloud restore on login ──────────────────────────────────────────────
  // When the user signs in (or opens the app already signed-in), pull any
  // previously-synced data from `user_backups` and merge it into local state.
  // This is what makes data reappear after logout / reinstall / new device.
  //
  // Merge rule: cloud wins for any slice that is *empty* locally OR when the
  // cloud row is newer than our local last-sync stamp. This preserves offline
  // work while ensuring restore works on a fresh device.
  const hydratedForUserRef = useRef<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: { user } } = await withTimeout(supabase.auth.getUser(), 4000, 'store.getUser');
        if (!user || cancelled) return;
        if (hydratedForUserRef.current === user.id) return;
        hydratedForUserRef.current = user.id;

        const snap = await withTimeout(restoreFromCloud(), 5000, 'store.restore');
        if (!snap || cancelled) return;

        // Suppress the immediate markDirty that our setState calls would
        // otherwise trigger — this data JUST came from the cloud.
        mountedBakiRef.current = false;
        mountedProductsRef.current = false;
        mountedHisabRef.current = false;

        if (snap.customers && (customers.length === 0 || snap.customers.length > customers.length)) {
          setCustomers(snap.customers as Customer[]);
        }
        if (snap.bakiPaymentRecords && (bakiPaymentRecords.length === 0 || snap.bakiPaymentRecords.length > bakiPaymentRecords.length)) {
          setBakiPaymentRecords(snap.bakiPaymentRecords as BakiPaymentRecord[]);
        }
        if (snap.products && (products.length === 0 || snap.products.length > products.length)) {
          setProducts(snap.products as Product[]);
        }
        if (snap.expenses && (expenses.length === 0 || snap.expenses.length > expenses.length)) {
          setExpenses(snap.expenses as Expense[]);
        }
        if (snap.customEarnings && (customEarnings.length === 0 || snap.customEarnings.length > customEarnings.length)) {
          setCustomEarnings(snap.customEarnings as CustomEarning[]);
        }
      } catch (e) {
        console.warn('[store] cloud hydrate failed:', e);
      }
    })();

    // Re-hydrate whenever auth state changes to a different user.
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      if (!session?.user) { hydratedForUserRef.current = null; return; }
      if (hydratedForUserRef.current !== session.user.id) {
        hydratedForUserRef.current = null; // will trigger next mount cycle
        // Kick the effect: cheapest is to reload by refetching now.
        void (async () => {
          try {
          const snap = await withTimeout(restoreFromCloud(), 5000, 'store.authRestore');
          if (!snap) return;
          mountedBakiRef.current = false;
          mountedProductsRef.current = false;
          mountedHisabRef.current = false;
          if (snap.customers?.length)          setCustomers(snap.customers as Customer[]);
          if (snap.bakiPaymentRecords?.length) setBakiPaymentRecords(snap.bakiPaymentRecords as BakiPaymentRecord[]);
          if (snap.products?.length)           setProducts(snap.products as Product[]);
          if (snap.expenses?.length)           setExpenses(snap.expenses as Expense[]);
          if (snap.customEarnings?.length)     setCustomEarnings(snap.customEarnings as CustomEarning[]);
          hydratedForUserRef.current = session.user.id;
          } catch (e) {
            console.warn('[store] auth restore failed:', e);
          }
        })();
      }
    });

    return () => { cancelled = true; sub.subscription.unsubscribe(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setStoreInfo = (info: StoreInfo) => setStoreInfoState(info);



  const generateCustomerDisplayName = (name: string): string => {
    const normalizedName = name.toLowerCase().trim();
    const existingCustomers = customers.filter(c => c.name.toLowerCase().trim() === normalizedName);
    if (existingCustomers.length === 0) return name.trim();
    let maxSuffix = 0;
    existingCustomers.forEach(c => {
      const match = c.displayName.match(/(\d+)$/);
      if (match) maxSuffix = Math.max(maxSuffix, parseInt(match[1]));
    });
    return `${name.trim()}${maxSuffix + 1}`;
  };

  const getExistingCustomersByName = (name: string): Customer[] => {
    if (!name.trim()) return [];
    const normalizedName = name.toLowerCase().trim();
    return customers.filter(c => c.name.toLowerCase().trim() === normalizedName);
  };

  const searchCustomersByPhone = (phone: string): Customer[] => {
    if (!phone.trim()) return [];
    return customers.filter(c => c.phone && c.phone.includes(phone.trim()));
  };

  const searchCustomersByName = (name: string): Customer[] => {
    if (!name.trim()) return [];
    const lowerName = name.toLowerCase().trim();
    return customers.filter(c => c.name.toLowerCase().includes(lowerName) || c.displayName.toLowerCase().includes(lowerName));
  };

  const getUnpaidCustomers = (): Customer[] => {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    return customers.filter(c => {
      if (c.totalDue <= 0) return false;
      if (!c.lastPaymentDate) return true;
      return new Date(c.lastPaymentDate) < oneMonthAgo;
    });
  };

  const getCustomersDueFor30Days = (): Customer[] => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return customers.filter(c => {
      if (c.totalDue <= 0) return false;
      const bakiDate = c.bakiCreatedAt ? new Date(c.bakiCreatedAt) : new Date(c.createdAt);
      if (bakiDate > thirtyDaysAgo) return false;
      if (c.lastPaymentDate) return false;
      return true;
    });
  };

  const getTodaysSalesSerial = (): number => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todaysRecords = bulkSaleRecords.filter(r => {
      const recordDate = new Date(r.createdAt);
      recordDate.setHours(0, 0, 0, 0);
      return recordDate.getTime() === today.getTime();
    });
    return todaysRecords.length + 1;
  };

  const getWeeklyBulkSales = (): BulkSaleRecord[] => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    return bulkSaleRecords.filter(r => new Date(r.createdAt) > oneWeekAgo).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  };

  const addProduct = (product: Omit<Product, 'id' | 'createdAt'>) => {
    const safeProfit = Math.min(Math.max(0, product.profit), product.price);
    setProducts(prev => [...prev, { ...product, profit: safeProfit, id: generateId(), createdAt: new Date() }]);
  };

  const updateProduct = (id: string, productUpdate: Partial<Product>) => {
    setProducts(prev => prev.map(p => {
      if (p.id !== id) return p;
      const updated = { ...p, ...productUpdate };
      if (updated.profit > updated.price) updated.profit = updated.price;
      return updated;
    }));
  };

  const deleteProduct = (id: string) => setProducts(prev => prev.filter(p => p.id !== id));

  const addSale = (sale: Omit<Sale, 'id' | 'createdAt'>) => {
    const safeSale = { ...sale, profit: Math.max(0, sale.profit), totalPrice: Math.max(0, sale.totalPrice) };
    setSales(prev => [...prev, { ...safeSale, id: generateId(), createdAt: new Date() }]);
    const product = products.find(p => p.id === sale.productId);
    if (product) updateProduct(sale.productId, { stock: Math.max(0, product.stock - sale.quantity) });
    if (!sale.isPaid && sale.customerId) updateCustomerDue(sale.customerId, Math.max(0, sale.totalPrice), Math.max(0, sale.profit));
  };

  const addMultipleSales = (salesList: Omit<Sale, 'id' | 'createdAt'>[], customerId?: string, customerName?: string, isPaid: boolean = true) => {
    const newSales: Sale[] = [];
    let totalDue = 0, totalProfit = 0, totalPrice = 0;
    const productNames: string[] = [];

    salesList.forEach(sale => {
      const safeSale = { ...sale, customerId, customerName, isPaid, profit: Math.max(0, sale.profit), totalPrice: Math.max(0, sale.totalPrice) };
      newSales.push({ ...safeSale, id: generateId(), createdAt: new Date() });
      productNames.push(sale.productName);
      totalPrice += safeSale.totalPrice;
      totalProfit += safeSale.profit;
      const product = products.find(p => p.id === sale.productId);
      if (product) updateProduct(sale.productId, { stock: Math.max(0, product.stock - sale.quantity) });
      if (!isPaid) totalDue += safeSale.totalPrice;
    });

    setSales(prev => [...prev, ...newSales]);

    if (salesList.length > 0) {
      const serialNumber = getTodaysSalesSerial();
      setBulkSaleRecords(prev => [...prev, { id: generateId(), serialNumber, productNames, totalPrice, totalProfit, createdAt: new Date() }]);
    }

    if (!isPaid && customerId) updateCustomerDue(customerId, totalDue, totalProfit);
  };

  const addCustomer = (customer: Omit<Customer, 'id' | 'createdAt' | 'displayName' | 'pendingProfit' | 'lastPaymentDate'>): Customer => {
    const displayName = generateCustomerDisplayName(customer.name);
    const newCustomer: Customer = { ...customer, id: generateId(), displayName, pendingProfit: 0, totalDue: Math.max(0, customer.totalDue), createdAt: new Date(), bakiCreatedAt: customer.totalDue > 0 ? new Date() : undefined };
    setCustomers(prev => [...prev, newCustomer]);
    return newCustomer;
  };

  const updateCustomer = (id: string, customerUpdate: Partial<Customer>) => {
    setCustomers(prev => prev.map(c => c.id === id ? { ...c, ...customerUpdate } : c));
  };

  const updateCustomerDue = (id: string, amount: number, profitAmount?: number) => {
    const safeAmount = Math.max(0, amount);
    const safeProfitAmount = profitAmount ? Math.max(0, profitAmount) : 0;
    setCustomers(prev => prev.map(c => {
      if (c.id !== id) return c;
      const newDue = Math.max(0, c.totalDue + safeAmount);
      return { ...c, totalDue: newDue, pendingProfit: Math.max(0, c.pendingProfit + safeProfitAmount), bakiCreatedAt: c.bakiCreatedAt || (newDue > 0 ? new Date() : undefined) };
    }));
  };

  const payCustomerDue = (id: string, paymentAmount: number): number => {
    const customer = customers.find(c => c.id === id);
    if (!customer || customer.totalDue <= 0 || paymentAmount <= 0) return 0;
    const proportionalProfit = customer.totalDue > 0 ? (customer.pendingProfit / customer.totalDue) * paymentAmount : 0;
    const newTotalDue = customer.totalDue - paymentAmount;
    const newPendingProfit = customer.pendingProfit - proportionalProfit;
    setCustomers(prev => prev.map(c => c.id === id ? { ...c, totalDue: Math.max(0, newTotalDue), pendingProfit: Math.max(0, newPendingProfit), lastPaymentDate: new Date() } : c));
    if (proportionalProfit > 0) {
      setBakiPaymentRecords(prev => [...prev, { id: generateId(), customerId: id, customerName: customer.displayName, paymentAmount, profitEarned: proportionalProfit, createdAt: new Date() }]);
    }
    return Math.max(0, proportionalProfit);
  };

  const addExpense = (expense: Omit<Expense, 'id' | 'createdAt'>) => {
    setExpenses(prev => [...prev, { ...expense, amount: Math.max(0, expense.amount), id: generateId(), createdAt: new Date() }]);
  };

  const addCustomEarning = (earning: Omit<CustomEarning, 'id' | 'createdAt'>) => {
    setCustomEarnings(prev => [...prev, { ...earning, amount: Math.max(0, earning.amount), id: generateId(), createdAt: new Date() }]);
  };

  const addPreOrder = (preOrder: Omit<PreOrder, 'id' | 'createdAt'>) => {
    if (preOrder.stockReserved) {
      preOrder.items.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        if (product) updateProduct(item.productId, { stock: Math.max(0, product.stock - item.quantity) });
      });
    }
    setPreOrders(prev => [...prev, { ...preOrder, id: generateId(), createdAt: new Date() }]);
  };

  const updatePreOrderStatus = (id: string,
