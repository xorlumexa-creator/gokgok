import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Calculator, 
  BookOpen, 
  Bell,
  Store,
  X
} from 'lucide-react';
import { useStore } from '@/context/StoreContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'ড্যাশবোর্ড' },
  { path: '/sell', icon: ShoppingCart, label: 'বিক্রি করুন' },
  { path: '/products', icon: Package, label: 'পণ্যসমূহ' },
  { path: '/accounts', icon: Calculator, label: 'হিসাব' },
  { path: '/credit-book', icon: BookOpen, label: 'বাকির খাতা' },
  { path: '/notifications', icon: Bell, label: 'বিজ্ঞপ্তি' },
];

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation();
  const { storeInfo } = useStore();

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
                    {storeInfo?.name || 'আমার দোকান'}
                  </h1>
                  <p className="text-xs text-muted-foreground">স্টক ম্যানেজমেন্ট</p>
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

          {/* Trial Banner */}
          {storeInfo && (
            <div className="trial-banner text-primary">
              🎁 ফ্রি ট্রায়াল: {storeInfo.trialDaysLeft} দিন বাকি
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
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
          <div className="p-4 border-t border-sidebar-border">
            <p className="text-xs text-muted-foreground text-center">
              © ২০২৬ স্টক ম্যানেজার
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
