import { useStore } from '@/context/StoreContext';
import { AlertTriangle, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function LowStockAlert() {
  const { products } = useStore();
  const navigate = useNavigate();
  
  const lowStockProducts = products.filter(p => p.stock <= 5);

  if (lowStockProducts.length === 0) {
    return null;
  }

  return (
    <div className="card-elevated p-4 border-l-4 border-l-warning">
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 bg-warning/10 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-warning" />
        </div>
        <h3 className="font-semibold text-foreground">স্টক কম আছে!</h3>
      </div>
      
      <div className="space-y-2">
        {lowStockProducts.slice(0, 3).map((product) => (
          <div 
            key={product.id}
            className="flex items-center justify-between py-2 px-3 bg-warning/5 rounded-lg"
          >
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-warning" />
              <span className="text-foreground">{product.name}</span>
            </div>
            <span className="text-sm font-semibold text-warning">
              {product.stock}টি বাকি
            </span>
          </div>
        ))}
      </div>

      {lowStockProducts.length > 3 && (
        <button
          onClick={() => navigate('/products')}
          className="w-full mt-3 py-2 text-sm text-primary hover:underline"
        >
          আরও {lowStockProducts.length - 3}টি দেখুন →
        </button>
      )}
    </div>
  );
}
