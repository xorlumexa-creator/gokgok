import { useNavigate } from 'react-router-dom';
import { 
  ShoppingCart, 
  Package, 
  BookOpen, 
  User, 
  Calculator, 
  History, 
  TrendingUp,
  CalendarCheck,
  Bell,
  Wallet,
  AlertCircle,
  Banknote,
  CreditCard,
  Coins
} from 'lucide-react';
import { useStore } from '@/context/StoreContext';
import { StatCard } from '@/components/dashboard/StatCard';
import { LowStockAlert } from '@/components/dashboard/LowStockAlert';

export default function Dashboard() {
  const { getDashboardStats, storeInfo } = useStore();
  const stats = getDashboardStats();
  const navigate = useNavigate();

  const quickNavItems = [
    { path: '/sell', icon: ShoppingCart, label: 'বিক্রি করুন', primary: true },
    { path: '/products', icon: Package, label: 'পণ্যসমূহ' },
    { path: '/credit-book', icon: BookOpen, label: 'বাকির খাতা' },
    { path: '/personal-accounts', icon: User, label: 'ব্যক্তিগত হিসাব' },
    { path: '/daily-sale', icon: TrendingUp, label: 'দৈনিক বিক্রি' },
    { path: '/shop-accounts', icon: Calculator, label: 'দোকানের হিসাব' },
    { path: '/selling-history', icon: History, label: 'বিক্রির ইতিহাস' },
    { path: '/pre-orders', icon: CalendarCheck, label: 'আগাম অর্ডার' },
    { path: '/notifications', icon: Bell, label: 'বিজ্ঞপ্তি' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome message */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">
          স্বাগতম, {storeInfo?.name || 'আপনার দোকান'}! 👋
        </h1>
        <p className="text-muted-foreground">আজকের ব্যবসার সারসংক্ষেপ দেখুন</p>
      </div>

      {/* Big Sell Button - Primary Action */}
      <button
        onClick={() => navigate('/sell')}
        className="w-full py-8 text-xl font-bold rounded-2xl bg-gradient-to-r from-due to-due/80 hover:from-due/90 hover:to-due/70 text-white shadow-lg transform hover:scale-[1.02] transition-all duration-200 flex items-center justify-center gap-3"
      >
        <ShoppingCart className="w-8 h-8" />
        বিক্রি করুন
      </button>

      {/* Quick Navigation Grid */}
      <div className="grid grid-cols-4 gap-3">
        {quickNavItems.slice(1).map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card border border-border hover:border-primary/50 hover:bg-primary/5 transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <item.icon className="w-5 h-5 text-primary" />
            </div>
            <span className="text-xs font-medium text-foreground text-center leading-tight">
              {item.label}
            </span>
          </button>
        ))}
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

      {/* Low Stock Alert */}
      <LowStockAlert />
    </div>
  );
}
