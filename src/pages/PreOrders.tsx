import { useState, useMemo } from 'react';
import { CalendarCheck, Plus, Search, User, Phone, X, Package, Trash2, CheckCircle, XCircle, Clock, MessageCircle, AlertTriangle, ShoppingBag, ChevronDown, Info, Tag, Percent, BookOpen } from 'lucide-react';
import { useStore } from '@/context/StoreContext';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { PreOrder, PreOrderStatus, SellingUnit, getUnitLabel, getPreOrderStatusLabel, getPreOrderStatusColor } from '@/types/store';
import { format } from 'date-fns';
import { bn } from 'date-fns/locale';
import { PhoneInputWithCode } from '@/components/common/PhoneInputWithCode';

// Selling unit options by stock type (same as Sell page)
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

// Enhanced order item for both adding and selling
interface SellOrderItem {
  product: any;
  basePrice: SellingUnit;
  sellUnitLabel: string;
  sellUnitToBase: number;
  sellAmount: number;
  quantityInBaseUnit: number;
  totalPrice: number;
  totalProfit: number;
  customPrice: string;
  discount: string;
}

export default function PreOrders() {
  const { products, preOrders, customers, addPreOrder, updatePreOrderStatus, updateProduct, markPreOrderAsSold, addMultipleSales, addCustomer, updateCustomerDue, storeInfo, searchCustomersByName, searchCustomersByPhone, getExistingCustomersByName } = useStore();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [viewingOrder, setViewingOrder] = useState<PreOrder | null>(null);
  const [statusFilter, setStatusFilter] = useState<PreOrderStatus | 'all'>('all');
  
  // Bikri-like add form state
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [addCart, setAddCart] = useState<SellOrderItem[]>([]);
  const [addSelectingProduct, setAddSelectingProduct] = useState<any>(null);
  const [addProductSearch, setAddProductSearch] = useState('');

  // Selling modal state (Bikri-like interface)
  const [sellingOrder, setSellingOrder] = useState<PreOrder | null>(null);
  const [sellCart, setSellCart] = useState<SellOrderItem[]>([]);
  const [sellIsPaid, setSellIsPaid] = useState(true);
  const [sellSelectingProduct, setSellSelectingProduct] = useState<any>(null);
  const [sellCustomerType, setSellCustomerType] = useState<'name' | 'phone'>('name');
  const [sellCustomerSearch, setSellCustomerSearch] = useState('');
  const [sellSelectedCustomer, setSellSelectedCustomer] = useState<string | null>(null);
  const [sellNewCustomerName, setSellNewCustomerName] = useState('');
  const [sellNewCustomerPhone, setSellNewCustomerPhone] = useState('');
  const [showNewCustomer, setShowNewCustomer] = useState(false);

  // WhatsApp reminder message
  const [reminderMessage, setReminderMessage] = useState(`Assalamualaikum,
আপনার অর্ডার [ORDER_DATE] তারিখে [STORE_NAME]-এ রাখানো ছিল।
অনুগ্রহ করে আপনার অর্ডারটি সংগ্রহ করুন।

ধন্যবাদ।`);

  const overdueOrders = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return preOrders.filter(o => {
      const dd = new Date(o.deliveryDate);
      dd.setHours(0, 0, 0, 0);
      return o.status === 'pending' && dd < today;
    });
  }, [preOrders]);

  const filteredPreOrders = useMemo(() => {
    let result = preOrders;
    if (statusFilter !== 'all') result = result.filter(o => o.status === statusFilter);
    if (searchTerm.trim()) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(o => o.customerName.toLowerCase().includes(lower) || o.customerPhone?.includes(searchTerm));
    }
    return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [preOrders, statusFilter, searchTerm]);

  const addFilteredProducts = useMemo(() => {
    if (!addProductSearch.trim()) return products;
    return products.filter(p => p.name.toLowerCase().includes(addProductSearch.toLowerCase()));
  }, [products, addProductSearch]);

  const sellFilteredCustomers = useMemo(() => {
    if (!sellCustomerSearch.trim()) return customers;
    return sellCustomerType === 'phone' ? searchCustomersByPhone(sellCustomerSearch) : searchCustomersByName(sellCustomerSearch);
  }, [sellCustomerSearch, sellCustomerType, customers, searchCustomersByName, searchCustomersByPhone]);

  // --- Common helpers ---
  const getSellingUnits = (product: any): SellingUnit[] => {
    if (product.sellingUnits && product.sellingUnits.length > 0) return product.sellingUnits;
    return [{ id: 'default', name: product.baseUnit || getUnitLabel(product.unitType), conversionToBase: 1, price: product.price, profit: product.profit }];
  };

  const getSellUnitOptions = (product: any) => {
    const stockType = getStockType(product.unitType);
    const options = SELL_UNIT_OPTIONS[stockType] || SELL_UNIT_OPTIONS.number;
    const customUnits: { label: string; toBase: number }[] = [];
    if (product.sellingUnits) {
      for (const su of product.sellingUnits) {
        if (!options.some(o => o.toBase === su.conversionToBase) && su.conversionToBase > 0) {
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

  const getFinalPrice = (item: SellOrderItem) => {
    const customP = parseFloat(item.customPrice);
    const discountAmt = parseFloat(item.discount) || 0;
    if (!isNaN(customP) && customP > 0) return Math.max(0, customP - discountAmt);
    return Math.max(0, item.totalPrice - discountAmt);
  };

  const getFinalProfit = (item: SellOrderItem) => {
    const finalPrice = getFinalPrice(item);
    const costPrice = item.totalPrice - item.totalProfit;
    return finalPrice - costPrice;
  };

  // --- Add form helpers (Bikri-like) ---
  const addToAddCart = (product: any, basePrice?: SellingUnit) => {
    const units = getSellingUnits(product);
    if (units.length > 1 && !basePrice) {
      setAddSelectingProduct(product);
      return;
    }
    const selectedBase = basePrice || units[0];
    const stockType = getStockType(product.unitType);
    const defaultUnit = SELL_UNIT_OPTIONS[stockType]?.[0] || { label: 'পিস', toBase: 1 };
    const defaultAmount = selectedBase.conversionToBase / (defaultUnit.toBase || 1);
    const { totalPrice, totalProfit, quantityInBaseUnit } = calcPrice(selectedBase, defaultAmount, defaultUnit.toBase);
    setAddCart(prev => [...prev, {
      product, basePrice: selectedBase, sellUnitLabel: defaultUnit.label, sellUnitToBase: defaultUnit.toBase,
      sellAmount: defaultAmount, quantityInBaseUnit, totalPrice, totalProfit, customPrice: '', discount: '',
    }]);
    setAddSelectingProduct(null);
    setAddProductSearch('');
    toast({ title: `${product.name} যোগ হয়েছে` });
  };

  const updateAddCartItem = (index: number, sellAmount: number, sellUnitLabel?: string, sellUnitToBase?: number) => {
    setAddCart(prev => prev.map((item, i) => {
      if (i !== index) return item;
      const newUnitToBase = sellUnitToBase ?? item.sellUnitToBase;
      const newLabel = sellUnitLabel ?? item.sellUnitLabel;
      const newAmount = Number.isFinite(sellAmount) ? Math.max(0, sellAmount) : 0;
      if (newAmount === 0) {
        return { ...item, sellUnitLabel: newLabel, sellUnitToBase: newUnitToBase, sellAmount: 0, quantityInBaseUnit: 0, totalPrice: 0, totalProfit: 0 };
      }
      const { totalPrice, totalProfit, quantityInBaseUnit } = calcPrice(item.basePrice, newAmount, newUnitToBase);
      return { ...item, sellUnitLabel: newLabel, sellUnitToBase: newUnitToBase, sellAmount: newAmount, quantityInBaseUnit, totalPrice, totalProfit };
    }));
  };

  const updateAddCartField = (index: number, field: 'customPrice' | 'discount', value: string) => {
    setAddCart(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const addCartTotalPrice = addCart.reduce((sum, item) => sum + getFinalPrice(item), 0);
  const addCartTotalProfit = addCart.reduce((sum, item) => sum + getFinalProfit(item), 0);

  const handleSubmit = () => {
    if (!customerName.trim()) { toast({ title: "গ্রাহকের নাম দিন", variant: "destructive" }); return; }
    if (!deliveryDate) { toast({ title: "ডেলিভারি তারিখ দিন", variant: "destructive" }); return; }
    if (addCart.length === 0) { toast({ title: "অন্তত একটি পণ্য যোগ করুন", variant: "destructive" }); return; }
    if (addCart.some(i => i.sellAmount <= 0)) { toast({ title: "⚠️ পরিমাণ দিন", variant: "destructive" }); return; }

    const orderItems = addCart.map(item => ({
      productId: item.product.id,
      productName: item.product.name,
      unitType: item.product.unitType,
      unitName: `${item.sellAmount} ${item.sellUnitLabel}`,
      quantity: item.quantityInBaseUnit,
      quantityInBaseUnit: item.quantityInBaseUnit,
      price: getFinalPrice(item),
      profit: Math.max(0, getFinalProfit(item)),
    }));

    const totalPrice = orderItems.reduce((sum, i) => sum + i.price, 0);
    const totalProfit = orderItems.reduce((sum, i) => sum + (i.profit || 0), 0);
    const canReserveStock = orderItems.every(item => {
      const p = products.find(pr => pr.id === item.productId);
      return p && item.quantity <= p.stock;
    });

    addPreOrder({
      customerName: customerName.trim(), customerPhone, deliveryDate: new Date(deliveryDate),
      items: orderItems, status: 'pending', totalPrice, totalProfit, stockReserved: canReserveStock,
    });
    toast({ title: "আগাম অর্ডার সংরক্ষিত হয়েছে ✓" });
    resetForm();
  };

  // --- Sell cart helpers ---
  const sellTotalPrice = sellCart.reduce((sum, item) => sum + getFinalPrice(item), 0);
  const sellTotalProfit = sellCart.reduce((sum, item) => sum + getFinalProfit(item), 0);

  const handleStatusChange = (orderId: string, newStatus: PreOrderStatus) => {
    const order = preOrders.find(o => o.id === orderId);
    if (!order) return;
    if (newStatus === 'cancelled' && order.status !== 'cancelled' && order.stockReserved) {
      order.items.forEach(item => { const p = products.find(pr => pr.id === item.productId); if (p) updateProduct(item.productId, { stock: p.stock + item.quantity }); });
    }
    updatePreOrderStatus(orderId, newStatus);
    toast({ title: newStatus === 'delivered' ? 'সরবরাহ সম্পন্ন ✓' : newStatus === 'cancelled' ? 'অর্ডার বাতিল হয়েছে' : 'স্ট্যাটাস আপডেট হয়েছে' });
    setViewingOrder(null);
  };

  const openSellModal = (order: PreOrder) => {
    setSellingOrder(order);
    setSellIsPaid(true);
    setSellSelectedCustomer(null);
    setSellNewCustomerName('');
    setSellNewCustomerPhone('');
    setShowNewCustomer(false);
    setSellCustomerSearch('');
    
    const cartItems: SellOrderItem[] = order.items.map(item => {
      const product = products.find(p => p.id === item.productId);
      if (!product) return null;
      const units = getSellingUnits(product);
      const basePrice = units[0];
      const stockType = getStockType(product.unitType);
      const defaultUnit = SELL_UNIT_OPTIONS[stockType]?.[0] || { label: 'পিস', toBase: 1 };
      const sellAmount = item.quantity / (defaultUnit.toBase || 1);
      const { totalPrice, totalProfit, quantityInBaseUnit } = calcPrice(basePrice, sellAmount, defaultUnit.toBase);
      return {
        product, basePrice, sellUnitLabel: defaultUnit.label, sellUnitToBase: defaultUnit.toBase,
        sellAmount, quantityInBaseUnit, totalPrice, totalProfit, customPrice: '', discount: '',
      };
    }).filter(Boolean) as SellOrderItem[];
    setSellCart(cartItems);
    setViewingOrder(null);
  };

  const updateSellCartItem = (index: number, sellAmount: number, sellUnitLabel?: string, sellUnitToBase?: number) => {
    setSellCart(prev => prev.map((item, i) => {
      if (i !== index) return item;
      const newUnitToBase = sellUnitToBase ?? item.sellUnitToBase;
      const newLabel = sellUnitLabel ?? item.sellUnitLabel;
      if (sellAmount <= 0) return item;
      const { totalPrice, totalProfit, quantityInBaseUnit } = calcPrice(item.basePrice, sellAmount, newUnitToBase);
      return { ...item, sellUnitLabel: newLabel, sellUnitToBase: newUnitToBase, sellAmount, quantityInBaseUnit, totalPrice, totalProfit };
    }));
  };

  const updateSellCartField = (index: number, field: 'customPrice' | 'discount', value: string) => {
    setSellCart(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const completeSellOrder = () => {
    if (!sellingOrder || sellCart.length === 0) return;
    let customerId: string | undefined;
    let custName = sellingOrder.customerName;
    if (!sellIsPaid) {
      if (sellNewCustomerName.trim()) {
        const nc = addCustomer({ name: sellNewCustomerName.trim(), phone: sellNewCustomerPhone, totalDue: 0 });
        customerId = nc.id; custName = nc.displayName;
      } else if (sellSelectedCustomer) {
        customerId = sellSelectedCustomer;
        const c = customers.find(c => c.id === sellSelectedCustomer);
        custName = c?.displayName || custName;
      } else {
        toast({ title: "বাকি বিক্রির জন্য গ্রাহক নির্বাচন করুন", variant: "destructive" }); return;
      }
    }
    const salesData = sellCart.map(item => ({
      productId: item.product.id, productName: item.product.name,
      quantity: item.quantityInBaseUnit, quantityInBaseUnit: item.quantityInBaseUnit,
      unitType: item.product.unitType, unitName: `${item.sellAmount} ${item.sellUnitLabel}`,
      totalPrice: getFinalPrice(item), profit: Math.max(0, getFinalProfit(item)), isPaid: sellIsPaid,
    }));
    addMultipleSales(salesData, customerId, custName, sellIsPaid);
    if (!sellIsPaid && customerId) {
      updateCustomerDue(customerId, sellTotalPrice, sellTotalProfit > 0 ? sellTotalProfit : 0);
    }
    updatePreOrderStatus(sellingOrder.id, 'delivered');
    toast({ title: "বিক্রি সম্পন্ন! ✅", description: `মোট: ৳${sellTotalPrice} | লাভ: ৳${Math.max(0, sellTotalProfit).toFixed(2)}` });
    setSellingOrder(null); setSellCart([]);
  };

  const handleSendWhatsAppReminder = (order: PreOrder) => {
    if (!order.customerPhone) { toast({ title: "ফোন নম্বর নেই", variant: "destructive" }); return; }
    const message = reminderMessage.replace('[ORDER_DATE]', format(new Date(order.deliveryDate), 'dd MMMM yyyy', { locale: bn })).replace('[STORE_NAME]', storeInfo?.name || 'দোকান');
    const phone = order.customerPhone.replace(/\+/g, '');
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const resetForm = () => {
    setShowAddForm(false); setCustomerName(''); setCustomerPhone(''); setDeliveryDate('');
    setAddCart([]); setAddProductSearch(''); setAddSelectingProduct(null);
  };

  const pendingCount = preOrders.filter(o => o.status === 'pending').length;

  // Render a cart item (shared between add form and sell modal)
  const renderCartItem = (
    item: SellOrderItem, idx: number,
    updateItem: (i: number, a: number, l?: string, t?: number) => void,
    updateField: (i: number, f: 'customPrice' | 'discount', v: string) => void,
    removeItem?: (i: number) => void
  ) => {
    const unitOptions = getSellUnitOptions(item.product);
    const finalP = getFinalPrice(item);
    const finalPr = getFinalProfit(item);
    return (
      <div key={idx} className="p-4 bg-muted/50 rounded-xl space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-semibold text-foreground">{item.product.name}</p>
            <p className="text-xs text-muted-foreground">বেজ: ৳{item.basePrice.price}/{item.basePrice.name}</p>
          </div>
          {removeItem && (
            <button onClick={() => removeItem(idx)} className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
        {/* Amount + Unit */}
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="text-xs text-muted-foreground mb-1 block">পরিমাণ</label>
            <input type="number" value={item.sellAmount || ''} onChange={(e) => updateItem(idx, parseFloat(e.target.value) || 0)}
              placeholder="পরিমাণ" className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" min="0" step="any" />
          </div>
          <div className="flex-1">
            <label className="text-xs text-muted-foreground mb-1 block">ইউনিট</label>
            <div className="relative">
              <select value={`${item.sellUnitLabel}|${item.sellUnitToBase}`} onChange={(e) => { const [l, t] = e.target.value.split('|'); updateItem(idx, item.sellAmount, l, parseFloat(t)); }}
                className="w-full h-10 rounded-xl border border-border bg-background px-3 pr-8 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-ring">
                {unitOptions.map((opt) => (<option key={`${opt.label}-${opt.toBase}`} value={`${opt.label}|${opt.toBase}`}>{opt.label}</option>))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>
        </div>
        {/* Custom Price + Discount */}
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Tag className="w-3 h-3" /> কাস্টম দাম</label>
            <input type="number" value={item.customPrice} onChange={(e) => updateField(idx, 'customPrice', e.target.value)}
              placeholder={`৳${item.totalPrice.toFixed(0)}`} className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" min="0" step="any" />
          </div>
          <div className="flex-1">
            <label className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Percent className="w-3 h-3" /> ছাড় (৳)</label>
            <input type="number" value={item.discount} onChange={(e) => updateField(idx, 'discount', e.target.value)}
              placeholder="০" className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" min="0" step="any" />
          </div>
        </div>
        {/* Summary */}
        {item.sellAmount > 0 && (
          <div className="flex items-center justify-between text-sm pt-1 border-t border-border/50">
            <div className="space-y-0.5">
              <p className="text-muted-foreground flex items-center gap-1"><Info className="w-3 h-3" /> {item.quantityInBaseUnit.toFixed(1)} {item.product.baseUnit || getUnitLabel(item.product.unitType)} কমবে</p>
              <p className="text-xs text-profit">লাভ: ৳{finalPr.toFixed(2)}</p>
            </div>
            <p className="text-lg font-bold text-foreground">৳{finalP.toFixed(2)}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-xl">
            <CalendarCheck className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">আগাম অর্ডার</h1>
            <p className="text-muted-foreground">{pendingCount}টি অপেক্ষমান অর্ডার</p>
          </div>
        </div>
        <Button onClick={() => setShowAddForm(true)} className="btn-primary rounded-xl">
          <Plus className="w-5 h-5 mr-2" /> নতুন অর্ডার
        </Button>
      </div>

      {/* Overdue Orders Alert */}
      {overdueOrders.length > 0 && (
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <h3 className="font-semibold text-amber-800 dark:text-amber-200">{overdueOrders.length}টি অর্ডার সংগ্রহ হয়নি!</h3>
          </div>
          <div className="space-y-2">
            {overdueOrders.map(order => (
              <div key={order.id} className="flex items-center justify-between p-2 bg-card rounded-lg">
                <div>
                  <p className="font-medium">{order.customerName}</p>
                  <p className="text-sm text-muted-foreground">{format(new Date(order.deliveryDate), 'dd MMM yyyy', { locale: bn })}</p>
                </div>
                <div className="flex gap-2">
                  {order.customerPhone && (
                    <Button size="sm" variant="outline" onClick={() => handleSendWhatsAppReminder(order)} className="text-green-600 border-green-600">
                      <MessageCircle className="w-4 h-4 mr-1" /> রিমাইন্ডার
                    </Button>
                  )}
                  <Button size="sm" onClick={() => openSellModal(order)} className="bg-profit hover:bg-profit/90 text-white">
                    <ShoppingBag className="w-4 h-4 mr-1" /> বিক্রি
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* WhatsApp Default Message */}
      <div className="card-elevated p-4">
        <label className="block text-sm font-medium mb-2">
          <MessageCircle className="w-4 h-4 inline mr-1" /> ডিফল্ট রিমাইন্ডার মেসেজ
        </label>
        <textarea value={reminderMessage} onChange={(e) => setReminderMessage(e.target.value)} rows={4} className="input-field text-sm" />
        <p className="text-xs text-muted-foreground mt-1">[ORDER_DATE] = অর্ডার তারিখ, [STORE_NAME] = দোকানের নাম</p>
      </div>

      {/* Status Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {(['all', 'pending', 'delivered', 'cancelled'] as const).map((status) => (
          <button key={status} onClick={() => setStatusFilter(status)} className={`px-4 py-2 rounded-xl whitespace-nowrap transition-all ${statusFilter === status ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
            {status === 'all' ? 'সব' : getPreOrderStatusLabel(status)}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="গ্রাহকের নাম বা ফোন দিয়ে খুঁজুন..." className="input-field pl-10" />
      </div>

      {/* Add Order Modal (Bikri-like) */}
      {showAddForm && (
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-card rounded-2xl shadow-soft border border-border p-6 animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-foreground">নতুন আগাম অর্ডার</h2>
              <button onClick={resetForm} className="p-2 hover:bg-muted rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              {/* Customer & Date */}
              <div>
                <label className="block text-sm font-medium mb-2"><User className="w-4 h-4 inline mr-1" /> অর্ডারকারীর নাম *</label>
                <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="গ্রাহকের নাম" className="input-field" />
              </div>
              <PhoneInputWithCode value={customerPhone} onChange={(phone) => setCustomerPhone(phone)} label="ফোন / WhatsApp নম্বর" />
              <div>
                <label className="block text-sm font-medium mb-2"><CalendarCheck className="w-4 h-4 inline mr-1" /> কোন তারিখে দিতে হবে *</label>
                <input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} min={new Date().toISOString().split('T')[0]} className="input-field" />
              </div>

              {/* Product Selection (Bikri-like) */}
              <div className="border-t border-border pt-4">
                <label className="block text-sm font-medium mb-2"><Package className="w-4 h-4 inline mr-1" /> পণ্য যোগ করুন</label>
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input type="text" value={addProductSearch} onChange={(e) => setAddProductSearch(e.target.value)} placeholder="পণ্য খুঁজুন..." className="input-field pl-9 text-sm" />
                </div>

                {/* Product Grid */}
                {addProductSearch && (
                  <div className="grid grid-cols-2 gap-2 mb-4 max-h-48 overflow-y-auto">
                    {addFilteredProducts.map(p => {
                      const units = getSellingUnits(p);
                      return (
                        <button key={p.id} onClick={() => addToAddCart(p)}
                          className="p-3 rounded-xl border border-border hover:border-primary/50 bg-background text-left transition-all">
                          <p className="font-medium text-sm truncate">{p.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {units.length > 1 ? `${units.length} দাম` : `৳${units[0].price}/${units[0].name}`}
                          </p>
                          <p className="text-xs text-muted-foreground">{formatStock(p.stock, p.unitType, p.baseUnit)}</p>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Base Price Selection for Add */}
                {addSelectingProduct && (
                  <div className="mb-4 p-4 bg-muted/50 rounded-xl space-y-2 animate-fade-in">
                    <p className="text-sm font-medium">{addSelectingProduct.name} - কোন দাম?</p>
                    {getSellingUnits(addSelectingProduct).map(unit => (
                      <button key={unit.id} onClick={() => addToAddCart(addSelectingProduct, unit)}
                        className="w-full p-3 rounded-lg border border-border hover:border-primary bg-background flex justify-between items-center">
                        <span className="font-medium text-sm">{unit.name}</span>
                        <span className="text-primary font-bold">৳{unit.price}</span>
                      </button>
                    ))}
                    <button onClick={() => setAddSelectingProduct(null)} className="text-xs text-muted-foreground">বাতিল</button>
                  </div>
                )}

                {/* Cart Items */}
                {addCart.length > 0 && (
                  <div className="space-y-3 mb-4">
                    {addCart.map((item, idx) => renderCartItem(item, idx, updateAddCartItem, updateAddCartField, (i) => setAddCart(prev => prev.filter((_, j) => j !== i))))}
                    <div className="border-t border-border pt-3 space-y-1">
                      <div className="flex justify-between text-lg">
                        <span className="font-medium">মোট:</span>
                        <span className="font-bold text-primary">৳{addCartTotalPrice.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">লাভ:</span>
                        <span className="text-profit font-semibold">+৳{addCartTotalProfit.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={resetForm} className="flex-1 py-5 rounded-xl">বাতিল</Button>
                <Button onClick={handleSubmit} className="flex-1 btn-primary py-5 rounded-xl">সংরক্ষণ করুন</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bikri-like Selling Modal */}
      {sellingOrder && (
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-card rounded-2xl shadow-soft border border-border p-6 animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-foreground">অর্ডার বিক্রি</h2>
                <p className="text-sm text-muted-foreground">{sellingOrder.customerName}</p>
              </div>
              <button onClick={() => { setSellingOrder(null); setSellCart([]); }} className="p-2 hover:bg-muted rounded-lg"><X className="w-5 h-5" /></button>
            </div>

            {/* Cart Items */}
            <div className="space-y-4 mb-4 max-h-[350px] overflow-y-auto">
              {sellCart.map((item, idx) => renderCartItem(item, idx, updateSellCartItem, updateSellCartField))}
            </div>

            {/* Payment Type */}
            <div className="flex gap-3 mb-4">
              <button onClick={() => setSellIsPaid(true)} className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all ${sellIsPaid ? 'border-primary bg-primary/5' : 'border-border'}`}>
                <CheckCircle className={`w-5 h-5 mx-auto mb-1 ${sellIsPaid ? 'text-primary' : 'text-muted-foreground'}`} />
                <span className={sellIsPaid ? 'text-primary font-medium' : 'text-muted-foreground'}>নগদ</span>
              </button>
              <button onClick={() => setSellIsPaid(false)} className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all ${!sellIsPaid ? 'border-destructive bg-destructive/5' : 'border-border'}`}>
                <BookOpen className={`w-5 h-5 mx-auto mb-1 ${!sellIsPaid ? 'text-destructive' : 'text-muted-foreground'}`} />
                <span className={!sellIsPaid ? 'text-destructive font-medium' : 'text-muted-foreground'}>বাকি</span>
              </button>
            </div>

            {/* Customer for Baki */}
            {!sellIsPaid && (
              <div className="mb-4 space-y-3 animate-fade-in">
                <p className="text-sm font-medium">গ্রাহক নির্বাচন করুন</p>
                <div className="flex gap-2">
                  <button onClick={() => setSellCustomerType('name')} className={`flex-1 py-2 px-3 rounded-lg text-sm ${sellCustomerType === 'name' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>নাম দিয়ে</button>
                  <button onClick={() => setSellCustomerType('phone')} className={`flex-1 py-2 px-3 rounded-lg text-sm ${sellCustomerType === 'phone' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>ফোন দিয়ে</button>
                </div>
                <input type={sellCustomerType === 'phone' ? 'tel' : 'text'} value={sellCustomerSearch} onChange={(e) => setSellCustomerSearch(e.target.value)} placeholder={sellCustomerType === 'phone' ? "ফোন নম্বর..." : "গ্রাহকের নাম..."} className="input-field" />
                {sellFilteredCustomers.length > 0 && (
                  <div className="max-h-32 overflow-y-auto border border-border rounded-xl">
                    {sellFilteredCustomers.map(c => (
                      <button key={c.id} onClick={() => { setSellSelectedCustomer(c.id); setShowNewCustomer(false); }} className={`w-full text-left px-4 py-2 text-sm ${sellSelectedCustomer === c.id ? 'bg-primary/10' : 'hover:bg-muted'}`}>{c.displayName}</button>
                    ))}
                  </div>
                )}
                <button onClick={() => setShowNewCustomer(!showNewCustomer)} className="text-sm text-primary">+ নতুন গ্রাহক</button>
                {showNewCustomer && (
                  <div className="space-y-2">
                    <input type="text" value={sellNewCustomerName} onChange={(e) => setSellNewCustomerName(e.target.value)} placeholder="নাম" className="input-field" />
                    <PhoneInputWithCode value={sellNewCustomerPhone} onChange={(p) => setSellNewCustomerPhone(p)} label="WhatsApp নম্বর" />
                  </div>
                )}
              </div>
            )}

            {/* Total */}
            <div className="border-t border-border pt-4 space-y-2 mb-4">
              <div className="flex justify-between text-lg">
                <span className="font-medium">মোট বিক্রয়:</span>
                <span className="font-bold text-foreground">৳{sellTotalPrice.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">মোট লাভ:</span>
                <span className="font-semibold text-profit">+৳{sellTotalProfit.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => { setSellingOrder(null); setSellCart([]); }} className="flex-1 py-5 rounded-xl">বাতিল</Button>
              <Button onClick={completeSellOrder} className="flex-1 btn-primary py-5 rounded-xl" disabled={sellCart.some(i => i.sellAmount <= 0)}>
                <CheckCircle className="w-5 h-5 mr-2" /> বিক্রি নিশ্চিত করুন
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* View Order Modal */}
      {viewingOrder && (
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-card rounded-2xl shadow-soft border border-border p-6 animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-foreground">অর্ডারের বিবরণ</h2>
              <button onClick={() => setViewingOrder(null)} className="p-2 hover:bg-muted rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-xl">
                <div className="flex items-center gap-2 mb-2"><User className="w-5 h-5 text-primary" /><span className="font-bold text-lg">{viewingOrder.customerName}</span></div>
                {viewingOrder.customerPhone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="w-4 h-4" /><span>{viewingOrder.customerPhone}</span>
                    <button onClick={() => handleSendWhatsAppReminder(viewingOrder)} className="ml-2 p-1 text-green-600 hover:bg-green-100 rounded"><MessageCircle className="w-4 h-4" /></button>
                  </div>
                )}
              </div>
              <div className="p-4 bg-primary/10 rounded-xl">
                <div className="flex items-center gap-2"><CalendarCheck className="w-5 h-5 text-primary" />
                  <div><p className="text-sm text-muted-foreground">ডেলিভারি তারিখ</p><p className="font-bold text-lg">{format(new Date(viewingOrder.deliveryDate), 'dd MMMM yyyy', { locale: bn })}</p></div>
                </div>
              </div>
              <div className="flex items-center justify-between"><span className="text-muted-foreground">অবস্থা:</span><span className={`px-3 py-1 rounded-full text-sm font-medium ${getPreOrderStatusColor(viewingOrder.status)}`}>{getPreOrderStatusLabel(viewingOrder.status)}</span></div>
              <div className="border-t border-border pt-4">
                <p className="font-medium mb-3">পণ্য ও সেবা:</p>
                <div className="space-y-2">
                  {viewingOrder.items.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div><p className="font-medium">{item.productName}</p><p className="text-sm text-muted-foreground">{item.unitName || `${item.quantity} ${getUnitLabel(item.unitType)}`}</p></div>
                      <span className="font-bold">৳{item.price}</span>
                    </div>
                  ))}
                </div>
                <div className="text-right pt-3 border-t border-border mt-3"><span className="text-muted-foreground">মোট: </span><span className="text-2xl font-bold text-primary">৳{viewingOrder.totalPrice}</span></div>
              </div>
              {viewingOrder.status === 'pending' && (
                <div className="space-y-3 pt-4">
                  <Button onClick={() => openSellModal(viewingOrder)} className="w-full py-5 rounded-xl bg-profit hover:bg-profit/90 text-white">
                    <ShoppingBag className="w-5 h-5 mr-2" /> বিক্রি করুন (নগদ/বাকি)
                  </Button>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => handleStatusChange(viewingOrder.id, 'cancelled')} className="flex-1 py-5 rounded-xl border-destructive text-destructive hover:bg-destructive/10">
                      <XCircle className="w-5 h-5 mr-2" /> বাতিল
                    </Button>
                    <Button variant="outline" onClick={() => handleStatusChange(viewingOrder.id, 'delivered')} className="flex-1 py-5 rounded-xl">
                      <CheckCircle className="w-5 h-5 mr-2" /> সরবরাহ সম্পন্ন
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Order List */}
      <div className="space-y-3">
        {filteredPreOrders.map((order) => {
          const isOverdue = new Date(order.deliveryDate) < new Date() && order.status === 'pending';
          return (
            <div key={order.id} className={`card-elevated p-4 hover:shadow-md transition-shadow ${isOverdue ? 'border-amber-400 bg-amber-50/50 dark:bg-amber-900/10' : ''}`}>
              <div className="flex items-center justify-between mb-2">
                <button onClick={() => setViewingOrder(order)} className="flex items-center gap-3 flex-1 text-left">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isOverdue ? 'bg-amber-100' : 'bg-primary/10'}`}>
                    {isOverdue ? <AlertTriangle className="w-5 h-5 text-amber-600" /> : <User className="w-5 h-5 text-primary" />}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{order.customerName}</p>
                    {order.customerPhone && <p className="text-sm text-muted-foreground">{order.customerPhone}</p>}
                  </div>
                </button>
                <div className="flex items-center gap-1">
                  {order.customerPhone && (
                    <>
                      <button onClick={() => window.location.href = `tel:${order.customerPhone}`} className="p-2 bg-primary/10 hover:bg-primary/20 rounded-xl text-primary"><Phone className="w-4 h-4" /></button>
                      <button onClick={() => handleSendWhatsAppReminder(order)} className="p-2 bg-green-100 hover:bg-green-200 rounded-xl text-green-600"><MessageCircle className="w-4 h-4" /></button>
                    </>
                  )}
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPreOrderStatusColor(order.status)}`}>{getPreOrderStatusLabel(order.status)}</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm ml-13">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CalendarCheck className="w-4 h-4" />
                  {format(new Date(order.deliveryDate), 'dd MMM yyyy', { locale: bn })}
                  {isOverdue && <span className="text-amber-600 text-xs">(মেয়াদ শেষ)</span>}
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-muted-foreground">{order.items.length}টি পণ্য</span>
                  <span className="font-bold text-primary">৳{order.totalPrice}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredPreOrders.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>কোন আগাম অর্ডার নেই</p>
        </div>
      )}
    </div>
  );
}
