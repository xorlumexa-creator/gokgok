import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Product, Sale, Customer, StoreInfo, DashboardStats, Expense, PersonalAccountStats } from '@/types/store';

interface StoreContextType {
  storeInfo: StoreInfo | null;
  products: Product[];
  sales: Sale[];
  customers: Customer[];
  expenses: Expense[];
  isOnboarded: boolean;
  setStoreInfo: (info: StoreInfo) => void;
  addProduct: (product: Omit<Product, 'id' | 'createdAt'>) => void;
  updateProduct: (id: string, product: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  addSale: (sale: Omit<Sale, 'id' | 'createdAt'>) => void;
  addCustomer: (customer: Omit<Customer, 'id' | 'createdAt' | 'displayName' | 'pendingProfit'>) => Customer;
  updateCustomerDue: (id: string, amount: number, profitAmount?: number) => void;
  payCustomerDue: (id: string, paymentAmount: number) => number; // Returns proportional profit
  completeOnboarding: (storeName: string, initialProducts: Omit<Product, 'id' | 'createdAt'>[]) => void;
  getDashboardStats: () => DashboardStats;
  getPersonalAccountStats: () => PersonalAccountStats;
  addExpense: (expense: Omit<Expense, 'id' | 'createdAt'>) => void;
  getProductSuggestions: (query: string) => Product[];
  generateCustomerDisplayName: (name: string) => string;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

const generateId = () => Math.random().toString(36).substr(2, 9);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [storeInfo, setStoreInfo] = useState<StoreInfo | null>(() => {
    const saved = localStorage.getItem('storeInfo');
    return saved ? JSON.parse(saved) : null;
  });

  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('products');
    return saved ? JSON.parse(saved) : [];
  });

  const [sales, setSales] = useState<Sale[]>(() => {
    const saved = localStorage.getItem('sales');
    return saved ? JSON.parse(saved) : [];
  });

  const [customers, setCustomers] = useState<Customer[]>(() => {
    const saved = localStorage.getItem('customers');
    return saved ? JSON.parse(saved) : [];
  });

  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem('expenses');
    return saved ? JSON.parse(saved) : [];
  });

  const isOnboarded = storeInfo?.isOnboarded ?? false;

  useEffect(() => {
    if (storeInfo) {
      localStorage.setItem('storeInfo', JSON.stringify(storeInfo));
    }
  }, [storeInfo]);

  useEffect(() => {
    localStorage.setItem('products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('sales', JSON.stringify(sales));
  }, [sales]);

  useEffect(() => {
    localStorage.setItem('customers', JSON.stringify(customers));
  }, [customers]);

  useEffect(() => {
    localStorage.setItem('expenses', JSON.stringify(expenses));
  }, [expenses]);

  // Generate unique display name for customers with same name
  const generateCustomerDisplayName = (name: string): string => {
    const normalizedName = name.toLowerCase().trim();
    const existingCustomers = customers.filter(c => 
      c.name.toLowerCase().trim() === normalizedName
    );
    
    if (existingCustomers.length === 0) {
      return name.trim();
    }
    
    // Find the highest suffix number
    let maxSuffix = 0;
    existingCustomers.forEach(c => {
      const match = c.displayName.match(/(\d+)$/);
      if (match) {
        maxSuffix = Math.max(maxSuffix, parseInt(match[1]));
      }
    });
    
    return `${name.trim()}${maxSuffix + 1}`;
  };

  const addProduct = (product: Omit<Product, 'id' | 'createdAt'>) => {
    setProducts(prev => [...prev, { ...product, id: generateId(), createdAt: new Date() }]);
  };

  const updateProduct = (id: string, productUpdate: Partial<Product>) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, ...productUpdate } : p));
  };

  const deleteProduct = (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  const addSale = (sale: Omit<Sale, 'id' | 'createdAt'>) => {
    setSales(prev => [...prev, { ...sale, id: generateId(), createdAt: new Date() }]);
    
    // Update product stock
    const product = products.find(p => p.id === sale.productId);
    if (product) {
      updateProduct(sale.productId, { stock: product.stock - sale.quantity });
    }

    // Update customer due and pending profit if not paid
    if (!sale.isPaid && sale.customerId) {
      updateCustomerDue(sale.customerId, sale.totalPrice, sale.profit);
    }
  };

  const addCustomer = (customer: Omit<Customer, 'id' | 'createdAt' | 'displayName' | 'pendingProfit'>): Customer => {
    const displayName = generateCustomerDisplayName(customer.name);
    const newCustomer: Customer = {
      ...customer,
      id: generateId(),
      displayName,
      pendingProfit: 0,
      createdAt: new Date()
    };
    setCustomers(prev => [...prev, newCustomer]);
    return newCustomer;
  };

  const updateCustomerDue = (id: string, amount: number, profitAmount?: number) => {
    setCustomers(prev => prev.map(c => 
      c.id === id ? { 
        ...c, 
        totalDue: c.totalDue + amount,
        pendingProfit: c.pendingProfit + (profitAmount || 0)
      } : c
    ));
  };

  // When customer pays baki, calculate proportional profit and add to cash profit
  const payCustomerDue = (id: string, paymentAmount: number): number => {
    const customer = customers.find(c => c.id === id);
    if (!customer || customer.totalDue <= 0) return 0;

    // Calculate proportional profit: (pendingProfit / totalDue) * paymentAmount
    const proportionalProfit = (customer.pendingProfit / customer.totalDue) * paymentAmount;
    const newTotalDue = customer.totalDue - paymentAmount;
    const newPendingProfit = customer.pendingProfit - proportionalProfit;

    setCustomers(prev => prev.map(c => 
      c.id === id ? { 
        ...c, 
        totalDue: Math.max(0, newTotalDue),
        pendingProfit: Math.max(0, newPendingProfit)
      } : c
    ));

    return proportionalProfit;
  };

  const addExpense = (expense: Omit<Expense, 'id' | 'createdAt'>) => {
    setExpenses(prev => [...prev, { ...expense, id: generateId(), createdAt: new Date() }]);
  };

  const getProductSuggestions = (query: string): Product[] => {
    if (!query.trim()) return [];
    const lowerQuery = query.toLowerCase();
    return products.filter(p => p.name.toLowerCase().includes(lowerQuery));
  };

  const completeOnboarding = (storeName: string, initialProducts: Omit<Product, 'id' | 'createdAt'>[]) => {
    const trialStart = new Date();
    setStoreInfo({
      name: storeName,
      trialStartDate: trialStart,
      trialDaysLeft: 15,
      isOnboarded: true
    });

    initialProducts.forEach(product => {
      if (product.name.trim()) {
        addProduct(product);
      }
    });
  };

  const getDashboardStats = (): DashboardStats => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todaySalesData = sales.filter(s => new Date(s.createdAt) >= today);
    const todayCashSales = todaySalesData.filter(s => s.isPaid);
    const todayCreditSales = todaySalesData.filter(s => !s.isPaid);

    const todaySales = todaySalesData.reduce((sum, s) => sum + s.totalPrice, 0);
    const todayProfit = todaySalesData.reduce((sum, s) => sum + s.profit, 0);
    
    const todayCashSalesTotal = todayCashSales.reduce((sum, s) => sum + s.totalPrice, 0);
    const todayCashProfitTotal = todayCashSales.reduce((sum, s) => sum + s.profit, 0);
    
    const todayCreditSalesTotal = todayCreditSales.reduce((sum, s) => sum + s.totalPrice, 0);
    const todayCreditProfitTotal = todayCreditSales.reduce((sum, s) => sum + s.profit, 0);

    const totalDue = customers.reduce((sum, c) => sum + c.totalDue, 0);
    const lowStockProducts = products.filter(p => p.stock <= 5).length;

    return {
      todaySales,
      todayProfit,
      todayCashSales: todayCashSalesTotal,
      todayCashProfit: todayCashProfitTotal,
      todayCreditSales: todayCreditSalesTotal,
      todayCreditProfit: todayCreditProfitTotal,
      totalDue,
      lowStockProducts,
      totalProducts: products.length
    };
  };

  const getPersonalAccountStats = (): PersonalAccountStats => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thisWeekStart = new Date(today);
    thisWeekStart.setDate(today.getDate() - today.getDay());

    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    // Only count cash (paid) sales profit
    const cashSales = sales.filter(s => s.isPaid);
    
    const todayCashSales = cashSales.filter(s => new Date(s.createdAt) >= today);
    const weekCashSales = cashSales.filter(s => new Date(s.createdAt) >= thisWeekStart);
    const monthCashSales = cashSales.filter(s => new Date(s.createdAt) >= thisMonthStart);

    const totalCashProfit = cashSales.reduce((sum, s) => sum + s.profit, 0);
    const todayCashProfit = todayCashSales.reduce((sum, s) => sum + s.profit, 0);
    const weekCashProfit = weekCashSales.reduce((sum, s) => sum + s.profit, 0);
    const monthCashProfit = monthCashSales.reduce((sum, s) => sum + s.profit, 0);

    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

    return {
      totalCashProfit,
      totalExpenses,
      netEarning: totalCashProfit - totalExpenses,
      todayCashProfit,
      weekCashProfit,
      monthCashProfit
    };
  };

  return (
    <StoreContext.Provider value={{
      storeInfo,
      products,
      sales,
      customers,
      expenses,
      isOnboarded,
      setStoreInfo,
      addProduct,
      updateProduct,
      deleteProduct,
      addSale,
      addCustomer,
      updateCustomerDue,
      payCustomerDue,
      completeOnboarding,
      getDashboardStats,
      getPersonalAccountStats,
      addExpense,
      getProductSuggestions,
      generateCustomerDisplayName
    }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
}
