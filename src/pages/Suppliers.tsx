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
  
  // Order message state
  const [showOrderModal, setShowOrderModal] = useState<string | null>(null);
  const [orderProduct, setOrderProduct] = useState('');
  const [orderQuantity, setOrderQuantity] = useState('');
  const [orderMessage, setOrderMessage] = useState('');
  const [editingMessage, setEditingMessage] = useState(false);
  
  const [productSearch, setProductSearch] = useState('');
  
  const filteredSuppliers = useMemo(() => {
    if (!searchTerm.trim()) return suppliers;
    const lower = searchTerm.toLowerCase();
    return suppliers.filter(s => 
      s.name.toLowerCase().includes(lower) ||
      s.phone.includes(searchTerm)
    );
  }, [suppliers, searchTerm]);

  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return products;
    return products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()));
  }, [products, productSearch]);

  const generateDefaultMessage = (productName: string, quantity: string) => {
    return `Assalamualaikum,
${storeInfo?.name || 'আমাদের দোকান'} থেকে অনুরোধ করা হচ্ছে যে, নিচের আইটেমগুলো সরবরাহ করবেন:

আইটেম: ${productName || '[পণ্যের নাম]'}
পরিমাণ: ${quantity || '[পরিমাণ]'}

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
    setShowOrderModal(supplier.id);
    setOrderProduct('');
    setOrderQuantity('');
    setOrderMessage(generateDefaultMessage('', ''));
    setEditingMessage(false);
  };

  const handleSendMessage = () => {
    if (!guardFeature('whatsapp')) return;
    const supplier = suppliers.find(s => s.id === showOrderModal);
    if (!supplier) return;


    // Format phone number for WhatsApp
    let phone = supplier.phone.replace(/\s+/g, '');
    if (!phone.startsWith('+')) {
      phone = '+' + phone;
    }

    const message = editingMessage ? orderMessage : generateDefaultMessage(orderProduct, orderQuantity);
    const whatsappUrl = `https://wa.me/${phone.replace('+', '')}?text=${encodeURIComponent(message)}`;
    
    window.open(whatsappUrl, '_blank');
    setShowOrderModal(null);
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
          placeholder="সরবরাহকারী খুঁজুন..."
          className="input-field pl-10"
        />
      </div>

      {/* Supplier List */}
      <div className="space-y-3">
        {filteredSuppliers.map((supplier) => {
          const suppliedProducts = products.filter(p => supplier.productIds.includes(p.id));
          return (
            <div key={supplier.id} className="card-elevated p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground text-lg">{supplier.name}</h3>
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                    <Phone className="w-4 h-4" />
                    {supplier.phone}
                  </p>
                  {suppliedProducts.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {suppliedProducts.slice(0, 3).map(p => (
                        <span key={p.id} className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">
                          {p.name}
                        </span>
                      ))}
                      {suppliedProducts.length > 3 && (
                        <span className="text-xs px-2 py-1 bg-muted text-muted-foreground rounded-full">
                          +{suppliedProducts.length - 3}টি আরও
                        </span>
                      )}
                    </div>
                  )}
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
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  {/* Delete Button */}
                  <button
                    onClick={() => handleDelete(supplier.id)}
                    className="p-2 hover:bg-destructive/10 rounded-lg text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredSuppliers.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Truck className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>কোন সরবরাহকারী পাওয়া যায়নি</p>
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
                  সরবরাহকৃত পণ্য নির্বাচন করুন
                </label>
                
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
              {/* Product Name */}
              <div>
                <label className="block text-sm font-medium mb-2">পণ্যের নাম</label>
                <input
                  type="text"
                  value={orderProduct}
                  onChange={(e) => {
                    setOrderProduct(e.target.value);
                    if (!editingMessage) {
                      setOrderMessage(generateDefaultMessage(e.target.value, orderQuantity));
                    }
                  }}
                  placeholder="যে পণ্য চাই"
                  className="input-field"
                />
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-sm font-medium mb-2">পরিমাণ</label>
                <input
                  type="text"
                  value={orderQuantity}
                  onChange={(e) => {
                    setOrderQuantity(e.target.value);
                    if (!editingMessage) {
                      setOrderMessage(generateDefaultMessage(orderProduct, e.target.value));
                    }
                  }}
                  placeholder="কত পরিমাণ চাই"
                  className="input-field"
                />
              </div>

              {/* Message Preview/Edit */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">বার্তা:</label>
                  <button
                    onClick={() => setEditingMessage(!editingMessage)}
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
                    {generateDefaultMessage(orderProduct, orderQuantity)}
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
