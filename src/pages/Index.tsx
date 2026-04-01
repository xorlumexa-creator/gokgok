import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useStore } from '@/context/StoreContext';
import logoImg from '@/assets/logo.png';

const Index = () => {
  const [mounted, setMounted] = useState(false);
  const { user, loading } = useAuth();
  const { isOnboarded } = useStore();
  const navigate = useNavigate();

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted || loading) return;
    if (!user) { navigate('/auth'); return; }
    if (isOnboarded) { navigate('/dashboard'); }
  }, [mounted, loading, user, isOnboarded, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) return null;

  if (!isOnboarded) return <StoreSetup />;

  return null;
};

function StoreSetup() {
  const navigate = useNavigate();
  const { completeOnboarding } = useStore();
  const [storeName, setStoreName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!storeName.trim()) return;
    setLoading(true);
    completeOnboarding(storeName.trim(), []);
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-accent via-background to-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src={logoImg} alt="Dukan 360°" className="w-20 h-20 rounded-2xl mx-auto mb-4 shadow-soft object-cover" />
          <h1 className="text-3xl font-bold text-foreground">Dukan 360°</h1>
          <p className="text-muted-foreground mt-2">আপনার দোকানের নাম দিন</p>
        </div>

        <div className="card-elevated p-6 animate-fade-in">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">দোকানের নাম</label>
              <input type="text" value={storeName} onChange={(e) => setStoreName(e.target.value)} placeholder="যেমন: করিম স্টোর" className="input-field" autoFocus />
            </div>
            <button onClick={handleSubmit} disabled={!storeName.trim() || loading} className="w-full btn-primary py-4 text-lg rounded-xl disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? 'অপেক্ষা করুন...' : 'শুরু করুন'}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">১৪ দিন ফ্রি ট্রায়াল চলছে</p>
      </div>
    </div>
  );
}

export default Index;