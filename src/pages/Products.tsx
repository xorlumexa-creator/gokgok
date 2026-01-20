import { useState, useMemo } from 'react';
import { Package, Plus, Search, Edit2, Trash2, X, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useStore } from '@/context/StoreContext';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { UnitType, SellingUnit, PRODUCT_CATEGORIES, BASE_UNITS, PRESET_SELLING_UNITS, getUnitLabel } from '@/types/store';

const generateId = () => Math.random().toString(36).substr(2, 9);

export default function Products() {
  const { products, addProduct, updateProduct, deleteProduct, getProductSuggestions } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    code: '',
    baseUnit: 'পিস',
    unitType: 'piece' as UnitType,
    stock: '',
    baseProfitPerUnit: '', // Profit per base unit
  });

  // Multi-unit selling options
  const [sellingUnits, setSellingUnits] = useState<SellingUnit[]>([
    { id: generateId(), name: 'পিস', conversionToBase: 1, price: 0, profit: 0 }
  ]);

  const [showSuggestions, setShowSuggestions] = useState(false);

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const suggestions = useMemo(() => {
    if (!formData.name.trim() || editingId) return [];
    return getProductSuggestions(formData.name);
  }, [formData.name, editingId, getProductSuggestions]);

  // Calculate profit per base unit from the first selling unit
  const profitPerBaseUnit = useMemo(() => {
    const firstUnit = sellingUnits[0];
    if (firstUnit && firstUnit.price > 0 && firstUnit.conversionToBase > 0) {
      return parseFloat(formData.baseProfitPerUnit) || 0;
    }
    return 0;
  }, [sellingUnits, formData.baseProfitPerUnit]);

  const addSellingUnit = () => {
    setSellingUnits([
      ...sellingUnits,
      { id: generateId(), name: '', conversionToBase: 1, price: 0, profit: 0 }
    ]);
  };

  const updateSellingUnit = (id: string, field: keyof SellingUnit, value: string | number) => {
    setSellingUnits(sellingUnits.map(unit => {
      if (unit.id === id) {
        const updated = { ...unit, [field]: value };
        // Auto-calculate profit based on base profit
        if (field === 'conversionToBase' || field === 'price') {
          updated.profit = profitPerBaseUnit * (updated.conversionToBase || 1);
        }
        return updated;
      }
      return unit;
    }));
  };

  const removeSellingUnit = (id: string) => {
    if (sellingUnits.length > 1) {
      setSellingUnits(sellingUnits.filter(u => u.id !== id));
    }
  };

  const selectPresetUnit = (preset: typeof PRESET_SELLING_UNITS[0]) => {
    const existingUnit = sellingUnits.find(u => u.name === preset.name);
    if (!existingUnit) {
      setSellingUnits([
        ...sellingUnits,
        { 
          id: generateId(), 
          name: preset.name, 
          conversionToBase: preset.conversionToBase, 
          price: 0,
          profit: profitPerBaseUnit * preset.conversionToBase
        }
      ]);
    }
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast({ title: "পণ্যের নাম দিন", variant: "destructive" });
      return;
    }

    const stock = parseFloat(formData.stock) || 0;
    if (stock < 0) {
      toast({ title: "স্টক নেগেটিভ হতে পারে না", variant: "destructive" });
      return;
    }

    // Validate selling units
    const validUnits = sellingUnits.filter(u => u.name.trim() && u.conversionToBase > 0);
    if (validUnits.length === 0) {
      toast({ title: "অন্তত একটি বিক্রয় ইউনিট যোগ করুন", variant: "destructive" });
      return;
    }

    // Check for duplicate unit names
    const unitNames = validUnits.map(u => u.name.toLowerCase());
    if (new Set(unitNames).size !== unitNames.length) {
      toast({ title: "একই নামে দুইটি ইউনিট থাকতে পারে না", variant: "destructive" });
      return;
    }

    // Check for duplicate conversion values
    const conversions = validUnits.map(u => u.conversionToBase);
    if (new Set(conversions).size !== conversions.length) {
      toast({ title: "একই conversion দুইবার থাকতে পারে না", variant: "destructive" });
      return;
    }

    // Base price and profit from first selling unit
    const basePrice = validUnits[0].price / validUnits[0].conversionToBase;
    const baseProfit = parseFloat(formData.baseProfitPerUnit) || 0;

    if (baseProfit < 0) {
      toast({ title: "লাভ নেগেটিভ হতে পারে না", variant: "destructive" });
      return;
    }

    // Update profits for all units based on base profit
    const unitsWithProfit = validUnits.map(u => ({
      ...u,
      profit: baseProfit * u.conversionToBase
    }));

    const productData = {
      name: formData.name.trim(),
      category: formData.category,
      code: formData.code.trim(),
      baseUnit: formData.baseUnit,
      unitType: formData.unitType,
      price: basePrice,
      profit: baseProfit,
      stock,
      sellingUnits: unitsWithProfit,
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
      category: product.category || '',
      code: product.code || '',
      baseUnit: product.baseUnit || getUnitLabel(product.unitType),
      unitType: product.unitType,
      stock: product.stock.toString(),
      baseProfitPerUnit: product.profit.toString(),
    });
    
    // Load existing selling units or create default
    if (product.sellingUnits && product.sellingUnits.length > 0) {
      setSellingUnits(product.sellingUnits);
    } else {
      setSellingUnits([
        { id: generateId(), name: getUnitLabel(product.unitType), conversionToBase: 1, price: product.price, profit: product.profit }
      ]);
    }
    
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
      category: '',
      code: '',
      baseUnit: 'পিস',
      unitType: 'piece',
      stock: '',
      baseProfitPerUnit: '',
    });
    setSellingUnits([
      { id: generateId(), name: 'পিস', conversionToBase: 1, price: 0, profit: 0 }
    ]);
    setShowSuggestions(false);
    setShowSummary(false);
  };

  const selectSuggestion = (product: typeof products[0]) => {
    toast({ 
      title: "পণ্য ইতিমধ্যে আছে", 
      description: `"${product.name}" তালিকায় আছে। স্টক বাড়াতে এডিট করুন।`,
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
        <Button onClick={() => setShowAddForm(true)} className="btn-primary rounded-xl">
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
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-foreground">
                  {editingId ? 'পণ্য সম্পাদনা' : 'নতুন পণ্য যোগ করুন'}
                </h2>
                <button
                  onClick={() => setShowHelp(!showHelp)}
                  className="p-1 text-muted-foreground hover:text-foreground"
                >
                  <HelpCircle className="w-5 h-5" />
                </button>
              </div>
              <button onClick={resetForm} className="p-2 hover:bg-muted rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Help Section */}
            {showHelp && (
              <div className="mb-6 p-4 bg-primary/10 rounded-xl text-sm animate-fade-in">
                <p className="font-semibold mb-2">📌 কিভাবে কাজ করে?</p>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• স্টক সবসময় base unit (ছোট ইউনিট) এ রাখা হয়</li>
                  <li>• ডিমের জন্য base unit = পিস</li>
                  <li>• আপনি ডজন, ৩০ পিস ইত্যাদি ইউনিটে বিক্রি করতে পারবেন</li>
                  <li>• লাভ প্রতি base unit এ দিন, অন্য ইউনিটে অটো হিসাব হবে</li>
                </ul>
              </div>
            )}

            <div className="space-y-4">
              {/* Product Name */}
              <div className="relative">
                <label className="block text-sm font-medium mb-2">পণ্যের নাম *</label>
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
                <p className="text-xs text-muted-foreground mt-1">যে নামে পণ্য চিনবেন</p>
                
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
                        <span className="font-medium">{product.name}</span>
                        <span className="text-sm text-muted-foreground">৳{product.price}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Category & Code */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-2">ক্যাটাগরি</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="input-field"
                  >
                    <option value="">নির্বাচন করুন</option>
                    {PRODUCT_CATEGORIES.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">প্রোডাক্ট কোড</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="ঐচ্ছিক"
                    className="input-field"
                  />
                </div>
              </div>

              {/* Base Unit Selection */}
              <div>
                <label className="block text-sm font-medium mb-2">Base Unit (ছোট ইউনিট) *</label>
                <div className="grid grid-cols-4 gap-2">
                  {BASE_UNITS.map((unit) => (
                    <button
                      key={unit.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, baseUnit: unit.label, unitType: unit.value as UnitType })}
                      className={`py-2 px-2 rounded-xl border-2 transition-all text-sm ${
                        formData.baseUnit === unit.label
                          ? 'border-primary bg-primary/5 text-primary font-medium'
                          : 'border-border text-muted-foreground hover:border-primary/50'
                      }`}
                    >
                      {unit.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">স্টক এই ইউনিটে রাখা হবে</p>
              </div>

              {/* Stock */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  স্টক ({formData.baseUnit}) *
                </label>
                <input
                  type="number"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  placeholder="মোট কয়টি আছে"
                  className="input-field"
                  min="0"
                />
              </div>

              {/* Profit per Base Unit */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  লাভ / {formData.baseUnit} (৳) *
                </label>
                <input
                  type="number"
                  value={formData.baseProfitPerUnit}
                  onChange={(e) => setFormData({ ...formData, baseProfitPerUnit: e.target.value })}
                  placeholder="প্রতি পিসে কত লাভ"
                  className="input-field"
                  min="0"
                  step="0.01"
                />
                <p className="text-xs text-muted-foreground mt-1">প্রতি {formData.baseUnit} এ কত লাভ করতে চান</p>
              </div>

              {/* Multi-Unit Selling Options */}
              <div className="border-t border-border pt-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium">বিক্রয় ইউনিট ও দাম</label>
                  <button
                    type="button"
                    onClick={addSellingUnit}
                    className="text-sm text-primary flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    আরও যোগ করুন
                  </button>
                </div>

                {/* Preset Units */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {PRESET_SELLING_UNITS.slice(0, 6).map(preset => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => selectPresetUnit(preset)}
                      className="text-xs px-2 py-1 bg-muted hover:bg-primary/10 rounded-lg transition-colors"
                    >
                      {preset.name} ({preset.conversionToBase})
                    </button>
                  ))}
                </div>

                {/* Selling Units List */}
                <div className="space-y-3">
                  {sellingUnits.map((unit, index) => (
                    <div key={unit.id} className="p-3 bg-muted/50 rounded-xl">
                      <div className="grid grid-cols-12 gap-2 items-end">
                        <div className="col-span-4">
                          <label className="text-xs text-muted-foreground">ইউনিট নাম</label>
                          <input
                            type="text"
                            value={unit.name}
                            onChange={(e) => updateSellingUnit(unit.id, 'name', e.target.value)}
                            placeholder="যেমন: ডজন"
                            className="input-field text-sm py-2"
                          />
                        </div>
                        <div className="col-span-3">
                          <label className="text-xs text-muted-foreground">= {formData.baseUnit}</label>
                          <input
                            type="number"
                            value={unit.conversionToBase || ''}
                            onChange={(e) => updateSellingUnit(unit.id, 'conversionToBase', parseFloat(e.target.value) || 0)}
                            placeholder="12"
                            className="input-field text-sm py-2"
                            min="1"
                          />
                        </div>
                        <div className="col-span-4">
                          <label className="text-xs text-muted-foreground">বিক্রয়মূল্য (৳)</label>
                          <input
                            type="number"
                            value={unit.price || ''}
                            onChange={(e) => updateSellingUnit(unit.id, 'price', parseFloat(e.target.value) || 0)}
                            placeholder="135"
                            className="input-field text-sm py-2"
                            min="0"
                          />
                        </div>
                        <div className="col-span-1">
                          {sellingUnits.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeSellingUnit(unit.id)}
                              className="p-2 text-due hover:bg-due/10 rounded-lg"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                      {parseFloat(formData.baseProfitPerUnit) > 0 && unit.conversionToBase > 0 && (
                        <p className="text-xs text-profit mt-2">
                          লাভ: ৳{(parseFloat(formData.baseProfitPerUnit) * unit.conversionToBase).toFixed(2)} / {unit.name || 'ইউনিট'}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                <p className="text-xs text-muted-foreground mt-2">
                  💡 উদাহরণ: ডিম - পিস = 1, ডজন = 12, ৩০ পিস = 30
                </p>
              </div>

              {/* Summary Preview */}
              <button
                type="button"
                onClick={() => setShowSummary(!showSummary)}
                className="w-full flex items-center justify-between p-3 bg-primary/10 rounded-xl"
              >
                <span className="font-medium">প্রিভিউ দেখুন</span>
                {showSummary ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>

              {showSummary && (
                <div className="p-4 bg-muted/50 rounded-xl space-y-2 animate-fade-in">
                  <p><strong>পণ্য:</strong> {formData.name || '—'}</p>
                  <p><strong>Base Unit:</strong> {formData.baseUnit}</p>
                  <p><strong>স্টক:</strong> {formData.stock || 0} {formData.baseUnit}</p>
                  <p><strong>লাভ/{formData.baseUnit}:</strong> ৳{formData.baseProfitPerUnit || 0}</p>
                  <div className="border-t border-border pt-2 mt-2">
                    <p className="font-medium mb-1">বিক্রয় ইউনিট:</p>
                    {sellingUnits.filter(u => u.name).map(unit => (
                      <p key={unit.id} className="text-sm text-muted-foreground">
                        • {unit.name}: {unit.conversionToBase} {formData.baseUnit} = ৳{unit.price}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={resetForm} className="flex-1 py-5 rounded-xl">
                  বাতিল
                </Button>
                <Button onClick={handleSubmit} className="flex-1 btn-primary py-5 rounded-xl">
                  {editingId ? 'আপডেট করুন' : 'সংরক্ষণ করুন'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Products List */}
      <div className="space-y-3">
        {filteredProducts.map((product) => (
          <div key={product.id} className="card-elevated p-4 flex items-center justify-between">
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
                    {product.baseUnit || getUnitLabel(product.unitType)}
                  </span>
                  {product.sellingUnits && product.sellingUnits.length > 1 && (
                    <span className="text-xs text-muted-foreground">
                      +{product.sellingUnits.length - 1} ইউনিট
                    </span>
                  )}
                  <span className="text-primary font-medium">৳{product.price.toFixed(2)}</span>
                  <span className="text-profit">+৳{product.profit.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className={`text-lg font-bold ${product.stock <= 5 ? 'text-warning' : 'text-foreground'}`}>
                  {product.stock}
                </p>
                <p className="text-xs text-muted-foreground">
                  {product.baseUnit || getUnitLabel(product.unitType)}
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
