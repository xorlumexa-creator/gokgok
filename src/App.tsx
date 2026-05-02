import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { StoreProvider, useStore } from "@/context/StoreContext";
import { MainLayout } from "@/components/layout/MainLayout";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { InstallPrompt } from "@/components/InstallPrompt";
import { useAuth } from "@/hooks/useAuth";
import { startAutoSync, stopAutoSync } from "@/lib/syncEngine";

// Lazy load all pages
const Index = lazy(() => import("./pages/Index"));
const Landing = lazy(() => import("./pages/Landing"));
const Auth = lazy(() => import("./pages/Auth"));
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
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Profile = lazy(() => import("./pages/Profile"));
const Invoice = lazy(() => import("./pages/Invoice"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes cache
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
  const { user, loading } = useAuth();
  const { isOnboarded } = useStore();
  
  if (loading) {
    return <PageLoader />;
  }
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  
  if (!isOnboarded) {
    return <Navigate to="/setup" replace />;
  }
  
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/subscription" element={<Subscription />} />
        <Route path="/setup" element={<Index />} />
        <Route element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }>
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
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

const App = () => {
  useEffect(() => {
    startAutoSync();
    return () => stopAutoSync();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <StoreProvider>
        <TooltipProvider>
          <OfflineIndicator />
          <InstallPrompt />
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </TooltipProvider>
      </StoreProvider>
    </QueryClientProvider>
  );
};

export default App;
