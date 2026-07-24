import { useState, useMemo } from 'react';
import { Truck, Plus, Search, Phone, MessageCircle, X, Package, Trash2, ChevronDown, ArrowLeft, RotateCcw, CheckCircle2 } from 'lucide-react';
import { useStore } from '@/context/StoreContext';
import { useSubscription } from '@/context/SubscriptionContext';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { PhoneInputWithCode } from '@/components/common/PhoneInputWithCode';
import { validatePhoneWithCountryCode, SellingUnit } from '@/types/store';

// Quantity-unit options by stock type — same list used on বিক্রি করুন (Sell page)
const SELL_UNIT_OPTIONS: Record<string, { label: string; toBase: number }[]> = {
  weight: [
    { label: 'গ্রাম', toBase: 1 },
    { label: 'কেজি', toBase: 1000 },
  ],
  number: [
    { label: 'পিস', toBase: 1 },
    { label: 'ডজন', toBase: 12 },
    { label: 'হালি', toBase: 4 },
  ],
  liquid: [
    { label: 'মিলি', toBase: 1 },
    { label: 'লিটার', toBase: 1000 },
  ],
};

const getStockType = (unitType: string): string => {
  if (['kg', 'gram'].includes(unitType)) return 'weight';
  if (['litre'].includes(unitType)) return 'liquid';
  return 'number';
};

// An item the shopkeeper wants to order — either a real product from
// inventory (carrying its linked supplier's phone/name straight from the
// product record) or a fully custom item typed in by hand.
interface OrderCartItem {
  id: string;
  productId?: string;
  name: string;
  sellAmount: number;
  sellUnitLabel: string;
  sellUnitToBase: number;
  isCustom: boolean;
  supplierPhone?: string;
  supplierName?: string;
}

const NO_CONTACT_KEY = '__no_contact__';

export default function Suppliers() {
  const { products, storeInfo } = useStore();
  const { guardFeature } = useSubscription();

  // --- Order-building (main) state ---
  const [cart, setCart] = useState<OrderCartItem[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [selectingProduct, setSelectingProduct] = useState<any>(null);

  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customQty, setCustomQty] = useState('');
  const [customUnit, setCustomUnit] = useState('');

  // --- Review / send state ---
  const [reviewMode, setReviewMode] = useState(false);
  const [noContactPhone, setNoContactPhone] = useState('');
  const [editingGroupKey, setEditingGroupKey] = useState<string | null>(null);
  const [groupMessageOverrides, setGroupMessageOverrides] = useState<Record<string, string>>({});
  const [sentGroups, setSentGroups] = useState<Set<string>>(new Set());

  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return products;
    const lower = productSearch.toLowerCase();
    return products.filter(p => p.name.toLowerCase().includes(lower));
  }, [products, productSearch]);

  const getSellUnitOptions = (product: any) => {
    const stockType = getStockType(product.unitType);
    const options = SELL_UNIT_OPTIONS[stockType] || SELL_UNIT_OPTIONS.number;
    const customUnits: { label: string; toBase: number }[] = [];
    if (product.sellingUnits) {
      for (const su of product.sellingUnits as SellingUnit[]) {
        if (!options.some(o => o.toBase === su.conversionToBase) && su.conversionToBase > 0) {
          customUnits.push({ label: su.name, toBase: su.conversionToBase });
        }
      }
    }
    return [...options, ...customUnits];
  };

  // --- Cart helpers (Bikri-korun style: pick product → pick unit → edit amount) ---
  const addProductToCart = (product: any, unit?: { label: string; toBase: number }) => {
    const options = getSellUnitOptions(product);
    if (options.length > 1 && !unit) {
      setSelectingProduct(product);
      return;
    }
    const chosen = unit || options[0];
    setCart(prev => [...prev, {
      id: `p-${product.id}-${Date.now()}`,
      productId: product.id,
      name: product.name,
      sellAmount: 1,
      sellUnitLabel: chosen.label,
      sellUnitToBase: chosen.toBase,
      isCustom: false,
      supplierPhone: product.supplierPhone || undefined,
      supplierName: product.supplierName || undefined,
    }]);
    setSelectingProduct(null);
    setProductSearch('');
    toast({ title: `${product.name} যোগ হয়েছে` });
  };

  const addCustomItemToCart = () => {
    const name = customName.trim();
    const qty = parseFloat(customQty);
    const unit = customUnit.trim();
    if (!name) { toast({ title: 'পণ্যের নাম দিন', variant: 'destructive' }); return; }
    if (!qty || qty <= 0) { toast({ title: 'সঠিক পরিমাণ দিন', variant: 'destructive' }); return; }
    if (!unit) { toast({ title: 'একক লিখুন (যেমন: কেজি, বস্তা)', variant: 'destructive' }); return; }
    setCart(prev => [...prev, {
      id: `c-${Date.now()}`,
      name, sellAmount: qty, sellUnitLabel: unit, sellUnitToBase: 1, isCustom: true,
    }]);
    toast({ title: `${name} যোগ হয়েছে (কাস্টম পণ্য) ✓` });
    setCustomName(''); setCustomQty(''); setCustomUnit('');
    setShowCustomForm(false);
  };

  const updateCartAmount = (idx: number, amount: number) => {
    setCart(prev => prev.map((it, i) => i === idx ? { ...it, sellAmount: Math.max(0, amount) } : it));
  };

  const updateCartUnit = (idx: number, label: string, toBase: number) => {
    setCart(prev => prev.map((it, i) => i === idx ? { ...it, sellUnitLabel: label, sellUnitToBase: toBase } : it));
  };

  const removeCartItem = (idx: number) => {
    setCart(prev => prev.filter((_, i) => i !== idx));
  };

  const resetOrder = () => {
    setCart([]); setProductSearch(''); setSelectingProduct(null);
    setShowCustomForm(false); setCustomName(''); setCustomQty(''); setCustomUnit('');
    setReviewMode(false); setNoContactPhone(''); setEditingGroupKey(null);
    setGroupMessageOverrides({}); setSentGroups(new Set());
  };

  const handleDone = () => {
    if (cart.length === 0) { toast({ title: 'অন্তত একটি পণ্য যোগ করুন', variant: 'destructive' }); return; }
    if (cart.some(it => !it.sellAmount || it.sellAmount <= 0)) { toast({ title: '⚠️ প্রতিটি পণ্যের সঠিক পরিমাণ দিন', variant: 'destructive' }); return; }
    setReviewMode(true);
  };

  // --- Grouping: one group per supplier phone number, plus a group for
  // custom items / products with no supplier phone attached ---
  const groupedOrder = useMemo(() => {
    const bySupplier = new Map<string, { key: string; name: string; phone: string; items: OrderCartItem[] }>();
    const noContact: OrderCartItem[] = [];
    cart.forEach(item => {
      const phone = !item.isCustom ? item.supplierPhone?.trim() : '';
      if (phone) {
        const key = phone.replace(/\s+/g, '');
        if (!bySupplier.has(key)) {
          bySupplier.set(key, { key, name: item.supplierName || 'সরবরাহকারী', phone, items: [] });
        }
        bySupplier.get(key)!.items.push(item);
      } else {
        noContact.push(item);
      }
    });
    return { supplierGroups: Array.from(bySupplier.values()), noContact };
  }, [cart]);

  const generateGroupMessage = (items: OrderCartItem[]) => {
    const itemLines = items.map((it, i) => `${i + 1}. ${it.name} — ${it.sellAmount} ${it.sellUnitLabel}`).join('\n');
    return `Assalamualaikum,
${storeInfo?.name || 'আমাদের দোকান'} থেকে অনুরোধ করা হচ্ছে যে, নিচের আইটেমগুলো সরবরাহ করবেন:

আইটেম:
${itemLines}

দোকান লোকেশন: ${storeInfo?.location || '[ঠিকানা]'}
মোবাইল: ${storeInfo?.phone || '[ফোন নম্বর]'}

ধন্যবাদ।`;
  };

  const getGroupMessage = (key: string, items: OrderCartItem[]) => groupMessageOverrides[key] ?? generateGroupMessage(items);

  const sendGroupMessage = (key: string, phone: string, items: OrderCartItem[]) => {
    if (!guardFeature('whatsapp')) return;
    let cleanPhone = phone.replace(/\s+/g, '');
    if (!cleanPhone.startsWith('+')) cleanPhone = '+' + cleanPhone;
    const validation = validatePhoneWithCountryCode(cleanPhone);
    if (!validation.valid) { toast({ title: validation.message, variant: 'destructive' }); return; }
    const message = getGroupMessage(key, items);
    window.open(`https://wa.me/${cleanPhone.replace('+', '')}?text=${encodeURIComponent(message)}`, '_blank');
    setSentGroups(prev => new Set(prev).add(key));
  };

  const sendNoContactMessage = () => {
    const validation = validatePhoneWithCountryCode(noContactPhone);
    if (!validation.valid) { toast({ title: validation.message, variant: 'destructive' }); return; }
    sendGroupMessage(NO_CONTACT_KEY, noContactPhone, groupedOrder.noContact);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-primary/10 rounded-xl">
          <Truck className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">পণ্য অর্ডার করুন</h1>
          <p className="text-muted-foreground">সরবরাহকারীদের কাছে হোলসেল অর্ডার পাঠান</p>
        </div>
      </div>

      {!reviewMode ? (
        <>
          {/* Product search + custom button */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="পণ্য খুঁজুন..."
                className="input-field pl-10"
              />
            </div>
            <button
              type="button"
              onClick={() => { setShowCustomForm(v => !v); setSelectingProduct(null); }}
              className="shrink-0 px-4 rounded-xl border border-dashed border-amber-500 text-amber-700 dark:text-amber-400 text-sm font-medium hover:bg-amber-50 dark:hover:bg-amber-900/10 flex items-center gap-1 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" /> কাস্টম পণ্য
            </button>
          </div>

          {/* Custom item form */}
          {showCustomForm && (
            <div className="p-4 bg-amber-50/60 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl space-y-3 animate-fade-in">
              <p className="text-sm font-medium flex items-center gap-1"><Package className="w-4 h-4" /> কাস্টম পণ্য যোগ করুন</p>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">পণ্যের নাম *</label>
                <input type="text" value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="যেমন: বিশেষ চাল" className="input-field text-sm" />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground mb-1 block">পরিমাণ *</label>
                  <input type="number" value={customQty} onChange={(e) => setCustomQty(e.target.value)} placeholder="যেমন: ৫" className="input-field text-sm" min="0" step="any" />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground mb-1 block">একক *</label>
                  <input type="text" value={customUnit} onChange={(e) => setCustomUnit(e.target.value)} placeholder="যেমন: কেজি, বস্তা" className="input-field text-sm" />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => { setShowCustomForm(false); setCustomName(''); setCustomQty(''); setCustomUnit(''); }} className="flex-1 text-xs text-muted-foreground py-2">বাতিল</button>
                <Button type="button" onClick={addCustomItemToCart} className="flex-1 btn-primary py-2 rounded-lg text-sm">যোগ করুন</Button>
              </div>
            </div>
          )}

          {/* Unit picker for a just-selected product */}
          {selectingProduct && (
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl space-y-2 animate-fade-in">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{selectingProduct.name} - কোন এককে অর্ডার করবেন?</p>
                <button onClick={() => setSelectingProduct(null)} className="p-1 hover:bg-background rounded-lg"><X className="w-4 h-4" /></button>
              </div>
              <div className="flex flex-wrap gap-2">
                {getSellUnitOptions(selectingProduct).map(opt => (
                  <button key={`${opt.label}-${opt.toBase}`} onClick={() => addProductToCart(selectingProduct, opt)}
                    className="px-3 py-2 rounded-lg border border-border hover:border-primary/50 bg-background text-sm">
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Product search results */}
          {productSearch.trim() && !selectingProduct && (
            <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
              {filteredProducts.map(p => (
                <button key={p.id} onClick={() => addProductToCart(p)}
                  className="p-3 rounded-xl border border-border hover:border-primary/50 bg-background text-left transition-all">
                  <p className="font-medium text-sm truncate">{p.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.supplierName ? `সরবরাহকারী: ${p.supplierName}` : 'সরবরাহকারী নেই'}
                  </p>
                </button>
              ))}
              {filteredProducts.length === 0 && (
                <p className="col-span-2 text-center py-6 text-muted-foreground text-sm">পণ্য পাওয়া যায়নি</p>
              )}
            </div>
          )}

          {/* Cart */}
          <div className="space-y-3">
            {cart.length === 0 && !productSearch.trim() && (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>কোনো পণ্য যোগ করা হয়নি</p>
                <p className="text-sm mt-1">উপরে খুঁজে পণ্য যোগ করুন, বা "কাস্টম পণ্য" ব্যবহার করুন</p>
              </div>
            )}
            {cart.map((item, idx) => (
              <div key={item.id} className={`p-4 rounded-xl space-y-3 ${item.isCustom ? 'bg-amber-50/60 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800' : 'bg-muted/50'}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-foreground flex items-center gap-2">
                      {item.name}
                      {item.isCustom && <span className="text-[10px] px-1.5 py-0.5 bg-amber-200 dark:bg-amber-800 rounded-full text-amber-800 dark:text-amber-100">কাস্টম</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.isCustom ? 'সরবরাহকারীর নম্বর পাঠানোর সময় দিতে হবে' : (item.supplierPhone ? `সরবরাহকারী: ${item.supplierName || 'অজানা'}` : 'সরবরাহকারীর নম্বর নেই')}
                    </p>
                  </div>
                  <button onClick={() => removeCartItem(idx)} className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground mb-1 block">পরিমাণ</label>
                    <input type="number" value={item.sellAmount || ''} onChange={(e) => updateCartAmount(idx, parseFloat(e.target.value) || 0)}
                      placeholder="পরিমাণ" className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" min="0" step="any" />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground mb-1 block">একক</label>
                    {item.isCustom ? (
                      <input type="text" value={item.sellUnitLabel} onChange={(e) => updateCartUnit(idx, e.target.value, 1)}
                        placeholder="যেমন: কেজি, বস্তা" className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                    ) : (
                      <div className="relative">
                        <select
                          value={`${item.sellUnitLabel}|${item.sellUnitToBase}`}
                          onChange={(e) => { const [l, t] = e.target.value.split('|'); updateCartUnit(idx, l, parseFloat(t)); }}
                          className="w-full h-10 rounded-xl border border-border bg-background px-3 pr-8 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                          {getSellUnitOptions(products.find(p => p.id === item.productId) || {}).map(opt => (
                            <option key={`${opt.label}-${opt.toBase}`} value={`${opt.label}|${opt.toBase}`}>{opt.label}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {cart.length > 0 && (
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={resetOrder} className="flex-1 py-5 rounded-xl">
                <RotateCcw className="w-4 h-4 mr-2" /> মুছে ফেলুন
              </Button>
              <Button onClick={handleDone} className="flex-1 btn-primary py-5 rounded-xl">
                <CheckCircle2 className="w-5 h-5 mr-2" /> সম্পন্ন
              </Button>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Review / grouped-by-supplier send screen */}
          <div className="flex items-center justify-between">
            <button onClick={() => setReviewMode(false)} className="flex items-center gap-1 text-sm text-primary">
              <ArrowLeft className="w-4 h-4" /> পণ্যে ফিরে যান
            </button>
            <button onClick={resetOrder} className="flex items-center gap-1 text-sm text-muted-foreground">
              <RotateCcw className="w-4 h-4" /> নতুন অর্ডার
            </button>
          </div>

          {groupedOrder.supplierGroups.map(group => (
            <div key={group.key} className="card-elevated p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    {group.name}
                    {sentGroups.has(group.key) && <span className="text-[10px] px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">পাঠানো হয়েছে</span>}
                  </h3>
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5"><Phone className="w-3.5 h-3.5" /> {group.phone}</p>
                </div>
              </div>

              <div className="space-y-1">
                {group.items.map((it, i) => (
                  <p key={it.id} className="text-sm text-foreground">{i + 1}. {it.name} — {it.sellAmount} {it.sellUnitLabel}</p>
                ))}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-muted-foreground">বার্তা</label>
                  <button
                    onClick={() => setEditingGroupKey(editingGroupKey === group.key ? null : group.key)}
                    className="text-xs text-primary"
                  >
                    {editingGroupKey === group.key ? 'ডিফল্ট করুন' : 'সম্পাদনা করুন'}
                  </button>
                </div>
                {editingGroupKey === group.key ? (
                  <textarea
                    value={getGroupMessage(group.key, group.items)}
                    onChange={(e) => setGroupMessageOverrides(prev => ({ ...prev, [group.key]: e.target.value }))}
                    className="input-field min-h-[160px] text-sm"
                  />
                ) : (
                  <div className="p-3 bg-muted/50 rounded-xl text-xs whitespace-pre-line max-h-[140px] overflow-y-auto">
                    {getGroupMessage(group.key, group.items)}
                  </div>
                )}
              </div>

              <Button onClick={() => sendGroupMessage(group.key, group.phone, group.items)} className="w-full bg-green-500 hover:bg-green-600 text-white py-4 rounded-xl">
                <MessageCircle className="w-5 h-5 mr-2" /> WhatsApp এ পাঠান
              </Button>
            </div>
          ))}

          {groupedOrder.noContact.length > 0 && (
            <div className="card-elevated p-4 space-y-3 border-amber-200 dark:border-amber-800">
              <div>
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  কাস্টম / সরবরাহকারীহীন পণ্য
                  {sentGroups.has(NO_CONTACT_KEY) && <span className="text-[10px] px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">পাঠানো হয়েছে</span>}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">এই পণ্যগুলোর কোনো সরবরাহকারীর নম্বর সংরক্ষিত নেই — পাঠানোর আগে নম্বর দিন</p>
              </div>

              <div className="space-y-1">
                {groupedOrder.noContact.map((it, i) => (
                  <p key={it.id} className="text-sm text-foreground">{i + 1}. {it.name} — {it.sellAmount} {it.sellUnitLabel}</p>
                ))}
              </div>

              <PhoneInputWithCode
                value={noContactPhone}
                onChange={(phone) => setNoContactPhone(phone)}
                label="সরবরাহকারীর নম্বর"
                required
              />

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-muted-foreground">বার্তা</label>
                  <button
                    onClick={() => setEditingGroupKey(editingGroupKey === NO_CONTACT_KEY ? null : NO_CONTACT_KEY)}
                    className="text-xs text-primary"
                  >
                    {editingGroupKey === NO_CONTACT_KEY ? 'ডিফল্ট করুন' : 'সম্পাদনা করুন'}
                  </button>
                </div>
                {editingGroupKey === NO_CONTACT_KEY ? (
                  <textarea
                    value={getGroupMessage(NO_CONTACT_KEY, groupedOrder.noContact)}
                    onChange={(e) => setGroupMessageOverrides(prev => ({ ...prev, [NO_CONTACT_KEY]: e.target.value }))}
                    className="input-field min-h-[160px] text-sm"
                  />
                ) : (
                  <div className="p-3 bg-muted/50 rounded-xl text-xs whitespace-pre-line max-h-[140px] overflow-y-auto">
                    {getGroupMessage(NO_CONTACT_KEY, groupedOrder.noContact)}
                  </div>
                )}
              </div>

              <Button onClick={sendNoContactMessage} className="w-full bg-green-500 hover:bg-green-600 text-white py-4 rounded-xl">
                <MessageCircle className="w-5 h-5 mr-2" /> WhatsApp এ পাঠান
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
