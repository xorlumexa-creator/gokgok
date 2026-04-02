import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, Edit2 } from 'lucide-react';
import { useStore } from '@/context/StoreContext';

export function DynamicPriceProducts() {
  const { products } = useStore();
  const navigate = useNavigate();
  const dynamicProducts = products.filter(p => p.dynamicPrice);

  if (dynamicProducts.length === 0) return null;

  const handleEdit = (productId: string) => {
    // Navigate to products page with edit intent
    navigate('/products', { state: { editProductId: productId } });
  };

  return (
    <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="w-5 h-5 text-amber-600" />
        <h3 className="font-semibold text-amber-800 dark:text-amber-200">দাম উঠা-নামা পণ্য</h3>
      </div>

      <div className="space-y-2">
        {dynamicProducts.map(product => {
          const currentPrice = product.sellingUnits?.[0]?.price || product.price;
          const costPrice = product.sellingUnits?.[0] 
            ? product.sellingUnits[0].price - product.sellingUnits[0].profit 
            : 0;

          return (
            <div key={product.id} className="flex items-center justify-between bg-background/80 p-3 rounded-lg">
              <div>
                <p className="font-medium text-sm text-foreground">{product.name}</p>
                <p className="text-xs text-muted-foreground">ক্রয়: ৳{costPrice.toFixed(0)} | বিক্রয়: ৳{currentPrice}</p>
              </div>
              <button onClick={() => handleEdit(product.id)} className="p-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors">
                <Edit2 className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
