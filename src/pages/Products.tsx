import { useState, useMemo } from 'react';
import { Package, Plus, Search, Edit2, Trash2, X, HelpCircle, ChevronDown, ChevronUp, Scale, Hash, Droplets } from 'lucide-react';
import { useStore } from '@/context/StoreContext';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { UnitType, SellingUnit, getUnitLabel } from '@/types/store';
import { PhoneInputWithCode } from '@/components/common/PhoneInputWithCode';

const generateId = () => Math.random().toString(36).substr(2, 9);

type StockType = 'weight' | 'number' | 'liquid';

interface UnitOption {
  name: string;
  conversionToBase: number;
  isCustom?: boolean;
}

const STOCK_TYPE_CONFIG: Record<StockType, { 
  label: string; icon: any; unit: string; unitType: UnitType; baseUnit: string; 
  description: string; examples: string; unitOptions: UnitOption[];
}> = {
  weight: { 
    label: 'ওজন', icon: Scale, unit: 'কেজি', unitType: 'kg', baseUnit: 'কেজি', 
    description: 'স্টক কিলোগ্রামে (kg) রাখা হবে', examples: 'চাল, মশলা, সবজি',
    unitOptions: [
      { name: '১ কেজি', conversionToBase: 1 },
      { name: '৫০০ গ্রাম', conversionToBase: 0.5 },
      { name: '২৫০ গ্রাম', conversionToBase: 0.25 },
      { name: '১০০ গ্রাম', conversionToBase: 0.1 },
      { name: '৫০ গ্রাম', conversionToBase: 0.05 },
    ]
  },
  number: { 
    label: 'সংখ্যা', icon: Hash, unit: 'পিস', unitType: 'piece', baseUnit: 'পিস', 
    description: 'স্টক পিসে রাখা হবে', examples: 'ডিম, প্যাকেট, বোতল',
    unitOptions: [
      { name: '১ পিস', conversionToBase: 1 },
      { name: '১ ডজন (12 পিস)', conversionToBase: 12 },
      { name: '১ হালি (4 পিস)', conversionToBase: 4 },
      { name: '১ বক্স', conversionToBase: 1, isCustom: true },
    ]
  },
  liquid: { 
    label: 'তরল', icon: Droplets, unit: 'লিটার', unitType: 'litre', baseUnit: 'লিটার', 
    description: 'স্টক লিটারে রাখা হবে', examples: 'তেল, দুধ, পানীয়',
    unitOptions: [
      { name: '১ লিটার', conversionToBase: 1 },
      { name: '৫০০ মিলি', conversionToBase: 0.5 },
      { name: '২৫০ মিলি', conversionToBase: 0.25 },
      { name: '১০০ মিলি', conversionToBase: 0.1 },
    ]
  },
};

export default function Products() {
  const { products, addProduct, updateProduct, deleteProduct, getProductSuggestions } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  
  const [stockType, setStockType] = useState<StockType>('number');
  const [formData, setFormData] = useState({
    name: '',
    stock: '',
    supplierPhone: '',
    supplierCountryCode: '+880',
  });

  // Multi-unit selling options with cost price
  const [sellingUnits, setSellingUnits] = useState<(SellingUnit & { costPrice: number })[]>([
    { id: generateId(), name: '১ পিস', conversionToBase: 1, price: 0, profit: 0, costPrice: 0 }
  ]);

  const [showSuggestions, setShowSuggestions] = useState(false);

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const suggestions = useMemo(() => {
    if (!formData.name.trim() || editingId) return [];
    return getProductSuggestions(formData.name);
  }, [formData.name, editingId, getProductSuggestions]);

  const config = STOCK_TYPE_CONFIG[stockType];

  const addSellingUnit = () => {
    // Find first unused unit option
    const usedNames = sellingUnits.map(u => u.name);
    const available = config.unitOptions.find(o => !usedNames.includes(o.name));
    const opt = available || config.unitOptions[0];
    
    setSellingUnits([
      ...sellingUnits,
      { id: generateId(), name: opt.name, conversionToBase: opt.conversionToBase, price: 0, profit: 0, costPrice: 0 }
    ]);
  };

  const handleUnitSelect = (unitId: string, optionName: string) => {
    const option = config.unitOptions.find(o => o.name === optionName);
    if (option) {
      setSellingUnits(sellingUnits.map(unit => {
        if (unit.id === unitId) {
          return { ...unit, name: option.name, conversionToBase: option.isCustom ? unit.conversionToBase : option.conversionToBase };
        }
        return unit;
      }));
    }
  };

  const updateSellingUnit = (id: string, field: string, value: string | number) => {
    setSellingUnits(sellingUnits.map(unit => {
      if (unit.id === id) {
        const updated = { ...unit, [field]: value };
        if (field === 'price' || field === 'costPrice') {
          updated.profit = Math.max(0, (updated.price || 0) - (updated.costPrice || 0));
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

    const validUnits = sellingUnits.filter(u => u.name.trim() && u.conversionToBase > 0);
    if (validUnits.length === 0) {
      toast({ title: "অন্তত একটি বিক্রয় মূল্য যোগ করুন", variant: "destructive" });
      return;
    }

    const unitNames = validUnits.map(u => u.name.toLowerCase());
    if (new Set(unitNames).size !== unitNames.length) {
      toast({ title: "একই নামে দুইটি ইউনিট থাকতে পারে না", variant: "destructive" });
      return;
    }

    const basePrice = validUnits[0].price / validUnits[0].conversionToBase;
    const baseProfit = validUnits[0].profit / validUnits[0].conversionToBase;

    const productData = {
      name: formData.name.trim(),
      baseUnit: config.baseUnit,
      unitType: config.unitType,
      price: basePrice,
      profit: Math.max(0, baseProfit),
      stock,
      sellingUnits: validUnits.map(u => ({
        id: u.id,
        name: u.name,
        conversionToBase: u.conversionToBase,
        price: u.price,
        profit: Math.max(0, u.profit),
      })),
      supplierPhone: formData.supplierPhone.trim() || undefined,
      supplierCountryCode: formData.supplierCountryCode,
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
    
    let type: StockType = 'number';
    if (product.unitType === 'kg' || product.unitType === 'gram') type = 'weight';
    else if (product.unitType === 'litre') type = 'liquid';
    setStockType(type);

    setFormData({
      name: product.name,
      stock: product.stock.toString(),
      supplierPhone: (product as any).supplierPhone || '',
      supplierCountryCode: (product as any).supplierCountryCode || '+880',
    });
    
    if (product.sellingUnits && product.sellingUnits.length > 0) {
      setSellingUnits(product.sellingUnits.map(u => ({
        ...u,
        costPrice: Math.max(0, u.price - u.profit),
      })));
    } else {
      setSellingUnits([
        { id: generateId(), name: getUnitLabel(product.unitType), conversionToBase: 1, price: product.price, profit: product.profit, costPrice: Math.max(0, product.price - product.profit) }
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
    setStockType('number');
    setFormData({ name: '', stock: '', supplierPhone: '', supplierCountryCode: '+880' });
    setSellingUnits([{ id: generateId(), name: '১ পিস', conversionToBase: 1, price: 0, profit: 0, costPrice: 0 }]);
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

  // Check if a unit option is "custom" (needs manual conversion input)
  const isCustomUnit = (unitName: string) => {
    const option = config.unitOptions.find(o => o.name === unitName);
    return option?.isCustom ?? false;
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
        <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="পণ্য খুঁজুন..." className="input-field pl-10" />
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
                <button onClick={() => setShowHelp(!showHelp)} className="p-1 text-muted-foreground hover:text-foreground">
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
                <p className="font-semibold mb-2">📌 স্টক কিভাবে কাজ করে?</p>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• <strong>ওজন</strong> = স্টক কেজিতে রাখা হয়</li>
                  <li>• <strong>সংখ্যা</strong> = স্টক পিস হিসেবে রাখা হয়</li>
                  <li>• <strong>তরল</strong> = স্টক লিটারে রাখা হয়</li>
                  <li>• আপনি ছোট ইউনিটে (গ্রাম, মিলি) বিক্রি করলেও মূল স্টক থেকে অটোমেটিক কমবে</li>
                </ul>
              </div>
            )}

            <div className="space-y-5">
              {/* 1. Product Name */}
              <div className="relative">
                <label className="block text-sm font-medium mb-2">পণ্যের নাম *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => { setFormData({ ...formData, name: e.target.value }); setShowSuggestions(true); }}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder="পণ্যের নাম লিখুন"
                  className="input-field"
                  autoFocus
                />
                {showSuggestions && suggestions.length > 0 && !editingId && (
                  <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-xl shadow-lg max-h-48 overflow-y-auto">
                    <div className="p-2 text-xs text-muted-foreground bg-muted/50">⚠️ একই নামে পণ্য আছে:</div>
                    {suggestions.map((product) => (
                      <button key={product.id} onClick={() => selectSuggestion(product)} className="w-full text-left px-4 py-3 hover:bg-muted transition-colors flex items-center justify-between">
                        <span className="font-medium">{product.name}</span>
                        <span className="text-sm text-muted-foreground">৳{product.price}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Supplier (Optional) */}
              <PhoneInputWithCode
                value={formData.supplierPhone}
                onChange={(phone, code) => setFormData({ ...formData, supplierPhone: phone, supplierCountryCode: code || '+880' })}
                label="সরবরাহকারীর WhatsApp নম্বর (ঐচ্ছিক)"
              />

              {/* 2. Stock Type Selection */}
              <div>
                <label className="block text-sm font-medium mb-2">স্টক কিভাবে রাখবেন? *</label>
                <div className="grid grid-cols-3 gap-3">
                  {(Object.entries(STOCK_TYPE_CONFIG) as [StockType, typeof STOCK_TYPE_CONFIG['weight']][]).map(([key, cfg]) => {
                    const Icon = cfg.icon;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          setStockType(key);
                          const firstOpt = cfg.unitOptions[0];
                          setSellingUnits([{ id: generateId(), name: firstOpt.name, conversionToBase: firstOpt.conversionToBase, price: 0, profit: 0, costPrice: 0 }]);
                        }}
                        className={`p-3 rounded-xl border-2 text-center transition-all ${
                          stockType === key
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <Icon className={`w-6 h-6 mx-auto mb-1 ${stockType === key ? 'text-primary' : 'text-muted-foreground'}`} />
                        <p className={`font-medium text-sm ${stockType === key ? 'text-primary' : 'text-foreground'}`}>{cfg.label}</p>
                        <p className="text-xs text-muted-foreground mt-1">{cfg.examples}</p>
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground mt-2">{config.description}</p>
              </div>

              {/* 3. Stock Quantity */}
              <div>
                <label className="block text-sm font-medium mb-2">মোট স্টক ({config.unit}) *</label>
                <input
                  type="number"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  placeholder={`কত ${config.unit} আছে`}
                  className="input-field text-lg"
                  min="0"
                  step="any"
                />
              </div>

              {/* 4. Multi-Unit Price Options with Dropdowns */}
              <div className="border-t border-border pt-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium">বিক্রয় মূল্য সেট করুন</label>
                  <button type="button" onClick={addSellingUnit} className="text-sm text-primary flex items-center gap-1">
                    <Plus className="w-4 h-4" />
                    আরও যোগ করুন
                  </button>
                </div>

                <div className="space-y-3">
                  {sellingUnits.map((unit) => (
                    <div key={unit.id} className="p-4 bg-muted/50 rounded-xl space-y-3 border border-border/50">
                      {/* Unit dropdown + conversion */}
                      <div className="flex items-end gap-2">
                        <div className="flex-1">
                          <label className="text-xs text-muted-foreground mb-1 block">ইউনিট নির্বাচন করুন</label>
                          <select
                            value={unit.name}
                            onChange={(e) => handleUnitSelect(unit.id, e.target.value)}
                            className="input-field text-sm py-2.5 bg-background appearance-none cursor-pointer"
                          >
                            {config.unitOptions.map(opt => (
                              <option key={opt.name} value={opt.name}>{opt.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="w-24">
                          <label className="text-xs text-muted-foreground mb-1 block">= {config.unit}</label>
                          <input
                            type="number"
                            value={unit.conversionToBase || ''}
                            onChange={(e) => updateSellingUnit(unit.id, 'conversionToBase', parseFloat(e.target.value) || 0)}
                            className={`input-field text-sm py-2.5 text-center ${isCustomUnit(unit.name) ? 'bg-background' : 'bg-muted/80'}`}
                            readOnly={!isCustomUnit(unit.name)}
                            min="0.001"
                            step="any"
                          />
                        </div>
                        {sellingUnits.length > 1 && (
                          <button type="button" onClick={() => removeSellingUnit(unit.id)} className="p-2 text-due hover:bg-due/10 rounded-lg mb-0.5">
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {/* Prices row */}
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-xs text-muted-foreground">বিক্রয়মূল্য (৳)</label>
                          <input
                            type="number"
                            value={unit.price || ''}
                            onChange={(e) => updateSellingUnit(unit.id, 'price', parseFloat(e.target.value) || 0)}
                            placeholder="০"
                            className="input-field text-sm py-2"
                            min="0"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">ক্রয়মূল্য (৳)</label>
                          <input
                            type="number"
                            value={unit.costPrice || ''}
                            onChange={(e) => updateSellingUnit(unit.id, 'costPrice', parseFloat(e.target.value) || 0)}
                            placeholder="০"
                            className="input-field text-sm py-2"
                            min="0"
                          />
                        </div>
                        <div className="flex items-end">
                          <div className={`w-full text-center py-2 rounded-lg text-sm font-semibold ${unit.profit > 0 ? 'bg-profit/10 text-profit' : 'bg-muted text-muted-foreground'}`}>
                            লাভ ৳{unit.profit.toFixed(0)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Examples */}
                <div className="mt-3 p-3 bg-accent/50 rounded-xl text-xs text-muted-foreground space-y-1">
                  <p className="font-medium text-accent-foreground">💡 উদাহরণ:</p>
                  {stockType === 'weight' && (
                    <>
                      <p>চাল: ১ কেজি = ৳৮০ (ক্রয় ৳৭০), ৫০০ গ্রাম = ৳৪০ (ক্রয় ৳৩৫)</p>
                    </>
                  )}
                  {stockType === 'number' && (
                    <>
                      <p>ডিম: ১ পিস = ৳১২ (ক্রয় ৳১০), ১ ডজন = ৳১৪০ (ক্রয় ৳১২০)</p>
                    </>
                  )}
                  {stockType === 'liquid' && (
                    <>
                      <p>তেল: ১ লিটার = ৳১৮০ (ক্রয় ৳১৬০), ৫০০ মিলি = ৳৯৫ (ক্রয় ৳৮৫)</p>
                    </>
                  )}
                </div>
              </div>

              {/* Summary Preview */}
              <button type="button" onClick={() => setShowSummary(!showSummary)} className="w-full flex items-center justify-between p-3 bg-primary/10 rounded-xl">
                <span className="font-medium">প্রিভিউ দেখুন</span>
                {showSummary ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>

              {showSummary && (
                <div className="p-4 bg-muted/50 rounded-xl space-y-2 animate-fade-in">
                  <p><strong>পণ্য:</strong> {formData.name || '—'}</p>
                  <p><strong>স্টক ধরন:</strong> {config.label}</p>
                  <p><strong>স্টক:</strong> {formData.stock || 0} {config.unit}</p>
                  <div className="border-t border-border pt-2 mt-2">
                    <p className="font-medium mb-1">বিক্রয় মূল্য:</p>
                    {sellingUnits.filter(u => u.name).map(unit => (
                      <p key={unit.id} className="text-sm text-muted-foreground">
                        • {unit.name} ({unit.conversionToBase} {config.unit}) = ৳{unit.price} | ক্রয়: ৳{unit.costPrice} | লাভ: ৳{unit.profit.toFixed(0)}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={resetForm} className="flex-1 py-5 rounded-xl">বাতিল</Button>
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
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${product.stock <= 5 ? 'bg-warning/10' : 'bg-accent'}`}>
                <Package className={`w-6 h-6 ${product.stock <= 5 ? 'text-warning' : 'text-primary'}`} />
              </div>
              <div>
                <p className="font-semibold text-foreground">{product.name}</p>
                <div className="flex items-center gap-2 text-sm flex-wrap">
                  <span className="bg-muted px-2 py-0.5 rounded text-xs">{product.baseUnit || getUnitLabel(product.unitType)}</span>
                  {product.sellingUnits && product.sellingUnits.length > 1 && (
                    <span className="text-xs text-muted-foreground">{product.sellingUnits.length} ইউনিট</span>
                  )}
                  {product.sellingUnits && product.sellingUnits.length > 0 && (
                    <span className="text-primary font-medium">৳{product.sellingUnits[0].price}</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className={`text-lg font-bold ${product.stock <= 5 ? 'text-warning' : 'text-foreground'}`}>{product.stock}</p>
                <p className="text-xs text-muted-foreground">{product.baseUnit || getUnitLabel(product.unitType)}</p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => handleEdit(product)} className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(product.id)} className="p-2 hover:bg-destructive/10 rounded-lg text-muted-foreground hover:text-destructive">
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
