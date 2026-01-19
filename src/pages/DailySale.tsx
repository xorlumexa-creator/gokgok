import { useMemo } from 'react';
import { TrendingUp, Wallet, Banknote, CreditCard, Coins, BarChart3 } from 'lucide-react';
import { useStore } from '@/context/StoreContext';
import { format, subDays, startOfWeek, endOfWeek, eachWeekOfInterval, subMonths } from 'date-fns';
import { bn } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function DailySale() {
  const { sales, bakiPaymentRecords, getDashboardStats } = useStore();
  const stats = getDashboardStats();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Today's detailed stats
  const todayStats = useMemo(() => {
    const todaySales = sales.filter(s => new Date(s.createdAt) >= today);
    const todayCashSales = todaySales.filter(s => s.isPaid);
    const todayCreditSales = todaySales.filter(s => !s.isPaid);
    const todayBakiPayments = bakiPaymentRecords.filter(r => new Date(r.createdAt) >= today);

    return {
      motBikri: todaySales.reduce((sum, s) => sum + s.totalPrice, 0),
      nagadBikri: todayCashSales.reduce((sum, s) => sum + s.totalPrice, 0),
      bakiBikri: todayCreditSales.reduce((sum, s) => sum + s.totalPrice, 0),
      motLav: todaySales.reduce((sum, s) => sum + s.profit, 0),
      nagadLav: todayCashSales.reduce((sum, s) => sum + s.profit, 0),
      bakirLav: todayBakiPayments.reduce((sum, r) => sum + r.profitEarned, 0),
    };
  }, [sales, bakiPaymentRecords, today]);

  // Weekly profit data for the last month (4 weeks)
  const weeklyProfitData = useMemo(() => {
    const oneMonthAgo = subMonths(new Date(), 1);
    const weeks = eachWeekOfInterval(
      { start: oneMonthAgo, end: new Date() },
      { weekStartsOn: 0 }
    );

    return weeks.map((weekStart, index) => {
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 0 });
      
      const weekSales = sales.filter(s => {
        const saleDate = new Date(s.createdAt);
        return saleDate >= weekStart && saleDate <= weekEnd;
      });
      
      const weekBakiPayments = bakiPaymentRecords.filter(r => {
        const payDate = new Date(r.createdAt);
        return payDate >= weekStart && payDate <= weekEnd;
      });

      const cashProfit = weekSales.filter(s => s.isPaid).reduce((sum, s) => sum + s.profit, 0);
      const creditProfit = weekSales.filter(s => !s.isPaid).reduce((sum, s) => sum + s.profit, 0);
      const bakiProfit = weekBakiPayments.reduce((sum, r) => sum + r.profitEarned, 0);

      return {
        name: `সপ্তাহ ${index + 1}`,
        dateRange: `${format(weekStart, 'dd MMM', { locale: bn })} - ${format(weekEnd, 'dd MMM', { locale: bn })}`,
        নগদ: cashProfit,
        বাকি: creditProfit + bakiProfit,
        মোট: cashProfit + creditProfit + bakiProfit,
      };
    });
  }, [sales, bakiPaymentRecords]);

  const StatCard = ({ 
    icon: Icon, 
    title, 
    value, 
    variant = 'default' 
  }: { 
    icon: any; 
    title: string; 
    value: number; 
    variant?: 'default' | 'profit' | 'due' | 'warning'; 
  }) => {
    const variants = {
      default: 'bg-primary/10 text-primary',
      profit: 'bg-profit/10 text-profit',
      due: 'bg-due/10 text-due',
      warning: 'bg-amber-500/10 text-amber-600',
    };

    return (
      <div className="card-elevated p-4">
        <div className="flex items-center gap-3 mb-2">
          <div className={`p-2 rounded-lg ${variants[variant]}`}>
            <Icon className="w-5 h-5" />
          </div>
          <p className="text-sm text-muted-foreground">{title}</p>
        </div>
        <p className={`text-2xl font-bold ${
          variant === 'profit' ? 'text-profit' : 
          variant === 'due' ? 'text-due' : 
          variant === 'warning' ? 'text-amber-600' : 'text-foreground'
        }`}>
          ৳{value.toLocaleString()}
        </p>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-primary/10 rounded-xl">
          <TrendingUp className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">দৈনিক বিক্রি</h1>
          <p className="text-muted-foreground">
            {format(today, 'dd MMMM yyyy (EEEE)', { locale: bn })}
          </p>
        </div>
      </div>

      {/* Today's Sales Stats */}
      <div className="space-y-3">
        <h3 className="font-semibold text-foreground">আজকের বিক্রি</h3>
        <div className="grid grid-cols-2 gap-3">
          <StatCard 
            icon={TrendingUp} 
            title="মোট বিক্রি" 
            value={todayStats.motBikri} 
          />
          <StatCard 
            icon={Banknote} 
            title="নগদ বিক্রি" 
            value={todayStats.nagadBikri} 
            variant="profit"
          />
          <StatCard 
            icon={CreditCard} 
            title="বাকি বিক্রি" 
            value={todayStats.bakiBikri} 
            variant="due"
          />
        </div>
      </div>

      {/* Today's Profit Stats */}
      <div className="space-y-3">
        <h3 className="font-semibold text-foreground">আজকের লাভ</h3>
        <div className="grid grid-cols-2 gap-3">
          <StatCard 
            icon={Wallet} 
            title="মোট লাভ" 
            value={todayStats.motLav} 
          />
          <StatCard 
            icon={Banknote} 
            title="নগদ লাভ" 
            value={todayStats.nagadLav} 
            variant="profit"
          />
          <StatCard 
            icon={Coins} 
            title="বাকির লাভ" 
            value={todayStats.bakirLav} 
            variant="warning"
          />
        </div>
      </div>

      {/* Monthly Profit Graph */}
      <div className="card-elevated p-4">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">মাসিক লাভের গ্রাফ (সাপ্তাহিক)</h3>
        </div>
        
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyProfitData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 12 }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickFormatter={(value) => `৳${value}`}
              />
              <Tooltip 
                formatter={(value: number, name: string) => [`৳${value.toLocaleString()}`, name]}
                labelFormatter={(label, payload) => {
                  const data = payload?.[0]?.payload;
                  return data?.dateRange || label;
                }}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Bar dataKey="নগদ" fill="hsl(var(--profit))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="বাকি" fill="hsl(var(--warning))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* All-time Summary */}
      <div className="card-elevated p-4 bg-gradient-to-r from-primary/10 to-primary/5">
        <h3 className="font-semibold text-foreground mb-3">সর্বমোট</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">মোট বাকি</p>
            <p className="text-xl font-bold text-due">৳{stats.totalDue.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">বাকির লাভ (পেন্ডিং)</p>
            <p className="text-xl font-bold text-warning">৳{stats.totalBakiProfit.toLocaleString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
