import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/context/StoreContext';
import { OnboardingModal } from '@/components/onboarding/OnboardingModal';

const Index = () => {
  const [mounted, setMounted] = useState(false);
  const { isOnboarded } = useStore();
  const navigate = useNavigate();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && isOnboarded) {
      navigate('/dashboard');
    }
  }, [mounted, isOnboarded, navigate]);

  if (!isOnboarded) {
    return <OnboardingModal />;
  }

  return null;
};

export default Index;
