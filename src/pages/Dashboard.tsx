import { TrendingUp, Wallet, AlertCircle, Package } from 'lucide-react';
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

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="আজকের বিক্রি"
          value={`৳${stats.todaySales.toLocaleString()}`}
          icon={TrendingUp}
          variant="default"
        />
        <StatCard
          title="আজকের লাভ"
          value={`৳${stats.todayProfit.toLocaleString()}`}
          icon={Wallet}
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
