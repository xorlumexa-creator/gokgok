import { TrendingUp, Wallet, AlertCircle, Package, Banknote, CreditCard } from 'lucide-react';
import { useStore } from '@/context/StoreContext';
import { StatCard } from '@/components/dashboard/StatCard';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { RecentSales } from '@/components/dashboard/RecentSales';
import { LowStockAlert } from '@/components/dashboard/LowStockAlert';

export default function Dashboard() {
  const { getDashboardStats, storeInfo } = useStore();
  const stats = getDashboardStats();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome message */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">
          স্বাগতম, {storeInfo?.name || 'আপনার দোকান'}! 👋
        </h1>
        <p className="text-muted-foreground">আজকের ব্যবসার সারসংক্ষেপ দেখুন</p>
      </div>

      {/* Today's Earnings Card */}
      <div className="card-elevated p-4 bg-gradient-to-r from-primary/10 to-primary/5">
        <h3 className="font-semibold text-foreground mb-3">আজকের আয়</h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 bg-card rounded-xl">
            <div className="flex items-center gap-1 mb-1">
              <TrendingUp className="w-3 h-3 text-primary" />
              <p className="text-xs text-muted-foreground">মোট বিক্রি</p>
            </div>
            <p className="text-lg font-bold text-foreground">৳{stats.todaySales.toLocaleString()}</p>
          </div>
          <div className="p-3 bg-profit/10 rounded-xl">
            <div className="flex items-center gap-1 mb-1">
              <Banknote className="w-3 h-3 text-profit" />
              <p className="text-xs text-muted-foreground">নগদ বিক্রি</p>
            </div>
            <p className="text-lg font-bold text-profit">৳{stats.todayCashSales.toLocaleString()}</p>
          </div>
          <div className="p-3 bg-due/10 rounded-xl">
            <div className="flex items-center gap-1 mb-1">
              <CreditCard className="w-3 h-3 text-due" />
              <p className="text-xs text-muted-foreground">বাকি বিক্রি</p>
            </div>
            <p className="text-lg font-bold text-due">৳{stats.todayCreditSales.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="আজকের লাভ"
          value={`৳${stats.todayProfit.toLocaleString()}`}
          subtitle={`নগদ: ৳${stats.todayCashProfit.toLocaleString()}`}
          icon={Wallet}
          variant="profit"
        />
        <StatCard
          title="নগদ লাভ"
          value={`৳${stats.todayCashProfit.toLocaleString()}`}
          subtitle="হাতে পেয়েছেন"
          icon={Banknote}
          variant="profit"
        />
        <StatCard
          title="মোট বাকি"
          value={`৳${stats.totalDue.toLocaleString()}`}
          icon={AlertCircle}
          variant="due"
        />
        <StatCard
          title="মোট পণ্য"
          value={stats.totalProducts}
          subtitle={stats.lowStockProducts > 0 ? `${stats.lowStockProducts}টি স্টক কম` : undefined}
          icon={Package}
          variant={stats.lowStockProducts > 0 ? 'warning' : 'default'}
        />
      </div>

      {/* Quick Actions */}
      <QuickActions />

      {/* Low Stock Alert */}
      <LowStockAlert />

      {/* Recent Sales */}
      <RecentSales />
    </div>
  );
}
