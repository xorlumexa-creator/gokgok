import { useState, useMemo } from 'react';
import { BookOpen, Search, User, Phone, Plus, X, CheckCircle, AlertTriangle, MessageCircle, Send, Edit3 } from 'lucide-react';
import { useStore } from '@/context/StoreContext';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { bn } from 'date-fns/locale';

export default function CreditBook() {
  const { 
    customers, 
    storeInfo,
    addCustomer, 
    updateCustomer,
    payCustomerDue, 
    getExistingCustomersByName, 
    generateCustomerDisplayName,
    getUnpaidCustomers,
    getCustomersDueFor30Days
  } = useStore();
  
  const [searchType, setSearchType] = useState<'name' | 'phone'>('name');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [formData, setFormData] = useState({ name: '', phone: '', whatsappNumber: '' });
  const [showUnpaidOnly, setShowUnpaidOnly] = useState(false);
  const [initialDue, setInitialDue] = useState('');

  // WhatsApp Reminder State
  const [showReminderSection, setShowReminderSection] = useState(false);
  const [reminderMessage, setReminderMessage] = useState('');
  const [editingMessage, setEditingMessage] = useState(false);

  // Get unpaid customers (no payment in last month)
  const unpaidCustomers = useMemo(() => getUnpaidCustomers(), [getUnpaidCustomers]);
  
  // Get customers with baki > 30 days (for reminder)
  const customersDueFor30Days = useMemo(() => getCustomersDueFor30Days(), [getCustomersDueFor30Days]);

  // Default reminder message template
  const defaultReminderMessage = `আসসালামু আলাইকুম,

আপনার সদয় অবগতির জন্য জানানো যাচ্ছে যে,
${storeInfo?.name || 'আমাদের দোকানে'} এ আপনার বাকি টাকা বর্তমানে
৳[AMOUNT]।

সুবিধা হলে পরিশোধ করবেন।
ধন্যবাদ।`;

  // Check for existing customers with same name when adding new
  const existingCustomersWithSameName = useMemo(() => {
    return getExistingCustomersByName(formData.name);
  }, [formData.name, getExistingCustomersByName]);

  // Filter by name or phone based on search type
  const filteredCustomers = useMemo(() => {
    let baseList = showUnpaidOnly ? unpaidCustomers : customers;
    
    if (!searchTerm.trim()) return baseList;
    
    if (searchType === 'phone') {
      return baseList.filter(c => c.phone && c.phone.includes(searchTerm.trim()));
    }
    
    const lowerSearch = searchTerm.toLowerCase();
    return baseList.filter(c =>
      c.name.toLowerCase().includes(lowerSearch) ||
      c.displayName.toLowerCase().includes(lowerSearch)
    );
  }, [customers, unpaidCustomers, searchTerm, searchType, showUnpaidOnly]);

  const totalDue = customers.reduce((sum, c) => sum + c.totalDue, 0);
  const customersWithDue = customers.filter(c => c.totalDue > 0);

  const handleAddCustomer = () => {
    if (!formData.name.trim()) {
      toast({ title: "গ্রাহকের নাম দিন", variant: "destructive" });
      return;
    }

    const dueAmount = Math.max(0, parseFloat(initialDue) || 0);

    addCustomer({
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      whatsappNumber: formData.whatsappNumber.trim() || formData.phone.trim(),
      totalDue: dueAmount,
    });

    toast({ title: "নতুন গ্রাহক যোগ হয়েছে ✓" });
    setShowAddForm(false);
    setFormData({ name: '', phone: '', whatsappNumber: '' });
    setInitialDue('');
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

  // Send WhatsApp message
  const sendWhatsAppMessage = (customer: typeof customers[0]) => {
    const phone = customer.whatsappNumber || customer.phone;
    if (!phone) {
      toast({ title: "WhatsApp নম্বর নেই", variant: "destructive" });
      return;
    }

    // Format phone number (remove spaces, add country code if needed)
    let formattedPhone = phone.replace(/\s+/g, '').replace(/^0/, '88');
    if (!formattedPhone.startsWith('88')) {
      formattedPhone = '88' + formattedPhone;
    }

    // Replace [AMOUNT] placeholder with actual amount
    const message = (reminderMessage || defaultReminderMessage)
      .replace('[AMOUNT]', customer.totalDue.toLocaleString());

    // Create WhatsApp deep link
    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
    
    // Open WhatsApp
    window.open(whatsappUrl, '_blank');
  };

  const handleShowReminders = () => {
    setShowReminderSection(!showReminderSection);
    if (!reminderMessage) {
      setReminderMessage(defaultReminderMessage);
    }
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

      {/* 30+ Days Reminder Button */}
      {customersDueFor30Days.length > 0 && (
        <button
          onClick={handleShowReminders}
          className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${
            showReminderSection 
              ? 'border-green-500 bg-green-50' 
              : 'border-primary bg-primary/5'
          }`}
        >
          <MessageCircle className={`w-6 h-6 ${showReminderSection ? 'text-green-600' : 'text-primary'}`} />
          <div className="text-left flex-1">
            <p className="font-semibold text-foreground">
              ১ মাসের বেশি বাকি আছে ({customersDueFor30Days.length}জন)
            </p>
            <p className="text-sm text-muted-foreground">
              {showReminderSection ? 'রিমাইন্ডার বন্ধ করুন' : 'WhatsApp এ মনে করিয়ে দিন'}
            </p>
          </div>
        </button>
      )}

      {/* WhatsApp Reminder Section */}
      {showReminderSection && customersDueFor30Days.length > 0 && (
        <div className="card-elevated p-4 space-y-4 animate-fade-in">
          {/* Message Editor */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">বার্তা (সম্পাদনা করতে পারবেন):</label>
              <button
                onClick={() => setEditingMessage(!editingMessage)}
                className="text-sm text-primary flex items-center gap-1"
              >
                <Edit3 className="w-4 h-4" />
                {editingMessage ? 'সংরক্ষণ' : 'সম্পাদনা'}
              </button>
            </div>
            {editingMessage ? (
              <textarea
                value={reminderMessage}
                onChange={(e) => setReminderMessage(e.target.value)}
                className="input-field min-h-[150px] text-sm"
                placeholder="বার্তা লিখুন..."
              />
            ) : (
              <div className="p-3 bg-muted/50 rounded-xl text-sm whitespace-pre-line">
                {reminderMessage}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              💡 [AMOUNT] এর জায়গায় স্বয়ংক্রিয়ভাবে বাকির পরিমাণ বসবে
            </p>
          </div>

          {/* Customer List for Reminder */}
          <div className="border-t border-border pt-4">
            <p className="text-sm font-medium mb-3">গ্রাহক তালিকা:</p>
            <p className="text-xs text-muted-foreground mb-3">
              ⚠️ গ্রাহকের সম্মতিতে WhatsApp বার্তা পাঠানো হবে
            </p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {customersDueFor30Days.map((customer) => (
                <div
                  key={customer.id}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-xl"
                >
                  <div>
                    <p className="font-medium">{customer.displayName}</p>
                    <p className="text-sm text-muted-foreground">
                      {customer.whatsappNumber || customer.phone || 'নম্বর নেই'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      বাকি: ৳{customer.totalDue.toLocaleString()} | 
                      {customer.bakiCreatedAt && ` তারিখ: ${format(new Date(customer.bakiCreatedAt), 'dd MMM yyyy', { locale: bn })}`}
                    </p>
                  </div>
                  <Button
                    onClick={() => sendWhatsAppMessage(customer)}
                    disabled={!customer.whatsappNumber && !customer.phone}
                    className="bg-green-500 hover:bg-green-600 text-white px-4"
                    size="sm"
                  >
                    <Send className="w-4 h-4 mr-1" />
                    পাঠান
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Unpaid Alert */}
      {unpaidCustomers.length > 0 && (
        <button
          onClick={() => setShowUnpaidOnly(!showUnpaidOnly)}
          className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${
            showUnpaidOnly 
              ? 'border-due bg-due/10' 
              : 'border-amber-300 bg-amber-50'
          }`}
        >
          <AlertTriangle className={`w-6 h-6 ${showUnpaidOnly ? 'text-due' : 'text-amber-600'}`} />
          <div className="text-left flex-1">
            <p className="font-semibold text-foreground">
              {unpaidCustomers.length}জন গ্রাহক এক মাসে কোন টাকা দেননি
            </p>
            <p className="text-sm text-muted-foreground">
              {showUnpaidOnly ? 'সব গ্রাহক দেখুন' : 'শুধু এদের দেখুন'}
            </p>
          </div>
        </button>
      )}

      {/* Search Type Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => {
            setSearchType('name');
            setSearchTerm('');
          }}
          className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all flex items-center justify-center gap-2 ${
            searchType === 'name' 
              ? 'border-primary bg-primary/5 text-primary' 
              : 'border-border bg-card text-muted-foreground'
          }`}
        >
          <User className="w-5 h-5" />
          <span className="font-medium">নাম দিয়ে খুঁজুন</span>
        </button>
        <button
          onClick={() => {
            setSearchType('phone');
            setSearchTerm('');
          }}
          className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all flex items-center justify-center gap-2 ${
            searchType === 'phone' 
              ? 'border-primary bg-primary/5 text-primary' 
              : 'border-border bg-card text-muted-foreground'
          }`}
        >
          <Phone className="w-5 h-5" />
          <span className="font-medium">ফোন দিয়ে খুঁজুন</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        {searchType === 'name' ? (
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        ) : (
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        )}
        <input
          type={searchType === 'phone' ? 'tel' : 'text'}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={searchType === 'phone' ? "ফোন নম্বর দিন..." : "গ্রাহকের নাম লিখুন..."}
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
                
                {/* Show existing customers with same name */}
                {existingCustomersWithSameName.length > 0 && (
                  <div className="mt-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                    <p className="text-sm font-semibold text-amber-800 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      "{formData.name}" নামে {existingCustomersWithSameName.length}জন গ্রাহক আছে:
                    </p>
                    <ul className="mt-2 space-y-1">
                      {existingCustomersWithSameName.map((c, index) => (
                        <li key={c.id} className="text-sm text-amber-700 flex items-center gap-2">
                          <span className="font-medium">{index + 1}.</span>
                          <span className="font-semibold">{c.displayName}</span>
                          {c.phone && <span className="text-xs">({c.phone})</span>}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-3 p-2 bg-primary/10 rounded-lg">
                      <p className="text-sm text-primary font-medium">
                        ✓ নতুন গ্রাহক হবে: <strong>{generateCustomerDisplayName(formData.name)}</strong>
                      </p>
                    </div>
                  </div>
                )}
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
              <div>
                <label className="block text-sm font-medium mb-2">
                  <MessageCircle className="w-4 h-4 inline mr-1" />
                  WhatsApp নম্বর (ঐচ্ছিক)
                </label>
                <input
                  type="tel"
                  value={formData.whatsappNumber}
                  onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
                  placeholder="আলাদা হলে দিন, না হলে ফোন নম্বর ব্যবহার হবে"
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">প্রাথমিক বাকি (৳) - ঐচ্ছিক</label>
                <input
                  type="number"
                  value={initialDue}
                  onChange={(e) => setInitialDue(e.target.value)}
                  placeholder="0"
                  min="0"
                  className="input-field"
                />
                <p className="text-xs text-muted-foreground mt-1">গ্রাহকের আগে থেকে বাকি থাকলে এখানে দিন</p>
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
                  {getPayingCustomer()?.phone && (
                    <p className="text-sm text-muted-foreground">{getPayingCustomer()?.phone}</p>
                  )}
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
        {filteredCustomers.map((customer) => {
          const isUnpaid = unpaidCustomers.some(c => c.id === customer.id);
          return (
            <div
              key={customer.id}
              className={`card-elevated p-4 ${isUnpaid ? 'border-l-4 border-l-due' : ''}`}
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
                    {isUnpaid && (
                      <p className="text-xs text-due font-medium mt-1">
                        ⚠️ ১ মাসে পরিশোধ করেননি
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
          );
        })}
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
