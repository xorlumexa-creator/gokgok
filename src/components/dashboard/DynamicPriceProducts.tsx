import { useState } from 'react';
import { TrendingUp, Edit2, Check, X } from 'lucide-react';
import { useStore } from '@/context/StoreContext';
import { toast } from '@/hooks/use-toast';

export function DynamicPriceProducts() {
  const { products, updateProduct } = useStore();
  const dynamicProducts = products.filter(p => p.dynamicPrice);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState('');

  if (dynamicProducts.length === 0) return null;

  const handleQuickEdit = (productId: string) => {
    const product = dynamicProducts.find(p => p.id === productId);
    if (!product) return;
    setEditingId(productId);
    setEditPrice(product.sellingUnits?.[0]?.price?.toString() || product.price.toString());
  };

  const handleSavePrice = (productId: string) => {
    const product = dynamicProducts.find(p => p.id === productId);
    if (!product) return;
    const newPrice = parseFloat(editPrice);
    if (isNaN(newPrice) || newPrice <= 0) {
      toast({ title: "সঠিক দাম দিন", variant: "destructive" });
      return;
    }

    // Update first selling unit price
    if (product.sellingUnits && product.sellingUnits.length > 0) {
      const updatedUnits = product.sellingUnits.map((u, i) => {
        if (i === 0) {
          const oldCost = u.price - u.profit;
          return { ...u, price: newPrice, profit: Math.max(0, newPrice - oldCost) };
        }
        return u;
      });
      const basePrice = newPrice / updatedUnits[0].conversionToBase;
      const baseProfit = updatedUnits[0].profit / updatedUnits[0].conversionToBase;
      updateProduct(productId, { sellingUnits: updatedUnits, price: basePrice, profit: baseProfit });
    } else {
      updateProduct(productId, { price: newPrice });
    }

    setEditingId(null);
    toast({ title: "দাম আপডেট হয়েছে ✓" });
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
          const isEditing = editingId === product.id;

          return (
            <div key={product.id} className="flex items-center justify-between bg-background/80 p-3 rounded-lg">
              <div>
                <p className="font-medium text-sm text-foreground">{product.name}</p>
                <p className="text-xs text-muted-foreground">ক্রয়: ৳{costPrice.toFixed(0)}</p>
              </div>
              <div className="flex items-center gap-2">
                {isEditing ? (
                  <>
                    <input
                      type="number"
                      value={editPrice}
                      onChange={(e) => setEditPrice(e.target.value)}
                      className="w-20 input-field text-sm py-1 px-2 text-center"
                      autoFocus
                    />
                    <button onClick={() => handleSavePrice(product.id)} className="p-1.5 bg-profit/10 text-profit rounded-lg hover:bg-profit/20">
                      <Check className="w-4 h-4" />
                    </button>
                    <button onClick={() => setEditingId(null)} className="p-1.5 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80">
                      <X className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="font-bold text-primary">৳{currentPrice}</span>
                    <button onClick={() => handleQuickEdit(product.id)} className="p-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary/20">
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}