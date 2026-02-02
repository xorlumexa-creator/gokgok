import { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Calculator, 
  BookOpen, 
  Bell,
  Store,
  X,
  User,
  CalendarCheck,
  History,
  TrendingUp,
  LogOut,
  Crown,
  Truck
} from 'lucide-react';
import { useStore } from '@/context/StoreContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'ড্যাশবোর্ড' },
  { path: '/sell', icon: ShoppingCart, label: 'বিক্রি করুন' },
  { path: '/products', icon: Package, label: 'পণ্যসমূহ' },
  { path: '/credit-book', icon: BookOpen, label: 'বাকির খাতা' },
  { path: '/daily-sale', icon: TrendingUp, label: 'দৈনিক বিক্রি' },
  { path: '/selling-history', icon: History, label: 'বিক্রির ইতিহাস' },
  { path: '/pre-orders', icon: CalendarCheck, label: 'আগাম অর্ডার' },
  { path: '/suppliers', icon: Truck, label: 'সাপ্লায়ার' },
  { path: '/shop-accounts', icon: Calculator, label: 'দোকানের হিসাব' },
  { path: '/personal-accounts', icon: User, label: 'ব্যক্তিগত হিসাব' },
  { path: '/notifications', icon: Bell, label: 'বিজ্ঞপ্তি' },
];

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { storeInfo } = useStore();
  const { user, signOut } = useAuth();
  const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>('trial');

  useEffect(() => {
    if (user) {
      checkSubscription();
    }
  }, [user]);

  const checkSubscription = async () => {
    if (!user) return;
    
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_status, trial_start_date')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        setSubscriptionStatus(profile.subscription_status);
        
        if (profile.trial_start_date && profile.subscription_status === 'trial') {
          const trialStart = new Date(profile.trial_start_date);
          const now = new Date();
          const daysPassed = Math.floor((now.getTime() - trialStart.getTime()) / (1000 * 60 * 60 * 24));
          setTrialDaysLeft(Math.max(0, 7 - daysPassed));
        }
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full w-72 bg-sidebar border-r border-sidebar-border z-50
        transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:static
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-sidebar-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                  <Store className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="font-bold text-foreground text-lg">
                    ShopMate
                  </h1>
                  <p className="text-xs text-muted-foreground">{storeInfo?.name || 'আমার দোকান'}</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="lg:hidden p-2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Trial/Subscription Banner */}
          {subscriptionStatus === 'trial' && trialDaysLeft !== null && (
            <button
              onClick={() => navigate('/subscription')}
              className={`mx-4 mt-4 p-3 rounded-xl transition-all ${
                trialDaysLeft <= 2 
                  ? 'bg-due/10 border border-due text-due' 
                  : 'bg-primary/10 border border-primary/30 text-primary'
              }`}
            >
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5" />
                <div className="text-left">
                  <p className="font-medium text-sm">
                    {trialDaysLeft > 0 
                      ? `🎁 ফ্রি ট্রায়াল: ${trialDaysLeft} দিন বাকি`
                      : '⚠️ ট্রায়াল শেষ!'
                    }
                  </p>
                  <p className="text-xs opacity-80">ট্যাপ করে আপগ্রেড করুন</p>
                </div>
              </div>
            </button>
          )}

          {subscriptionStatus === 'active' && (
            <div className="mx-4 mt-4 p-3 rounded-xl bg-profit/10 border border-profit/30">
              <div className="flex items-center gap-2 text-profit">
                <Crown className="w-5 h-5" />
                <p className="font-medium text-sm">প্রিমিয়াম সদস্য ✓</p>
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={`nav-item ${isActive ? 'active' : ''}`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-sidebar-border space-y-2">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:text-due hover:bg-due/10 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">লগআউট</span>
            </button>
            <p className="text-xs text-muted-foreground text-center">
              © ২০২৬ ShopMate
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
