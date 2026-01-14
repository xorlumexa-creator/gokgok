export type ProductType = 'unit' | 'weight';
export type UnitSellMode = 'box' | 'single';
export type WeightUnit = 'kg' | 'gram';

export interface Product {
  id: string;
  name: string;
  price: number;
  profit: number;
  stock: number;
  createdAt: Date;
  // New fields for product types
  productType: ProductType;
  // For weight-based products
  weightUnit?: WeightUnit;
  pricePerUnit?: number; // Price per kg or gram
  profitPerUnit?: number;
  // For unit-based products with box option
  sellMode?: UnitSellMode;
  unitsPerBox?: number;
  boxPrice?: number;
  boxProfit?: number;
  unitPrice?: number; // Calculated: boxPrice / unitsPerBox
  unitProfit?: number; // Calculated: boxProfit / unitsPerBox
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
  // For tracking weight-based sales
  weightAmount?: number;
  weightUnit?: WeightUnit;
}

export interface Customer {
  id: string;
  name: string;
  displayName: string; // Unique display name (e.g., Rahim, Rahim1, Rahim2)
  phone?: string;
  totalDue: number;
  // Track profit pending from unpaid sales for proportional calculation
  pendingProfit: number;
  createdAt: Date;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
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
  todayCashSales: number;
  todayCashProfit: number;
  todayCreditSales: number;
  todayCreditProfit: number;
  totalDue: number;
  lowStockProducts: number;
  totalProducts: number;
}

export interface PersonalAccountStats {
  totalCashProfit: number; // Earning from cash sales
  totalExpenses: number;
  netEarning: number;
  todayCashProfit: number;
  weekCashProfit: number;
  monthCashProfit: number;
}
