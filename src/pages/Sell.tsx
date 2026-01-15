import { useState, useMemo } from 'react';
import { ShoppingCart, Search, Plus, Minus, CheckCircle, User, X, Calculator, Phone } from 'lucide-react';
import { useStore } from '@/context/StoreContext';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { CartItem, Product } from '@/types/store';

export default function Sell() {
  const { 
    products, 
    customers, 
    addMultipleSales, 
    addCustomer, 
    searchCustomersByName, 
    searchCustomersByPhone,
    getExistingCustomersByName,
    generateCustomerDisplayName 
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
  
  // Customer search state
  const [customerSearchType, setCustomerSearchType] = useState<'name' | 'phone'>('name');
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');

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

  // Check for existing customers with same name
  const existingCustomersWithSameName = useMemo(() => {
    return getExistingCustomersByName(newCustomerName);
  }, [newCustomerName, getExistingCustomersByName]);

  // Cart calculations
  const totalPrice = cart.reduce((sum, item) => sum + item.totalPrice, 0);
  const totalProfit = cart.reduce((sum, item) => sum + item.totalProfit, 0);
  const change = parseFloat(customerPaid) - totalPrice;

  const addToCart = (product: Product) => {
    const existingItem = cart.find(item => item.product.id === product.id);
    if (existingItem) {
      updateCartQuantity(product.id, existingItem.quantity + 1);
    } else {
      const newItem: CartItem = {
        product,
        quantity: 1,
        totalPrice: product.price,
        totalProfit: Math.max(0, product.profit)
      };
      setCart([...cart, newItem]);
    }
    toast({ title: `${product.name} যোগ হয়েছে 🛒` });
  };

  const updateCartQuantity = (productId: string, newQuantity: number) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    if (newQuantity > product.stock) {
      toast({ title: "স্টকে পর্যাপ্ত পণ্য নেই", variant: "destructive" });
      return;
    }

    setCart(cart.map(item => {
      if (item.product.id === productId) {
        return {
          ...item,
          quantity: newQuantity,
          totalPrice: product.price * newQuantity,
          totalProfit: Math.max(0, product.profit * newQuantity)
        };
      }
      return item;
    }));
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.product.id !== productId));
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
  };

  const handleSale = () => {
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

    // Prepare sales data
    const salesData = cart.map(item => ({
      productId: item.product.id,
      productName: item.product.name,
      quantity: item.quantity,
      totalPrice: item.totalPrice,
      profit: Math.max(0, item.totalProfit),
      isPaid
    }));

    addMultipleSales(salesData, customerId || undefined, customerName || undefined, isPaid);

    toast({
      title: "বিক্রি সম্পন্ন! ✅",
      description: `মোট: ৳${totalPrice} | লাভ: ৳${Math.max(0, totalProfit)}`,
    });

    clearCart();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-primary/10 rounded-xl">
          <ShoppingCart className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">বিক্রি করুন</h1>
          <p className="text-muted-foreground">পণ্য নির্বাচন করে বিক্রি করুন</p>
        </div>
      </div>

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
          const inCart = cart.find(item => item.product.id === p.id);
          return (
            <button
              key={p.id}
              onClick={() => addToCart(p)}
              className={`p-4 rounded-xl border-2 transition-all duration-200 text-left relative ${
                inCart
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50 bg-card'
              }`}
            >
              {inCart && (
                <span className="absolute -top-2 -right-2 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                  {inCart.quantity}
                </span>
              )}
              <p className="font-semibold text-foreground truncate">{p.name}</p>
              <p className="text-lg font-bold text-primary">৳{p.price}</p>
              <p className="text-xs text-muted-foreground">{p.stock}টি স্টকে</p>
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

      {/* Cart Section */}
      {cart.length > 0 && (
        <div className="card-elevated p-6 animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              কার্ট ({cart.length}টি পণ্য)
            </h3>
            <button onClick={clearCart} className="text-due hover:underline text-sm">
              সব মুছুন
            </button>
          </div>
          
          {/* Cart Items */}
          <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
            {cart.map((item) => (
              <div key={item.product.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
                <div className="flex-1">
                  <p className="font-medium text-foreground">{item.product.name}</p>
                  <p className="text-sm text-muted-foreground">৳{item.product.price} × {item.quantity}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)}
                      className="p-1 bg-background rounded-lg hover:bg-muted"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-8 text-center font-bold">{item.quantity}</span>
                    <button
                      onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)}
                      className="p-1 bg-background rounded-lg hover:bg-muted"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <span className="font-bold text-foreground w-20 text-right">৳{item.totalPrice}</span>
                  <button
                    onClick={() => removeFromCart(item.product.id)}
                    className="p-1 text-due hover:bg-due/10 rounded-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
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
              
              {/* Search Type Toggle */}
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => {
                    setCustomerSearchType('name');
                    setCustomerSearchTerm('');
                  }}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm transition-all ${
                    customerSearchType === 'name' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  <User className="w-4 h-4 inline mr-1" />
                  নাম দিয়ে
                </button>
                <button
                  onClick={() => {
                    setCustomerSearchType('phone');
                    setCustomerSearchTerm('');
                  }}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm transition-all ${
                    customerSearchType === 'phone' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  <Phone className="w-4 h-4 inline mr-1" />
                  ফোন দিয়ে
                </button>
              </div>

              {/* Customer Search */}
              {!showCustomerInput && (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type={customerSearchType === 'phone' ? 'tel' : 'text'}
                      value={customerSearchTerm}
                      onChange={(e) => setCustomerSearchTerm(e.target.value)}
                      placeholder={customerSearchType === 'phone' ? "ফোন নম্বর দিন..." : "নাম লিখুন..."}
                      className="input-field pl-10"
                    />
                  </div>
                  
                  {filteredCustomers.length > 0 && (
                    <div className="max-h-40 overflow-y-auto space-y-2">
                      {filteredCustomers.map(c => (
                        <button
                          key={c.id}
                          onClick={() => {
                            setSelectedCustomer(c.id);
                            setCustomerSearchTerm('');
                          }}
                          className={`w-full p-3 text-left rounded-lg border transition-all ${
                            selectedCustomer === c.id 
                              ? 'border-primary bg-primary/5' 
                              : 'border-border hover:border-primary/50'
                          }`}
                        >
                          <p className="font-medium">{c.displayName}</p>
                          {c.phone && <p className="text-xs text-muted-foreground">{c.phone}</p>}
                          <p className="text-xs text-due">বাকি: ৳{c.totalDue}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}

              {!showCustomerInput && (
                <button
                  onClick={() => setShowCustomerInput(true)}
                  className="text-sm text-primary hover:underline"
                >
                  + নতুন গ্রাহক যোগ করুন
                </button>
              )}

              {showCustomerInput && (
                <div className="space-y-3 p-4 bg-muted/50 rounded-xl">
                  <div>
                    <input
                      type="text"
                      value={newCustomerName}
                      onChange={(e) => setNewCustomerName(e.target.value)}
                      placeholder="গ্রাহকের নাম"
                      className="input-field"
                    />
                    {existingCustomersWithSameName.length > 0 && (
                      <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <p className="text-sm font-medium text-amber-800">
                          ⚠️ "{newCustomerName}" নামে {existingCustomersWithSameName.length}জন গ্রাহক আছে:
                        </p>
                        <ul className="mt-1 text-xs text-amber-700">
                          {existingCustomersWithSameName.map(c => (
                            <li key={c.id}>• {c.displayName} {c.phone ? `(${c.phone})` : ''}</li>
                          ))}
                        </ul>
                        <p className="mt-2 text-sm text-amber-800">
                          নতুন গ্রাহক হবে: <strong>{generateCustomerDisplayName(newCustomerName)}</strong>
                        </p>
                      </div>
                    )}
                  </div>
                  <input
                    type="tel"
                    value={newCustomerPhone}
                    onChange={(e) => setNewCustomerPhone(e.target.value)}
                    placeholder="ফোন নম্বর (ঐচ্ছিক)"
                    className="input-field"
                  />
                  <button
                    onClick={() => {
                      setShowCustomerInput(false);
                      setSelectedCustomer(null);
                    }}
                    className="text-sm text-muted-foreground hover:underline"
                  >
                    ← বিদ্যমান গ্রাহক নির্বাচন করুন
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Total */}
          <div className="border-t border-border pt-4 mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-muted-foreground">মোট</span>
              <span className="text-2xl font-bold text-foreground">৳{totalPrice}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">লাভ</span>
              <span className="text-lg font-semibold text-profit">+৳{Math.max(0, totalProfit)}</span>
            </div>
          </div>

          {/* Calculate Change Button */}
          {isPaid && (
            <button
              onClick={() => setShowCalculator(!showCalculator)}
              className="w-full mb-4 py-3 px-4 rounded-xl border-2 border-dashed border-primary/50 text-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-2"
            >
              <Calculator className="w-5 h-5" />
              ফেরত হিসাব করুন
            </button>
          )}

          {/* Calculator Modal */}
          {showCalculator && (
            <div className="mb-4 p-4 bg-accent rounded-xl animate-fade-in">
              <div className="flex justify-between items-center mb-3">
                <span className="font-medium">মোট বিক্রি</span>
                <input
                  type="number"
                  value={totalPrice}
                  readOnly
                  className="w-32 p-2 text-right font-bold bg-card rounded-lg border border-border"
                />
              </div>
              <div className="flex justify-between items-center mb-3">
                <span className="font-medium">গ্রাহক দিয়েছে</span>
                <input
                  type="number"
                  value={customerPaid}
                  onChange={(e) => setCustomerPaid(e.target.value)}
                  placeholder="0"
                  className="w-32 p-2 text-right font-bold bg-card rounded-lg border border-border"
                  autoFocus
                />
              </div>
              {customerPaid && parseFloat(customerPaid) >= totalPrice && (
                <div className="flex justify-between items-center p-3 bg-profit/10 rounded-lg">
                  <span className="font-bold text-profit">ফেরত দিন</span>
                  <span className="text-2xl font-bold text-profit">৳{change.toFixed(0)}</span>
                </div>
              )}
              {customerPaid && parseFloat(customerPaid) < totalPrice && (
                <div className="flex justify-between items-center p-3 bg-due/10 rounded-lg">
                  <span className="font-bold text-due">বাকি থাকবে</span>
                  <span className="text-2xl font-bold text-due">৳{Math.abs(change).toFixed(0)}</span>
                </div>
              )}
            </div>
          )}

          <Button
            onClick={handleSale}
            className="w-full btn-primary py-6 text-lg rounded-xl"
            disabled={!isPaid && !selectedCustomer && !newCustomerName.trim()}
          >
            বিক্রি সম্পন্ন করুন ✓
          </Button>
        </div>
      )}
    </div>
  );
}
