import { useState, useMemo } from 'react';
import { Package, Plus, Search, Edit2, Trash2, X, Scale, Box } from 'lucide-react';
import { useStore } from '@/context/StoreContext';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { ProductType, UnitSellMode, WeightUnit } from '@/types/store';

export default function Products() {
  const { products, addProduct, updateProduct, deleteProduct, getProductSuggestions } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    profit: '',
    stock: '',
    productType: 'unit' as ProductType,
    // Weight fields
    weightUnit: 'kg' as WeightUnit,
    pricePerUnit: '',
    profitPerUnit: '',
    // Unit/Box fields
    sellMode: 'single' as UnitSellMode,
    unitsPerBox: '',
    boxPrice: '',
    boxProfit: '',
  });
  const [showSuggestions, setShowSuggestions] = useState(false);

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const suggestions = useMemo(() => {
    if (!formData.name.trim() || editingId) return [];
    return getProductSuggestions(formData.name);
  }, [formData.name, editingId, getProductSuggestions]);

  // Calculate unit price from box
  const calculatedUnitPrice = useMemo(() => {
    if (formData.sellMode === 'box' && formData.unitsPerBox && formData.boxPrice) {
      return (parseFloat(formData.boxPrice) / parseInt(formData.unitsPerBox)).toFixed(2);
    }
    return '';
  }, [formData.sellMode, formData.unitsPerBox, formData.boxPrice]);

  const calculatedUnitProfit = useMemo(() => {
    if (formData.sellMode === 'box' && formData.unitsPerBox && formData.boxProfit) {
      return (parseFloat(formData.boxProfit) / parseInt(formData.unitsPerBox)).toFixed(2);
    }
    return '';
  }, [formData.sellMode, formData.unitsPerBox, formData.boxProfit]);

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast({ title: "পণ্যের নাম দিন", variant: "destructive" });
      return;
    }

    // Check for duplicate product name (only when adding new)
    if (!editingId) {
      const existingProduct = products.find(
        p => p.name.toLowerCase().trim() === formData.name.toLowerCase().trim()
      );
      if (existingProduct) {
        toast({ 
          title: "এই নামে পণ্য আছে!", 
          description: `"${existingProduct.name}" ইতিমধ্যে তালিকায় আছে। অন্য নাম দিন।`,
          variant: "destructive" 
        });
        return;
      }
    }

    let productData: any = {
      name: formData.name.trim(),
      stock: parseInt(formData.stock) || 0,
      productType: formData.productType,
    };

    if (formData.productType === 'weight') {
      productData = {
        ...productData,
        weightUnit: formData.weightUnit,
        pricePerUnit: parseFloat(formData.pricePerUnit) || 0,
        profitPerUnit: parseFloat(formData.profitPerUnit) || 0,
        price: parseFloat(formData.pricePerUnit) || 0,
        profit: parseFloat(formData.profitPerUnit) || 0,
      };
    } else {
      // Unit type
      if (formData.sellMode === 'box') {
        const unitsPerBox = parseInt(formData.unitsPerBox) || 1;
        const boxPrice = parseFloat(formData.boxPrice) || 0;
        const boxProfit = parseFloat(formData.boxProfit) || 0;
        productData = {
          ...productData,
          sellMode: formData.sellMode,
          unitsPerBox,
          boxPrice,
          boxProfit,
          unitPrice: boxPrice / unitsPerBox,
          unitProfit: boxProfit / unitsPerBox,
          price: boxPrice / unitsPerBox,
          profit: boxProfit / unitsPerBox,
        };
      } else {
        productData = {
          ...productData,
          sellMode: 'single',
          price: parseFloat(formData.price) || 0,
          profit: parseFloat(formData.profit) || 0,
        };
      }
    }

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
      price: product.price?.toString() || '',
      profit: product.profit?.toString() || '',
      stock: product.stock.toString(),
      productType: product.productType || 'unit',
      weightUnit: product.weightUnit || 'kg',
      pricePerUnit: product.pricePerUnit?.toString() || '',
      profitPerUnit: product.profitPerUnit?.toString() || '',
      sellMode: product.sellMode || 'single',
      unitsPerBox: product.unitsPerBox?.toString() || '',
      boxPrice: product.boxPrice?.toString() || '',
      boxProfit: product.boxProfit?.toString() || '',
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
      price: '',
      profit: '',
      stock: '',
      productType: 'unit',
      weightUnit: 'kg',
      pricePerUnit: '',
      profitPerUnit: '',
      sellMode: 'single',
      unitsPerBox: '',
      boxPrice: '',
      boxProfit: '',
    });
    setShowSuggestions(false);
  };

  const selectSuggestion = (productName: string) => {
    toast({ 
      title: "পণ্য ইতিমধ্যে আছে", 
      description: `"${productName}" তালিকায় আছে। স্টক বাড়াতে এডিট করুন।`,
      variant: "destructive"
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
          <div className="w-full max-w-lg bg-card rounded-2xl shadow-soft border border-border p-6 animate-slide-up max-h-[90vh] overflow-y-auto">
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
                      ⚠️ এই নামে পণ্য আছে:
                    </div>
                    {suggestions.map((product) => (
                      <button
                        key={product.id}
                        onClick={() => selectSuggestion(product.name)}
                        className="w-full text-left px-4 py-3 hover:bg-muted transition-colors flex items-center justify-between"
                      >
                        <span className="font-medium">{product.name}</span>
                        <span className="text-sm text-muted-foreground">স্টক: {product.stock}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Product Type Selection */}
              <div>
                <label className="block text-sm font-medium mb-2">পণ্যের ধরন</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, productType: 'unit' })}
                    className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                      formData.productType === 'unit'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <Box className={`w-6 h-6 ${formData.productType === 'unit' ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className={formData.productType === 'unit' ? 'text-primary font-medium' : 'text-muted-foreground'}>
                      ইউনিট/পিস
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, productType: 'weight' })}
                    className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                      formData.productType === 'weight'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <Scale className={`w-6 h-6 ${formData.productType === 'weight' ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className={formData.productType === 'weight' ? 'text-primary font-medium' : 'text-muted-foreground'}>
                      ওজন (কেজি/গ্রাম)
                    </span>
                  </button>
                </div>
              </div>

              {/* Weight-based fields */}
              {formData.productType === 'weight' && (
                <div className="space-y-4 animate-fade-in p-4 bg-muted/30 rounded-xl">
                  <div>
                    <label className="block text-sm font-medium mb-2">ইউনিট</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, weightUnit: 'kg' })}
                        className={`py-3 rounded-xl border-2 transition-all ${
                          formData.weightUnit === 'kg'
                            ? 'border-primary bg-primary/5 text-primary font-medium'
                            : 'border-border text-muted-foreground'
                        }`}
                      >
                        কেজি (KG)
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, weightUnit: 'gram' })}
                        className={`py-3 rounded-xl border-2 transition-all ${
                          formData.weightUnit === 'gram'
                            ? 'border-primary bg-primary/5 text-primary font-medium'
                            : 'border-border text-muted-foreground'
                        }`}
                      >
                        গ্রাম (Gram)
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        মূল্য / {formData.weightUnit === 'kg' ? 'কেজি' : 'গ্রাম'} (৳)
                      </label>
                      <input
                        type="number"
                        value={formData.pricePerUnit}
                        onChange={(e) => setFormData({ ...formData, pricePerUnit: e.target.value })}
                        placeholder="0"
                        className="input-field"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        লাভ / {formData.weightUnit === 'kg' ? 'কেজি' : 'গ্রাম'} (৳)
                      </label>
                      <input
                        type="number"
                        value={formData.profitPerUnit}
                        onChange={(e) => setFormData({ ...formData, profitPerUnit: e.target.value })}
                        placeholder="0"
                        className="input-field"
                        min="0"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Unit-based fields */}
              {formData.productType === 'unit' && (
                <div className="space-y-4 animate-fade-in">
                  {/* Sell Mode Selection */}
                  <div>
                    <label className="block text-sm font-medium mb-2">বিক্রির ধরন</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, sellMode: 'single' })}
                        className={`py-3 rounded-xl border-2 transition-all ${
                          formData.sellMode === 'single'
                            ? 'border-primary bg-primary/5 text-primary font-medium'
                            : 'border-border text-muted-foreground'
                        }`}
                      >
                        একক পিস
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, sellMode: 'box' })}
                        className={`py-3 rounded-xl border-2 transition-all ${
                          formData.sellMode === 'box'
                            ? 'border-primary bg-primary/5 text-primary font-medium'
                            : 'border-border text-muted-foreground'
                        }`}
                      >
                        বক্স/কার্টন
                      </button>
                    </div>
                  </div>

                  {formData.sellMode === 'single' ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium mb-2">মূল্য (৳)</label>
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
                        <label className="block text-sm font-medium mb-2">লাভ / ইউনিট (৳)</label>
                        <input
                          type="number"
                          value={formData.profit}
                          onChange={(e) => setFormData({ ...formData, profit: e.target.value })}
                          placeholder="0"
                          className="input-field"
                          min="0"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 p-4 bg-muted/30 rounded-xl">
                      <div>
                        <label className="block text-sm font-medium mb-2">প্রতি বক্সে কতটি?</label>
                        <input
                          type="number"
                          value={formData.unitsPerBox}
                          onChange={(e) => setFormData({ ...formData, unitsPerBox: e.target.value })}
                          placeholder="যেমন: 24"
                          className="input-field"
                          min="1"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium mb-2">বক্সের দাম (৳)</label>
                          <input
                            type="number"
                            value={formData.boxPrice}
                            onChange={(e) => setFormData({ ...formData, boxPrice: e.target.value })}
                            placeholder="0"
                            className="input-field"
                            min="0"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">বক্সে লাভ (৳)</label>
                          <input
                            type="number"
                            value={formData.boxProfit}
                            onChange={(e) => setFormData({ ...formData, boxProfit: e.target.value })}
                            placeholder="0"
                            className="input-field"
                            min="0"
                          />
                        </div>
                      </div>
                      {calculatedUnitPrice && (
                        <div className="p-3 bg-profit/10 rounded-lg">
                          <p className="text-sm text-muted-foreground">প্রতি পিসের দাম:</p>
                          <p className="text-lg font-bold text-profit">
                            ৳{calculatedUnitPrice} (লাভ: ৳{calculatedUnitProfit})
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Stock */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  স্টক {formData.productType === 'weight' 
                    ? `(${formData.weightUnit === 'kg' ? 'কেজি' : 'গ্রাম'})` 
                    : formData.sellMode === 'box' ? '(পিস সংখ্যা)' : '(সংখ্যা)'}
                </label>
                <input
                  type="number"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  placeholder="0"
                  className="input-field"
                  min="0"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={resetForm} className="flex-1 py-5 rounded-xl">
                  বাতিল
                </Button>
                <Button onClick={handleSubmit} className="flex-1 btn-primary py-5 rounded-xl">
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
                {product.productType === 'weight' ? (
                  <Scale className={`w-6 h-6 ${product.stock <= 5 ? 'text-warning' : 'text-primary'}`} />
                ) : (
                  <Package className={`w-6 h-6 ${product.stock <= 5 ? 'text-warning' : 'text-primary'}`} />
                )}
              </div>
              <div>
                <p className="font-semibold text-foreground">{product.name}</p>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-primary font-medium">
                    ৳{product.price}
                    {product.productType === 'weight' && `/${product.weightUnit === 'kg' ? 'কেজি' : 'গ্রাম'}`}
                  </span>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-profit">+৳{product.profit} লাভ</span>
                  {product.sellMode === 'box' && (
                    <>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-xs bg-muted px-2 py-0.5 rounded">বক্স: {product.unitsPerBox}টি</span>
                    </>
                  )}
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
                  {product.productType === 'weight' 
                    ? (product.weightUnit === 'kg' ? 'কেজি' : 'গ্রাম')
                    : 'স্টক'}
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
