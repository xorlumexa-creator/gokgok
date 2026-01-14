import { useState, useMemo } from 'react';
import { BookOpen, Search, User, Phone, Plus, X, CheckCircle } from 'lucide-react';
import { useStore } from '@/context/StoreContext';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

export default function CreditBook() {
  const { customers, addCustomer, payCustomerDue } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [formData, setFormData] = useState({ name: '', phone: '' });

  // Filter by name or phone
  const filteredCustomers = useMemo(() => {
    if (!searchTerm.trim()) return customers;
    const lowerSearch = searchTerm.toLowerCase();
    return customers.filter(c =>
      c.name.toLowerCase().includes(lowerSearch) ||
      c.displayName.toLowerCase().includes(lowerSearch) ||
      (c.phone && c.phone.includes(searchTerm))
    );
  }, [customers, searchTerm]);

  const totalDue = customers.reduce((sum, c) => sum + c.totalDue, 0);
  const customersWithDue = customers.filter(c => c.totalDue > 0);

  const handleAddCustomer = () => {
    if (!formData.name.trim()) {
      toast({ title: "গ্রাহকের নাম দিন", variant: "destructive" });
      return;
    }

    addCustomer({
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      totalDue: 0,
    });

    toast({ title: "নতুন গ্রাহক যোগ হয়েছে ✓" });
    setShowAddForm(false);
    setFormData({ name: '', phone: '' });
  };

  const handlePayment = (customerId: string) => {
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: "সঠিক টাকার পরিমাণ দিন", variant: "destructive" });
      return;
    }

    const customer = customers.find(c => c.id === customerId);
    if (!customer) return;

    if (amount > customer.totalDue) {
      toast({ title: "বাকির বেশি পরিশোধ করা যাবে না", variant: "destructive" });
      return;
    }

    // Pay and get proportional profit
    const proportionalProfit = payCustomerDue(customerId, amount);
    
    toast({ 
      title: `৳${amount} পরিশোধ হয়েছে ✓`,
      description: `৳${proportionalProfit.toFixed(2)} নগদ লাভে যোগ হয়েছে`
    });
    setShowPaymentModal(null);
    setPaymentAmount('');
  };

  const getPayingCustomer = () => {
    return customers.find(c => c.id === showPaymentModal);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-xl">
            <BookOpen className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">বাকির খাতা</h1>
            <p className="text-muted-foreground">{customersWithDue.length}জন গ্রাহকের বাকি আছে</p>
          </div>
        </div>
        <Button
          onClick={() => setShowAddForm(true)}
          className="btn-primary rounded-xl"
        >
          <Plus className="w-5 h-5 mr-2" />
          নতুন গ্রাহক
        </Button>
      </div>

      {/* Total Due Card */}
      <div className="card-elevated p-6 bg-gradient-to-r from-due/10 to-due/5">
        <p className="text-muted-foreground mb-1">মোট বাকি</p>
        <p className="text-4xl font-bold text-due">৳{totalDue.toLocaleString()}</p>
        <p className="text-sm text-muted-foreground mt-2">
          {customersWithDue.length}জন গ্রাহক
        </p>
      </div>

      {/* Search by name or phone */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="নাম বা ফোন নম্বর দিয়ে খুঁজুন..."
          className="input-field pl-10"
        />
      </div>

      {/* Add Customer Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-card rounded-2xl shadow-soft border border-border p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-foreground">নতুন গ্রাহক যোগ করুন</h2>
              <button onClick={() => setShowAddForm(false)} className="p-2 hover:bg-muted rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">গ্রাহকের নাম</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="নাম লিখুন"
                  className="input-field"
                  autoFocus
                />
                <p className="text-xs text-muted-foreground mt-1">
                  💡 একই নামে গ্রাহক থাকলে স্বয়ংক্রিয়ভাবে নম্বর যোগ হবে (যেমন: রহিম, রহিম1, রহিম2)
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">মোবাইল নম্বর (ঐচ্ছিক)</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="01XXXXXXXXX"
                  className="input-field"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setShowAddForm(false)} className="flex-1 py-5 rounded-xl">
                  বাতিল
                </Button>
                <Button onClick={handleAddCustomer} className="flex-1 btn-primary py-5 rounded-xl">
                  যোগ করুন
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-card rounded-2xl shadow-soft border border-border p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-foreground">বাকি পরিশোধ</h2>
              <button onClick={() => setShowPaymentModal(null)} className="p-2 hover:bg-muted rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {getPayingCustomer() && (
                <div className="p-4 bg-muted/50 rounded-xl">
                  <p className="text-sm text-muted-foreground">গ্রাহক</p>
                  <p className="font-semibold text-foreground">{getPayingCustomer()?.displayName}</p>
                  <p className="text-sm text-muted-foreground mt-2">মোট বাকি</p>
                  <p className="text-xl font-bold text-due">৳{getPayingCustomer()?.totalDue.toLocaleString()}</p>
                  {getPayingCustomer()?.pendingProfit && getPayingCustomer()!.pendingProfit > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      (পেন্ডিং লাভ: ৳{getPayingCustomer()?.pendingProfit.toFixed(2)})
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">টাকার পরিমাণ (৳)</label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="0"
                  className="input-field text-2xl font-bold text-center"
                  autoFocus
                  min="0"
                  max={getPayingCustomer()?.totalDue || 0}
                />
              </div>

              <div className="p-3 bg-profit/10 rounded-lg">
                <p className="text-xs text-muted-foreground">
                  💡 পরিশোধের সাথে আনুপাতিক লাভ নগদে যোগ হবে। 
                  যেমন: ৳30 বাকিতে ৳5 লাভ থাকলে, ৳10 পরিশোধে ৳1.67 লাভ যোগ হবে।
                </p>
              </div>

              <Button 
                onClick={() => handlePayment(showPaymentModal)} 
                className="w-full btn-primary py-6 rounded-xl text-lg"
              >
                <CheckCircle className="w-5 h-5 mr-2" />
                পরিশোধ করুন
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Customer List */}
      <div className="space-y-3">
        {filteredCustomers.map((customer) => (
          <div
            key={customer.id}
            className="card-elevated p-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  customer.totalDue > 0 ? 'bg-due/10' : 'bg-accent'
                }`}>
                  <User className={`w-6 h-6 ${
                    customer.totalDue > 0 ? 'text-due' : 'text-primary'
                  }`} />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{customer.displayName}</p>
                  {customer.name !== customer.displayName && (
                    <p className="text-xs text-muted-foreground">({customer.name})</p>
                  )}
                  {customer.phone && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {customer.phone}
                    </p>
                  )}
                </div>
              </div>

              <div className="text-right">
                <p className={`text-xl font-bold ${
                  customer.totalDue > 0 ? 'text-due' : 'text-foreground'
                }`}>
                  ৳{customer.totalDue.toLocaleString()}
                </p>
                {customer.pendingProfit > 0 && (
                  <p className="text-xs text-muted-foreground">
                    লাভ: ৳{customer.pendingProfit.toFixed(2)}
                  </p>
                )}
                {customer.totalDue > 0 && (
                  <button
                    onClick={() => setShowPaymentModal(customer.id)}
                    className="text-sm text-primary hover:underline mt-1"
                  >
                    বাকি নিন →
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredCustomers.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>কোন গ্রাহক পাওয়া যায়নি</p>
        </div>
      )}
    </div>
  );
}
