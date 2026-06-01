import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { StoreProvider, useStore } from "@/context/StoreContext";
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
    queries: { staleTime: 1000 * 60 * 5, gcTime: 1000 * 60 * 30, retry: 1, refetchOnWindowFocus: false },
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
  const { user, loading } = useAuth();
  const { profile, loading: profLoading } = useProfile();
  const { isOnboarded } = useStore();

  if (loading || profLoading) return <PageLoader />;
  if (!user) return <Navigate to="/auth" replace />;
  if (profile?.must_change_password) return <Navigate to="/change-password" replace />;
  if (profile?.role === 'manager') return <Navigate to="/manager" replace />;
  if (!isOnboarded) return <Navigate to="/setup" replace />;
  return <>{children}</>;
}

function ManagerRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { profile, loading: profLoading } = useProfile();
  if (loading || profLoading) return <PageLoader />;
  if (!user) return <Navigate to="/auth" replace />;
  if (profile?.must_change_password) return <Navigate to="/change-password" replace />;
  if (profile?.role !== 'manager') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function StoreProtectedRoute({ children }: { children: React.ReactNode }) {
  return (
    <StoreProvider>
      <ProtectedRoute>{children}</ProtectedRoute>
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
        <Route path="/subscription" element={<Subscription />} />
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
    const t = window.setTimeout(() => startSyncEngine(), 3000);
    return () => window.clearTimeout(t);
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
