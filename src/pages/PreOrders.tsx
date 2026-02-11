import { useState, useMemo } from 'react';
import { CalendarCheck, Plus, Search, User, Phone, X, Package, Trash2, CheckCircle, XCircle, Clock, MessageCircle, AlertTriangle, ShoppingBag } from 'lucide-react';
import { useStore } from '@/context/StoreContext';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { PreOrder, PreOrderItem, PreOrderStatus, getUnitLabel, getPreOrderStatusLabel, getPreOrderStatusColor } from '@/types/store';
import { format } from 'date-fns';
import { bn } from 'date-fns/locale';
import { PhoneInputWithCode } from '@/components/common/PhoneInputWithCode';

export default function PreOrders() {
  const { products, preOrders, addPreOrder, updatePreOrderStatus, updateProduct, markPreOrderAsSold, storeInfo } = useStore();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [viewingOrder, setViewingOrder] = useState<PreOrder | null>(null);
  const [statusFilter, setStatusFilter] = useState<PreOrderStatus | 'all'>('all');
  
  // Form state
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [orderItems, setOrderItems] = useState<PreOrderItem[]>([]);
  
  // Item adding state
  const [selectedProductId, setSelectedProductId] = useState('');
  const [itemQuantity, setItemQuantity] = useState('');
  const [productSearchTerm, setProductSearchTerm] = useState('');

  // WhatsApp reminder message
  const [reminderMessage, setReminderMessage] = useState(`Assalamualaikum,
আপনার অর্ডার [ORDER_DATE] তারিখে [STORE_NAME]-এ রাখানো ছিল।
অনুগ্রহ করে আপনার অর্ডারটি সংগ্রহ করুন।

ধন্যবাদ।`);

  // Get overdue orders
  const overdueOrders = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return preOrders.filter(o => {
      const deliveryDate = new Date(o.deliveryDate);
      deliveryDate.setHours(0, 0, 0, 0);
      return o.status === 'pending' && deliveryDate < today;
    });
  }, [preOrders]);

  const filteredPreOrders = useMemo(() => {
    let result = preOrders;
    
    if (statusFilter !== 'all') {
      result = result.filter(o => o.status === statusFilter);
    }
    
    if (searchTerm.trim()) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(o => 
        o.customerName.toLowerCase().includes(lower) ||
        o.customerPhone?.includes(searchTerm)
      );
    }
    
    return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [preOrders, statusFilter, searchTerm]);

  const filteredProducts = useMemo(() => {
    if (!productSearchTerm.trim()) return products;
    const lower = productSearchTerm.toLowerCase();
    return products.filter(p => p.name.toLowerCase().includes(lower));
  }, [products, productSearchTerm]);

  const handleAddItem = () => {
    if (!selectedProductId) {
      toast({ title: "পণ্য নির্বাচন করুন", variant: "destructive" });
      return;
    }
    
    const product = products.find(p => p.id === selectedProductId);
    if (!product) return;
    
    const qty = parseFloat(itemQuantity) || 0;
    if (qty <= 0) {
      toast({ title: "সঠিক পরিমাণ দিন", variant: "destructive" });
      return;
    }
    
    // Show warning if stock is low but still allow
    if (qty > product.stock) {
      toast({ 
        title: "সতর্কতা: পর্যাপ্ত স্টক নেই", 
        description: `${product.name} এর স্টকে ${product.stock} ${getUnitLabel(product.unitType)} আছে। তবুও অর্ডার করতে পারবেন।`,
        variant: "default"
      });
    }
    
    // Check if already added
    const existingIndex = orderItems.findIndex(i => i.productId === product.id);
    if (existingIndex >= 0) {
      // Update quantity
      const updated = [...orderItems];
      const newQty = updated[existingIndex].quantity + qty;
      updated[existingIndex].quantity = newQty;
      updated[existingIndex].price = product.price * newQty;
      updated[existingIndex].profit = product.profit * newQty;
      setOrderItems(updated);
    } else {
      setOrderItems([...orderItems, {
        productId: product.id,
        productName: product.name,
        unitType: product.unitType,
        quantity: qty,
        quantityInBaseUnit: qty,
        price: product.price * qty,
        profit: product.profit * qty
      }]);
    }
    
    setSelectedProductId('');
    setItemQuantity('');
    setProductSearchTerm('');
    toast({ title: `${product.name} যোগ হয়েছে` });
  };

  const handleRemoveItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (!customerName.trim()) {
      toast({ title: "গ্রাহকের নাম দিন", variant: "destructive" });
      return;
    }
    
    if (!deliveryDate) {
      toast({ title: "ডেলিভারি তারিখ দিন", variant: "destructive" });
      return;
    }
    
    if (orderItems.length === 0) {
      toast({ title: "অন্তত একটি পণ্য যোগ করুন", variant: "destructive" });
      return;
    }
    
    // Check stock and show warning if not enough (but allow saving)
    let stockWarning = false;
    for (const item of orderItems) {
      const product = products.find(p => p.id === item.productId);
      if (product && item.quantity > product.stock) {
        stockWarning = true;
      }
    }
    
    if (stockWarning) {
      toast({ 
        title: "সতর্কতা", 
        description: "কিছু পণ্যের স্টক কম আছে। অর্ডার সংরক্ষিত হবে।",
      });
    }
    
    const totalPrice = orderItems.reduce((sum, item) => sum + item.price, 0);
    const totalProfit = orderItems.reduce((sum, item) => sum + (item.profit || 0), 0);
    
    // Only reserve stock if available
    const canReserveStock = orderItems.every(item => {
      const product = products.find(p => p.id === item.productId);
      return product && item.quantity <= product.stock;
    });
    
    addPreOrder({
      customerName: customerName.trim(),
      customerPhone: customerPhone,
      deliveryDate: new Date(deliveryDate),
      items: orderItems,
      status: 'pending',
      totalPrice,
      totalProfit,
      stockReserved: canReserveStock
    });
    
    toast({ title: "আগাম অর্ডার সংরক্ষিত হয়েছে ✓" });
    resetForm();
  };

  const handleStatusChange = (orderId: string, newStatus: PreOrderStatus) => {
    const order = preOrders.find(o => o.id === orderId);
    if (!order) return;
    
    // If cancelling, restore stock
    if (newStatus === 'cancelled' && order.status !== 'cancelled' && order.stockReserved) {
      order.items.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        if (product) {
          updateProduct(item.productId, { stock: product.stock + item.quantity });
        }
      });
    }
    
    updatePreOrderStatus(orderId, newStatus);
    toast({ 
      title: newStatus === 'delivered' ? 'সরবরাহ সম্পন্ন ✓' : 
             newStatus === 'cancelled' ? 'অর্ডার বাতিল হয়েছে' : 
             'স্ট্যাটাস আপডেট হয়েছে' 
    });
    setViewingOrder(null);
  };

  const handleMarkAsSold = (orderId: string) => {
    markPreOrderAsSold(orderId);
    toast({ 
      title: "বিক্রি সম্পন্ন ✓",
      description: "অর্ডারটি বিক্রি হিসেবে রেকর্ড হয়েছে এবং লাভ গণনা করা হয়েছে।"
    });
    setViewingOrder(null);
  };

  const handleSendWhatsAppReminder = (order: PreOrder) => {
    if (!order.customerPhone) {
      toast({ title: "ফোন নম্বর নেই", variant: "destructive" });
      return;
    }

    const message = reminderMessage
      .replace('[ORDER_DATE]', format(new Date(order.deliveryDate), 'dd MMMM yyyy', { locale: bn }))
      .replace('[STORE_NAME]', storeInfo?.name || 'দোকান');

    const phone = order.customerPhone.replace(/\+/g, '');
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const resetForm = () => {
    setShowAddForm(false);
    setCustomerName('');
    setCustomerPhone('');
    setDeliveryDate('');
    setOrderItems([]);
    setSelectedProductId('');
    setItemQuantity('');
    setProductSearchTerm('');
  };

  const pendingCount = preOrders.filter(o => o.status === 'pending').length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-xl">
            <CalendarCheck className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">আগাম অর্ডার</h1>
            <p className="text-muted-foreground">{pendingCount}টি অপেক্ষমান অর্ডার</p>
          </div>
        </div>
        <Button
          onClick={() => setShowAddForm(true)}
          className="btn-primary rounded-xl"
        >
          <Plus className="w-5 h-5 mr-2" />
          নতুন অর্ডার
        </Button>
      </div>

      {/* Overdue Orders Alert */}
      {overdueOrders.length > 0 && (
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <h3 className="font-semibold text-amber-800 dark:text-amber-200">
              {overdueOrders.length}টি অর্ডার সংগ্রহ হয়নি!
            </h3>
          </div>
          <div className="space-y-2">
            {overdueOrders.map(order => (
              <div key={order.id} className="flex items-center justify-between p-2 bg-white dark:bg-background rounded-lg">
                <div>
                  <p className="font-medium">{order.customerName}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(order.deliveryDate), 'dd MMM yyyy', { locale: bn })}
                  </p>
                </div>
                <div className="flex gap-2">
                  {order.customerPhone && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSendWhatsAppReminder(order)}
                      className="text-green-600 border-green-600"
                    >
                      <MessageCircle className="w-4 h-4 mr-1" />
                      রিমাইন্ডার
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={() => handleMarkAsSold(order.id)}
                    className="bg-profit hover:bg-profit/90 text-white"
                  >
                    <ShoppingBag className="w-4 h-4 mr-1" />
                    বিক্রি হয়েছে
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Default WhatsApp Message */}
      <div className="card-elevated p-4">
        <label className="block text-sm font-medium mb-2">
          <MessageCircle className="w-4 h-4 inline mr-1" />
          ডিফল্ট রিমাইন্ডার মেসেজ (সম্পাদনাযোগ্য)
        </label>
        <textarea
          value={reminderMessage}
          onChange={(e) => setReminderMessage(e.target.value)}
          rows={4}
          className="input-field text-sm"
          placeholder="WhatsApp রিমাইন্ডার মেসেজ..."
        />
        <p className="text-xs text-muted-foreground mt-1">
          [ORDER_DATE] = অর্ডার তারিখ, [STORE_NAME] = দোকানের নাম
        </p>
      </div>

      {/* Status Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {(['all', 'pending', 'delivered', 'cancelled'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-4 py-2 rounded-xl whitespace-nowrap transition-all ${
              statusFilter === status
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {status === 'all' ? 'সব' : getPreOrderStatusLabel(status)}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="গ্রাহকের নাম বা ফোন দিয়ে খুঁজুন..."
          className="input-field pl-10"
        />
      </div>

      {/* Add Order Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-card rounded-2xl shadow-soft border border-border p-6 animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-foreground">নতুন আগাম অর্ডার</h2>
              <button onClick={resetForm} className="p-2 hover:bg-muted rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Customer Name */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  <User className="w-4 h-4 inline mr-1" />
                  অর্ডারকারীর নাম *
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="গ্রাহকের নাম"
                  className="input-field"
                />
              </div>

              {/* Phone with Country Code */}
              <PhoneInputWithCode
                value={customerPhone}
                onChange={(phone) => setCustomerPhone(phone)}
                label="ফোন / WhatsApp নম্বর"
              />

              {/* Delivery Date */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  <CalendarCheck className="w-4 h-4 inline mr-1" />
                  কোন তারিখে দিতে হবে *
                </label>
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="input-field"
                />
              </div>

              {/* Add Products */}
              <div className="border-t border-border pt-4">
                <label className="block text-sm font-medium mb-2">
                  <Package className="w-4 h-4 inline mr-1" />
                  পণ্য ও পরিমাণ
                </label>
                
                {/* Product Search */}
                <div className="space-y-2 mb-3">
                  <input
                    type="text"
                    value={productSearchTerm}
                    onChange={(e) => setProductSearchTerm(e.target.value)}
                    placeholder="পণ্য খুঁজুন..."
                    className="input-field"
                  />
                  
                  {productSearchTerm && (
                    <div className="max-h-40 overflow-y-auto border border-border rounded-xl bg-background">
                      {filteredProducts.map(p => (
                        <button
                          key={p.id}
                          onClick={() => {
                            setSelectedProductId(p.id);
                            setProductSearchTerm(p.name);
                          }}
                          className={`w-full text-left px-4 py-3 hover:bg-muted transition-colors flex items-center justify-between ${
                            selectedProductId === p.id ? 'bg-primary/10' : ''
                          }`}
                        >
                          <div>
                            <span className="font-medium">{p.name}</span>
                            <span className="text-xs text-muted-foreground ml-2">
                              ({p.baseUnit || getUnitLabel(p.unitType)})
                            </span>
                          </div>
                          <span className={`text-sm ${p.stock <= 5 ? 'text-due' : 'text-muted-foreground'}`}>
                            স্টক: {p.stock}
                          </span>
                        </button>
                      ))}
                      {filteredProducts.length === 0 && (
                        <p className="text-center py-4 text-muted-foreground">পণ্য পাওয়া যায়নি</p>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Quantity & Add Button */}
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={itemQuantity}
                    onChange={(e) => setItemQuantity(e.target.value)}
                    placeholder="পরিমাণ"
                    className="input-field flex-1"
                    min="1"
                  />
                  <Button
                    type="button"
                    onClick={handleAddItem}
                    variant="outline"
                    className="px-4"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    যোগ করুন
                  </Button>
                </div>
                
                {/* Added Items */}
                {orderItems.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {orderItems.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-xl"
                      >
                        <div>
                          <p className="font-medium">{item.productName}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.quantity} {getUnitLabel(item.unitType)} × ৳{(item.price / item.quantity).toFixed(0)}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold">৳{item.price}</span>
                          <button
                            onClick={() => handleRemoveItem(index)}
                            className="p-1 text-due hover:bg-due/10 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                    <div className="text-right pt-2 border-t border-border">
                      <span className="text-muted-foreground">মোট: </span>
                      <span className="text-xl font-bold text-primary">
                        ৳{orderItems.reduce((sum, i) => sum + i.price, 0)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={resetForm} className="flex-1 py-5 rounded-xl">
                  বাতিল
                </Button>
                <Button onClick={handleSubmit} className="flex-1 btn-primary py-5 rounded-xl">
                  সংরক্ষণ করুন
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Order Modal */}
      {viewingOrder && (
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-card rounded-2xl shadow-soft border border-border p-6 animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-foreground">অর্ডারের বিবরণ</h2>
              <button onClick={() => setViewingOrder(null)} className="p-2 hover:bg-muted rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Customer Info */}
              <div className="p-4 bg-muted/50 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-5 h-5 text-primary" />
                  <span className="font-bold text-lg">{viewingOrder.customerName}</span>
                </div>
                {viewingOrder.customerPhone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="w-4 h-4" />
                    <span>{viewingOrder.customerPhone}</span>
                    <button
                      onClick={() => handleSendWhatsAppReminder(viewingOrder)}
                      className="ml-2 p-1 text-green-600 hover:bg-green-100 rounded"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Delivery Date */}
              <div className="p-4 bg-primary/10 rounded-xl">
                <div className="flex items-center gap-2">
                  <CalendarCheck className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">ডেলিভারি তারিখ</p>
                    <p className="font-bold text-lg">
                      {format(new Date(viewingOrder.deliveryDate), 'dd MMMM yyyy', { locale: bn })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">অবস্থা:</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPreOrderStatusColor(viewingOrder.status)}`}>
                  {getPreOrderStatusLabel(viewingOrder.status)}
                </span>
              </div>

              {/* Items */}
              <div className="border-t border-border pt-4">
                <p className="font-medium mb-3">পণ্যসমূহ:</p>
                <div className="space-y-2">
                  {viewingOrder.items.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{item.productName}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.quantity} {getUnitLabel(item.unitType)}
                        </p>
                      </div>
                      <span className="font-bold">৳{item.price}</span>
                    </div>
                  ))}
                </div>
                <div className="text-right pt-3 border-t border-border mt-3">
                  <span className="text-muted-foreground">মোট: </span>
                  <span className="text-2xl font-bold text-primary">৳{viewingOrder.totalPrice}</span>
                </div>
              </div>

              {/* Action Buttons */}
              {viewingOrder.status === 'pending' && (
                <div className="space-y-3 pt-4">
                  {/* Sold Button - Primary Action */}
                  <Button
                    onClick={() => handleMarkAsSold(viewingOrder.id)}
                    className="w-full py-5 rounded-xl bg-profit hover:bg-profit/90 text-white"
                  >
                    <ShoppingBag className="w-5 h-5 mr-2" />
                    বিক্রি হয়েছে (Sold)
                  </Button>
                  
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => handleStatusChange(viewingOrder.id, 'cancelled')}
                      className="flex-1 py-5 rounded-xl border-due text-due hover:bg-due/10"
                    >
                      <XCircle className="w-5 h-5 mr-2" />
                      বাতিল করুন
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleStatusChange(viewingOrder.id, 'delivered')}
                      className="flex-1 py-5 rounded-xl"
                    >
                      <CheckCircle className="w-5 h-5 mr-2" />
                      সরবরাহ সম্পন্ন
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Order List */}
      <div className="space-y-3">
        {filteredPreOrders.map((order) => {
          const isOverdue = new Date(order.deliveryDate) < new Date() && order.status === 'pending';
          return (
            <div
              key={order.id}
              className={`card-elevated p-4 hover:shadow-md transition-shadow ${
                isOverdue ? 'border-amber-400 bg-amber-50/50 dark:bg-amber-900/10' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <button
                  onClick={() => setViewingOrder(order)}
                  className="flex items-center gap-3 flex-1 text-left"
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    isOverdue ? 'bg-amber-100' : 'bg-primary/10'
                  }`}>
                    {isOverdue ? (
                      <AlertTriangle className="w-5 h-5 text-amber-600" />
                    ) : (
                      <User className="w-5 h-5 text-primary" />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{order.customerName}</p>
                    {order.customerPhone && (
                      <p className="text-sm text-muted-foreground">{order.customerPhone}</p>
                    )}
                  </div>
                </button>
                <div className="flex items-center gap-1">
                  {order.customerPhone && (
                    <>
                      <button
                        onClick={() => window.location.href = `tel:${order.customerPhone}`}
                        className="p-2 bg-primary/10 hover:bg-primary/20 rounded-xl text-primary transition-colors"
                        title="কল করুন"
                      >
                        <Phone className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleSendWhatsAppReminder(order)}
                        className="p-2 bg-green-100 hover:bg-green-200 rounded-xl text-green-600 transition-colors"
                        title="WhatsApp বার্তা"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPreOrderStatusColor(order.status)}`}>
                    {getPreOrderStatusLabel(order.status)}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between text-sm ml-13">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CalendarCheck className="w-4 h-4" />
                  {format(new Date(order.deliveryDate), 'dd MMM yyyy', { locale: bn })}
                  {isOverdue && (
                    <span className="text-amber-600 text-xs">(মেয়াদ শেষ)</span>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-muted-foreground">
                    {order.items.length}টি পণ্য
                  </span>
                  <span className="font-bold text-primary">৳{order.totalPrice}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredPreOrders.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>কোন আগাম অর্ডার নেই</p>
        </div>
      )}
    </div>
  );
}
