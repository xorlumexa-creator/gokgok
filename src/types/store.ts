// Unified unit type for all products
export type UnitType = 'piece' | 'kg' | 'gram' | 'hali' | 'dozen' | 'box';

// Product unit pricing - allows multiple units per product
export interface ProductUnit {
  id: string;
  name: string; // e.g., "১ পিস", "১ ডজন", "৩০ পিস"
  price: number;
  // Internal conversion value (hidden from user) - how many base units
  conversionValue: number;
}

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
  // Multi-unit pricing
  units?: ProductUnit[];
}

export interface CartItem {
  product: Product;
  quantity: number;
  totalPrice: number;
  totalProfit: number;
  selectedUnit?: ProductUnit; // Which unit was used for sale
}

export interface Sale {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitType: UnitType;
  unitName?: string; // Which unit was sold (e.g., "১ ডজন")
  totalPrice: number;
  profit: number;
  customerId?: string;
  customerName?: string;
  isPaid: boolean;
  createdAt: Date;
}

// Pre-Order / আগাম অর্ডার types
export type PreOrderStatus = 'pending' | 'delivered' | 'cancelled';

export interface PreOrderItem {
  productId: string;
  productName: string;
  unitType: UnitType;
  unitName?: string;
  quantity: number;
  price: number;
}

export interface PreOrder {
  id: string;
  customerName: string;
  customerPhone?: string;
  deliveryDate: Date;
  items: PreOrderItem[];
  status: PreOrderStatus;
  totalPrice: number;
  createdAt: Date;
  stockReserved: boolean; // Track if stock was deducted
}

export interface Customer {
  id: string;
  name: string;
  displayName: string; // Unique display name (e.g., Rahim, Rahim1, Rahim2)
  phone?: string;
  whatsappNumber?: string; // Explicitly for WhatsApp
  totalDue: number;
  // Track profit pending from unpaid sales for proportional calculation
  pendingProfit: number;
  createdAt: Date;
  // Track last payment date for unpaid notification
  lastPaymentDate?: Date;
  // Track when first baki was created for 30-day reminder
  bakiCreatedAt?: Date;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  createdAt: Date;
}

// Custom earning entry (for adding custom income)
export interface CustomEarning {
  id: string;
  description: string;
  amount: number;
  category: string;
  createdAt: Date;
}

// Baki payment record - tracks profit from baki payments
export interface BakiPaymentRecord {
  id: string;
  customerId: string;
  customerName: string;
  paymentAmount: number;
  profitEarned: number; // Proportional profit earned from this payment
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
  totalBakiProfit: number; // Profit earned from baki payments
  totalCustomEarnings: number; // Custom added earnings
  totalEarnings: number; // Sum of all earnings
  totalExpenses: number;
  netEarning: number;
  todayCashProfit: number;
  weekCashProfit: number;
  monthCashProfit: number;
  todayBakiProfit: number;
  weekBakiProfit: number;
  monthBakiProfit: number;
}

// Bulk sale record for dashboard display
export interface BulkSaleRecord {
  id: string;
  serialNumber: number; // Daily serial number
  productNames: string[];
  totalPrice: number;
  totalProfit: number;
  createdAt: Date;
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

// Helper to get pre-order status label in Bengali
export const getPreOrderStatusLabel = (status: PreOrderStatus): string => {
  const labels: Record<PreOrderStatus, string> = {
    pending: 'অপেক্ষমান',
    delivered: 'সরবরাহ সম্পন্ন',
    cancelled: 'বাতিল'
  };
  return labels[status];
};

// Helper to get status color
export const getPreOrderStatusColor = (status: PreOrderStatus): string => {
  const colors: Record<PreOrderStatus, string> = {
    pending: 'bg-amber-100 text-amber-700',
    delivered: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700'
  };
  return colors[status];
};
