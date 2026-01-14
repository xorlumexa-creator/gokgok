import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Product, Sale, Customer, StoreInfo, DashboardStats } from '@/types/store';

interface StoreContextType {
  storeInfo: StoreInfo | null;
  products: Product[];
  sales: Sale[];
  customers: Customer[];
  isOnboarded: boolean;
  setStoreInfo: (info: StoreInfo) => void;
  addProduct: (product: Omit<Product, 'id' | 'createdAt'>) => void;
  updateProduct: (id: string, product: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  addSale: (sale: Omit<Sale, 'id' | 'createdAt'>) => void;
  addCustomer: (customer: Omit<Customer, 'id' | 'createdAt'>) => void;
  updateCustomerDue: (id: string, amount: number) => void;
  completeOnboarding: (storeName: string, initialProducts: Omit<Product, 'id' | 'createdAt'>[]) => void;
  getDashboardStats: () => DashboardStats;
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

    // Update customer due if not paid
    if (!sale.isPaid && sale.customerId) {
      updateCustomerDue(sale.customerId, sale.totalPrice);
    }
  };

  const addCustomer = (customer: Omit<Customer, 'id' | 'createdAt'>) => {
    setCustomers(prev => [...prev, { ...customer, id: generateId(), createdAt: new Date() }]);
  };

  const updateCustomerDue = (id: string, amount: number) => {
    setCustomers(prev => prev.map(c => 
      c.id === id ? { ...c, totalDue: c.totalDue + amount } : c
    ));
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
    const todaySales = todaySalesData.reduce((sum, s) => sum + s.totalPrice, 0);
    const todayProfit = todaySalesData.reduce((sum, s) => sum + s.profit, 0);
    const totalDue = customers.reduce((sum, c) => sum + c.totalDue, 0);
    const lowStockProducts = products.filter(p => p.stock <= 5).length;

    return {
      todaySales,
      todayProfit,
      totalDue,
      lowStockProducts,
      totalProducts: products.length
    };
  };

  return (
    <StoreContext.Provider value={{
      storeInfo,
      products,
      sales,
      customers,
      isOnboarded,
      setStoreInfo,
      addProduct,
      updateProduct,
      deleteProduct,
      addSale,
      addCustomer,
      updateCustomerDue,
      completeOnboarding,
      getDashboardStats
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
