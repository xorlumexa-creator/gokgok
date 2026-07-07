import { useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, CreditCard, KeyRound, Users, BarChart3, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/useProfile';
import { withTimeout } from '@/lib/asyncTimeout';
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

  // FIX 2: Move navigation into useEffect — calling navigate() during render
  // is an illegal side effect that causes React warnings and UI flicker
  useEffect(() => {
    if (!loading && profile && profile.role !== 'manager') {
      navigate('/dashboard', { replace: true });
    }
  }, [loading, profile, navigate]);

  const signOut = async () => {
    await withTimeout(supabase.auth.signOut(), 4000, 'manager.signOut').catch(() => null);
    navigate('/auth');
  };

  if (loading) {
    // FIX 2: Use flex py instead of min-h-screen — cleaner loading state
    return (
      <div className="flex items-center justify-center py-20">
        লোড হচ্ছে...
      </div>
    );
  }

  // FIX 2: Return null while redirect is in progress (useEffect handles nav)
  if (!profile || profile.role !== 'manager') return null;

  return (
    <div className="min-h-screen flex bg-muted/30">
      <aside className="w-60 bg-card border-r border-border p-4 flex flex-col shrink-0 sticky top-0 h-screen">
        <div className="flex items-center gap-2 mb-6 px-2">
          <img src={logoImg} alt="" className="w-9 h-9 rounded-lg" />
          <div>
            <p className="font-bold text-sm">Dukan 360°</p>
            <p className="text-xs text-primary">ম্যানেজার প্যানেল</p>
          </div>
        </div>
        <nav className="space-y-1 flex-1 overflow-y-auto">
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
      <main className="flex-1 min-w-0 p-6 pb-10"><Outlet /></main>
    </div>
  );
}
