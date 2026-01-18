import { useNavigate } from 'react-router-dom';
import { TrendingUp, Wallet, AlertCircle, Package, Banknote, CreditCard, ShoppingCart, Coins, Clock, ChevronRight, X } from 'lucide-react';
import { useStore } from '@/context/StoreContext';
import { StatCard } from '@/components/dashboard/StatCard';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { RecentSales } from '@/components/dashboard/RecentSales';
import { LowStockAlert } from '@/components/dashboard/LowStockAlert';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { bn } from 'date-fns/locale';
import { useState } from 'react';
import { BulkSaleRecord } from '@/types/store';

export default function Dashboard() {
  const { getDashboardStats, storeInfo, getWeeklyBulkSales } = useStore();
  const stats = getDashboardStats();
  const navigate = useNavigate();
  const weeklyBulkSales = getWeeklyBulkSales();
  
  const [viewingSale, setViewingSale] = useState<BulkSaleRecord | null>(null);

  // Group sales by date
  const salesByDate = weeklyBulkSales.reduce((acc, sale) => {
    const dateKey = format(new Date(sale.createdAt), 'yyyy-MM-dd');
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(sale);
    return acc;
  }, {} as Record<string, BulkSaleRecord[]>);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome message */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">
          স্বাগতম, {storeInfo?.name || 'আপনার দোকান'}! 👋
        </h1>
        <p className="text-muted-foreground">আজকের ব্যবসার সারসংক্ষেপ দেখুন</p>
      </div>

      {/* Big Sell Button */}
      <Button
        onClick={() => navigate('/sell')}
        className="w-full py-8 text-xl font-bold rounded-2xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg transform hover:scale-[1.02] transition-all duration-200"
      >
        <ShoppingCart className="w-8 h-8 mr-3" />
        বিক্রি করুন
      </Button>

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
          title="বাকির লাভ"
          value={`৳${stats.totalBakiProfit.toLocaleString()}`}
          subtitle="পেন্ডিং আছে"
          icon={Coins}
          variant="warning"
        />
        <StatCard
          title="মোট বাকি"
          value={`৳${stats.totalDue.toLocaleString()}`}
          icon={AlertCircle}
          variant="due"
        />
      </div>

      {/* Product Stats */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard
          title="মোট পণ্য"
          value={stats.totalProducts}
          subtitle={stats.lowStockProducts > 0 ? `${stats.lowStockProducts}টি স্টক কম` : undefined}
          icon={Package}
          variant={stats.lowStockProducts > 0 ? 'warning' : 'default'}
        />
      </div>

      {/* Weekly Sales History */}
      {weeklyBulkSales.length > 0 && (
        <div className="card-elevated p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              সাপ্তাহিক বিক্রি (সিরিয়াল অনুসারে)
            </h3>
            <span className="text-xs text-muted-foreground">{weeklyBulkSales.length}টি বিক্রি</span>
          </div>
          
          <div className="space-y-4 max-h-80 overflow-y-auto">
            {Object.entries(salesByDate).map(([dateKey, daySales]) => (
              <div key={dateKey}>
                <p className="text-xs font-medium text-muted-foreground mb-2 sticky top-0 bg-card py-1">
                  {format(new Date(dateKey), 'dd MMMM yyyy (EEEE)', { locale: bn })}
                </p>
                <div className="space-y-2">
                  {daySales.map((sale) => (
                    <button
                      key={sale.id}
                      onClick={() => setViewingSale(sale)}
                      className="w-full text-left p-3 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                            <span className="text-sm font-bold text-primary">{sale.serialNumber}</span>
                          </div>
                          <div>
                            <p className="font-medium text-sm text-foreground truncate max-w-[200px]">
                              {sale.productNames.join(', ')}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(sale.createdAt), 'hh:mm a', { locale: bn })}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sale Detail Modal */}
      {viewingSale && (
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-card rounded-2xl shadow-soft border border-border p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-foreground">
                বিক্রি #{viewingSale.serialNumber}
              </h2>
              <button onClick={() => setViewingSale(null)} className="p-2 hover:bg-muted rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="p-3 bg-muted/50 rounded-xl">
                <p className="text-sm text-muted-foreground">সময়</p>
                <p className="font-medium">
                  {format(new Date(viewingSale.createdAt), 'dd MMMM yyyy, hh:mm a', { locale: bn })}
                </p>
              </div>
              
              <div>
                <p className="text-sm font-medium mb-2">পণ্যসমূহ:</p>
                <div className="space-y-1">
                  {viewingSale.productNames.map((name, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
                      <Package className="w-4 h-4 text-primary" />
                      <span className="text-sm">{name}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="border-t border-border pt-4">
                <div className="flex justify-between mb-2">
                  <span className="text-muted-foreground">মোট মূল্য:</span>
                  <span className="font-bold text-lg">৳{viewingSale.totalPrice.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">লাভ:</span>
                  <span className="font-bold text-profit">৳{viewingSale.totalProfit.toLocaleString()}</span>
                </div>
              </div>
              
              <Button onClick={() => setViewingSale(null)} variant="outline" className="w-full">
                বন্ধ করুন
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <QuickActions />

      {/* Low Stock Alert */}
      <LowStockAlert />

      {/* Recent Sales */}
      <RecentSales />
    </div>
  );
}
