import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Search, Plus, Minus, CheckCircle, User, X, Calculator, Phone, BookOpen, HelpCircle, AlertTriangle, Info, ChevronDown, Tag, Percent } from 'lucide-react';
import { PhoneInputWithCode } from '@/components/common/PhoneInputWithCode';
import { useStore } from '@/context/StoreContext';
import { useSubscription } from '@/context/SubscriptionContext';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { CartItem, Product, SellingUnit, getUnitLabel } from '@/types/store';

// Selling unit options by stock type
const SELL_UNIT_OPTIONS: Record<string, { label: string; toBase: number }[]> = {
  weight: [
    { label: 'গ্রাম', toBase: 1 },
    { label: 'কেজি', toBase: 1000 },
  ],
  number: [
    { label: 'পিস', toBase: 1 },
    { label: 'ডজন', toBase: 12 },
    { label: 'হালি', toBase: 4 },
  ],
  liquid: [
    { label: 'মিলি', toBase: 1 },
    { label: 'লিটার', toBase: 1000 },
  ],
};

const getStockType = (unitType: string): string => {
  if (['kg', 'gram'].includes(unitType)) return 'weight';
  if (['litre'].includes(unitType)) return 'liquid';
  return 'number';
};

const formatStock = (stock: number, unitType: string, baseUnit?: string) => {
  if (unitType === 'gram' || unitType === 'kg') {
    if (stock >= 1000) return `${(stock / 1000).toFixed(1)} কেজি`;
    return `${stock} গ্রাম`;
  }
  if (unitType === 'litre') {
    if (stock >= 1000) return `${(stock / 1000).toFixed(1)} লিটার`;
    return `${stock} মিলি`;
  }
  return `${stock} ${baseUnit || 'পিস'}`;
};

interface FlexCartItem {
  product: Product;
  basePrice: SellingUnit;
  sellUnitLabel: string;
  sellUnitToBase: number;
  sellAmount: number;
  quantityInBaseUnit: number;
  totalPrice: number;
  totalProfit: number;
  customPrice: string; // Custom price override (empty = use calculated)
  discount: string; // Discount amount (empty = no discount)
}

export default function Sell() {
  const navigate = useNavigate();
  const { 
    products, 
    customers, 
    addMultipleSales, 
    addCustomer, 
    updateCustomerDue,
    searchCustomersByName, 
    searchCustomersByPhone,
    getExistingCustomersByName,
  } = useStore();
  const { guardAddCustomer, guardRecordSale, incrementSalesCredit, hasFeature: subHasFeature } = useSubscription();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<FlexCartItem[]>([]);
  const [isPaid, setIsPaid] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [showCustomerInput, setShowCustomerInput] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [customerPaid, setCustomerPaid] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  
  const [customerSearchType, setCustomerSearchType] = useState<'name' | 'phone'>('name');
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');

  const [showBakiOption, setShowBakiOption] = useState(false);
  const [bakiCustomerSearchType, setBakiCustomerSearchType] = useState<'name' | 'phone'>('name');
  const [bakiCustomerSearchTerm, setBakiCustomerSearchTerm] = useState('');
  const [bakiSelectedCustomer, setBakiSelectedCustomer] = useState<string | null>(null);
  const [bakiNewCustomerName, setBakiNewCustomerName] = useState('');
  const [bakiNewCustomerPhone, setBakiNewCustomerPhone] = useState('');
  const [showBakiNewCustomer, setShowBakiNewCustomer] = useState(false);

  const [selectingFor, setSelectingFor] = useState<Product | null>(null);

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCustomers = useMemo(() => {
    if (!customerSearchTerm.trim()) return customers;
    if (customerSearchType === 'phone') {
      return searchCustomersByPhone(customerSearchTerm);
    }
    return searchCustomersByName(customerSearchTerm);
  }, [customerSearchTerm, customerSearchType, customers, searchCustomersByName, searchCustomersByPhone]);

  const bakiFilteredCustomers = useMemo(() => {
    if (!bakiCustomerSearchTerm.trim()) return customers;
    if (bakiCustomerSearchType === 'phone') {
      return searchCustomersByPhone(bakiCustomerSearchTerm);
    }
    return searchCustomersByName(bakiCustomerSearchTerm);
  }, [bakiCustomerSearchTerm, bakiCustomerSearchType, customers, searchCustomersByName, searchCustomersByPhone]);

  const existingCustomersWithSameName = useMemo(() => {
    return getExistingCustomersByName(newCustomerName);
  }, [newCustomerName, getExistingCustomersByName]);

  const existingBakiCustomersWithSameName = useMemo(() => {
    return getExistingCustomersByName(bakiNewCustomerName);
  }, [bakiNewCustomerName, getExistingCustomersByName]);

  // Get final price for a cart item (considering custom price and discount)
  const getFinalPrice = (item: FlexCartItem) => {
    const baseTotal = item.totalPrice;
    const customP = parseFloat(item.customPrice);
    const discountAmt = parseFloat(item.discount) || 0;
    
    if (!isNaN(customP) && customP > 0) {
      return Math.max(0, customP - discountAmt);
    }
    return Math.max(0, baseTotal - discountAmt);
  };

  // Get final profit for a cart item
  const getFinalProfit = (item: FlexCartItem) => {
    const finalPrice = getFinalPrice(item);
    const costPrice = item.totalPrice - item.totalProfit; // original cost
    return finalPrice - costPrice;
  };

  const totalPrice = cart.reduce((sum, item) => sum + getFinalPrice(item), 0);
  const totalProfit = cart.reduce((sum, item) => sum + getFinalProfit(item), 0);
  const change = parseFloat(customerPaid) - totalPrice;
  const bakiAmount = Math.abs(change);

  const getSellingUnits = (product: Product): SellingUnit[] => {
    if (product.sellingUnits && product.sellingUnits.length > 0) {
      return product.sellingUnits;
    }
    return [{
      id: 'default',
      name: product.baseUnit || getUnitLabel(product.unitType),
      conversionToBase: 1,
      price: product.price,
      profit: product.profit
    }];
  };

  const getSellUnitOptions = (product: Product) => {
    const stockType = getStockType(product.unitType);
    const options = SELL_UNIT_OPTIONS[stockType] || SELL_UNIT_OPTIONS.number;
    
    const customUnits: { label: string; toBase: number }[] = [];
    if (product.sellingUnits) {
      for (const su of product.sellingUnits) {
        const exists = options.some(o => o.toBase === su.conversionToBase);
        if (!exists && su.conversionToBase > 0) {
          customUnits.push({ label: su.name, toBase: su.conversionToBase });
        }
      }
    }
    return [...options, ...customUnits];
  };

  const calcPrice = (basePrice: SellingUnit, sellAmount: number, sellUnitToBase: number) => {
    const baseUnitsNeeded = sellAmount * sellUnitToBase;
    const pricePerBase = basePrice.price / basePrice.conversionToBase;
    const costPerBase = (basePrice.price - basePrice.profit) / basePrice.conversionToBase;
    const total = pricePerBase * baseUnitsNeeded;
    const totalCost = costPerBase * baseUnitsNeeded;
    return {
      totalPrice: Math.round(total * 100) / 100,
      totalProfit: Math.round((total - totalCost) * 100) / 100,
      quantityInBaseUnit: baseUnitsNeeded,
    };
  };

  const addToCart = (product: Product, basePrice?: SellingUnit) => {
    const units = getSellingUnits(product);
    
    if (units.length > 1 && !basePrice) {
      setSelectingFor(product);
      return;
    }

    const selectedBase = basePrice || units[0];
    const stockType = getStockType(product.unitType);
    const defaultSellUnit = SELL_UNIT_OPTIONS[stockType]?.[0] || { label: 'পিস', toBase: 1 };
    
    const defaultAmount = selectedBase.conversionToBase / (defaultSellUnit.toBase || 1);
    const { totalPrice: tp, totalProfit: tpr, quantityInBaseUnit } = calcPrice(selectedBase, defaultAmount, defaultSellUnit.toBase);

    const newItem: FlexCartItem = {
      product,
      basePrice: selectedBase,
      sellUnitLabel: defaultSellUnit.label,
      sellUnitToBase: defaultSellUnit.toBase,
      sellAmount: defaultAmount,
      quantityInBaseUnit,
      totalPrice: tp,
      totalProfit: tpr,
      customPrice: '',
      discount: '',
    };
    setCart([...cart, newItem]);
    setSelectingFor(null);
    toast({ title: `${product.name} যোগ হয়েছে 🛒` });
  };

  const updateCartItem = (index: number, sellAmount: number, sellUnitLabel?: string, sellUnitToBase?: number) => {
    setCart(prev => prev.map((item, i) => {
      if (i !== index) return item;
      const newUnitToBase = sellUnitToBase ?? item.sellUnitToBase;
      const newLabel = sellUnitLabel ?? item.sellUnitLabel;
      const newAmount = Number.isFinite(sellAmount) ? Math.max(0, sellAmount) : 0;

      if (newAmount === 0) {
        return {
          ...item,
          sellUnitLabel: newLabel,
          sellUnitToBase: newUnitToBase,
          sellAmount: 0,
          quantityInBaseUnit: 0,
          totalPrice: 0,
          totalProfit: 0,
        };
      }

      const { totalPrice: tp, totalProfit: tpr, quantityInBaseUnit } = calcPrice(item.basePrice, newAmount, newUnitToBase);

      return {
        ...item,
        sellUnitLabel: newLabel,
        sellUnitToBase: newUnitToBase,
        sellAmount: newAmount,
        quantityInBaseUnit,
        totalPrice: tp,
        totalProfit: tpr,
      };
    }));
  };

  const updateCartItemField = (index: number, field: 'customPrice' | 'discount', value: string) => {
    setCart(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const removeFromCart = (index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  const clearCart = () => {
    setCart([]);
    setIsPaid(true);
    setSelectedCustomer(null);
    setNewCustomerName('');
    setNewCustomerPhone('');
    setShowCustomerInput(false);
    setCustomerSearchTerm('');
    setShowCalculator(false);
    setCustomerPaid('');
    setShowBakiOption(false);
    setBakiSelectedCustomer(null);
    setBakiNewCustomerName('');
    setBakiNewCustomerPhone('');
    setShowBakiNewCustomer(false);
    setBakiCustomerSearchTerm('');
    setShowConfirmation(false);
  };

  const handleSaveToBaki = () => {
    let customerId = bakiSelectedCustomer;
    let customerDisplayName = '';

    if (bakiNewCustomerName.trim()) {
      if (!guardAddCustomer()) return;
      const newCustomer = addCustomer({
        name: bakiNewCustomerName.trim(),
        phone: bakiNewCustomerPhone.trim(),
        totalDue: 0,
      });
      customerId = newCustomer.id;
      customerDisplayName = newCustomer.displayName;
    } else if (bakiSelectedCustomer) {

      const customer = customers.find(c => c.id === bakiSelectedCustomer);
      customerDisplayName = customer?.displayName || '';
    }

    if (!customerId) {
      toast({ title: "গ্রাহক নির্বাচন করুন", variant: "destructive" });
      return;
    }

    const proportionalProfit = totalProfit > 0 ? (totalProfit / totalPrice) * bakiAmount : 0;
    updateCustomerDue(customerId, bakiAmount, proportionalProfit);

    toast({ 
      title: `৳${bakiAmount} বাকি সংরক্ষিত হয়েছে ✓`,
      description: `${customerDisplayName}-এর হিসাবে যোগ হয়েছে`
    });

    completeSale(true, parseFloat(customerPaid));
  };

  const completeSale = (partialPaid: boolean = false, paidAmount?: number) => {
    if (cart.length === 0) {
      toast({ title: "কার্ট খালি আছে", variant: "destructive" });
      return;
    }
    if (!guardRecordSale(1)) return;

    let customerId = selectedCustomer;
    let customerName = '';

    if (!isPaid) {
      if (newCustomerName.trim()) {
        if (!guardAddCustomer()) return;
        const newCustomer = addCustomer({
          name: newCustomerName.trim(),
          phone: newCustomerPhone.trim(),
          totalDue: 0,
        });
        customerId = newCustomer.id;
        customerName = newCustomer.displayName;
      } else if (selectedCustomer) {
        const customer = customers.find(c => c.id === selectedCustomer);
        customerId = customer?.id;
        customerName = customer?.displayName || '';
      } else {
        toast({ title: "বাকি বিক্রির জন্য গ্রাহক নির্বাচন করুন", variant: "destructive" });
        return;
      }
    }

    const salesData = cart.map(item => ({
      productId: item.product.id,
      productName: item.product.name,
      quantity: item.quantityInBaseUnit,
      quantityInBaseUnit: item.quantityInBaseUnit,
      unitType: item.product.unitType,
      unitName: `${item.sellAmount} ${item.sellUnitLabel}`,
      totalPrice: getFinalPrice(item),
      profit: Math.max(0, getFinalProfit(item)),
      isPaid: isPaid || partialPaid
    }));

    addMultipleSales(salesData, customerId || undefined, customerName || undefined, isPaid || partialPaid);
    incrementSalesCredit(1);



    // Build invoice data for navigation
    const invoiceItems = cart.map(item => ({
      productName: item.product.name,
      quantity: item.sellAmount,
      unitName: item.sellUnitLabel,
      pricePerUnit: Math.round(item.basePrice.price / item.basePrice.conversionToBase * item.sellUnitToBase),
      totalPrice: getFinalPrice(item),
    }));

    const invoiceData = {
      invoiceNo: `INV-${Date.now().toString(36).toUpperCase()}`,
      date: new Date(),
      customerName: customerName || '',
      customerPhone: newCustomerPhone || bakiNewCustomerPhone || '',
      items: invoiceItems,
      subtotal: totalPrice,
      discount: 0,
      total: totalPrice,
      paymentMethod: isPaid ? 'cash' as const : 'due' as const,
      dueAmount: !isPaid ? totalPrice : 0,
      shopName: '',
      shopAddress: '',
    };

    toast({
      title: "বিক্রি সম্পন্ন! ✅",
      description: `মোট: ৳${totalPrice} | লাভ: ৳${Math.max(0, totalProfit).toFixed(2)}`,
    });

    const navData = { invoiceData };
    clearCart();
    // Invoice/Receipt is a Pro feature. If locked, skip the invoice screen and just return to dashboard.
    if (subHasFeature('invoice')) {
      navigate('/invoice', { state: navData });
    } else {
      navigate('/dashboard');
    }

  };

  const handleSale = () => {
    const hasZero = cart.some(item => !item.sellAmount || item.sellAmount <= 0);
    if (hasZero) {
      toast({ title: "⚠️ পরিমাণ দিন", description: "প্রতিটি পণ্যের পরিমাণ অবশ্যই দিতে হবে।", variant: "destructive" });
      return;
    }
    setShowConfirmation(true);
  };

  const confirmSale = () => {
    setShowConfirmation(false);
    completeSale();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header with Help */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-xl">
            <ShoppingCart className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">বিক্রি করুন</h1>
            <p className="text-muted-foreground">পণ্য নির্বাচন করে বিক্রি করুন</p>
          </div>
        </div>
        <button
          onClick={() => setShowHelp(!showHelp)}
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl"
        >
          <HelpCircle className="w-6 h-6" />
        </button>
      </div>

      {showHelp && (
        <div className="p-4 bg-primary/10 rounded-xl text-sm animate-fade-in">
          <p className="font-semibold mb-2">📌 কিভাবে কাজ করে:</p>
          <ul className="space-y-1 text-muted-foreground">
            <li>• পণ্য ট্যাপ করুন → বেজ প্রাইস নির্বাচন করুন</li>
            <li>• ইউনিট ও পরিমাণ দিন → অটো হিসাব হবে</li>
            <li>• কাস্টম দাম দিতে চাইলে "কাস্টম দাম" ফিল্ডে লিখুন</li>
            <li>• ডিসকাউন্ট দিতে চাইলে "ছাড়" ফিল্ডে টাকা লিখুন</li>
          </ul>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="পণ্য খুঁজুন..."
          className="input-field pl-10"
        />
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {filteredProducts.map((p) => {
          const inCart = cart.filter(item => item.product.id === p.id);
          const units = getSellingUnits(p);
          
          return (
            <button
              key={p.id}
              onClick={() => addToCart(p)}
              className={`p-4 rounded-xl border-2 transition-all duration-200 text-left relative ${
                inCart.length > 0
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50 bg-card'
              }`}
            >
              {inCart.length > 0 && (
                <span className="absolute -top-2 -right-2 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                  {inCart.length}
                </span>
              )}
              <p className="font-semibold text-foreground truncate">{p.name}</p>
              <div className="flex items-center gap-1 flex-wrap">
                {units.length > 1 ? (
                  <span className="text-xs text-muted-foreground">
                    {units.length} দাম সেট
                  </span>
                ) : (
                  <>
                    <p className="text-lg font-bold text-primary">৳{units[0].price}</p>
                    <span className="text-xs text-muted-foreground">/{units[0].name}</span>
                  </>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {formatStock(p.stock, p.unitType, p.baseUnit)} স্টকে
              </p>
            </button>
          );
        })}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>কোন পণ্য পাওয়া যায়নি</p>
        </div>
      )}

      {/* Base Price Selection Modal */}
      {selectingFor && (
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-card rounded-2xl shadow-soft border border-border p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-foreground">{selectingFor.name}</h3>
              <button onClick={() => setSelectingFor(null)} className="p-1 hover:bg-muted rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              স্টকে: {formatStock(selectingFor.stock, selectingFor.unitType, selectingFor.baseUnit)}
            </p>
            <p className="text-sm font-medium text-foreground mb-3">কোন দাম দিয়ে বিক্রি করবেন?</p>
            <p className="text-xs text-muted-foreground mb-4">
              💡 বেজ প্রাইস বাছাই করুন, তারপর যেকোনো পরিমাণে বিক্রি করতে পারবেন
            </p>
            <div className="space-y-2">
              {getSellingUnits(selectingFor).map(unit => (
                <button
                  key={unit.id}
                  onClick={() => addToCart(selectingFor, unit)}
                  className="w-full p-4 rounded-xl border-2 border-border hover:border-primary bg-muted/30 hover:bg-primary/5 transition-all flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium">{unit.name}</p>
                    <p className="text-xs text-muted-foreground">
                      = {unit.conversionToBase} {selectingFor.baseUnit || getUnitLabel(selectingFor.unitType)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary">৳{unit.price}</p>
                    <p className="text-xs text-profit">লাভ: ৳{unit.profit.toFixed(2)}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Sale Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-card rounded-2xl shadow-soft border border-border p-6 animate-slide-up max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-foreground">বিক্রি সারাংশ</h3>
              <button onClick={() => setShowConfirmation(false)} className="p-1 hover:bg-muted rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 mb-4">
              {cart.map((item, idx) => {
                const product = products.find(p => p.id === item.product.id);
                const remainingStock = product ? product.stock - item.quantityInBaseUnit : 0;
                const finalP = getFinalPrice(item);
                const finalPr = getFinalProfit(item);
                const hasCustom = item.customPrice && parseFloat(item.customPrice) > 0;
                const hasDiscount = item.discount && parseFloat(item.discount) > 0;
                return (
                  <div key={idx} className="p-3 bg-muted/50 rounded-xl">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-foreground">{item.product.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.sellAmount} {item.sellUnitLabel} (বেজ: {item.basePrice.name})
                        </p>
                        <p className="text-xs text-muted-foreground">
                          = {item.quantityInBaseUnit.toFixed(1)} {item.product.baseUnit || getUnitLabel(item.product.unitType)} কমবে
                        </p>
                        {hasCustom && (
                          <p className="text-xs text-primary">কাস্টম দাম: ৳{item.customPrice}</p>
                        )}
                        {hasDiscount && (
                          <p className="text-xs text-amber-600">ছাড়: ৳{item.discount}</p>
                        )}
                      </div>
                      <p className="font-bold text-foreground">৳{finalP.toFixed(2)}</p>
                    </div>
                    <div className="flex justify-between mt-2 text-xs">
                      <span className="text-profit">লাভ: ৳{finalPr.toFixed(2)}</span>
                      <span className={`${remainingStock < 0 ? 'text-due' : 'text-muted-foreground'}`}>
                        অবশিষ্ট: {formatStock(Math.max(0, remainingStock), item.product.unitType, item.product.baseUnit)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-border pt-4 space-y-2 mb-4">
              <div className="flex justify-between text-lg">
                <span className="font-medium">মোট বিক্রয়:</span>
                <span className="font-bold text-foreground">৳{totalPrice.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">মোট লাভ:</span>
                <span className="font-semibold text-profit">+৳{totalProfit.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">পেমেন্ট:</span>
                <span className={isPaid ? 'text-profit' : 'text-due'}>{isPaid ? 'নগদ' : 'বাকি'}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowConfirmation(false)} className="flex-1 py-5 rounded-xl">
                ফিরে যান
              </Button>
              <Button onClick={confirmSale} className="flex-1 btn-primary py-5 rounded-xl">
                <CheckCircle className="w-5 h-5 mr-2" />
                বিক্রি নিশ্চিত করুন
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Cart Section */}
      {cart.length > 0 && (
        <div className="card-elevated p-6 animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              কার্ট ({cart.length}টি আইটেম)
            </h3>
            <button onClick={clearCart} className="text-due hover:underline text-sm">
              সব মুছুন
            </button>
          </div>
          
          {/* Cart Items */}
          <div className="space-y-4 mb-4 max-h-[400px] overflow-y-auto">
            {cart.map((item, idx) => {
              const unitOptions = getSellUnitOptions(item.product);
              const finalP = getFinalPrice(item);
              const finalPr = getFinalProfit(item);
              return (
                <div key={idx} className="p-4 bg-muted/50 rounded-xl space-y-3">
                  {/* Product name and base price info */}
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-foreground">{item.product.name}</p>
                      <p className="text-xs text-muted-foreground">
                        বেজ: ৳{item.basePrice.price}/{item.basePrice.name}
                      </p>
                    </div>
                    <button
                      onClick={() => removeFromCart(idx)}
                      className="p-1.5 text-due hover:bg-due/10 rounded-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Amount + Unit row (পরিমাণ বামে, ইউনিট ডানে) */}
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <label className="text-xs text-muted-foreground mb-1 block">পরিমাণ</label>
                      <input
                        type="number"
                        value={item.sellAmount === 0 ? '' : item.sellAmount}
                        onChange={(e) => {
                          if (e.target.value === '') {
                            updateCartItem(idx, 0);
                            return;
                          }

                          const val = Number(e.target.value);
                          if (Number.isNaN(val)) return;
                          updateCartItem(idx, val);
                        }}
                        placeholder="পরিমাণ"
                        className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        min="0"
                        step="any"
                      />
                    </div>

                    <div className="flex-1">
                      <label className="text-xs text-muted-foreground mb-1 block">ইউনিট</label>
                      <div className="relative">
                        <select
                          value={`${item.sellUnitLabel}|${item.sellUnitToBase}`}
                          onChange={(e) => {
                            const [label, toBase] = e.target.value.split('|');
                            updateCartItem(idx, item.sellAmount, label, parseFloat(toBase));
                          }}
                          className="w-full h-10 rounded-xl border border-border bg-background px-3 pr-8 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                          {unitOptions.map((opt) => (
                            <option key={`${opt.label}-${opt.toBase}`} value={`${opt.label}|${opt.toBase}`}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  {/* Custom Price + Discount row (compact) */}
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <label className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                        <Tag className="w-3 h-3" /> কাস্টম দাম
                      </label>
                      <input
                        type="number"
                        value={item.customPrice}
                        onChange={(e) => updateCartItemField(idx, 'customPrice', e.target.value)}
                        placeholder={`৳${item.totalPrice.toFixed(0)}`}
                        className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        min="0"
                        step="any"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                        <Percent className="w-3 h-3" /> ছাড় (৳)
                      </label>
                      <input
                        type="number"
                        value={item.discount}
                        onChange={(e) => updateCartItemField(idx, 'discount', e.target.value)}
                        placeholder="০"
                        className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        min="0"
                        step="any"
                      />
                    </div>
                  </div>

                  {/* Auto-calculated summary */}
                  {item.sellAmount > 0 && (
                    <div className="flex items-center justify-between text-sm pt-1 border-t border-border/50">
                      <div className="space-y-0.5">
                        <p className="text-muted-foreground flex items-center gap-1">
                          <Info className="w-3 h-3" />
                          {item.quantityInBaseUnit.toFixed(1)} {item.product.baseUnit || getUnitLabel(item.product.unitType)} কমবে
                        </p>
                        <p className="text-xs text-profit">লাভ: ৳{finalPr.toFixed(2)}</p>
                      </div>
                      <p className="text-lg font-bold text-foreground">৳{finalP.toFixed(2)}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Payment Type */}
          <div className="flex gap-3 mb-4">
            <button
              onClick={() => setIsPaid(true)}
              className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all ${
                isPaid ? 'border-primary bg-primary/5' : 'border-border'
              }`}
            >
              <CheckCircle className={`w-5 h-5 mx-auto mb-1 ${isPaid ? 'text-primary' : 'text-muted-foreground'}`} />
              <span className={isPaid ? 'text-primary font-medium' : 'text-muted-foreground'}>নগদ</span>
            </button>
            <button
              onClick={() => setIsPaid(false)}
              className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all ${
                !isPaid ? 'border-due bg-due/5' : 'border-border'
              }`}
            >
              <User className={`w-5 h-5 mx-auto mb-1 ${!isPaid ? 'text-due' : 'text-muted-foreground'}`} />
              <span className={!isPaid ? 'text-due font-medium' : 'text-muted-foreground'}>বাকি</span>
            </button>
          </div>

          {/* Customer Selection for Credit */}
          {!isPaid && (
            <div className="mb-4 animate-fade-in space-y-3">
              <p className="text-sm font-medium text-foreground">গ্রাহক নির্বাচন করুন</p>
              
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => { setCustomerSearchType('name'); setCustomerSearchTerm(''); }}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm transition-all ${
                    customerSearchType === 'name' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  <User className="w-4 h-4 inline mr-1" /> নাম দিয়ে
                </button>
                <button
                  onClick={() => { setCustomerSearchType('phone'); setCustomerSearchTerm(''); }}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm transition-all ${
                    customerSearchType === 'phone' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  <Phone className="w-4 h-4 inline mr-1" /> ফোন দিয়ে
                </button>
              </div>

              <input
                type={customerSearchType === 'phone' ? 'tel' : 'text'}
                value={customerSearchTerm}
                onChange={(e) => setCustomerSearchTerm(e.target.value)}
                placeholder={customerSearchType === 'phone' ? "ফোন নম্বর দিন..." : "গ্রাহকের নাম লিখুন..."}
                className="input-field"
              />
              
              {filteredCustomers.length > 0 && (
                <div className="max-h-40 overflow-y-auto border border-border rounded-xl bg-background">
                  {filteredCustomers.map(c => (
                    <button
                      key={c.id}
                      onClick={() => { setSelectedCustomer(c.id); setShowCustomerInput(false); setNewCustomerName(''); }}
                      className={`w-full text-left px-4 py-3 transition-colors flex items-center justify-between ${
                        selectedCustomer === c.id ? 'bg-primary/10' : 'hover:bg-muted'
                      }`}
                    >
                      <div>
                        <span className="font-medium">{c.displayName}</span>
                        {c.phone && <span className="text-xs text-muted-foreground ml-2">{c.phone}</span>}
                      </div>
                      {c.totalDue > 0 && <span className="text-sm text-due">বাকি: ৳{c.totalDue}</span>}
                    </button>
                  ))}
                </div>
              )}

              <button onClick={() => setShowCustomerInput(!showCustomerInput)} className="text-sm text-primary flex items-center gap-1">
                <Plus className="w-4 h-4" /> নতুন গ্রাহক যোগ করুন
              </button>

              {showCustomerInput && (
                <div className="space-y-3 p-4 bg-muted/30 rounded-xl animate-fade-in">
                  <input type="text" value={newCustomerName} onChange={(e) => setNewCustomerName(e.target.value)} placeholder="গ্রাহকের নাম" className="input-field" />
                  <PhoneInputWithCode value={newCustomerPhone} onChange={(phone) => setNewCustomerPhone(phone)} label="WhatsApp নম্বর (ঐচ্ছিক)" />
                  {existingCustomersWithSameName.length > 0 && (
                    <p className="text-xs text-amber-600">⚠️ এই নামে {existingCustomersWithSameName.length}জন গ্রাহক আছে</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Total & Actions */}
          <div className="border-t border-border pt-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-muted-foreground">মোট বিক্রয়:</span>
              <span className="text-2xl font-bold text-foreground">৳{totalPrice.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center mb-4">
              <span className="text-muted-foreground">মোট লাভ:</span>
              <span className="text-lg font-semibold text-profit">+৳{totalProfit.toFixed(2)}</span>
            </div>

            {/* Calculator for Cash Sales */}
            {isPaid && (
              <div className="mb-4">
                <button onClick={() => setShowCalculator(!showCalculator)} className="flex items-center gap-2 text-sm text-primary">
                  <Calculator className="w-4 h-4" />
                  ক্যালকুলেটর {showCalculator ? 'বন্ধ করুন' : 'খুলুন'}
                </button>

                {showCalculator && (
                  <div className="mt-3 p-4 bg-muted/50 rounded-xl space-y-3 animate-fade-in">
                    <div>
                      <label className="text-sm text-muted-foreground">গ্রাহক কত দিয়েছে?</label>
                      <input type="number" value={customerPaid} onChange={(e) => setCustomerPaid(e.target.value)} placeholder="টাকার পরিমাণ" className="input-field mt-1" min="0" />
                    </div>
                    
                    {customerPaid && parseFloat(customerPaid) > 0 && (
                      <div className="space-y-2">
                        {change >= 0 ? (
                          <div className="p-3 bg-profit/10 rounded-lg">
                            <p className="text-profit font-bold text-lg">ফেরত: ৳{change.toFixed(2)}</p>
                          </div>
                        ) : (
                          <div className="p-3 bg-due/10 rounded-lg">
                            <p className="text-due font-bold text-lg">বাকি: ৳{bakiAmount.toFixed(2)}</p>
                            <button onClick={() => setShowBakiOption(!showBakiOption)} className="text-sm text-primary mt-2 flex items-center gap-1">
                              <BookOpen className="w-4 h-4" /> বাকি সংরক্ষণ করুন
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Baki Customer Selection */}
                    {showBakiOption && change < 0 && (
                      <div className="border-t border-border pt-3 space-y-3 animate-fade-in">
                        <p className="text-sm font-medium">কার নামে বাকি রাখবেন?</p>
                        
                        <div className="flex gap-2">
                          <button onClick={() => setBakiCustomerSearchType('name')} className={`flex-1 py-2 px-3 rounded-lg text-sm ${bakiCustomerSearchType === 'name' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>নাম দিয়ে</button>
                          <button onClick={() => setBakiCustomerSearchType('phone')} className={`flex-1 py-2 px-3 rounded-lg text-sm ${bakiCustomerSearchType === 'phone' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>ফোন দিয়ে</button>
                        </div>

                        <input type={bakiCustomerSearchType === 'phone' ? 'tel' : 'text'} value={bakiCustomerSearchTerm} onChange={(e) => setBakiCustomerSearchTerm(e.target.value)} placeholder={bakiCustomerSearchType === 'phone' ? "ফোন নম্বর..." : "গ্রাহকের নাম..."} className="input-field" />

                        {bakiFilteredCustomers.length > 0 && (
                          <div className="max-h-32 overflow-y-auto border border-border rounded-xl">
                            {bakiFilteredCustomers.map(c => (
                              <button key={c.id} onClick={() => { setBakiSelectedCustomer(c.id); setShowBakiNewCustomer(false); setBakiNewCustomerName(''); }} className={`w-full text-left px-4 py-2 text-sm ${bakiSelectedCustomer === c.id ? 'bg-primary/10' : 'hover:bg-muted'}`}>
                                {c.displayName}
                              </button>
                            ))}
                          </div>
                        )}

                        <button onClick={() => setShowBakiNewCustomer(!showBakiNewCustomer)} className="text-sm text-primary">+ নতুন গ্রাহক</button>

                        {showBakiNewCustomer && (
                          <div className="space-y-2">
                            <input type="text" value={bakiNewCustomerName} onChange={(e) => setBakiNewCustomerName(e.target.value)} placeholder="নাম" className="input-field" />
                            <PhoneInputWithCode value={bakiNewCustomerPhone} onChange={(phone) => setBakiNewCustomerPhone(phone)} label="WhatsApp নম্বর" />
                          </div>
                        )}

                        <Button onClick={handleSaveToBaki} className="w-full bg-due hover:bg-due/90 text-white" disabled={!bakiSelectedCustomer && !bakiNewCustomerName.trim()}>
                          ৳{bakiAmount.toFixed(2)} বাকি সংরক্ষণ করুন
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <Button 
              onClick={handleSale} 
              className="w-full btn-primary py-6 text-lg rounded-xl"
              disabled={cart.length === 0 || cart.some(item => item.sellAmount <= 0)}
            >
              <CheckCircle className="w-5 h-5 mr-2" />
              বিক্রি সম্পন্ন করুন
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
