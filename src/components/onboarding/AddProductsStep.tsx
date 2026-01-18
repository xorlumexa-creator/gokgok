import { Plus, Trash2, Package, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { UnitType, getUnitLabel } from '@/types/store';

interface ProductUnitInput {
  name: string;
  price: string;
}

interface ProductInput {
  name: string;
  stock: string;
  units: ProductUnitInput[];
}

interface AddProductsStepProps {
  products: ProductInput[];
  onProductChange: (index: number, field: keyof Omit<ProductInput, 'units'>, value: string) => void;
  onProductUnitChange: (productIndex: number, unitIndex: number, field: keyof ProductUnitInput, value: string) => void;
  onAddProductUnit: (productIndex: number) => void;
  onRemoveProductUnit: (productIndex: number, unitIndex: number) => void;
  onAddProduct: () => void;
  onRemoveProduct: (index: number) => void;
  onBack: () => void;
  onComplete: () => void;
}

export function AddProductsStep({
  products,
  onProductChange,
  onProductUnitChange,
  onAddProductUnit,
  onRemoveProductUnit,
  onAddProduct,
  onRemoveProduct,
  onBack,
  onComplete
}: AddProductsStepProps) {
  const hasValidProducts = products.some(p => p.name.trim().length > 0 && p.units.some(u => u.name.trim() && parseFloat(u.price) > 0));

  return (
    <div className="animate-fade-in">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mx-auto mb-4">
          <Package className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">
          কিছু পণ্য যোগ করুন 📦
        </h2>
        <p className="text-muted-foreground text-sm">
          শুধু ৩-৫টি পণ্য দিয়ে শুরু করুন। পরে আরও যোগ করা যাবে।
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
                পণ্য #{index + 1}
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

            <div className="space-y-3">
              {/* Product Name */}
              <input
                type="text"
                value={product.name}
                onChange={(e) => onProductChange(index, 'name', e.target.value)}
                placeholder="পণ্যের নাম (যেমন: ডিম, চাল)"
                className="input-field"
              />
              
              {/* Stock */}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">মোট স্টক</label>
                <input
                  type="number"
                  value={product.stock}
                  onChange={(e) => onProductChange(index, 'stock', e.target.value)}
                  placeholder="যত পণ্য বর্তমানে আছে"
                  className="input-field"
                  min="0"
                />
              </div>

              {/* Units Section */}
              <div className="border-t border-border pt-3 mt-3">
                <label className="text-xs text-muted-foreground mb-2 block">একক ও দাম:</label>
                <div className="space-y-2">
                  {product.units.map((unit, unitIndex) => (
                    <div key={unitIndex} className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={unit.name}
                        onChange={(e) => onProductUnitChange(index, unitIndex, 'name', e.target.value)}
                        placeholder="একক (যেমন: ১ পিস, ১ ডজন)"
                        className="input-field flex-1"
                      />
                      <div className="relative w-28">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">৳</span>
                        <input
                          type="number"
                          value={unit.price}
                          onChange={(e) => onProductUnitChange(index, unitIndex, 'price', e.target.value)}
                          placeholder="দাম"
                          className="input-field pl-7"
                          min="0"
                        />
                      </div>
                      {product.units.length > 1 && (
                        <button
                          onClick={() => onRemoveProductUnit(index, unitIndex)}
                          className="p-2 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => onAddProductUnit(index)}
                  className="mt-2 text-sm text-primary hover:underline flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  আরেকটি একক যোগ করুন
                </button>
              </div>
            </div>

            {index === 0 && (
              <p className="text-xs text-muted-foreground mt-3 p-2 bg-muted/50 rounded-lg">
                💡 উদাহরণ: ডিম → একক: "১ পিস" দাম ১২৳, "১ ডজন" দাম ১৩৫৳, "৩০ পিস" দাম ৩২০৳
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
          আরেকটি পণ্য যোগ করুন
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
