export interface Product {
  id: string;
  name: string;
  price: number;
  profit: number;
  stock: number;
  createdAt: Date;
}

export interface Sale {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  totalPrice: number;
  profit: number;
  customerId?: string;
  customerName?: string;
  isPaid: boolean;
  createdAt: Date;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  totalDue: number;
  createdAt: Date;
}

export interface StoreInfo {
  name: string;
  trialStartDate: Date;
  trialDaysLeft: number;
  isOnboarded: boolean;
}

export interface DashboardStats {
  todaySales: number;
  todayProfit: number;
  totalDue: number;
  lowStockProducts: number;
  totalProducts: number;
}
