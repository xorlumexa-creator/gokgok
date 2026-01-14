import { Calculator, TrendingUp, TrendingDown, Wallet, Calendar, Banknote, CreditCard } from 'lucide-react';
import { useStore } from '@/context/StoreContext';
import { StatCard } from '@/components/dashboard/StatCard';

export default function ShopAccounts() {
  const { sales, customers } = useStore();

  // Calculate stats
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const thisWeekStart = new Date(today);
  thisWeekStart.setDate(today.getDate() - today.getDay());

  const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const todaySales = sales.filter(s => new Date(s.createdAt) >= today);
  const weekSales = sales.filter(s => new Date(s.createdAt) >= thisWeekStart);
  const monthSales = sales.filter(s => new Date(s.createdAt) >= thisMonthStart);

  // Today stats - separated by cash and credit
  const todayCashSales = todaySales.filter(s => s.isPaid);
  const todayCreditSales = todaySales.filter(s => !s.isPaid);

  const todayTotal = todaySales.reduce((sum, s) => sum + s.totalPrice, 0);
  const todayProfit = todaySales.reduce((sum, s) => sum + s.profit, 0);
  const todayCashTotal = todayCashSales.reduce((sum, s) => sum + s.totalPrice, 0);
  const todayCashProfit = todayCashSales.reduce((sum, s) => sum + s.profit, 0);
  const todayCreditTotal = todayCreditSales.reduce((sum, s) => sum + s.totalPrice, 0);
  const todayCreditProfit = todayCreditSales.reduce((sum, s) => sum + s.profit, 0);

  // Week stats
  const weekCashSales = weekSales.filter(s => s.isPaid);
  const weekCreditSales = weekSales.filter(s => !s.isPaid);
  const weekTotal = weekSales.reduce((sum, s) => sum + s.totalPrice, 0);
  const weekProfit = weekSales.reduce((sum, s) => sum + s.profit, 0);
  const weekCashProfit = weekCashSales.reduce((sum, s) => sum + s.profit, 0);
  const weekCreditProfit = weekCreditSales.reduce((sum, s) => sum + s.profit, 0);

  // Month stats
  const monthCashSales = monthSales.filter(s => s.isPaid);
  const monthCreditSales = monthSales.filter(s => !s.isPaid);
  const monthTotal = monthSales.reduce((sum, s) => sum + s.totalPrice, 0);
  const monthProfit = monthSales.reduce((sum, s) => sum + s.profit, 0);
  const monthCashProfit = monthCashSales.reduce((sum, s) => sum + s.profit, 0);
  const monthCreditProfit = monthCreditSales.reduce((sum, s) => sum + s.profit, 0);

  const totalDue = customers.reduce((sum, c) => sum + c.totalDue, 0);
  const totalSales = sales.reduce((sum, s) => sum + s.totalPrice, 0);
  const totalProfit = sales.reduce((sum, s) => sum + s.profit, 0);
  const totalCashProfit = sales.filter(s => s.isPaid).reduce((sum, s) => sum + s.profit, 0);
  const totalCreditProfit = sales.filter(s => !s.isPaid).reduce((sum, s) => sum + s.profit, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-primary/10 rounded-xl">
          <Calculator className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">দোকানের হিসাব</h1>
          <p className="text-muted-foreground">আপনার দোকানের ব্যবসার সারসংক্ষেপ</p>
        </div>
      </div>

      {/* Today - Detailed Breakdown */}
      <div className="card-elevated p-4">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-foreground">আজ</h2>
        </div>
        
        {/* Total Sales */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="p-4 bg-muted/50 rounded-xl">
            <p className="text-xs text-muted-foreground mb-1">মোট বিক্রি</p>
            <p className="text-xl font-bold text-foreground">৳{todayTotal.toLocaleString()}</p>
          </div>
          <div className="p-4 bg-profit/10 rounded-xl">
            <div className="flex items-center gap-1 mb-1">
              <Banknote className="w-3 h-3 text-profit" />
              <p className="text-xs text-muted-foreground">নগদ বিক্রি</p>
            </div>
            <p className="text-xl font-bold text-profit">৳{todayCashTotal.toLocaleString()}</p>
          </div>
          <div className="p-4 bg-due/10 rounded-xl">
            <div className="flex items-center gap-1 mb-1">
              <CreditCard className="w-3 h-3 text-due" />
              <p className="text-xs text-muted-foreground">বাকি বিক্রি</p>
            </div>
            <p className="text-xl font-bold text-due">৳{todayCreditTotal.toLocaleString()}</p>
          </div>
        </div>

        {/* Profit Breakdown */}
        <div className="p-4 bg-gradient-to-r from-profit/10 to-profit/5 rounded-xl">
          <p className="text-sm text-muted-foreground mb-3">আজকের লাভ</p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-xs text-muted-foreground">মোট লাভ</p>
              <p className="text-lg font-bold text-foreground">৳{todayProfit.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">নগদ লাভ</p>
              <p className="text-lg font-bold text-profit">৳{todayCashProfit.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">বাকি লাভ</p>
              <p className="text-lg font-bold text-due">৳{todayCreditProfit.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Week & Month */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="card-elevated p-4">
          <h3 className="font-semibold text-foreground mb-3">এই সপ্তাহ</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">মোট বিক্রি</span>
              <span className="font-semibold text-foreground">৳{weekTotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">মোট লাভ</span>
              <span className="font-semibold text-foreground">৳{weekProfit.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground flex items-center gap-1">
                <Banknote className="w-3 h-3" /> নগদ লাভ
              </span>
              <span className="font-semibold text-profit">৳{weekCashProfit.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground flex items-center gap-1">
                <CreditCard className="w-3 h-3" /> বাকি লাভ
              </span>
              <span className="font-semibold text-due">৳{weekCreditProfit.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">বিক্রি সংখ্যা</span>
              <span className="font-semibold text-foreground">{weekSales.length}টি</span>
            </div>
          </div>
        </div>

        <div className="card-elevated p-4">
          <h3 className="font-semibold text-foreground mb-3">এই মাস</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">মোট বিক্রি</span>
              <span className="font-semibold text-foreground">৳{monthTotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">মোট লাভ</span>
              <span className="font-semibold text-foreground">৳{monthProfit.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground flex items-center gap-1">
                <Banknote className="w-3 h-3" /> নগদ লাভ
              </span>
              <span className="font-semibold text-profit">৳{monthCashProfit.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground flex items-center gap-1">
                <CreditCard className="w-3 h-3" /> বাকি লাভ
              </span>
              <span className="font-semibold text-due">৳{monthCreditProfit.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">বিক্রি সংখ্যা</span>
              <span className="font-semibold text-foreground">{monthSales.length}টি</span>
            </div>
          </div>
        </div>
      </div>

      {/* Overall Stats */}
      <div className="card-elevated p-4">
        <h3 className="font-semibold text-foreground mb-4">সর্বমোট হিসাব</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="মোট বিক্রি"
            value={`৳${totalSales.toLocaleString()}`}
            icon={TrendingUp}
          />
          <StatCard
            title="মোট লাভ"
            value={`৳${totalProfit.toLocaleString()}`}
            icon={Wallet}
            variant="profit"
          />
          <StatCard
            title="নগদ লাভ"
            value={`৳${totalCashProfit.toLocaleString()}`}
            subtitle="হাতে আছে"
            icon={Banknote}
            variant="profit"
          />
          <StatCard
            title="বাকি লাভ"
            value={`৳${totalCreditProfit.toLocaleString()}`}
            subtitle="পেন্ডিং"
            icon={CreditCard}
            variant="due"
          />
        </div>
        <div className="mt-4 p-4 bg-due/10 rounded-xl">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-due" />
              <span className="text-muted-foreground">মোট বাকি</span>
            </div>
            <span className="text-2xl font-bold text-due">৳{totalDue.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
