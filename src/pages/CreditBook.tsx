import { useState, useMemo } from 'react';
import { BookOpen, Search, User, Phone, Plus, X, CheckCircle, AlertTriangle, MessageCircle, Send, Edit3, PhoneCall, Trash2, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { useStore } from '@/context/StoreContext';
import { useSubscription } from '@/context/SubscriptionContext';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { bn } from 'date-fns/locale';
import { PhoneInputWithCode } from '@/components/common/PhoneInputWithCode';

export default function CreditBook() {
  const { 
    customers, 
    storeInfo,
    addCustomer, 
    updateCustomer,
    deleteCustomer,
    payCustomerDue, 
    getExistingCustomersByName, 
    generateCustomerDisplayName,
    getUnpaidCustomers,
    getCustomersDueFor30Days,
    getZeroDueAccounts
  } = useStore();
  const { guardAddCustomer, guardFeature } = useSubscription();
  
  const [searchType, setSearchType] = useState<'name' | 'phone'>('name');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [formData, setFormData] = useState({ name: '', phone: '', countryCode: '+880' });
  const [showUnpaidOnly, setShowUnpaidOnly] = useState(false);
  const [initialDue, setInitialDue] = useState('');
  const [showCustomizeDue, setShowCustomizeDue] = useState(false);

  // Edit due amount state
  const [editingDueFor, setEditingDueFor] = useState<string | null>(null);
  const [editDueAmount, setEditDueAmount] = useState('');

  // WhatsApp Reminder State
  const [showReminderSection, setShowReminderSection] = useState(false);
  const [reminderMessage, setReminderMessage] = useState('');
  const [editingMessage, setEditingMessage] = useState(false);

  // "০ টাকা বাকি" cleanup reminder state (lives on the baki page only)
  const [showZeroDueSection, setShowZeroDueSection] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Check if today is 1st of month for monthly reminder
  const isFirstOfMonth = new Date().getDate() === 1;

  // Get unpaid customers (no payment in last month)
  const unpaidCustomers = useMemo(() => getUnpaidCustomers(), [getUnpaidCustomers]);
  
  // Get customers with baki > 30 days (for reminder)
  const customersDueFor30Days = useMemo(() => getCustomersDueFor30Days(), [getCustomersDueFor30Days]);

  // Get all customers with any baki (for monthly reminder)
  const customersWithBaki = useMemo(() => customers.filter(c => c.totalDue > 0), [customers]);

  // Get accounts sitting at ৳0 baki (still occupying an account slot in the limit)
  const zeroDueAccounts = useMemo(() => getZeroDueAccounts(), [getZeroDueAccounts, customers]);

  // Human-readable "X দিন ধরে" / "X মাস ধরে" text for how long an account has been at ৳0
  const formatZeroDuration = (date: Date | string): string => {
    const start = new Date(date);
    const diffDays = Math.max(0, Math.floor((Date.now() - start.getTime()) / (1000 * 60 * 60 * 24)));
    if (diffDays < 30) {
      return diffDays === 0 ? 'আজ থেকে' : `${diffDays} দিন ধরে`;
    }
    const months = Math.floor(diffDays / 30);
    const remDays = diffDays % 30;
    return remDays === 0 ? `${months} মাস ধরে` : `${months} মাস ${remDays} দিন ধরে`;
  };

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
    if (!guardAddCustomer()) return;

    const dueAmount = Math.max(0, parseFloat(initialDue) || 0);


    addCustomer({
      name: formData.name.trim(),
      phone: formData.phone,
      countryCode: formData.countryCode,
      whatsappNumber: formData.phone,
      totalDue: dueAmount,
    });

    toast({ title: "নতুন গ্রাহক যোগ হয়েছে ✓" });
    setShowAddForm(false);
    setFormData({ name: '', phone: '', countryCode: '+880' });
    setInitialDue('');
    setShowCustomizeDue(false);
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
      description: `৳${proportionalProfit.toFixed(2)} বাকির লাভে যোগ হয়েছে`
    });
    setShowPaymentModal(null);
    setPaymentAmount('');
  };

  const handleEditDue = (customerId: string) => {
    const newDue = parseFloat(editDueAmount);
    if (isNaN(newDue) || newDue < 0) {
      toast({ title: "সঠিক পরিমাণ দিন", variant: "destructive" });
      return;
    }

    updateCustomer(customerId, { totalDue: newDue });
    toast({ title: "বাকির পরিমাণ আপডেট হয়েছে ✓" });
    setEditingDueFor(null);
    setEditDueAmount('');
  };

  const getPayingCustomer = () => {
    return customers.find(c => c.id === showPaymentModal);
  };

  // Delete a ৳0-baki account. Frees one slot from the account limit
  // (subscription limit is based on total number of customer accounts).
  const handleDeleteZeroDueAccount = (customerId: string, displayName: string) => {
    if (confirmDeleteId !== customerId) {
      setConfirmDeleteId(customerId);
      return;
    }
    deleteCustomer(customerId);
    setConfirmDeleteId(null);
    toast({
      title: `"${displayName}" অ্যাকাউন্ট মুছে ফেলা হয়েছে ✓`,
      description: 'অ্যাকাউন্ট স্লট খালি হয়েছে',
    });
  };

  // Send WhatsApp message
  const sendWhatsAppMessage = (customer: typeof customers[0]) => {
    if (!guardFeature('whatsapp')) return;
    const phone = customer.whatsappNumber || customer.phone;
    if (!phone) {
      toast({ title: "WhatsApp নম্বর নেই", variant: "destructive" });
      return;
    }

    // Format phone number for WhatsApp
    let formattedPhone = phone.replace(/\s+/g, '');
    if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+' + formattedPhone;
    }

    // Replace [AMOUNT] placeholder with actual amount
    const message = (reminderMessage || defaultReminderMessage)
      .replace('[AMOUNT]', customer.totalDue.toLocaleString());

    // Create WhatsApp deep link
    const whatsappUrl = `https://wa.me/${formattedPhone.replace('+', '')}?text=${encodeURIComponent(message)}`;
    
    // Open WhatsApp
    window.open(whatsappUrl, '_blank');
  };

  // Call customer
  const callCustomer = (phone: string) => {
    window.location.href = `tel:${phone}`;
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
        <Button onClick={() => setShowAddForm(true)} className="btn-primary rounded-xl">
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

      {/* Monthly Reminder Button (Shows on 1st of month) */}
      {isFirstOfMonth && customersWithBaki.length > 0 && (
        <button
          onClick={handleShowReminders}
          className="w-full p-4 rounded-xl border-2 border-green-500 bg-green-50 transition-all flex items-center gap-3"
        >
          <MessageCircle className="w-6 h-6 text-green-600" />
          <div className="text-left flex-1">
            <p className="font-semibold text-foreground">
              মাসিক রিমাইন্ডার পাঠান ({customersWithBaki.length}জন)
            </p>
            <p className="text-sm text-muted-foreground">
              সব বাকিদারকে WhatsApp এ মনে করিয়ে দিন
            </p>
          </div>
        </button>
      )}

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
      {showReminderSection && (customersWithBaki.length > 0 || customersDueFor30Days.length > 0) && (
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
                {reminderMessage || defaultReminderMessage}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              💡 [AMOUNT] এর জায়গায় স্বয়ংক্রিয়ভাবে বাকির পরিমাণ বসবে
            </p>
          </div>

          {/* Customer List for Reminder */}
          <div className="border-t border-border pt-4">
            <p className="text-sm font-medium mb-3">গ্রাহক তালিকা:</p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {(isFirstOfMonth ? customersWithBaki : customersDueFor30Days).map((customer) => (
                <div
                  key={customer.id}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-xl"
                >
                  <div className="flex-1">
                    <p className="font-medium">{customer.displayName}</p>
                    <p className="text-sm text-muted-foreground">
                      {customer.whatsappNumber || customer.phone || 'নম্বর নেই'}
                    </p>
                    <p className="text-xs text-due font-medium">
                      বাকি: ৳{customer.totalDue.toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Call Button */}
                    {(customer.phone || customer.whatsappNumber) && (
                      <button
                        onClick={() => callCustomer(customer.phone || customer.whatsappNumber || '')}
                        className="p-2 bg-primary/10 hover:bg-primary/20 rounded-xl text-primary"
                        title="কল করুন"
                      >
                        <PhoneCall className="w-4 h-4" />
                      </button>
                    )}
                    {/* WhatsApp Button */}
                    <Button
                      onClick={() => sendWhatsAppMessage(customer)}
                      disabled={!customer.whatsappNumber && !customer.phone}
                      className="bg-green-500 hover:bg-green-600 text-white px-3"
                      size="sm"
                    >
                      <Send className="w-4 h-4 mr-1" />
                      পাঠান
                    </Button>
                  </div>
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

      {/* ৳0 Baki Cleanup Reminder (baki page only, not dashboard) */}
      {zeroDueAccounts.length > 0 && (
        <div className="space-y-0">
          <button
            onClick={() => setShowZeroDueSection(!showZeroDueSection)}
            className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${
              showZeroDueSection ? 'border-primary bg-primary/5' : 'border-slate-300 bg-slate-50'
            }`}
          >
            <Clock className={`w-6 h-6 ${showZeroDueSection ? 'text-primary' : 'text-slate-500'}`} />
            <div className="text-left flex-1">
              <p className="font-semibold text-foreground">
                ৳০ বাকি এমন অ্যাকাউন্ট আছে ({zeroDueAccounts.length}জন)
              </p>
              <p className="text-sm text-muted-foreground">
                এই অ্যাকাউন্টগুলো এখনো আপনার লিমিটের জায়গা দখল করে আছে
              </p>
            </div>
            {showZeroDueSection ? (
              <ChevronUp className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            )}
          </button>

          {showZeroDueSection && (
            <div className="card-elevated p-4 mt-3 space-y-2 animate-fade-in max-h-80 overflow-y-auto">
              {zeroDueAccounts.map((customer) => {
                const zeroSince = customer.dueClearedAt || customer.createdAt;
                const isConfirming = confirmDeleteId === customer.id;
                return (
                  <div
                    key={customer.id}
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-xl"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{customer.displayName}</p>
                      {customer.phone && (
                        <p className="text-xs text-muted-foreground">{customer.phone}</p>
                      )}
                      <p className="text-xs text-primary font-medium mt-0.5">
                        {formatZeroDuration(zeroSince)} ৳০ বাকি
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {isConfirming && (
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-3 py-2 bg-muted hover:bg-muted/80 rounded-lg text-xs font-medium"
                        >
                          বাতিল
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteZeroDueAccount(customer.id, customer.displayName)}
                        className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                          isConfirming
                            ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                            : 'bg-red-100 text-red-600 hover:bg-red-200'
                        }`}
                        title="অ্যাকাউন্ট মুছুন"
                      >
                        <Trash2 className="w-4 h-4" />
                        {isConfirming ? 'নিশ্চিত মুছুন' : 'মুছুন'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
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

      {/* Add Customer Modal - Simplified: Only Name + WhatsApp Phone + Customize Baki */}
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
              {/* Name Field */}
              <div>
                <label className="block text-sm font-medium mb-2">গ্রাহকের নাম *</label>
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
                      "{formData.name}" নামে {existingCustomersWithSameName.length}জন গ্রাহক আছে
                    </p>
                    <div className="mt-3 p-2 bg-primary/10 rounded-lg">
                      <p className="text-sm text-primary font-medium">
                        ✓ নতুন গ্রাহক হবে: <strong>{generateCustomerDisplayName(formData.name)}</strong>
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* WhatsApp Phone Field with Country Code */}
              <PhoneInputWithCode
                value={formData.phone}
                onChange={(phone, code) => setFormData({ ...formData, phone, countryCode: code })}
                label="WhatsApp নম্বর (অটো মেসেজের জন্য)"
              />

              {/* Customize Baki Toggle */}
              <div className="border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => setShowCustomizeDue(!showCustomizeDue)}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                >
                  <span className="text-sm font-medium flex items-center gap-2">
                    <Edit3 className="w-4 h-4" />
                    কাস্টমাইজ করুন (আগে থেকে বাকি আছে?)
                  </span>
                  <span className={`text-sm font-medium ${showCustomizeDue ? 'text-primary' : 'text-muted-foreground'}`}>
                    {showCustomizeDue ? 'হ্যাঁ' : 'না'}
                  </span>
                </button>

                {showCustomizeDue && (
                  <div className="mt-3 animate-fade-in">
                    <label className="block text-sm font-medium mb-2">বাকির পরিমাণ (৳)</label>
                    <input
                      type="number"
                      value={initialDue}
                      onChange={(e) => setInitialDue(e.target.value)}
                      placeholder="0"
                      className="input-field"
                      min="0"
                    />
                  </div>
                )}
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

      {/* Customer List */}
      <div className="space-y-3">
        {filteredCustomers.map((customer) => (
          <div
            key={customer.id}
            className={`card-elevated p-4 transition-all ${
              customer.totalDue > 0 ? 'border-l-4 border-l-due' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="font-semibold text-foreground text-lg">{customer.displayName}</p>
                {customer.phone && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {customer.phone}
                  </p>
                )}
                {customer.bakiCreatedAt && customer.totalDue > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    বাকি শুরু: {format(new Date(customer.bakiCreatedAt), 'dd MMM yyyy', { locale: bn })}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3">
                {/* Due Amount with Edit */}
                {editingDueFor === customer.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={editDueAmount}
                      onChange={(e) => setEditDueAmount(e.target.value)}
                      className="w-24 text-center font-bold bg-card rounded-lg border border-border p-1"
                      autoFocus
                      min="0"
                    />
                    <button
                      onClick={() => handleEditDue(customer.id)}
                      className="p-1 bg-primary/10 hover:bg-primary/20 rounded-lg text-primary"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setEditingDueFor(null)}
                      className="p-1 bg-muted hover:bg-muted/80 rounded-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setEditingDueFor(customer.id);
                      setEditDueAmount(customer.totalDue.toString());
                    }}
                    className="flex items-center gap-1.5 group"
                    title="বাকির পরিমাণ কাস্টমাইজ করুন"
                  >
                    <span className={`text-xl font-bold ${customer.totalDue > 0 ? 'text-due' : 'text-profit'}`}>
                      ৳{customer.totalDue.toLocaleString()}
                    </span>
                    <span className="p-1.5 bg-primary/10 group-hover:bg-primary/20 rounded-lg text-primary transition-colors">
                      <Edit3 className="w-4 h-4" />
                    </span>
                  </button>
                )}

                {/* Action Buttons */}
                <div className="flex items-center gap-1">
                  {/* Call Button */}
                  {customer.phone && (
                    <button
                      onClick={() => callCustomer(customer.phone!)}
                      className="p-2 bg-primary/10 hover:bg-primary/20 rounded-xl text-primary"
                      title="কল করুন"
                    >
                      <PhoneCall className="w-5 h-5" />
                    </button>
                  )}
                  {/* Message Button */}
                  {(customer.phone || customer.whatsappNumber) && (
                    <button
                      onClick={() => sendWhatsAppMessage(customer)}
                      className="p-2 bg-green-100 hover:bg-green-200 rounded-xl text-green-600"
                      title="WhatsApp বার্তা"
                    >
                      <MessageCircle className="w-5 h-5" />
                    </button>
                  )}
                  {/* Pay Button */}
                  {customer.totalDue > 0 && (
                    <Button
                      onClick={() => setShowPaymentModal(customer.id)}
                      size="sm"
                      className="bg-profit hover:bg-profit/90 text-white"
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      পরিশোধ
                    </Button>
                  )}
                </div>
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
              <div className="p-4 bg-due/10 rounded-xl">
                <p className="text-sm text-muted-foreground">মোট বাকি</p>
                <p className="text-3xl font-bold text-due">
                  ৳{getPayingCustomer()?.totalDue.toLocaleString()}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">কত টাকা পরিশোধ করছে?</label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="টাকার পরিমাণ"
                  className="input-field text-xl"
                  autoFocus
                  min="0"
                />
              </div>

              {/* Quick Amount Buttons */}
              <div className="flex gap-2 flex-wrap">
                {[100, 500, 1000].map(amount => (
                  <button
                    key={amount}
                    onClick={() => setPaymentAmount(amount.toString())}
                    className="px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg text-sm"
                  >
                    ৳{amount}
                  </button>
                ))}
                <button
                  onClick={() => setPaymentAmount(getPayingCustomer()?.totalDue.toString() || '')}
                  className="px-4 py-2 bg-profit/10 hover:bg-profit/20 text-profit rounded-lg text-sm"
                >
                  সম্পূর্ণ
                </button>
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setShowPaymentModal(null)} className="flex-1 py-5 rounded-xl">
                  বাতিল
                </Button>
                <Button 
                  onClick={() => handlePayment(showPaymentModal)} 
                  className="flex-1 bg-profit hover:bg-profit/90 text-white py-5 rounded-xl"
                >
                  <CheckCircle className="w-5 h-5 mr-2" />
                  পরিশোধ করুন
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
