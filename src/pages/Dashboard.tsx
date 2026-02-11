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
  Truck
} from 'lucide-react';
import { useStore } from '@/context/StoreContext';
import { LowStockAlert } from '@/components/dashboard/LowStockAlert';

export default function Dashboard() {
  const { storeInfo } = useStore();
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
    { path: '/suppliers', icon: Truck, label: 'সাপ্লায়ার' },
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

      {/* Low Stock Alert */}
      <LowStockAlert />
    </div>
  );
}
