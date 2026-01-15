// Unified unit type for all products
export type UnitType = 'piece' | 'kg' | 'gram' | 'hali' | 'dozen' | 'box';

export interface Product {
  id: string;
  name: string;
  unitType: UnitType;
  price: number; // Price per unit
  profit: number; // Profit per unit
  stock: number;
  createdAt: Date;
  // For box type - contains how many pieces
  unitsPerBox?: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
  totalPrice: number;
  totalProfit: number;
}

export interface Sale {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitType: UnitType;
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
  displayName: string; // Unique display name (e.g., Rahim, Rahim1, Rahim2)
  phone?: string;
  totalDue: number;
  // Track profit pending from unpaid sales for proportional calculation
  pendingProfit: number;
  createdAt: Date;
  // Track last payment date for unpaid notification
  lastPaymentDate?: Date;
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
  totalBakiProfit: number; // Pending profit from baki sales
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

// Helper to get unit label in Bengali
export const getUnitLabel = (unitType: UnitType): string => {
  const labels: Record<UnitType, string> = {
    piece: 'পিস',
    kg: 'কেজি',
    gram: 'গ্রাম',
    hali: 'হালি',
    dozen: 'ডজন',
    box: 'বক্স'
  };
  return labels[unitType];
};
