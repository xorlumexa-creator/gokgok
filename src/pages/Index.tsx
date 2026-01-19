import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useStore } from '@/context/StoreContext';

const Index = () => {
  const [mounted, setMounted] = useState(false);
  const { user, loading } = useAuth();
  const { isOnboarded } = useStore();
  const navigate = useNavigate();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || loading) return;
    
    // If not logged in, redirect to auth
    if (!user) {
      navigate('/auth');
      return;
    }
    
    // If logged in and onboarded, go to dashboard
    if (isOnboarded) {
      navigate('/dashboard');
    }
  }, [mounted, loading, user, isOnboarded, navigate]);

  // Show loading while checking
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // If not logged in, show nothing (will redirect)
  if (!user) {
    return null;
  }

  // If not onboarded, show simple store name input
  if (!isOnboarded) {
    return <StoreSetup />;
  }

  return null;
};

// Simple store name setup - no product listing during first login
function StoreSetup() {
  const navigate = useNavigate();
  const { completeOnboarding } = useStore();
  const [storeName, setStoreName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!storeName.trim()) return;
    
    setLoading(true);
    // Complete onboarding with store name only, no products
    completeOnboarding(storeName.trim(), []);
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-accent via-background to-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-soft">
            <svg className="w-10 h-10 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-foreground">ShopMate</h1>
          <p className="text-muted-foreground mt-2">আপনার দোকানের নাম দিন</p>
        </div>

        <div className="card-elevated p-6 animate-fade-in">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">দোকানের নাম</label>
              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="যেমন: করিম স্টোর"
                className="input-field"
                autoFocus
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={!storeName.trim() || loading}
              className="w-full btn-primary py-4 text-lg rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'অপেক্ষা করুন...' : 'শুরু করুন'}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          ৭ দিন ফ্রি ট্রায়াল চলছে
        </p>
      </div>
    </div>
  );
}

export default Index;
