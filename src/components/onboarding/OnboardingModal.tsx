import { useState, useEffect } from 'react';
import { WelcomeStep } from './WelcomeStep';
import { AddProductsStep } from './AddProductsStep';
import { CompletionStep } from './CompletionStep';
import { useStore } from '@/context/StoreContext';
import { useNavigate } from 'react-router-dom';

interface ProductUnitInput {
  name: string;
  price: string;
}

interface ProductInput {
  name: string;
  stock: string;
  units: ProductUnitInput[];
}

const createEmptyProduct = (): ProductInput => ({
  name: '',
  stock: '',
  units: [{ name: '', price: '' }],
});

const initialProducts: ProductInput[] = [
  createEmptyProduct(),
  createEmptyProduct(),
  createEmptyProduct(),
];

export function OnboardingModal() {
  const [step, setStep] = useState(1);
  const [storeName, setStoreName] = useState('');
  const [products, setProducts] = useState<ProductInput[]>(initialProducts);
  const { completeOnboarding } = useStore();
  const navigate = useNavigate();

  const handleProductChange = (index: number, field: keyof Omit<ProductInput, 'units'>, value: string) => {
    setProducts(prev => prev.map((p, i) => 
      i === index ? { ...p, [field]: value } : p
    ));
  };

  const handleProductUnitChange = (productIndex: number, unitIndex: number, field: keyof ProductUnitInput, value: string) => {
    setProducts(prev => prev.map((p, i) => {
      if (i !== productIndex) return p;
      return {
        ...p,
        units: p.units.map((u, j) => 
          j === unitIndex ? { ...u, [field]: value } : u
        ),
      };
    }));
  };

  const handleAddProductUnit = (productIndex: number) => {
    setProducts(prev => prev.map((p, i) => {
      if (i !== productIndex) return p;
      return {
        ...p,
        units: [...p.units, { name: '', price: '' }],
      };
    }));
  };

  const handleRemoveProductUnit = (productIndex: number, unitIndex: number) => {
    setProducts(prev => prev.map((p, i) => {
      if (i !== productIndex) return p;
      if (p.units.length <= 1) return p;
      return {
        ...p,
        units: p.units.filter((_, j) => j !== unitIndex),
      };
    }));
  };

  const handleAddProduct = () => {
    if (products.length < 5) {
      setProducts(prev => [...prev, createEmptyProduct()]);
    }
  };

  const handleRemoveProduct = (index: number) => {
    setProducts(prev => prev.filter((_, i) => i !== index));
  };

  const handleComplete = () => {
    const validProducts = products
      .filter(p => p.name.trim() && p.units.some(u => u.name.trim() && parseFloat(u.price) > 0))
      .map(p => {
        // Get first valid unit as base price
        const validUnits = p.units.filter(u => u.name.trim() && parseFloat(u.price) > 0);
        const basePrice = parseFloat(validUnits[0]?.price) || 0;
        
        // Create product units array
        const productUnits = validUnits.map((u, idx) => ({
          id: `unit_${Date.now()}_${idx}`,
          name: u.name.trim(),
          price: parseFloat(u.price) || 0,
          conversionValue: 1, // Default, can be calculated if needed
        }));

        return {
          name: p.name.trim(),
          price: basePrice,
          profit: 0, // Will be calculated per sale
          stock: parseInt(p.stock) || 0,
          unitType: 'piece' as const,
          units: productUnits,
        };
      });

    completeOnboarding(storeName, validProducts);
    setStep(3);
  };

  const handleGoToDashboard = () => {
    navigate('/dashboard');
  };

  const validProductCount = products.filter(p => p.name.trim() && p.units.some(u => u.name.trim())).length;

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
            onProductUnitChange={handleProductUnitChange}
            onAddProductUnit={handleAddProductUnit}
            onRemoveProductUnit={handleRemoveProductUnit}
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
