import { useState } from 'react';
import { User, TrendingUp, TrendingDown, Plus, X, Minus, PiggyBank, Banknote, CreditCard } from 'lucide-react';
import { useStore } from '@/context/StoreContext';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

export default function PersonalAccounts() {
  const { expenses, customEarnings, addExpense, addCustomEarning } = useStore();
  const [activeTab, setActiveTab] = useState<'earning' | 'expense'>('earning');
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddEarning, setShowAddEarning] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ description: '', amount: '', category: 'general' });
  const [earningForm, setEarningForm] = useState({ description: '', amount: '', category: 'other' });

  const expenseCategories = [
    { value: 'general', label: 'সাধারণ' },
    { value: 'food', label: 'খাবার' },
    { value: 'transport', label: 'যাতায়াত' },
    { value: 'bills', label: 'বিল' },
    { value: 'family', label: 'পরিবার' },
    { value: 'other', label: 'অন্যান্য' },
  ];

  const earningCategories = [
    { value: 'nagad', label: 'নগদ আয়' },
    { value: 'baki', label: 'বাকি আয়' },
    { value: 'other_income', label: 'অন্যান্য আয়' },
    { value: 'investment', label: 'বিনিয়োগ থেকে' },
    { value: 'gift', label: 'উপহার' },
    { value: 'other', label: 'অন্যান্য' },
  ];

  // Calculate totals from manual entries
  const totalEarnings = customEarnings.reduce((sum, e) => sum + e.amount, 0);
  const nagadEarnings = customEarnings.filter(e => e.category === 'nagad').reduce((sum, e) => sum + e.amount, 0);
  const bakiEarnings = customEarnings.filter(e => e.category === 'baki').reduce((sum, e) => sum + e.amount, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const netEarning = totalEarnings - totalExpenses;

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
    addExpense({ description: expenseForm.description.trim(), amount, category: expenseForm.category });
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
    addCustomEarning({ description: earningForm.description.trim(), amount, category: earningForm.category });
    toast({ title: "আয় যোগ হয়েছে ✓" });
    setShowAddEarning(false);
    setEarningForm({ description: '', amount: '', category: 'other' });
  };

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
        <p className={`text-4xl font-bold ${netEarning >= 0 ? 'text-profit' : 'text-due'}`}>
          ৳{netEarning.toLocaleString()}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card-elevated p-4">
          <div className="flex items-center gap-2 mb-2">
            <Banknote className="w-4 h-4 text-profit" />
            <p className="text-xs text-muted-foreground">মোট আয়</p>
          </div>
          <p className="text-2xl font-bold text-profit">৳{totalEarnings.toLocaleString()}</p>
          <div className="mt-2 space-y-1 text-xs text-muted-foreground">
            <p>নগদ: ৳{nagadEarnings.toLocaleString()}</p>
            <p>বাকি: ৳{bakiEarnings.toLocaleString()}</p>
          </div>
        </div>
        <div className="card-elevated p-4">
          <div className="flex items-center gap-2 mb-2">
            <CreditCard className="w-4 h-4 text-due" />
            <p className="text-xs text-muted-foreground">মোট খরচ</p>
          </div>
          <p className="text-2xl font-bold text-due">৳{totalExpenses.toLocaleString()}</p>
        </div>
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
          <Button
            onClick={() => setShowAddEarning(true)}
            variant="outline"
            className="w-full py-6 rounded-xl border-profit text-profit hover:bg-profit/10"
          >
            <Plus className="w-5 h-5 mr-2" />
            আয় যোগ করুন
          </Button>

          <p className="text-sm text-muted-foreground p-3 bg-muted/50 rounded-xl">
            💡 এখানে আপনার ব্যক্তিগত আয় লিখুন — নগদ বা বাকি থেকে। অ্যাপ অটোমেটিক হিসাব করে না, আপনি নিজে লিখবেন।
          </p>

          {/* Recent Earnings */}
          {customEarnings.length > 0 && (
            <div className="card-elevated p-4">
              <h3 className="font-semibold text-foreground mb-4">সাম্প্রতিক আয়</h3>
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {customEarnings.slice(-10).reverse().map((earning) => (
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

          {customEarnings.length === 0 && (
            <p className="text-center text-muted-foreground py-8">কোন আয় যোগ হয়নি</p>
          )}
        </div>
      )}

      {/* Expense Tab */}
      {activeTab === 'expense' && (
        <div className="space-y-4 animate-fade-in">
          <Button
            onClick={() => setShowAddExpense(true)}
            variant="outline"
            className="w-full py-6 rounded-xl border-due text-due hover:bg-due/10"
          >
            <Plus className="w-5 h-5 mr-2" />
            খরচ যোগ করুন
          </Button>

          {/* Recent Expenses */}
          <div className="card-elevated p-4">
            <h3 className="font-semibold text-foreground mb-4">সাম্প্রতিক খরচ</h3>
            <div className="space-y-3 max-h-60 overflow-y-auto">
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
                <input type="text" value={expenseForm.description} onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })} placeholder="যেমন: বাজার, বিল, যাতায়াত..." className="input-field" autoFocus />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">টাকার পরিমাণ (৳)</label>
                <input type="number" value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })} placeholder="0" className="input-field text-xl font-bold" min="0" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">ক্যাটাগরি</label>
                <select value={expenseForm.category} onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })} className="input-field">
                  {expenseCategories.map((cat) => (<option key={cat.value} value={cat.value}>{cat.label}</option>))}
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setShowAddExpense(false)} className="flex-1 py-5 rounded-xl">বাতিল</Button>
                <Button onClick={handleAddExpense} className="flex-1 btn-primary py-5 rounded-xl"><Minus className="w-4 h-4 mr-2" />খরচ যোগ করুন</Button>
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
              <h2 className="text-xl font-bold text-foreground">আয় যোগ করুন</h2>
              <button onClick={() => setShowAddEarning(false)} className="p-2 hover:bg-muted rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">আয়ের বিবরণ</label>
                <input type="text" value={earningForm.description} onChange={(e) => setEarningForm({ ...earningForm, description: e.target.value })} placeholder="যেমন: দোকানের আয়, ভাড়া..." className="input-field" autoFocus />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">টাকার পরিমাণ (৳)</label>
                <input type="number" value={earningForm.amount} onChange={(e) => setEarningForm({ ...earningForm, amount: e.target.value })} placeholder="0" className="input-field text-xl font-bold" min="0" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">ক্যাটাগরি</label>
                <select value={earningForm.category} onChange={(e) => setEarningForm({ ...earningForm, category: e.target.value })} className="input-field">
                  {earningCategories.map((cat) => (<option key={cat.value} value={cat.value}>{cat.label}</option>))}
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setShowAddEarning(false)} className="flex-1 py-5 rounded-xl">বাতিল</Button>
                <Button onClick={handleAddEarning} className="flex-1 py-5 rounded-xl bg-profit hover:bg-profit/90 text-white"><Plus className="w-4 h-4 mr-2" />আয় যোগ করুন</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}