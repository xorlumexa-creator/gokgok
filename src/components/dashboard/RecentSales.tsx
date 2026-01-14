import { useStore } from '@/context/StoreContext';
import { ShoppingBag } from 'lucide-react';

export function RecentSales() {
  const { sales } = useStore();
  
  const recentSales = sales
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return (
    <div className="card-elevated p-4">
      <h3 className="font-semibold text-foreground mb-4">সাম্প্রতিক বিক্রি</h3>
      
      {recentSales.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>এখনো কোন বিক্রি হয়নি</p>
          <p className="text-sm">বিক্রি করুন পেজে গিয়ে প্রথম বিক্রি করুন</p>
        </div>
      ) : (
        <div className="space-y-3">
          {recentSales.map((sale) => (
            <div 
              key={sale.id} 
              className="flex items-center justify-between py-3 border-b border-border last:border-0"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{sale.productName}</p>
                  <p className="text-sm text-muted-foreground">
                    {sale.quantity} × ৳{sale.totalPrice / sale.quantity}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-foreground">৳{sale.totalPrice}</p>
                <p className="text-xs text-profit">+৳{sale.profit} লাভ</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
