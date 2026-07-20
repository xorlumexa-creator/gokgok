import { useState, useMemo } from 'react';
import { Truck, Plus, Search, Phone, MessageCircle, X, Edit2, Trash2, Package } from 'lucide-react';
import { useStore } from '@/context/StoreContext';
import { useSubscription } from '@/context/SubscriptionContext';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { PhoneInputWithCode } from '@/components/common/PhoneInputWithCode';
import { validatePhoneWithCountryCode } from '@/types/store';

export default function Suppliers() {
  const { suppliers, products, storeInfo, addSupplier, updateSupplier, deleteSupplier } = useStore();
  const { guardFeature } = useSubscription();

  
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    countryCode: '+880',
    productIds: [] as string[]
  });
  
  // Order message state — a list of items (from this supplier's own
  // products, or fully custom), each with its own quantity and unit.
  interface OrderItem { id: string; name: string; quantity: string; unit: string; isCustom: boolean }
  const [showOrderModal, setShowOrderModal] = useState<string | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [showOrderProductPicker, setShowOrderProductPicker] = useState(false);
  const [showOrderCustomForm, setShowOrderCustomForm] = useState(false);
  const [customItemName, setCustomItemName] = useState('');
  const [customItemQty, setCustomItemQty] = useState('');
  const [customItemUnit, setCustomItemUnit] = useState('');
  const [orderMessage, setOrderMessage] = useState('');
  const [editingMessage, setEditingMessage] = useState(false);
  
  const [productSearch, setProductSearch] = useState('');
  
  // Flatten to one row per (product, supplier) pair so the list can show
  // "পণ্যের নাম (সরবরাহকারীর নাম)" - this covers suppliers added manually on
  // this page AND suppliers auto-linked from the product page's supplier field.
  const supplierProductRows = useMemo(() => {
    const rows: { key: string; supplier: typeof suppliers[0]; product: typeof products[0] }[] = [];
    suppliers.forEach(supplier => {
      supplier.productIds.forEach(pid => {
        const product = products.find(p => p.id === pid);
        if (product) rows.push({ key: `${supplier.id}-${pid}`, supplier, product });
      });
    });
    return rows.sort((a, b) => a.product.name.localeCompare(b.product.name, 'bn'));
  }, [suppliers, products]);

  const filteredSupplierRows = useMemo(() => {
    if (!searchTerm.trim()) return supplierProductRows;
    const lower = searchTerm.toLowerCase();
    return supplierProductRows.filter(row =>
      row.supplier.name.toLowerCase().includes(lower) ||
      row.supplier.phone.includes(searchTerm) ||
      row.product.name.toLowerCase().includes(lower)
    );
  }, [supplierProductRows, searchTerm]);

  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return products;
    return products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()));
  }, [products, productSearch]);

  // Products belonging ONLY to the supplier whose order modal is currently
  // open — never the whole shop's catalog, so a shop owner can't
  // accidentally order an item from the wrong supplier.
  const orderModalSupplier = useMemo(
    () => suppliers.find(s => s.id === showOrderModal) || null,
    [suppliers, showOrderModal],
  );
  const orderModalSupplierProducts = useMemo(() => {
    if (!orderModalSupplier) return [];
    return products.filter(p => orderModalSupplier.productIds.includes(p.id));
  }, [products, orderModalSupplier]);

  const generateDefaultMessage = (items: OrderItem[]) => {
    const itemLines = items.length
      ? items.map((it, i) => `${i + 1}. ${it.name || '[পণ্যের নাম]'} — ${it.quantity || '[পরিমাণ]'}${it.unit ? ' ' + it.unit : ''}`).join('\n')
      : '[কোনো আইটেম যোগ করা হয়নি]';
    return `Assalamualaikum,
${storeInfo?.name || 'আমাদের দোকান'} থেকে অনুরোধ করা হচ্ছে যে, নিচের আইটেমগুলো সরবরাহ করবেন:

আইটেম:
${itemLines}

দোকান লোকেশন: ${storeInfo?.location || '[ঠিকানা]'}
মোবাইল: ${storeInfo?.phone || '[ফোন নম্বর]'}

ধন্যবাদ।`;
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast({ title: "সরবরাহকারীর নাম দিন", variant: "destructive" });
      return;
    }

    const validation = validatePhoneWithCountryCode(formData.phone);
    if (!validation.valid) {
      toast({ title: validation.message, variant: "destructive" });
      return;
    }

    // Suppliers can only be added by selecting a product
    if (formData.productIds.length === 0) {
      toast({ title: "কমপক্ষে একটি পণ্য নির্বাচন করুন", variant: "destructive" });
      return;
    }

    if (editingId) {
      updateSupplier(editingId, {
        name: formData.name.trim(),
        phone: formData.phone,
        countryCode: formData.countryCode,
        productIds: formData.productIds
      });
      toast({ title: "সরবরাহকারী আপডেট হয়েছে ✓" });
    } else {
      addSupplier({
        name: formData.name.trim(),
        phone: formData.phone,
        countryCode: formData.countryCode,
        productIds: formData.productIds
      });
      toast({ title: "নতুন সরবরাহকারী যোগ হয়েছে ✓" });
    }

    resetForm();
  };

  const handleEdit = (supplier: typeof suppliers[0]) => {
    setEditingId(supplier.id);
    setFormData({
      name: supplier.name,
      phone: supplier.phone,
      countryCode: supplier.countryCode,
      productIds: supplier.productIds
    });
    setShowAddForm(true);
  };

  const handleDelete = (id: string) => {
    deleteSupplier(id);
    toast({ title: "সরবরাহকারী মুছে ফেলা হয়েছে" });
  };

  const resetForm = () => {
    setShowAddForm(false);
    setEditingId(null);
    setFormData({ name: '', phone: '', countryCode: '+880', productIds: [] });
    setProductSearch('');
  };

  const toggleProduct = (productId: string) => {
    setFormData(prev => ({
      ...prev,
      productIds: prev.productIds.includes(productId)
        ? prev.productIds.filter(id => id !== productId)
        : [...prev.productIds, productId]
    }));
  };

  const openOrderModal = (supplier: typeof suppliers[0]) => {
    if (!guardFeature('whatsapp')) return;
    setShowOrderModal(supplier.id);
    setOrderItems([]);
    setShowOrderProductPicker(false);
    setShowOrderCustomForm(false);
    setCustomItemName(''); setCustomItemQty(''); setCustomItemUnit('');
    setOrderMessage(generateDefaultMessage([]));
    setEditingMessage(false);
  };


  const handleSendMessage = () => {
    if (!guardFeature('whatsapp')) return;
    const supplier = suppliers.find(s => s.id === showOrderModal);
    if (!supplier) return;

    if (orderItems.length === 0) {
      toast({ title: 'অন্তত একটি পণ্য যোগ করুন', variant: 'destructive' });
      return;
    }

    // Format phone number for WhatsApp
    let phone = supplier.phone.replace(/\s+/g, '');
    if (!phone.startsWith('+')) {
      phone = '+' + phone;
    }

    const message = editingMessage ? orderMessage : generateDefaultMessage(orderItems);
    const whatsappUrl = `https://wa.me/${phone.replace('+', '')}?text=${encodeURIComponent(message)}`;

    window.open(whatsappUrl, '_blank');
    setShowOrderModal(null);
  };

  const addProductOrderItem = (product: typeof products[0]) => {
    setOrderItems(prev => [...prev, {
      id: `p-${product.id}-${Date.now()}`,
      name: product.name,
      quantity: '',
      unit: product.baseUnit || '',
      isCustom: false,
    }]);
    setShowOrderProductPicker(false);
  };

  const addCustomOrderItem = () => {
    if (!customItemName.trim()) {
      toast({ title: 'পণ্যের নাম দিন', variant: 'destructive' });
      return;
    }
    setOrderItems(prev => [...prev, {
      id: `c-${Date.now()}`,
      name: customItemName.trim(),
      quantity: customItemQty.trim(),
      unit: customItemUnit.trim(),
      isCustom: true,
    }]);
    setCustomItemName(''); setCustomItemQty(''); setCustomItemUnit('');
    setShowOrderCustomForm(false);
  };

  const updateOrderItem = (idx: number, patch: Partial<OrderItem>) => {
    setOrderItems(prev => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };

  const removeOrderItem = (idx: number) => {
    setOrderItems(prev => prev.filter((_, i) => i !== idx));
  };

  const callSupplier = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  const messageSupplier = (supplier: typeof suppliers[0]) => {
    openOrderModal(supplier);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-xl">
            <Truck className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">সরবরাহকারী</h1>
            <p className="text-muted-foreground">{suppliers.length}জন সরবরাহকারী</p>
          </div>
        </div>
        <Button onClick={() => setShowAddForm(true)} className="btn-primary rounded-xl">
          <Plus className="w-5 h-5 mr-2" />
          নতুন সরবরাহকারী
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="পণ্য বা সরবরাহকারীর নাম দিয়ে খুঁজুন..."
          className="input-field pl-10"
        />
      </div>

      {/* Supplier List - one row per product, supplier name shown in brackets */}
      <div className="space-y-3">
        {filteredSupplierRows.map(({ key, supplier, product }) => (
          <div key={key} className="card-elevated p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-foreground text-lg">
                  {product.name}{' '}
                  <span className="text-primary font-medium">({supplier.name})</span>
                </h3>
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                  <Phone className="w-4 h-4" />
                  {supplier.phone}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {/* Call Button */}
                <button
                  onClick={() => callSupplier(supplier.phone)}
                  className="p-2 bg-primary/10 hover:bg-primary/20 rounded-xl text-primary transition-colors"
                  title="কল করুন"
                >
                  <Phone className="w-5 h-5" />
                </button>
                {/* Message Button */}
                <button
                  onClick={() => messageSupplier(supplier)}
                  className="p-2 bg-green-100 hover:bg-green-200 rounded-xl text-green-600 transition-colors"
                  title="WhatsApp বার্তা"
                >
                  <MessageCircle className="w-5 h-5" />
                </button>
                {/* Edit Button */}
                <button
                  onClick={() => handleEdit(supplier)}
                  className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground"
                  title="সরবরাহকারী সম্পাদনা"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                {/* Delete Button */}
                <button
                  onClick={() => handleDelete(supplier.id)}
                  className="p-2 hover:bg-destructive/10 rounded-lg text-muted-foreground hover:text-destructive"
                  title="সরবরাহকারী মুছুন"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredSupplierRows.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Truck className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>কোন সরবরাহকারী পাওয়া যায়নি</p>
          <p className="text-sm mt-1">পণ্য যোগ করার সময় বা এখানে "নতুন সরবরাহকারী" থেকে একটি পণ্য নির্বাচন করে সরবরাহকারী যোগ করুন</p>
        </div>
      )}

      {/* Add/Edit Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-card rounded-2xl shadow-soft border border-border p-6 animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-foreground">
                {editingId ? 'সরবরাহকারী সম্পাদনা' : 'নতুন সরবরাহকারী যোগ করুন'}
              </h2>
              <button onClick={resetForm} className="p-2 hover:bg-muted rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium mb-2">সরবরাহকারীর নাম *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="নাম লিখুন"
                  className="input-field"
                  autoFocus
                />
              </div>

              {/* Phone with Country Code */}
              <PhoneInputWithCode
                value={formData.phone}
                onChange={(phone, code) => setFormData({ ...formData, phone, countryCode: code })}
                label="WhatsApp নম্বর"
                required
              />

              {/* Product Selection */}
              <div className="border-t border-border pt-4">
                <label className="block text-sm font-medium mb-2">
                  <Package className="w-4 h-4 inline mr-1" />
                  সরবরাহকৃত পণ্য নির্বাচন করুন *
                </label>
                <p className="text-xs text-muted-foreground -mt-1 mb-2">
                  কমপক্ষে একটি পণ্য নির্বাচন করতে হবে
                </p>
                
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="পণ্য খুঁজুন..."
                  className="input-field mb-3"
                />

                <div className="max-h-40 overflow-y-auto border border-border rounded-xl">
                  {filteredProducts.map(product => (
                    <label
                      key={product.id}
                      className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted transition-colors ${
                        formData.productIds.includes(product.id) ? 'bg-primary/10' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.productIds.includes(product.id)}
                        onChange={() => toggleProduct(product.id)}
                        className="w-4 h-4 text-primary rounded"
                      />
                      <span className="font-medium">{product.name}</span>
                    </label>
                  ))}
                  {filteredProducts.length === 0 && (
                    <p className="text-center py-4 text-muted-foreground text-sm">পণ্য পাওয়া যায়নি</p>
                  )}
                </div>

                {formData.productIds.length > 0 && (
                  <p className="text-sm text-primary mt-2">
                    {formData.productIds.length}টি পণ্য নির্বাচিত
                  </p>
                )}
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

      {/* Order Message Modal */}
      {showOrderModal && (
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-card rounded-2xl shadow-soft border border-border p-6 animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-foreground">অর্ডার বার্তা পাঠান</h2>
              <button onClick={() => setShowOrderModal(null)} className="p-2 hover:bg-muted rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Item list */}
              {orderItems.length > 0 && (
                <div className="space-y-2">
                  {orderItems.map((item, idx) => (
                    <div key={item.id} className="p-3 bg-muted/50 rounded-xl space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        {item.isCustom ? (
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => updateOrderItem(idx, { name: e.target.value })}
                            placeholder="পণ্যের নাম"
                            className="input-field text-sm flex-1"
                          />
                        ) : (
                          <p className="font-medium text-sm truncate flex-1">{item.name}</p>
                        )}
                        <button onClick={() => removeOrderItem(idx)} className="shrink-0 p-1.5 hover:bg-background rounded-lg">
                          <X className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={item.quantity}
                          onChange={(e) => updateOrderItem(idx, { quantity: e.target.value })}
                          placeholder="পরিমাণ"
                          className="input-field text-sm flex-1"
                        />
                        <input
                          type="text"
                          value={item.unit}
                          onChange={(e) => updateOrderItem(idx, { unit: e.target.value })}
                          placeholder="একক (কেজি, বস্তা...)"
                          className="input-field text-sm flex-1"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add item buttons */}
              <div className="flex gap-2">
                <button type="button" onClick={() => { setShowOrderProductPicker(v => !v); setShowOrderCustomForm(false); }}
                  className="flex-1 py-2.5 rounded-xl border border-dashed border-primary text-primary text-sm font-medium hover:bg-primary/5 flex items-center justify-center gap-1">
                  <Plus className="w-4 h-4" /> পণ্য যোগ করুন
                </button>
                <button type="button" onClick={() => { setShowOrderCustomForm(v => !v); setShowOrderProductPicker(false); }}
                  className="flex-1 py-2.5 rounded-xl border border-dashed border-amber-500 text-amber-700 dark:text-amber-400 text-sm font-medium hover:bg-amber-50 dark:hover:bg-amber-900/10 flex items-center justify-center gap-1">
                  <Plus className="w-4 h-4" /> কাস্টম পণ্য
                </button>
              </div>

              {/* Product picker — ONLY this supplier's own linked products */}
              {showOrderProductPicker && (
                <div className="p-3 bg-muted/30 rounded-xl space-y-2">
                  <p className="text-xs text-muted-foreground">শুধু এই সরবরাহকারীর পণ্য দেখানো হচ্ছে</p>
                  {orderModalSupplierProducts.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                      {orderModalSupplierProducts.map(p => (
                        <button key={p.id} type="button" onClick={() => addProductOrderItem(p)}
                          className="p-3 rounded-xl border border-border hover:border-primary/50 bg-background text-left transition-all">
                          <p className="font-medium text-sm truncate">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{p.baseUnit}</p>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      এই সরবরাহকারীর সাথে কোনো পণ্য যুক্ত নেই। পণ্য পেজ থেকে যুক্ত করুন, অথবা নিচের "কাস্টম পণ্য" ব্যবহার করুন।
                    </p>
                  )}
                </div>
              )}

              {/* Custom item form */}
              {showOrderCustomForm && (
                <div className="p-4 bg-amber-50/60 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl space-y-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">পণ্যের নাম *</label>
                    <input type="text" value={customItemName} onChange={(e) => setCustomItemName(e.target.value)}
                      placeholder="যেমন: বিশেষ চাল" className="input-field text-sm" />
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-xs text-muted-foreground mb-1 block">পরিমাণ</label>
                      <input type="text" value={customItemQty} onChange={(e) => setCustomItemQty(e.target.value)}
                        placeholder="যেমন: ৫" className="input-field text-sm" />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-muted-foreground mb-1 block">একক</label>
                      <input type="text" value={customItemUnit} onChange={(e) => setCustomItemUnit(e.target.value)}
                        placeholder="যেমন: কেজি, বস্তা" className="input-field text-sm" />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button type="button" onClick={() => { setShowOrderCustomForm(false); setCustomItemName(''); setCustomItemQty(''); setCustomItemUnit(''); }}
                      className="flex-1 text-xs text-muted-foreground py-2">বাতিল</button>
                    <Button type="button" onClick={addCustomOrderItem} className="flex-1 btn-primary py-2 rounded-lg text-sm">যোগ করুন</Button>
                  </div>
                </div>
              )}

              {/* Message Preview/Edit */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">বার্তা:</label>
                  <button
                    onClick={() => {
                      if (!editingMessage) setOrderMessage(generateDefaultMessage(orderItems));
                      setEditingMessage(!editingMessage);
                    }}
                    className="text-sm text-primary flex items-center gap-1"
                  >
                    {editingMessage ? 'ডিফল্ট করুন' : 'সম্পাদনা করুন'}
                  </button>
                </div>
                {editingMessage ? (
                  <textarea
                    value={orderMessage}
                    onChange={(e) => setOrderMessage(e.target.value)}
                    className="input-field min-h-[200px] text-sm"
                  />
                ) : (
                  <div className="p-3 bg-muted/50 rounded-xl text-sm whitespace-pre-line max-h-[200px] overflow-y-auto">
                    {generateDefaultMessage(orderItems)}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setShowOrderModal(null)} className="flex-1 py-5 rounded-xl">
                  বাতিল
                </Button>
                <Button onClick={handleSendMessage} className="flex-1 bg-green-500 hover:bg-green-600 text-white py-5 rounded-xl">
                  <MessageCircle className="w-5 h-5 mr-2" />
                  WhatsApp এ পাঠান
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
