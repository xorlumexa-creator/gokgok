import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, CreditCard, KeyRound, Users, BarChart3, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/useProfile';
import logoImg from '@/assets/logo.png';

const items = [
  { to: '/manager', label: 'ড্যাশবোর্ড', icon: LayoutDashboard, end: true },
  { to: '/manager/subscriptions', label: 'সাবস্ক্রিপশন রিকোয়েস্ট', icon: CreditCard },
  { to: '/manager/passwords', label: 'পাসওয়ার্ড রিসেট', icon: KeyRound },
  { to: '/manager/users', label: 'ইউজার তালিকা', icon: Users },
  { to: '/manager/stats', label: 'পরিসংখ্যান', icon: BarChart3 },
];

export default function ManagerLayout() {
  const navigate = useNavigate();
  const { profile, loading } = useProfile();

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">লোড হচ্ছে...</div>;
  }
  if (!profile || profile.role !== 'manager') {
    navigate('/dashboard');
    return null;
  }

  return (
    <div className="min-h-screen flex bg-muted/30">
      <aside className="w-60 bg-card border-r border-border p-4 flex flex-col">
        <div className="flex items-center gap-2 mb-6 px-2">
          <img src={logoImg} alt="" className="w-9 h-9 rounded-lg" />
          <div>
            <p className="font-bold text-sm">Dukan 360°</p>
            <p className="text-xs text-primary">ম্যানেজার প্যানেল</p>
          </div>
        </div>
        <nav className="space-y-1 flex-1">
          {items.map(it => (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-muted'
                }`
              }
            >
              <it.icon className="w-4 h-4" />
              {it.label}
            </NavLink>
          ))}
        </nav>
        <Button variant="outline" onClick={signOut} className="mt-4">
          <LogOut className="w-4 h-4 mr-2" /> লগ আউট
        </Button>
      </aside>
      <main className="flex-1 p-6 overflow-auto"><Outlet /></main>
    </div>
  );
}
