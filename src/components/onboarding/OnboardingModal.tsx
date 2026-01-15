import { useState } from 'react';
import { WelcomeStep } from './WelcomeStep';
import { AddProductsStep } from './AddProductsStep';
import { CompletionStep } from './CompletionStep';
import { useStore } from '@/context/StoreContext';
import { useNavigate } from 'react-router-dom';

interface ProductInput {
  name: string;
  price: string;
  profit: string;
  stock: string;
}

const initialProducts: ProductInput[] = [
  { name: '', price: '', profit: '', stock: '' },
  { name: '', price: '', profit: '', stock: '' },
  { name: '', price: '', profit: '', stock: '' },
];

export function OnboardingModal() {
  const [step, setStep] = useState(1);
  const [storeName, setStoreName] = useState('');
  const [products, setProducts] = useState<ProductInput[]>(initialProducts);
  const { completeOnboarding } = useStore();
  const navigate = useNavigate();

  const handleProductChange = (index: number, field: keyof ProductInput, value: string) => {
    setProducts(prev => prev.map((p, i) => 
      i === index ? { ...p, [field]: value } : p
    ));
  };

  const handleAddProduct = () => {
    if (products.length < 5) {
      setProducts(prev => [...prev, { name: '', price: '', profit: '', stock: '' }]);
    }
  };

  const handleRemoveProduct = (index: number) => {
    setProducts(prev => prev.filter((_, i) => i !== index));
  };

  const handleComplete = () => {
    const validProducts = products
      .filter(p => p.name.trim())
      .map(p => {
        const price = parseFloat(p.price) || 0;
        const profit = parseFloat(p.profit) || 0;
        return {
          name: p.name.trim(),
          price,
          profit: Math.min(profit, price), // Ensure profit <= price
          stock: parseInt(p.stock) || 0,
          unitType: 'piece' as const,
        };
      });

    completeOnboarding(storeName, validProducts);
    setStep(3);
  };

  const handleGoToDashboard = () => {
    navigate('/dashboard');
  };

  const validProductCount = products.filter(p => p.name.trim()).length;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card rounded-2xl shadow-soft border border-border p-6 md:p-8 max-h-[90vh] overflow-y-auto">
        {/* Progress indicator */}
        {step < 3 && (
          <div className="flex items-center justify-center gap-2 mb-6">
            {[1, 2].map((s) => (
              <div
                key={s}
                className={`h-2 rounded-full transition-all duration-300 ${
                  s === step ? 'w-8 bg-primary' : s < step ? 'w-8 bg-primary/50' : 'w-8 bg-muted'
                }`}
              />
            ))}
          </div>
        )}

        {step === 1 && (
          <WelcomeStep
            storeName={storeName}
            onStoreNameChange={setStoreName}
            onNext={() => setStep(2)}
          />
        )}

        {step === 2 && (
          <AddProductsStep
            products={products}
            onProductChange={handleProductChange}
            onAddProduct={handleAddProduct}
            onRemoveProduct={handleRemoveProduct}
            onBack={() => setStep(1)}
            onComplete={handleComplete}
          />
        )}

        {step === 3 && (
          <CompletionStep
            storeName={storeName}
            productCount={validProductCount}
            onGoToDashboard={handleGoToDashboard}
          />
        )}
      </div>
    </div>
  );
}
