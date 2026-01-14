import { Calculator, TrendingUp, TrendingDown, Wallet, Calendar } from 'lucide-react';
import { useStore } from '@/context/StoreContext';
import { StatCard } from '@/components/dashboard/StatCard';

export default function Accounts() {
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

  const todayTotal = todaySales.reduce((sum, s) => sum + s.totalPrice, 0);
  const todayProfit = todaySales.reduce((sum, s) => sum + s.profit, 0);

  const weekTotal = weekSales.reduce((sum, s) => sum + s.totalPrice, 0);
  const weekProfit = weekSales.reduce((sum, s) => sum + s.profit, 0);

  const monthTotal = monthSales.reduce((sum, s) => sum + s.totalPrice, 0);
  const monthProfit = monthSales.reduce((sum, s) => sum + s.profit, 0);

  const totalDue = customers.reduce((sum, c) => sum + c.totalDue, 0);
  const totalSales = sales.reduce((sum, s) => sum + s.totalPrice, 0);
  const totalProfit = sales.reduce((sum, s) => sum + s.profit, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-primary/10 rounded-xl">
          <Calculator className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">হিসাব</h1>
          <p className="text-muted-foreground">আপনার ব্যবসার সারসংক্ষেপ</p>
        </div>
      </div>

      {/* Today */}
      <div className="card-elevated p-4">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-foreground">আজ</h2>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-muted/50 rounded-xl">
            <p className="text-sm text-muted-foreground mb-1">বিক্রি</p>
            <p className="text-2xl font-bold text-foreground">৳{todayTotal.toLocaleString()}</p>
          </div>
          <div className="p-4 bg-profit/10 rounded-xl">
            <p className="text-sm text-muted-foreground mb-1">লাভ</p>
            <p className="text-2xl font-bold text-profit">৳{todayProfit.toLocaleString()}</p>
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
              <span className="font-semibold text-profit">৳{weekProfit.toLocaleString()}</span>
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
              <span className="font-semibold text-profit">৳{monthProfit.toLocaleString()}</span>
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
            title="মোট বাকি"
            value={`৳${totalDue.toLocaleString()}`}
            icon={TrendingDown}
            variant="due"
          />
          <StatCard
            title="বিক্রি সংখ্যা"
            value={sales.length}
            icon={Calculator}
          />
        </div>
      </div>
    </div>
  );
}
