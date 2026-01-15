import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Product, Sale, Customer, StoreInfo, DashboardStats, Expense, PersonalAccountStats, CartItem } from '@/types/store';

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
  addMultipleSales: (sales: Omit<Sale, 'id' | 'createdAt'>[], customerId?: string, customerName?: string, isPaid?: boolean) => void;
  addCustomer: (customer: Omit<Customer, 'id' | 'createdAt' | 'displayName' | 'pendingProfit' | 'lastPaymentDate'>) => Customer;
  updateCustomerDue: (id: string, amount: number, profitAmount?: number) => void;
  payCustomerDue: (id: string, paymentAmount: number) => number; // Returns proportional profit
  completeOnboarding: (storeName: string, initialProducts: Omit<Product, 'id' | 'createdAt'>[]) => void;
  getDashboardStats: () => DashboardStats;
  getPersonalAccountStats: () => PersonalAccountStats;
  addExpense: (expense: Omit<Expense, 'id' | 'createdAt'>) => void;
  getProductSuggestions: (query: string) => Product[];
  generateCustomerDisplayName: (name: string) => string;
  getExistingCustomersByName: (name: string) => Customer[];
  searchCustomersByPhone: (phone: string) => Customer[];
  searchCustomersByName: (name: string) => Customer[];
  getUnpaidCustomers: () => Customer[]; // Customers with no payment in last month
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

  // Get existing customers by name for suggestions
  const getExistingCustomersByName = (name: string): Customer[] => {
    if (!name.trim()) return [];
    const normalizedName = name.toLowerCase().trim();
    return customers.filter(c => 
      c.name.toLowerCase().trim() === normalizedName
    );
  };

  // Search customers by phone number
  const searchCustomersByPhone = (phone: string): Customer[] => {
    if (!phone.trim()) return [];
    return customers.filter(c => c.phone && c.phone.includes(phone.trim()));
  };

  // Search customers by name
  const searchCustomersByName = (name: string): Customer[] => {
    if (!name.trim()) return [];
    const lowerName = name.toLowerCase().trim();
    return customers.filter(c => 
      c.name.toLowerCase().includes(lowerName) || 
      c.displayName.toLowerCase().includes(lowerName)
    );
  };

  // Get customers who haven't paid anything in the last month
  const getUnpaidCustomers = (): Customer[] => {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    return customers.filter(c => {
      if (c.totalDue <= 0) return false;
      
      // If never paid or last payment was more than a month ago
      if (!c.lastPaymentDate) return true;
      
      const lastPayment = new Date(c.lastPaymentDate);
      return lastPayment < oneMonthAgo;
    });
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
    // Ensure profit is never negative
    const safeSale = {
      ...sale,
      profit: Math.max(0, sale.profit),
      totalPrice: Math.max(0, sale.totalPrice)
    };

    setSales(prev => [...prev, { ...safeSale, id: generateId(), createdAt: new Date() }]);
    
    // Update product stock
    const product = products.find(p => p.id === sale.productId);
    if (product) {
      updateProduct(sale.productId, { stock: Math.max(0, product.stock - sale.quantity) });
    }

    // Update customer due and pending profit if not paid
    if (!sale.isPaid && sale.customerId) {
      updateCustomerDue(sale.customerId, Math.max(0, sale.totalPrice), Math.max(0, sale.profit));
    }
  };

  const addMultipleSales = (
    salesList: Omit<Sale, 'id' | 'createdAt'>[],
    customerId?: string,
    customerName?: string,
    isPaid: boolean = true
  ) => {
    const newSales: Sale[] = [];
    let totalDue = 0;
    let totalProfit = 0;

    salesList.forEach(sale => {
      const safeSale = {
        ...sale,
        customerId,
        customerName,
        isPaid,
        profit: Math.max(0, sale.profit),
        totalPrice: Math.max(0, sale.totalPrice)
      };

      newSales.push({ ...safeSale, id: generateId(), createdAt: new Date() });

      // Update product stock
      const product = products.find(p => p.id === sale.productId);
      if (product) {
        updateProduct(sale.productId, { stock: Math.max(0, product.stock - sale.quantity) });
      }

      if (!isPaid) {
        totalDue += safeSale.totalPrice;
        totalProfit += safeSale.profit;
      }
    });

    setSales(prev => [...prev, ...newSales]);

    // Update customer due if credit sale
    if (!isPaid && customerId) {
      updateCustomerDue(customerId, totalDue, totalProfit);
    }
  };

  const addCustomer = (customer: Omit<Customer, 'id' | 'createdAt' | 'displayName' | 'pendingProfit' | 'lastPaymentDate'>): Customer => {
    const displayName = generateCustomerDisplayName(customer.name);
    const newCustomer: Customer = {
      ...customer,
      id: generateId(),
      displayName,
      pendingProfit: 0,
      totalDue: Math.max(0, customer.totalDue), // Ensure non-negative
      createdAt: new Date()
    };
    setCustomers(prev => [...prev, newCustomer]);
    return newCustomer;
  };

  const updateCustomerDue = (id: string, amount: number, profitAmount?: number) => {
    // Ensure amounts are never negative
    const safeAmount = Math.max(0, amount);
    const safeProfitAmount = profitAmount ? Math.max(0, profitAmount) : 0;

    setCustomers(prev => prev.map(c => 
      c.id === id ? { 
        ...c, 
        totalDue: Math.max(0, c.totalDue + safeAmount),
        pendingProfit: Math.max(0, c.pendingProfit + safeProfitAmount)
      } : c
    ));
  };

  // When customer pays baki, calculate proportional profit and add to cash profit
  const payCustomerDue = (id: string, paymentAmount: number): number => {
    const customer = customers.find(c => c.id === id);
    if (!customer || customer.totalDue <= 0 || paymentAmount <= 0) return 0;

    // Calculate proportional profit: (pendingProfit / totalDue) * paymentAmount
    const proportionalProfit = customer.totalDue > 0 
      ? (customer.pendingProfit / customer.totalDue) * paymentAmount 
      : 0;
    const newTotalDue = customer.totalDue - paymentAmount;
    const newPendingProfit = customer.pendingProfit - proportionalProfit;

    setCustomers(prev => prev.map(c => 
      c.id === id ? { 
        ...c, 
        totalDue: Math.max(0, newTotalDue),
        pendingProfit: Math.max(0, newPendingProfit),
        lastPaymentDate: new Date() // Update last payment date
      } : c
    ));

    return Math.max(0, proportionalProfit);
  };

  const addExpense = (expense: Omit<Expense, 'id' | 'createdAt'>) => {
    const safeExpense = {
      ...expense,
      amount: Math.max(0, expense.amount)
    };
    setExpenses(prev => [...prev, { ...safeExpense, id: generateId(), createdAt: new Date() }]);
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
    const totalBakiProfit = customers.reduce((sum, c) => sum + c.pendingProfit, 0);
    const lowStockProducts = products.filter(p => p.stock <= 5).length;

    return {
      todaySales,
      todayProfit,
      todayCashSales: todayCashSalesTotal,
      todayCashProfit: todayCashProfitTotal,
      todayCreditSales: todayCreditSalesTotal,
      todayCreditProfit: todayCreditProfitTotal,
      totalDue,
      totalBakiProfit,
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
      addMultipleSales,
      addCustomer,
      updateCustomerDue,
      payCustomerDue,
      completeOnboarding,
      getDashboardStats,
      getPersonalAccountStats,
      addExpense,
      getProductSuggestions,
      generateCustomerDisplayName,
      getExistingCustomersByName,
      searchCustomersByPhone,
      searchCustomersByName,
      getUnpaidCustomers
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
