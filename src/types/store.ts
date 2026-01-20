// Unified unit type for all products
export type UnitType = 'piece' | 'kg' | 'gram' | 'hali' | 'dozen' | 'box' | 'tray' | 'packet' | 'litre';

// Selling unit - defines how products can be sold in different quantities
export interface SellingUnit {
  id: string;
  name: string; // e.g., "পিস", "ডজন", "৩০ পিস"
  conversionToBase: number; // How many base units this represents
  price: number; // Selling price for this unit
  profit: number; // Profit for this unit (auto-calculated from base)
}

// Product unit pricing - allows multiple units per product (legacy support)
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
  category?: string; // Product category
  code?: string; // Product code (optional)
  baseUnit: string; // Base unit name e.g., "পিস", "গ্রাম"
  unitType: UnitType; // For backward compatibility
  price: number; // Base unit price
  profit: number; // Profit per base unit
  stock: number; // Stock in base units
  createdAt: Date;
  // Multi-unit selling options
  sellingUnits?: SellingUnit[];
  // Legacy fields for backward compatibility
  unitsPerBox?: number;
  units?: ProductUnit[];
}

export interface CartItem {
  product: Product;
  quantity: number; // Quantity in the selected unit
  quantityInBaseUnit: number; // Converted quantity in base units
  totalPrice: number;
  totalProfit: number;
  selectedUnit?: SellingUnit; // Which unit was used for sale
}

export interface Sale {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  quantityInBaseUnit?: number; // Actual base units sold
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
  quantityInBaseUnit?: number;
  price: number;
  profit?: number;
}

export interface PreOrder {
  id: string;
  customerName: string;
  customerPhone?: string; // With country code
  countryCode?: string;
  deliveryDate: Date;
  items: PreOrderItem[];
  status: PreOrderStatus;
  totalPrice: number;
  totalProfit?: number;
  createdAt: Date;
  stockReserved: boolean; // Track if stock was deducted
}

export interface Customer {
  id: string;
  name: string;
  displayName: string; // Unique display name (e.g., Rahim, Rahim1, Rahim2)
  phone?: string; // With country code
  countryCode?: string;
  whatsappNumber?: string; // Explicitly for WhatsApp (with country code)
  totalDue: number;
  // Track profit pending from unpaid sales for proportional calculation
  pendingProfit: number;
  createdAt: Date;
  // Track last payment date for unpaid notification
  lastPaymentDate?: Date;
  // Track when first baki was created for 30-day reminder
  bakiCreatedAt?: Date;
}

// Supplier types
export interface Supplier {
  id: string;
  name: string;
  phone: string; // With country code (required)
  countryCode: string;
  productIds: string[]; // List of product IDs supplied by this supplier
  createdAt: Date;
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
  location?: string;
  phone?: string;
  countryCode?: string;
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

// Product categories
export const PRODUCT_CATEGORIES = [
  { value: 'grocery', label: 'মুদি' },
  { value: 'dairy', label: 'দুগ্ধ জাত' },
  { value: 'meat', label: 'মাংস' },
  { value: 'fish', label: 'মাছ' },
  { value: 'vegetables', label: 'শাকসবজি' },
  { value: 'fruits', label: 'ফল' },
  { value: 'snacks', label: 'স্ন্যাকস' },
  { value: 'beverages', label: 'পানীয়' },
  { value: 'cosmetics', label: 'প্রসাধনী' },
  { value: 'electronics', label: 'ইলেকট্রনিক্স' },
  { value: 'clothing', label: 'পোশাক' },
  { value: 'stationary', label: 'স্টেশনারি' },
  { value: 'medicine', label: 'ওষুধ' },
  { value: 'other', label: 'অন্যান্য' },
];

// Base units
export const BASE_UNITS = [
  { value: 'piece', label: 'পিস' },
  { value: 'gram', label: 'গ্রাম' },
  { value: 'kg', label: 'কেজি' },
  { value: 'litre', label: 'লিটার' },
  { value: 'dozen', label: 'ডজন' },
  { value: 'box', label: 'বক্স' },
  { value: 'packet', label: 'প্যাকেট' },
];

// Preset selling units with conversion factors
export const PRESET_SELLING_UNITS = [
  { name: 'পিস', conversionToBase: 1 },
  { name: 'ডজন', conversionToBase: 12 },
  { name: 'হালি', conversionToBase: 4 },
  { name: '৩০ পিস', conversionToBase: 30 },
  { name: 'বক্স', conversionToBase: 1 }, // User will set this
  { name: 'ট্রে', conversionToBase: 30 },
  { name: 'কেজি', conversionToBase: 1000 }, // 1000 grams
  { name: '৫০০ গ্রাম', conversionToBase: 500 },
  { name: '২৫০ গ্রাম', conversionToBase: 250 },
  { name: 'লিটার', conversionToBase: 1000 }, // 1000 ml
];

// Helper to get unit label in Bengali
export const getUnitLabel = (unitType: UnitType): string => {
  const labels: Record<UnitType, string> = {
    piece: 'পিস',
    kg: 'কেজি',
    gram: 'গ্রাম',
    hali: 'হালি',
    dozen: 'ডজন',
    box: 'বক্স',
    tray: 'ট্রে',
    packet: 'প্যাকেট',
    litre: 'লিটার'
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

// Validate phone number with country code
export const validatePhoneWithCountryCode = (phone: string): { valid: boolean; message: string } => {
  if (!phone) {
    return { valid: false, message: 'ফোন নম্বর দিন' };
  }
  
  // Check if starts with + and has at least 10 digits
  if (!phone.startsWith('+')) {
    return { valid: false, message: 'Country code দিয়ে শুরু করুন। যেমন: +8801XXXXXXXXX' };
  }
  
  const digitsOnly = phone.replace(/\D/g, '');
  if (digitsOnly.length < 10) {
    return { valid: false, message: 'সঠিক ফোন নম্বর দিন' };
  }
  
  return { valid: true, message: '' };
};
