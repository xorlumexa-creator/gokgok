import { useState } from 'react';
import { ShoppingCart, Search, Plus, Minus, CheckCircle, User } from 'lucide-react';
import { useStore } from '@/context/StoreContext';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

export default function Sell() {
  const { products, customers, addSale, addCustomer } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isPaid, setIsPaid] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [showCustomerInput, setShowCustomerInput] = useState(false);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) && p.stock > 0
  );

  const product = products.find(p => p.id === selectedProduct);
  const totalPrice = product ? product.price * quantity : 0;
  const totalProfit = product ? product.profit * quantity : 0;

  const handleSale = () => {
    if (!product) return;

    let customerId = selectedCustomer;
    let customerName = '';

    if (!isPaid) {
      if (newCustomerName.trim()) {
        const newCustomer = {
          name: newCustomerName.trim(),
          phone: '',
          totalDue: 0,
        };
        addCustomer(newCustomer);
        customerName = newCustomer.name;
      } else if (selectedCustomer) {
        const customer = customers.find(c => c.id === selectedCustomer);
        customerName = customer?.name || '';
      }
    }

    addSale({
      productId: product.id,
      productName: product.name,
      quantity,
      totalPrice,
      profit: totalProfit,
      customerId: customerId || undefined,
      customerName: customerName || undefined,
      isPaid,
    });

    toast({
      title: "বিক্রি সম্পন্ন! ✅",
      description: `${product.name} × ${quantity} = ৳${totalPrice}`,
    });

    // Reset form
    setSelectedProduct(null);
    setQuantity(1);
    setIsPaid(true);
    setSelectedCustomer(null);
    setNewCustomerName('');
    setShowCustomerInput(false);
    setSearchTerm('');
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
        {filteredProducts.map((p) => (
          <button
            key={p.id}
            onClick={() => {
              setSelectedProduct(p.id);
              setQuantity(1);
            }}
            className={`p-4 rounded-xl border-2 transition-all duration-200 text-left ${
              selectedProduct === p.id
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50 bg-card'
            }`}
          >
            <p className="font-semibold text-foreground truncate">{p.name}</p>
            <p className="text-lg font-bold text-primary">৳{p.price}</p>
            <p className="text-xs text-muted-foreground">{p.stock}টি স্টকে</p>
          </button>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>কোন পণ্য পাওয়া যায়নি</p>
        </div>
      )}

      {/* Sale Form */}
      {product && (
        <div className="card-elevated p-6 animate-slide-up">
          <h3 className="font-semibold text-foreground mb-4">{product.name}</h3>
          
          {/* Quantity */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-muted-foreground">পরিমাণ</span>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="p-2 bg-muted rounded-lg hover:bg-muted/80"
              >
                <Minus className="w-5 h-5" />
              </button>
              <span className="text-xl font-bold w-12 text-center">{quantity}</span>
              <button
                onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                className="p-2 bg-muted rounded-lg hover:bg-muted/80"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
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
            <div className="mb-4 animate-fade-in">
              <p className="text-sm text-muted-foreground mb-2">গ্রাহক নির্বাচন করুন</p>
              {customers.length > 0 && !showCustomerInput && (
                <select
                  value={selectedCustomer || ''}
                  onChange={(e) => setSelectedCustomer(e.target.value)}
                  className="input-field mb-2"
                >
                  <option value="">গ্রাহক নির্বাচন করুন</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
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
                <input
                  type="text"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  placeholder="গ্রাহকের নাম লিখুন"
                  className="input-field"
                />
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
              <span className="text-lg font-semibold text-profit">+৳{totalProfit}</span>
            </div>
          </div>

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
