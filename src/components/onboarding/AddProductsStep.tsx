import { Plus, Trash2, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ProductInput {
  name: string;
  price: string;
  profit: string;
  stock: string;
}

interface AddProductsStepProps {
  products: ProductInput[];
  onProductChange: (index: number, field: keyof ProductInput, value: string) => void;
  onAddProduct: () => void;
  onRemoveProduct: (index: number) => void;
  onBack: () => void;
  onComplete: () => void;
}

export function AddProductsStep({
  products,
  onProductChange,
  onAddProduct,
  onRemoveProduct,
  onBack,
  onComplete
}: AddProductsStepProps) {
  const hasValidProducts = products.some(p => p.name.trim().length > 0);

  return (
    <div className="animate-fade-in">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mx-auto mb-4">
          <Package className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">
          কিছু প্রোডাক্ট যোগ করুন 📦
        </h2>
        <p className="text-muted-foreground">
          শুধু ৩–৫ প্রোডাক্ট দিয়ে শুরু করুন। পরে আরও যোগ করা যাবে।
        </p>
      </div>

      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
        {products.map((product, index) => (
          <div
            key={index}
            className="card-elevated p-4 animate-slide-up"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-muted-foreground">
                প্রোডাক্ট #{index + 1}
              </span>
              {products.length > 1 && (
                <button
                  onClick={() => onRemoveProduct(index)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <input
                  type="text"
                  value={product.name}
                  onChange={(e) => onProductChange(index, 'name', e.target.value)}
                  placeholder="প্রোডাক্টের নাম"
                  className="input-field"
                />
              </div>
              <div>
                <input
                  type="number"
                  value={product.price}
                  onChange={(e) => onProductChange(index, 'price', e.target.value)}
                  placeholder="মূল্য (৳)"
                  className="input-field"
                  min="0"
                />
              </div>
              <div>
                <input
                  type="number"
                  value={product.profit}
                  onChange={(e) => onProductChange(index, 'profit', e.target.value)}
                  placeholder="লাভ / ইউনিট (৳)"
                  className="input-field"
                  min="0"
                />
              </div>
              <div className="col-span-2">
                <input
                  type="number"
                  value={product.stock}
                  onChange={(e) => onProductChange(index, 'stock', e.target.value)}
                  placeholder="স্টক সংখ্যা"
                  className="input-field"
                  min="0"
                />
              </div>
            </div>

            {index === 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                💡 লাভ = বিক্রয়মূল্য − ক্রয়মূল্য
              </p>
            )}
          </div>
        ))}
      </div>

      {products.length < 5 && (
        <button
          onClick={onAddProduct}
          className="w-full mt-4 py-3 border-2 border-dashed border-border rounded-xl text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          আরেকটি প্রোডাক্ট যোগ করুন
        </button>
      )}

      <div className="flex gap-3 mt-6">
        <Button
          variant="outline"
          onClick={onBack}
          className="flex-1 py-5 rounded-xl"
        >
          ← পেছনে
        </Button>
        <Button
          onClick={onComplete}
          disabled={!hasValidProducts}
          className="flex-1 btn-primary py-5 rounded-xl"
        >
          🚀 শুরু করুন
        </Button>
      </div>
    </div>
  );
}
