import { useStore } from '@/context/StoreContext';
import { AlertTriangle, Package, Phone, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function LowStockAlert() {
  const { products, suppliers, storeInfo } = useStore();
  const navigate = useNavigate();
  
  const lowStockProducts = products.filter(p => p.stock <= 5);

  if (lowStockProducts.length === 0) {
    return null;
  }

  // Find supplier for a product
  const findSupplier = (productId: string) => {
    return suppliers.find(s => s.productIds.includes(productId));
  };

  const callSupplier = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  const messageSupplier = (supplier: typeof suppliers[0], productName: string, stock: number) => {
    const message = `Assalamualaikum,
${storeInfo?.name || 'আমাদের দোকান'} থেকে অনুরোধ করা হচ্ছে যে, নিচের আইটেমগুলো সরবরাহ করবেন:

আইটেম: ${productName}
পরিমাণ: [পরিমাণ দিন]

বর্তমান স্টক: ${stock}টি

দোকান লোকেশন: ${storeInfo?.location || '[ঠিকানা]'}
মোবাইল: ${storeInfo?.phone || '[ফোন নম্বর]'}

ধন্যবাদ।`;

    const phone = supplier.phone.replace(/\+/g, '');
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="card-elevated p-4 border-l-4 border-l-warning">
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 bg-warning/10 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-warning" />
        </div>
        <h3 className="font-semibold text-foreground">স্টক কম আছে!</h3>
      </div>
      
      <div className="space-y-2">
        {lowStockProducts.slice(0, 5).map((product) => {
          const supplier = findSupplier(product.id);
          return (
            <div 
              key={product.id}
              className="flex items-center justify-between py-2 px-3 bg-warning/5 rounded-lg"
            >
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-warning" />
                <div>
                  <span className="text-foreground">{product.name}</span>
                  <span className="text-sm font-semibold text-warning ml-2">
                    {product.stock}টি বাকি
                  </span>
                </div>
              </div>
              {supplier && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => callSupplier(supplier.phone)}
                    className="p-1.5 bg-primary/10 hover:bg-primary/20 rounded-lg text-primary transition-colors"
                    title={`কল: ${supplier.name}`}
                  >
                    <Phone className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => messageSupplier(supplier, product.name, product.stock)}
                    className="p-1.5 bg-green-100 hover:bg-green-200 rounded-lg text-green-600 transition-colors"
                    title={`WhatsApp: ${supplier.name}`}
                  >
                    <MessageCircle className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {lowStockProducts.length > 5 && (
        <button
          onClick={() => navigate('/products')}
          className="w-full mt-3 py-2 text-sm text-primary hover:underline"
        >
          আরও {lowStockProducts.length - 5}টি দেখুন →
        </button>
      )}
    </div>
  );
}
