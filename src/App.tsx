import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { StoreProvider, useStore } from "@/context/StoreContext";
import { SubscriptionProvider } from "@/context/SubscriptionContext";
import { SubscriptionLockModal } from "@/components/subscription/SubscriptionLockModal";
import { MainLayout } from "@/components/layout/MainLayout";
import { InstallPrompt } from "@/components/InstallPrompt";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { startSyncEngine } from "@/lib/syncEngine";

const Index = lazy(() => import("./pages/Index"));
const Landing = lazy(() => import("./pages/Landing"));
const Auth = lazy(() => import("./pages/Auth"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ChangePassword = lazy(() => import("./pages/ChangePassword"));
const Subscription = lazy(() => import("./pages/Subscription"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Sell = lazy(() => import("./pages/Sell"));
const Products = lazy(() => import("./pages/Products"));
const PreOrders = lazy(() => import("./pages/PreOrders"));
const ShopAccounts = lazy(() => import("./pages/ShopAccounts"));
const PersonalAccounts = lazy(() => import("./pages/PersonalAccounts"));
const CreditBook = lazy(() => import("./pages/CreditBook"));
const Notifications = lazy(() => import("./pages/Notifications"));
const SellingHistory = lazy(() => import("./pages/SellingHistory"));
const DailySale = lazy(() => import("./pages/DailySale"));
const Suppliers = lazy(() => import("./pages/Suppliers"));
const Profile = lazy(() => import("./pages/Profile"));
const Invoice = lazy(() => import("./pages/Invoice"));
const NotFound = lazy(() => import("./pages/NotFound"));

const ManagerLayout = lazy(() => import("./pages/manager/ManagerLayout"));
const ManagerDashboard = lazy(() => import("./pages/manager/ManagerDashboard"));
const ManagerSubscriptions = lazy(() => import("./pages/manager/SubscriptionRequests"));
const ManagerPasswords = lazy(() => import("./pages/manager/PasswordResetRequests"));
const ManagerUsers = lazy(() => import("./pages/manager/UsersList"));
const ManagerStats = lazy(() => import("./pages/manager/Statistics"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profLoading } = useProfile();
  const { isOnboarded, setStoreInfo } = useStore();

  useEffect(() => {
    if (!user || isOnboarded || !profile?.shop_name) return;
    setStoreInfo({
      name: profile.shop_name,
      trialStartDate: new Date(profile.trial_start_date || Date.now()),
      trialDaysLeft: 3,
      isOnboarded: true,
    });
  }, [user, isOnboarded, profile?.shop_name, profile?.trial_start_date, setStoreInfo]);

  // FIX: Only block on authLoading — the one true loading state.
  // Don't block on profLoading if we already have a cached profile.
  if (authLoading) return <PageLoader />;
  if (!user) return <Navigate to="/auth" replace />;

  // FIX: Only show profile loader if we have NO cached profile at all.
  // If localStorage has a profile, render immediately and revalidate in background.
  if (!profile && profLoading && !localStorage.getItem('cache:profile')) return <PageLoader />;

  if (profile?.must_change_password) return <Navigate to="/change-password" replace />;
  if (profile?.role === 'manager') return <Navigate to="/manager" replace />;

  // Only redirect to /setup when profile is fully loaded AND genuinely missing shop_name.
  if (profile && !profLoading && !profile.shop_name && !localStorage.getItem('storeInfo')) {
    return <Navigate to="/setup" replace />;
  }

  return <>{children}</>;
}

function ManagerRoute({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profLoading } = useProfile();

  // FIX: Same pattern — only block on authLoading
  if (authLoading) return <PageLoader />;
  if (!user) return <Navigate to="/auth" replace />;
  if (!profile && profLoading && !localStorage.getItem('cache:profile')) return <PageLoader />;
  if (profile?.must_change_password) return <Navigate to="/change-password" replace />;
  if (profile?.role !== 'manager') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function StoreProtectedRoute({ children }: { children: React.ReactNode }) {
  return (
    <StoreProvider>
      <SubscriptionProvider>
        <ProtectedRoute>
          {children}
          <SubscriptionLockModal />
        </ProtectedRoute>
      </SubscriptionProvider>
    </StoreProvider>
  );
}

function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/change-password" element={<ChangePassword />} />
        <Route path="/subscription" element={<StoreProvider><SubscriptionProvider><Subscription /></SubscriptionProvider></StoreProvider>} />
        <Route path="/setup" element={<StoreProvider><Index /></StoreProvider>} />

        <Route element={<ManagerRoute><ManagerLayout /></ManagerRoute>}>
          <Route path="/manager" element={<ManagerDashboard />} />
          <Route path="/manager/subscriptions" element={<ManagerSubscriptions />} />
          <Route path="/manager/passwords" element={<ManagerPasswords />} />
          <Route path="/manager/users" element={<ManagerUsers />} />
          <Route path="/manager/stats" element={<ManagerStats />} />
        </Route>

        <Route element={<StoreProtectedRoute><MainLayout /></StoreProtectedRoute>}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/sell" element={<Sell />} />
          <Route path="/products" element={<Products />} />
          <Route path="/pre-orders" element={<PreOrders />} />
          <Route path="/shop-accounts" element={<ShopAccounts />} />
          <Route path="/personal-accounts" element={<PersonalAccounts />} />
          <Route path="/credit-book" element={<CreditBook />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/selling-history" element={<SellingHistory />} />
          <Route path="/daily-sale" element={<DailySale />} />
          <Route path="/suppliers" element={<Suppliers />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/invoice" element={<Invoice />} />
          <Route path="/accounts" element={<Navigate to="/shop-accounts" replace />} />
        </Route>

        <Route path="/reset-password" element={<Navigate to="/forgot-password" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

const App = () => {
  useEffect(() => {
    if (navigator.onLine) {
      const t = window.setTimeout(() => startSyncEngine(), 3000);
      return () => window.clearTimeout(t);
    } else {
      const handleOnline = () => startSyncEngine();
      window.addEventListener('online', handleOnline);
      return () => window.removeEventListener('online', handleOnline);
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <InstallPrompt />
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
  
