import { useState } from 'react';
import { User, TrendingUp, TrendingDown, Wallet, Calendar, Plus, X, Minus, PiggyBank, Coins, Banknote, CreditCard } from 'lucide-react';
import { useStore } from '@/context/StoreContext';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

export default function PersonalAccounts() {
  const { getPersonalAccountStats, expenses, customEarnings, bakiPaymentRecords, addExpense, addCustomEarning } = useStore();
  const [activeTab, setActiveTab] = useState<'earning' | 'expense'>('earning');
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddEarning, setShowAddEarning] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    description: '',
    amount: '',
    category: 'general',
  });
  const [earningForm, setEarningForm] = useState({
    description: '',
    amount: '',
    category: 'other',
  });

  const stats = getPersonalAccountStats();

  const expenseCategories = [
    { value: 'general', label: 'সাধারণ' },
    { value: 'food', label: 'খাবার' },
    { value: 'transport', label: 'যাতায়াত' },
    { value: 'bills', label: 'বিল' },
    { value: 'family', label: 'পরিবার' },
    { value: 'other', label: 'অন্যান্য' },
  ];

  const earningCategories = [
    { value: 'other_income', label: 'অন্যান্য আয়' },
    { value: 'investment', label: 'বিনিয়োগ থেকে' },
    { value: 'gift', label: 'উপহার' },
    { value: 'refund', label: 'ফেরত' },
    { value: 'other', label: 'অন্যান্য' },
  ];

  // Filter expenses by time period
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const thisWeekStart = new Date(today);
  thisWeekStart.setDate(today.getDate() - today.getDay());

  const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const todayExpenses = expenses.filter(e => new Date(e.createdAt) >= today);
  const weekExpenses = expenses.filter(e => new Date(e.createdAt) >= thisWeekStart);
  const monthExpenses = expenses.filter(e => new Date(e.createdAt) >= thisMonthStart);

  const todayExpenseTotal = todayExpenses.reduce((sum, e) => sum + e.amount, 0);
  const weekExpenseTotal = weekExpenses.reduce((sum, e) => sum + e.amount, 0);
  const monthExpenseTotal = monthExpenses.reduce((sum, e) => sum + e.amount, 0);

  const handleAddExpense = () => {
    if (!expenseForm.description.trim()) {
      toast({ title: "খরচের বিবরণ দিন", variant: "destructive" });
      return;
    }
    const amount = parseFloat(expenseForm.amount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: "সঠিক টাকার পরিমাণ দিন", variant: "destructive" });
      return;
    }

    addExpense({
      description: expenseForm.description.trim(),
      amount,
      category: expenseForm.category,
    });

    toast({ title: "খরচ যোগ হয়েছে ✓" });
    setShowAddExpense(false);
    setExpenseForm({ description: '', amount: '', category: 'general' });
  };

  const handleAddEarning = () => {
    if (!earningForm.description.trim()) {
      toast({ title: "আয়ের বিবরণ দিন", variant: "destructive" });
      return;
    }
    const amount = parseFloat(earningForm.amount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: "সঠিক টাকার পরিমাণ দিন", variant: "destructive" });
      return;
    }

    addCustomEarning({
      description: earningForm.description.trim(),
      amount,
      category: earningForm.category,
    });

    toast({ title: "আয় যোগ হয়েছে ✓" });
    setShowAddEarning(false);
    setEarningForm({ description: '', amount: '', category: 'other' });
  };

  // Recent baki payments for display
  const recentBakiPayments = bakiPaymentRecords.slice(-10).reverse();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-xl">
            <User className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">ব্যক্তিগত হিসাব</h1>
            <p className="text-muted-foreground">আপনার আয় ও খরচ</p>
          </div>
        </div>
      </div>

      {/* Net Earning Card */}
      <div className="card-elevated p-6 bg-gradient-to-r from-primary/10 to-primary/5">
        <div className="flex items-center gap-2 mb-2">
          <PiggyBank className="w-5 h-5 text-primary" />
          <p className="text-muted-foreground">নেট আয় (আয় - খরচ)</p>
        </div>
        <p className={`text-4xl font-bold ${stats.netEarning >= 0 ? 'text-profit' : 'text-due'}`}>
          ৳{stats.netEarning.toLocaleString()}
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          মোট আয়: ৳{stats.totalEarnings.toLocaleString()} | মোট খরচ: ৳{stats.totalExpenses.toLocaleString()}
        </p>
      </div>

      {/* Tab Switch */}
      <div className="flex gap-2 p-1 bg-muted rounded-xl">
        <button
          onClick={() => setActiveTab('earning')}
          className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
            activeTab === 'earning'
              ? 'bg-card text-profit shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          আয়
        </button>
        <button
          onClick={() => setActiveTab('expense')}
          className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
            activeTab === 'expense'
              ? 'bg-card text-due shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <TrendingDown className="w-4 h-4" />
          খরচ
        </button>
      </div>

      {/* Earning Tab */}
      {activeTab === 'earning' && (
        <div className="space-y-4 animate-fade-in">
          {/* Add Custom Earning Button */}
          <Button
            onClick={() => setShowAddEarning(true)}
            variant="outline"
            className="w-full py-6 rounded-xl border-profit text-profit hover:bg-profit/10"
          >
            <Plus className="w-5 h-5 mr-2" />
            কাস্টম আয় যোগ করুন
          </Button>

          {/* Earnings Breakdown */}
          <div className="grid grid-cols-1 gap-3">
            {/* Cash Sales Profit */}
            <div className="p-4 bg-profit/10 rounded-xl border border-profit/20">
              <div className="flex items-center gap-2 mb-2">
                <Banknote className="w-5 h-5 text-profit" />
                <p className="text-sm font-medium text-foreground">নগদ বিক্রির লাভ</p>
              </div>
              <p className="text-2xl font-bold text-profit">৳{stats.totalCashProfit.toLocaleString()}</p>
              <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                <span>আজ: ৳{stats.todayCashProfit.toLocaleString()}</span>
                <span>সপ্তাহ: ৳{stats.weekCashProfit.toLocaleString()}</span>
                <span>মাস: ৳{stats.monthCashProfit.toLocaleString()}</span>
              </div>
            </div>

            {/* Baki Payment Profit */}
            <div className="p-4 bg-amber-500/10 rounded-xl border border-amber-500/20">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="w-5 h-5 text-amber-600" />
                <p className="text-sm font-medium text-foreground">বাকি পরিশোধ থেকে লাভ</p>
              </div>
              <p className="text-2xl font-bold text-amber-600">৳{stats.totalBakiProfit.toLocaleString()}</p>
              <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                <span>আজ: ৳{stats.todayBakiProfit.toLocaleString()}</span>
                <span>সপ্তাহ: ৳{stats.weekBakiProfit.toLocaleString()}</span>
                <span>মাস: ৳{stats.monthBakiProfit.toLocaleString()}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                💡 যখন গ্রাহক বাকি শোধ করে, তখন আনুপাতিক হারে লাভ এখানে যোগ হয়
              </p>
            </div>

            {/* Custom Earnings */}
            {stats.totalCustomEarnings > 0 && (
              <div className="p-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <Coins className="w-5 h-5 text-blue-600" />
                  <p className="text-sm font-medium text-foreground">অন্যান্য আয়</p>
                </div>
                <p className="text-2xl font-bold text-blue-600">৳{stats.totalCustomEarnings.toLocaleString()}</p>
              </div>
            )}
          </div>

          {/* Period-wise Summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="card-elevated p-4 text-center">
              <Calendar className="w-4 h-4 mx-auto mb-2 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">আজ</p>
              <p className="text-lg font-bold text-profit">
                ৳{(stats.todayCashProfit + stats.todayBakiProfit).toLocaleString()}
              </p>
            </div>
            <div className="card-elevated p-4 text-center">
              <Calendar className="w-4 h-4 mx-auto mb-2 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">এই সপ্তাহ</p>
              <p className="text-lg font-bold text-profit">
                ৳{(stats.weekCashProfit + stats.weekBakiProfit).toLocaleString()}
              </p>
            </div>
            <div className="card-elevated p-4 text-center">
              <Calendar className="w-4 h-4 mx-auto mb-2 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">এই মাস</p>
              <p className="text-lg font-bold text-profit">
                ৳{(stats.monthCashProfit + stats.monthBakiProfit).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Recent Baki Payments */}
          {recentBakiPayments.length > 0 && (
            <div className="card-elevated p-4">
              <h3 className="font-semibold text-foreground mb-4">সাম্প্রতিক বাকি পরিশোধ</h3>
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {recentBakiPayments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium text-foreground">{payment.customerName}</p>
                      <p className="text-xs text-muted-foreground">
                        পরিশোধ: ৳{payment.paymentAmount.toLocaleString()} • {new Date(payment.createdAt).toLocaleDateString('bn-BD')}
                      </p>
                    </div>
                    <p className="font-bold text-profit">+৳{payment.profitEarned.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Custom Earnings */}
          {customEarnings.length > 0 && (
            <div className="card-elevated p-4">
              <h3 className="font-semibold text-foreground mb-4">কাস্টম আয়</h3>
              <div className="space-y-3 max-h-40 overflow-y-auto">
                {customEarnings.slice(-5).reverse().map((earning) => (
                  <div key={earning.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium text-foreground">{earning.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {earningCategories.find(c => c.value === earning.category)?.label} • {new Date(earning.createdAt).toLocaleDateString('bn-BD')}
                      </p>
                    </div>
                    <p className="font-bold text-profit">+৳{earning.amount.toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="p-4 bg-muted/50 rounded-xl">
            <p className="text-sm text-muted-foreground">
              💡 <strong>নগদ আয়</strong> = নগদ বিক্রির লাভ + বাকি পরিশোধ থেকে লাভ + কাস্টম আয়। বাকিতে বিক্রির লাভ গ্রাহক পরিশোধ করলে আনুপাতিক হারে যোগ হয়।
            </p>
          </div>
        </div>
      )}

      {/* Expense Tab */}
      {activeTab === 'expense' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="p-4 bg-due/10 rounded-xl border border-due/20 flex-1 mr-3">
              <p className="text-sm text-muted-foreground mb-1">মোট খরচ</p>
              <p className="text-3xl font-bold text-due">৳{stats.totalExpenses.toLocaleString()}</p>
            </div>
            <Button
              onClick={() => setShowAddExpense(true)}
              className="btn-primary rounded-xl h-full py-6"
            >
              <Plus className="w-5 h-5 mr-2" />
              খরচ যোগ
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="card-elevated p-4 text-center">
              <Calendar className="w-4 h-4 mx-auto mb-2 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">আজ</p>
              <p className="text-lg font-bold text-due">৳{todayExpenseTotal.toLocaleString()}</p>
            </div>
            <div className="card-elevated p-4 text-center">
              <Calendar className="w-4 h-4 mx-auto mb-2 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">এই সপ্তাহ</p>
              <p className="text-lg font-bold text-due">৳{weekExpenseTotal.toLocaleString()}</p>
            </div>
            <div className="card-elevated p-4 text-center">
              <Calendar className="w-4 h-4 mx-auto mb-2 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">এই মাস</p>
              <p className="text-lg font-bold text-due">৳{monthExpenseTotal.toLocaleString()}</p>
            </div>
          </div>

          {/* Recent Expenses */}
          <div className="card-elevated p-4">
            <h3 className="font-semibold text-foreground mb-4">সাম্প্রতিক খরচ</h3>
            <div className="space-y-3">
              {expenses.slice(-10).reverse().map((expense) => (
                <div key={expense.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium text-foreground">{expense.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {expenseCategories.find(c => c.value === expense.category)?.label} • {new Date(expense.createdAt).toLocaleDateString('bn-BD')}
                    </p>
                  </div>
                  <p className="font-bold text-due">-৳{expense.amount.toLocaleString()}</p>
                </div>
              ))}
              {expenses.length === 0 && (
                <p className="text-center text-muted-foreground py-4">কোন খরচ নেই</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Expense Modal */}
      {showAddExpense && (
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-card rounded-2xl shadow-soft border border-border p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-foreground">খরচ যোগ করুন</h2>
              <button onClick={() => setShowAddExpense(false)} className="p-2 hover:bg-muted rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">খরচের বিবরণ</label>
                <input
                  type="text"
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  placeholder="যেমন: বাজার, বিল, যাতায়াত..."
                  className="input-field"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">টাকার পরিমাণ (৳)</label>
                <input
                  type="number"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  placeholder="0"
                  className="input-field text-xl font-bold"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">ক্যাটাগরি</label>
                <select
                  value={expenseForm.category}
                  onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                  className="input-field"
                >
                  {expenseCategories.map((cat) => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setShowAddExpense(false)} className="flex-1 py-5 rounded-xl">
                  বাতিল
                </Button>
                <Button onClick={handleAddExpense} className="flex-1 btn-primary py-5 rounded-xl">
                  <Minus className="w-4 h-4 mr-2" />
                  খরচ যোগ করুন
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Earning Modal */}
      {showAddEarning && (
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-card rounded-2xl shadow-soft border border-border p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-foreground">কাস্টম আয় যোগ করুন</h2>
              <button onClick={() => setShowAddEarning(false)} className="p-2 hover:bg-muted rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">আয়ের বিবরণ</label>
                <input
                  type="text"
                  value={earningForm.description}
                  onChange={(e) => setEarningForm({ ...earningForm, description: e.target.value })}
                  placeholder="যেমন: অন্য ব্যবসা থেকে, ভাড়া..."
                  className="input-field"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">টাকার পরিমাণ (৳)</label>
                <input
                  type="number"
                  value={earningForm.amount}
                  onChange={(e) => setEarningForm({ ...earningForm, amount: e.target.value })}
                  placeholder="0"
                  className="input-field text-xl font-bold"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">ক্যাটাগরি</label>
                <select
                  value={earningForm.category}
                  onChange={(e) => setEarningForm({ ...earningForm, category: e.target.value })}
                  className="input-field"
                >
                  {earningCategories.map((cat) => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setShowAddEarning(false)} className="flex-1 py-5 rounded-xl">
                  বাতিল
                </Button>
                <Button onClick={handleAddEarning} className="flex-1 py-5 rounded-xl bg-profit hover:bg-profit/90 text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  আয় যোগ করুন
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
