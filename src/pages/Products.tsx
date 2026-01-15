import { useState, useMemo } from 'react';
import { Package, Plus, Search, Edit2, Trash2, X } from 'lucide-react';
import { useStore } from '@/context/StoreContext';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { UnitType, getUnitLabel } from '@/types/store';

const UNIT_OPTIONS: { value: UnitType; label: string }[] = [
  { value: 'piece', label: 'পিস' },
  { value: 'kg', label: 'কেজি' },
  { value: 'gram', label: 'গ্রাম' },
  { value: 'hali', label: 'হালি (4 পিস)' },
  { value: 'dozen', label: 'ডজন (12 পিস)' },
  { value: 'box', label: 'বক্স' },
];

export default function Products() {
  const { products, addProduct, updateProduct, deleteProduct, getProductSuggestions } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    unitType: 'piece' as UnitType,
    price: '',
    profit: '',
    stock: '',
    unitsPerBox: '',
  });
  const [showSuggestions, setShowSuggestions] = useState(false);

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const suggestions = useMemo(() => {
    if (!formData.name.trim() || editingId) return [];
    return getProductSuggestions(formData.name);
  }, [formData.name, editingId, getProductSuggestions]);

  // Validate profit doesn't exceed price
  const isProfitValid = useMemo(() => {
    const price = parseFloat(formData.price) || 0;
    const profit = parseFloat(formData.profit) || 0;
    return profit <= price;
  }, [formData.price, formData.profit]);

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast({ title: "পণ্যের নাম দিন", variant: "destructive" });
      return;
    }

    const price = parseFloat(formData.price) || 0;
    const profit = parseFloat(formData.profit) || 0;

    if (profit > price) {
      toast({ 
        title: "লাভ বেশি হয়ে গেছে!", 
        description: "লাভ বিক্রয়মূল্যের চেয়ে বেশি হতে পারে না",
        variant: "destructive" 
      });
      return;
    }

    if (profit < 0) {
      toast({ 
        title: "লাভ নেগেটিভ হতে পারে না", 
        variant: "destructive" 
      });
      return;
    }

    // Check for duplicate product name + unit type combo (only when adding new)
    if (!editingId) {
      const existingProduct = products.find(
        p => p.name.toLowerCase().trim() === formData.name.toLowerCase().trim() &&
             p.unitType === formData.unitType
      );
      if (existingProduct) {
        toast({ 
          title: "এই পণ্য আছে!", 
          description: `"${existingProduct.name}" (${getUnitLabel(existingProduct.unitType)}) ইতিমধ্যে তালিকায় আছে।`,
          variant: "destructive" 
        });
        return;
      }
    }

    const productData = {
      name: formData.name.trim(),
      unitType: formData.unitType,
      price,
      profit,
      stock: parseFloat(formData.stock) || 0,
      unitsPerBox: formData.unitType === 'box' ? (parseInt(formData.unitsPerBox) || undefined) : undefined,
    };

    if (editingId) {
      updateProduct(editingId, productData);
      toast({ title: "পণ্য আপডেট হয়েছে ✓" });
    } else {
      addProduct(productData);
      toast({ title: "নতুন পণ্য যোগ হয়েছে ✓" });
    }

    resetForm();
  };

  const handleEdit = (product: typeof products[0]) => {
    setEditingId(product.id);
    setFormData({
      name: product.name,
      unitType: product.unitType,
      price: product.price.toString(),
      profit: product.profit.toString(),
      stock: product.stock.toString(),
      unitsPerBox: product.unitsPerBox?.toString() || '',
    });
    setShowAddForm(true);
  };

  const handleDelete = (id: string) => {
    deleteProduct(id);
    toast({ title: "পণ্য মুছে ফেলা হয়েছে" });
  };

  const resetForm = () => {
    setShowAddForm(false);
    setEditingId(null);
    setFormData({
      name: '',
      unitType: 'piece',
      price: '',
      profit: '',
      stock: '',
      unitsPerBox: '',
    });
    setShowSuggestions(false);
  };

  const selectSuggestion = (product: typeof products[0]) => {
    toast({ 
      title: "পণ্য ইতিমধ্যে আছে", 
      description: `"${product.name}" (${getUnitLabel(product.unitType)}) তালিকায় আছে। স্টক বাড়াতে এডিট করুন।`,
    });
    setShowSuggestions(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-xl">
            <Package className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">পণ্যসমূহ</h1>
            <p className="text-muted-foreground">{products.length}টি পণ্য</p>
          </div>
        </div>
        <Button
          onClick={() => setShowAddForm(true)}
          className="btn-primary rounded-xl"
        >
          <Plus className="w-5 h-5 mr-2" />
          নতুন পণ্য
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="পণ্য খুঁজুন..."
          className="input-field pl-10"
        />
      </div>

      {/* Add/Edit Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-card rounded-2xl shadow-soft border border-border p-6 animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-foreground">
                {editingId ? 'পণ্য সম্পাদনা' : 'নতুন পণ্য যোগ করুন'}
              </h2>
              <button onClick={resetForm} className="p-2 hover:bg-muted rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Product Name with Autocomplete */}
              <div className="relative">
                <label className="block text-sm font-medium mb-2">পণ্যের নাম</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder="পণ্যের নাম লিখুন"
                  className="input-field"
                  autoFocus
                />
                {/* Suggestions dropdown */}
                {showSuggestions && suggestions.length > 0 && !editingId && (
                  <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-xl shadow-lg max-h-48 overflow-y-auto">
                    <div className="p-2 text-xs text-muted-foreground bg-muted/50">
                      ⚠️ একই নামে পণ্য আছে:
                    </div>
                    {suggestions.map((product) => (
                      <button
                        key={product.id}
                        onClick={() => selectSuggestion(product)}
                        className="w-full text-left px-4 py-3 hover:bg-muted transition-colors flex items-center justify-between"
                      >
                        <div>
                          <span className="font-medium">{product.name}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            ({getUnitLabel(product.unitType)})
                          </span>
                        </div>
                        <span className="text-sm text-muted-foreground">৳{product.price}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Unit Type Selection */}
              <div>
                <label className="block text-sm font-medium mb-2">একক/পরিমাণ</label>
                <div className="grid grid-cols-3 gap-2">
                  {UNIT_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, unitType: option.value })}
                      className={`py-3 px-2 rounded-xl border-2 transition-all text-sm ${
                        formData.unitType === option.value
                          ? 'border-primary bg-primary/5 text-primary font-medium'
                          : 'border-border text-muted-foreground hover:border-primary/50'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Box units info */}
              {formData.unitType === 'box' && (
                <div className="animate-fade-in">
                  <label className="block text-sm font-medium mb-2">প্রতি বক্সে কতটি পিস?</label>
                  <input
                    type="number"
                    value={formData.unitsPerBox}
                    onChange={(e) => setFormData({ ...formData, unitsPerBox: e.target.value })}
                    placeholder="যেমন: 24"
                    className="input-field"
                    min="1"
                  />
                </div>
              )}

              {/* Price & Profit */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    মূল্য / {getUnitLabel(formData.unitType)} (৳)
                  </label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="0"
                    className="input-field"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    লাভ / {getUnitLabel(formData.unitType)} (৳)
                  </label>
                  <input
                    type="number"
                    value={formData.profit}
                    onChange={(e) => setFormData({ ...formData, profit: e.target.value })}
                    placeholder="0"
                    className={`input-field ${!isProfitValid ? 'border-due' : ''}`}
                    min="0"
                  />
                  {!isProfitValid && (
                    <p className="text-xs text-due mt-1">লাভ মূল্যের চেয়ে বেশি!</p>
                  )}
                </div>
              </div>

              {/* Stock */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  স্টক ({getUnitLabel(formData.unitType)})
                </label>
                <input
                  type="number"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  placeholder="0"
                  className="input-field"
                  min="0"
                  step={formData.unitType === 'kg' || formData.unitType === 'gram' ? '0.1' : '1'}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={resetForm} className="flex-1 py-5 rounded-xl">
                  বাতিল
                </Button>
                <Button 
                  onClick={handleSubmit} 
                  className="flex-1 btn-primary py-5 rounded-xl"
                  disabled={!isProfitValid}
                >
                  {editingId ? 'আপডেট করুন' : 'যোগ করুন'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Products List */}
      <div className="space-y-3">
        {filteredProducts.map((product) => (
          <div
            key={product.id}
            className="card-elevated p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                product.stock <= 5 ? 'bg-warning/10' : 'bg-accent'
              }`}>
                <Package className={`w-6 h-6 ${product.stock <= 5 ? 'text-warning' : 'text-primary'}`} />
              </div>
              <div>
                <p className="font-semibold text-foreground">{product.name}</p>
                <div className="flex items-center gap-2 text-sm flex-wrap">
                  <span className="bg-muted px-2 py-0.5 rounded text-xs">
                    {getUnitLabel(product.unitType)}
                    {product.unitType === 'box' && product.unitsPerBox && ` (${product.unitsPerBox}টি)`}
                  </span>
                  <span className="text-primary font-medium">৳{product.price}</span>
                  <span className="text-profit">+৳{product.profit}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className={`text-lg font-bold ${
                  product.stock <= 5 ? 'text-warning' : 'text-foreground'
                }`}>
                  {product.stock}
                </p>
                <p className="text-xs text-muted-foreground">
                  {getUnitLabel(product.unitType)}
                </p>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => handleEdit(product)}
                  className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(product.id)}
                  className="p-2 hover:bg-destructive/10 rounded-lg text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>কোন পণ্য পাওয়া যায়নি</p>
        </div>
      )}
    </div>
  );
}
