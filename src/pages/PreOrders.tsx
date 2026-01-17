import { useState, useMemo } from 'react';
import { CalendarCheck, Plus, Search, User, Phone, X, Package, Trash2, CheckCircle, XCircle, Eye, Clock } from 'lucide-react';
import { useStore } from '@/context/StoreContext';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { PreOrder, PreOrderItem, PreOrderStatus, getUnitLabel, getPreOrderStatusLabel, getPreOrderStatusColor } from '@/types/store';
import { format } from 'date-fns';
import { bn } from 'date-fns/locale';

export default function PreOrders() {
  const { products, preOrders, addPreOrder, updatePreOrderStatus, updateProduct } = useStore();
  
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
    
    if (qty > product.stock) {
      toast({ 
        title: "পর্যাপ্ত স্টক নেই", 
        description: `${product.name} এর স্টকে ${product.stock} ${getUnitLabel(product.unitType)} আছে`,
        variant: "destructive" 
      });
      return;
    }
    
    // Check if already added
    const existingIndex = orderItems.findIndex(i => i.productId === product.id);
    if (existingIndex >= 0) {
      // Update quantity
      const updated = [...orderItems];
      const newQty = updated[existingIndex].quantity + qty;
      if (newQty > product.stock) {
        toast({ title: "পর্যাপ্ত স্টক নেই", variant: "destructive" });
        return;
      }
      updated[existingIndex].quantity = newQty;
      updated[existingIndex].price = product.price * newQty;
      setOrderItems(updated);
    } else {
      setOrderItems([...orderItems, {
        productId: product.id,
        productName: product.name,
        unitType: product.unitType,
        quantity: qty,
        price: product.price * qty
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
    
    // Check stock again before saving
    for (const item of orderItems) {
      const product = products.find(p => p.id === item.productId);
      if (!product || item.quantity > product.stock) {
        toast({ 
          title: "পর্যাপ্ত স্টক নেই", 
          description: `${item.productName} এর জন্য যথেষ্ট স্টক নেই`,
          variant: "destructive" 
        });
        return;
      }
    }
    
    const totalPrice = orderItems.reduce((sum, item) => sum + item.price, 0);
    
    addPreOrder({
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      deliveryDate: new Date(deliveryDate),
      items: orderItems,
      status: 'pending',
      totalPrice,
      stockReserved: true
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

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  <Phone className="w-4 h-4 inline mr-1" />
                  ফোন / WhatsApp নম্বর
                </label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  className="input-field"
                />
              </div>

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
                              ({getUnitLabel(p.unitType)})
                            </span>
                          </div>
                          <span className="text-sm text-muted-foreground">
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
                  <p className="text-muted-foreground flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    {viewingOrder.customerPhone}
                  </p>
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
                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => handleStatusChange(viewingOrder.id, 'cancelled')}
                    className="flex-1 py-5 rounded-xl border-due text-due hover:bg-due/10"
                  >
                    <XCircle className="w-5 h-5 mr-2" />
                    বাতিল করুন
                  </Button>
                  <Button
                    onClick={() => handleStatusChange(viewingOrder.id, 'delivered')}
                    className="flex-1 py-5 rounded-xl bg-profit hover:bg-profit/90 text-white"
                  >
                    <CheckCircle className="w-5 h-5 mr-2" />
                    সরবরাহ সম্পন্ন
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Order List */}
      <div className="space-y-3">
        {filteredPreOrders.map((order) => (
          <button
            key={order.id}
            onClick={() => setViewingOrder(order)}
            className="w-full card-elevated p-4 text-left hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{order.customerName}</p>
                  {order.customerPhone && (
                    <p className="text-sm text-muted-foreground">{order.customerPhone}</p>
                  )}
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPreOrderStatusColor(order.status)}`}>
                {getPreOrderStatusLabel(order.status)}
              </span>
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <CalendarCheck className="w-4 h-4" />
                {format(new Date(order.deliveryDate), 'dd MMM yyyy', { locale: bn })}
              </div>
              <div className="flex items-center gap-4">
                <span className="text-muted-foreground">
                  {order.items.length}টি পণ্য
                </span>
                <span className="font-bold text-primary">৳{order.totalPrice}</span>
              </div>
            </div>
          </button>
        ))}
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
