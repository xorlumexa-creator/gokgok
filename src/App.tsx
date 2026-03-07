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
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Subscription from "./pages/Subscription";
import Dashboard from "./pages/Dashboard";
import Sell from "./pages/Sell";
import Products from "./pages/Products";
import PreOrders from "./pages/PreOrders";
import ShopAccounts from "./pages/ShopAccounts";
import PersonalAccounts from "./pages/PersonalAccounts";
import CreditBook from "./pages/CreditBook";
import Notifications from "./pages/Notifications";
import SellingHistory from "./pages/SellingHistory";
import DailySale from "./pages/DailySale";
import Suppliers from "./pages/Suppliers";
import ResetPassword from "./pages/ResetPassword";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { isOnboarded } = useStore();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  
  if (!isOnboarded) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/auth" element={<Auth />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/subscription" element={<Subscription />} />
      <Route path="/" element={<Index />} />
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
        <Route path="/accounts" element={<Navigate to="/shop-accounts" replace />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
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

export default App;