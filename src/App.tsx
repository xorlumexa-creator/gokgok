import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { StoreProvider, useStore } from "@/context/StoreContext";
import { MainLayout } from "@/components/layout/MainLayout";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Sell from "./pages/Sell";
import Products from "./pages/Products";
import ShopAccounts from "./pages/ShopAccounts";
import PersonalAccounts from "./pages/PersonalAccounts";
import CreditBook from "./pages/CreditBook";
import Notifications from "./pages/Notifications";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isOnboarded } = useStore();
  
  if (!isOnboarded) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route element={
        <ProtectedRoute>
          <MainLayout />
        </ProtectedRoute>
      }>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/sell" element={<Sell />} />
        <Route path="/products" element={<Products />} />
        <Route path="/shop-accounts" element={<ShopAccounts />} />
        <Route path="/personal-accounts" element={<PersonalAccounts />} />
        <Route path="/credit-book" element={<CreditBook />} />
        <Route path="/notifications" element={<Notifications />} />
        {/* Redirect old route */}
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
