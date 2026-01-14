import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/context/StoreContext';
import { OnboardingModal } from '@/components/onboarding/OnboardingModal';

const Index = () => {
  const { isOnboarded } = useStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (isOnboarded) {
      navigate('/dashboard');
    }
  }, [isOnboarded, navigate]);

  if (!isOnboarded) {
    return <OnboardingModal />;
  }

  return null;
};

export default Index;
