import { useState, useMemo } from 'react';
import { ShoppingCart, Search, Plus, Minus, CheckCircle, User, X, Calculator, Phone, BookOpen, HelpCircle, AlertTriangle, Info } from 'lucide-react';
import { PhoneInputWithCode } from '@/components/common/PhoneInputWithCode';
import { useStore } from '@/context/StoreContext';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { CartItem, Product, SellingUnit, getUnitLabel } from '@/types/store';

// Format stock in human-readable form
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

export default function Sell() {
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
  
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isPaid, setIsPaid] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [showCustomerInput, setShowCustomerInput] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [customerPaid, setCustomerPaid] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  
  // Customer search state
  const [customerSearchType, setCustomerSearchType] = useState<'name' | 'phone'>('name');
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');

  // Quantity input for direct typing
  const [editingQuantity, setEditingQuantity] = useState<string | null>(null);
  const [tempQuantity, setTempQuantity] = useState('');

  // Optional baki when customer pays less
  const [showBakiOption, setShowBakiOption] = useState(false);
  const [bakiCustomerSearchType, setBakiCustomerSearchType] = useState<'name' | 'phone'>('name');
  const [bakiCustomerSearchTerm, setBakiCustomerSearchTerm] = useState('');
  const [bakiSelectedCustomer, setBakiSelectedCustomer] = useState<string | null>(null);
  const [bakiNewCustomerName, setBakiNewCustomerName] = useState('');
  const [bakiNewCustomerPhone, setBakiNewCustomerPhone] = useState('');
  const [showBakiNewCustomer, setShowBakiNewCustomer] = useState(false);

  // Unit selection modal
  const [selectingUnitFor, setSelectingUnitFor] = useState<Product | null>(null);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) && p.stock > 0
  );

  // Search customers based on selected type
  const filteredCustomers = useMemo(() => {
    if (!customerSearchTerm.trim()) return customers;
    if (customerSearchType === 'phone') {
      return searchCustomersByPhone(customerSearchTerm);
    }
    return searchCustomersByName(customerSearchTerm);
  }, [customerSearchTerm, customerSearchType, customers, searchCustomersByName, searchCustomersByPhone]);

  // Search for baki customers
  const bakiFilteredCustomers = useMemo(() => {
    if (!bakiCustomerSearchTerm.trim()) return customers;
    if (bakiCustomerSearchType === 'phone') {
      return searchCustomersByPhone(bakiCustomerSearchTerm);
    }
    return searchCustomersByName(bakiCustomerSearchTerm);
  }, [bakiCustomerSearchTerm, bakiCustomerSearchType, customers, searchCustomersByName, searchCustomersByPhone]);

  // Check for existing customers with same name
  const existingCustomersWithSameName = useMemo(() => {
    return getExistingCustomersByName(newCustomerName);
  }, [newCustomerName, getExistingCustomersByName]);

  // Check for existing baki customers with same name
  const existingBakiCustomersWithSameName = useMemo(() => {
    return getExistingCustomersByName(bakiNewCustomerName);
  }, [bakiNewCustomerName, getExistingCustomersByName]);

  // Cart calculations
  const totalPrice = cart.reduce((sum, item) => sum + item.totalPrice, 0);
  const totalProfit = cart.reduce((sum, item) => sum + item.totalProfit, 0);
  const change = parseFloat(customerPaid) - totalPrice;
  const bakiAmount = Math.abs(change);

  // Get available selling units for a product
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

  const addToCart = (product: Product, selectedUnit?: SellingUnit) => {
    const units = getSellingUnits(product);
    
    if (units.length > 1 && !selectedUnit) {
      setSelectingUnitFor(product);
      return;
    }

    const unit = selectedUnit || units[0];
    const quantityInBaseUnit = unit.conversionToBase;

    if (quantityInBaseUnit > product.stock) {
      toast({ 
        title: "⚠️ স্টকে পর্যাপ্ত পণ্য নেই",
        description: `${product.name} এর স্টকে ${formatStock(product.stock, product.unitType, product.baseUnit)} আছে`,
        variant: "destructive" 
      });
      return;
    }

    const existingItem = cart.find(
      item => item.product.id === product.id && item.selectedUnit?.id === unit.id
    );
    
    if (existingItem) {
      updateCartQuantity(product.id, existingItem.quantity + 1, unit);
    } else {
      const newItem: CartItem = {
        product,
        quantity: 1,
        quantityInBaseUnit,
        totalPrice: unit.price,
        totalProfit: unit.profit,
        selectedUnit: unit
      };
      setCart([...cart, newItem]);
    }
    
    setSelectingUnitFor(null);
    toast({ title: `${product.name} (${unit.name}) যোগ হয়েছে 🛒` });
  };

  const updateCartQuantity = (productId: string, newQuantity: number, unit?: SellingUnit) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    if (newQuantity <= 0) {
      removeFromCart(productId, unit?.id);
      return;
    }

    const selectedUnit = unit || cart.find(i => i.product.id === productId)?.selectedUnit;
    const conversionToBase = selectedUnit?.conversionToBase || 1;
    const newQuantityInBaseUnit = newQuantity * conversionToBase;

    if (newQuantityInBaseUnit > product.stock) {
      toast({ 
        title: "⚠️ স্টকের চেয়ে বেশি",
        description: `স্টকে ${formatStock(product.stock, product.unitType, product.baseUnit)} আছে, তবে বিক্রি করতে পারবেন`,
      });
    }

    setCart(cart.map(item => {
      if (item.product.id === productId && item.selectedUnit?.id === (unit?.id || item.selectedUnit?.id)) {
        const unitPrice = item.selectedUnit?.price || product.price;
        const unitProfit = item.selectedUnit?.profit || product.profit;
        return {
          ...item,
          quantity: newQuantity,
          quantityInBaseUnit: newQuantityInBaseUnit,
          totalPrice: unitPrice * newQuantity,
          totalProfit: unitProfit * newQuantity
        };
      }
      return item;
    }));
  };

  const handleQuantityInput = (productId: string, unitId?: string) => {
    const qty = parseFloat(tempQuantity) || 0;
    if (qty > 0) {
      const item = cart.find(i => i.product.id === productId && i.selectedUnit?.id === unitId);
      if (item) {
        updateCartQuantity(productId, qty, item.selectedUnit);
      }
    }
    setEditingQuantity(null);
    setTempQuantity('');
  };

  const removeFromCart = (productId: string, unitId?: string) => {
    setCart(cart.filter(item => 
      !(item.product.id === productId && item.selectedUnit?.id === unitId)
    ));
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

    let customerId = selectedCustomer;
    let customerName = '';

    if (!isPaid) {
      if (newCustomerName.trim()) {
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
      unitName: item.selectedUnit?.name,
      totalPrice: item.totalPrice,
      profit: Math.max(0, item.totalProfit),
      isPaid: isPaid || partialPaid
    }));

    addMultipleSales(salesData, customerId || undefined, customerName || undefined, isPaid || partialPaid);

    toast({
      title: "বিক্রি সম্পন্ন! ✅",
      description: `মোট: ৳${totalPrice} | লাভ: ৳${Math.max(0, totalProfit).toFixed(2)}`,
    });

    clearCart();
  };

  const handleSale = () => {
    // Show confirmation modal
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

      {/* Help Note */}
      {showHelp && (
        <div className="p-4 bg-primary/10 rounded-xl text-sm animate-fade-in">
          <p className="font-semibold mb-2">📌 কিভাবে কাজ করে:</p>
          <ul className="space-y-1 text-muted-foreground">
            <li>• পণ্য ট্যাপ করুন → ইউনিট নির্বাচন করুন</li>
            <li>• পরিমাণ বাড়ান/কমান বা সরাসরি লিখুন</li>
            <li>• সিস্টেম অটোমেটিক দাম, লাভ ও স্টক হিসাব করবে</li>
            <li>• বিক্রির আগে সারাংশ দেখানো হবে</li>
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
          const totalInCart = inCart.reduce((sum, item) => sum + item.quantity, 0);
          const units = getSellingUnits(p);
          
          return (
            <button
              key={p.id}
              onClick={() => addToCart(p)}
              className={`p-4 rounded-xl border-2 transition-all duration-200 text-left relative ${
                totalInCart > 0
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50 bg-card'
              }`}
            >
              {totalInCart > 0 && (
                <span className="absolute -top-2 -right-2 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                  {totalInCart}
                </span>
              )}
              <p className="font-semibold text-foreground truncate">{p.name}</p>
              <div className="flex items-center gap-1 flex-wrap">
                {units.length > 1 ? (
                  <span className="text-xs text-muted-foreground">
                    {units.length} ইউনিট
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

      {/* Unit Selection Modal */}
      {selectingUnitFor && (
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-card rounded-2xl shadow-soft border border-border p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-foreground">{selectingUnitFor.name}</h3>
              <button onClick={() => setSelectingUnitFor(null)} className="p-1 hover:bg-muted rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              স্টকে: {formatStock(selectingUnitFor.stock, selectingUnitFor.unitType, selectingUnitFor.baseUnit)}
            </p>
            <p className="text-sm text-muted-foreground mb-4">কোন ইউনিটে বিক্রি করবেন?</p>
            <div className="space-y-2">
              {getSellingUnits(selectingUnitFor).map(unit => (
                <button
                  key={unit.id}
                  onClick={() => addToCart(selectingUnitFor, unit)}
                  className="w-full p-4 rounded-xl border-2 border-border hover:border-primary bg-muted/30 hover:bg-primary/5 transition-all flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium">{unit.name}</p>
                    <p className="text-xs text-muted-foreground">
                      = {unit.conversionToBase} {selectingUnitFor.baseUnit || getUnitLabel(selectingUnitFor.unitType)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary">৳{unit.price}</p>
                    <p className="text-xs text-profit">+৳{unit.profit.toFixed(2)}</p>
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
              {cart.map(item => {
                const product = products.find(p => p.id === item.product.id);
                const remainingStock = product ? product.stock - item.quantityInBaseUnit : 0;
                return (
                  <div key={`${item.product.id}-${item.selectedUnit?.id}`} className="p-3 bg-muted/50 rounded-xl">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-foreground">{item.product.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.quantity} × {item.selectedUnit?.name} = {item.quantityInBaseUnit} {item.product.baseUnit || getUnitLabel(item.product.unitType)}
                        </p>
                      </div>
                      <p className="font-bold text-foreground">৳{item.totalPrice}</p>
                    </div>
                    <div className="flex justify-between mt-2 text-xs">
                      <span className="text-profit">লাভ: ৳{item.totalProfit.toFixed(2)}</span>
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
          <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
            {cart.map((item) => {
              const itemKey = `${item.product.id}-${item.selectedUnit?.id}`;
              return (
                <div key={itemKey} className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{item.product.name}</p>
                    <p className="text-sm text-muted-foreground">
                      ৳{item.selectedUnit?.price || item.product.price}/{item.selectedUnit?.name || getUnitLabel(item.product.unitType)} × {item.quantity}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Info className="w-3 h-3" />
                      {item.quantityInBaseUnit} {item.product.baseUnit || getUnitLabel(item.product.unitType)} কমবে
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => updateCartQuantity(item.product.id, item.quantity - 1, item.selectedUnit)}
                        className="p-1.5 bg-background rounded-lg hover:bg-muted"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      
                      {editingQuantity === itemKey ? (
                        <input
                          type="number"
                          value={tempQuantity}
                          onChange={(e) => setTempQuantity(e.target.value)}
                          onBlur={() => handleQuantityInput(item.product.id, item.selectedUnit?.id)}
                          onKeyDown={(e) => e.key === 'Enter' && handleQuantityInput(item.product.id, item.selectedUnit?.id)}
                          className="w-16 text-center font-bold bg-card rounded-lg border border-border p-1"
                          autoFocus
                          min="0"
                        />
                      ) : (
                        <button
                          onClick={() => {
                            setEditingQuantity(itemKey);
                            setTempQuantity(item.quantity.toString());
                          }}
                          className="w-12 text-center font-bold bg-card rounded-lg py-1 hover:bg-muted"
                        >
                          {item.quantity}
                        </button>
                      )}
                      
                      <button
                        onClick={() => updateCartQuantity(item.product.id, item.quantity + 1, item.selectedUnit)}
                        className="p-1.5 bg-background rounded-lg hover:bg-muted"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <span className="font-bold text-foreground w-20 text-right">৳{item.totalPrice}</span>
                    <button
                      onClick={() => removeFromCart(item.product.id, item.selectedUnit?.id)}
                      className="p-1 text-due hover:bg-due/10 rounded-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
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
              disabled={cart.length === 0}
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
