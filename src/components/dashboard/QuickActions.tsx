import { ShoppingCart, Package, UserPlus, Calculator } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const actions = [
  { icon: ShoppingCart, label: 'বিক্রি করুন', path: '/sell', color: 'bg-primary text-primary-foreground' },
  { icon: Package, label: 'পণ্য যোগ করুন', path: '/products', color: 'bg-accent text-accent-foreground' },
  { icon: UserPlus, label: 'বাকি যোগ করুন', path: '/credit-book', color: 'bg-secondary text-secondary-foreground' },
  { icon: Calculator, label: 'হিসাব দেখুন', path: '/accounts', color: 'bg-muted text-foreground' },
];

export function QuickActions() {
  const navigate = useNavigate();

  return (
    <div className="card-elevated p-4">
      <h3 className="font-semibold text-foreground mb-4">দ্রুত কাজ</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {actions.map((action) => (
          <button
            key={action.path}
            onClick={() => navigate(action.path)}
            className={`${action.color} p-4 rounded-xl flex flex-col items-center gap-2 hover:opacity-90 transition-all duration-200 hover:-translate-y-1`}
          >
            <action.icon className="w-6 h-6" />
            <span className="text-sm font-medium">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
