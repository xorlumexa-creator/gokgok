import { useState, useMemo } from 'react';
import { History, Package, X, ChevronRight, Calendar, Search, Trash2 } from 'lucide-react';
import { useStore } from '@/context/StoreContext';
import { Button } from '@/components/ui/button';
import { format, subMonths, isAfter } from 'date-fns';
import { bn } from 'date-fns/locale';
import { BulkSaleRecord } from '@/types/store';

export default function SellingHistory() {
  const { bulkSaleRecords, sales } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [viewingSale, setViewingSale] = useState<BulkSaleRecord | null>(null);
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');

  // Clean up records older than 2 months
  const twoMonthsAgo = subMonths(new Date(), 2);
  
  const validRecords = useMemo(() => {
    return bulkSaleRecords.filter(record => 
      isAfter(new Date(record.createdAt), twoMonthsAgo)
    );
  }, [bulkSaleRecords, twoMonthsAgo]);

  // Filter by date
  const filteredRecords = useMemo(() => {
    let records = validRecords;
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - 7);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    
    if (dateFilter === 'today') {
      records = records.filter(r => new Date(r.createdAt) >= today);
    } else if (dateFilter === 'week') {
      records = records.filter(r => new Date(r.createdAt) >= weekStart);
    } else if (dateFilter === 'month') {
      records = records.filter(r => new Date(r.createdAt) >= monthStart);
    }
    
    // Search filter
    if (searchTerm.trim()) {
      const lower = searchTerm.toLowerCase();
      records = records.filter(r => 
        r.productNames.some(name => name.toLowerCase().includes(lower))
      );
    }
    
    return records.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [validRecords, dateFilter, searchTerm]);

  // Group by date
  const salesByDate = useMemo(() => {
    return filteredRecords.reduce((acc, sale) => {
      const dateKey = format(new Date(sale.createdAt), 'yyyy-MM-dd');
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(sale);
      return acc;
    }, {} as Record<string, BulkSaleRecord[]>);
  }, [filteredRecords]);

  // Calculate totals
  const totals = useMemo(() => {
    return filteredRecords.reduce((acc, sale) => ({
      totalSales: acc.totalSales + sale.totalPrice,
      totalProfit: acc.totalProfit + sale.totalProfit,
      count: acc.count + 1
    }), { totalSales: 0, totalProfit: 0, count: 0 });
  }, [filteredRecords]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-primary/10 rounded-xl">
          <History className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">বিক্রির ইতিহাস</h1>
          <p className="text-muted-foreground">{totals.count}টি বিক্রি (২ মাসের মধ্যে)</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card-elevated p-4 bg-gradient-to-r from-primary/10 to-primary/5">
          <p className="text-sm text-muted-foreground">মোট বিক্রি</p>
          <p className="text-2xl font-bold text-primary">৳{totals.totalSales.toLocaleString()}</p>
        </div>
        <div className="card-elevated p-4 bg-gradient-to-r from-profit/10 to-profit/5">
          <p className="text-sm text-muted-foreground">মোট লাভ</p>
          <p className="text-2xl font-bold text-profit">৳{totals.totalProfit.toLocaleString()}</p>
        </div>
      </div>

      {/* Date Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          { key: 'all', label: 'সব' },
          { key: 'today', label: 'আজ' },
          { key: 'week', label: 'এই সপ্তাহ' },
          { key: 'month', label: 'এই মাস' },
        ].map((filter) => (
          <button
            key={filter.key}
            onClick={() => setDateFilter(filter.key as any)}
            className={`px-4 py-2 rounded-xl whitespace-nowrap transition-all ${
              dateFilter === filter.key
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {filter.label}
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
          placeholder="পণ্যের নাম দিয়ে খুঁজুন..."
          className="input-field pl-10"
        />
      </div>

      {/* Sales List */}
      <div className="space-y-4">
        {Object.keys(salesByDate).length > 0 ? (
          Object.entries(salesByDate).map(([dateKey, daySales]) => (
            <div key={dateKey} className="card-elevated p-4">
              <div className="flex items-center gap-2 mb-3 sticky top-0 bg-card py-1">
                <Calendar className="w-4 h-4 text-primary" />
                <p className="text-sm font-medium text-foreground">
                  {format(new Date(dateKey), 'dd MMMM yyyy (EEEE)', { locale: bn })}
                </p>
                <span className="text-xs text-muted-foreground ml-auto">
                  {daySales.length}টি বিক্রি
                </span>
              </div>
              <div className="space-y-2">
                {daySales.map((sale) => (
                  <button
                    key={sale.id}
                    onClick={() => setViewingSale(sale)}
                    className="w-full text-left p-3 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                          <span className="text-sm font-bold text-primary">{sale.serialNumber}</span>
                        </div>
                        <div>
                          <p className="font-medium text-sm text-foreground truncate max-w-[180px]">
                            {sale.productNames.join(', ')}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(sale.createdAt), 'hh:mm a', { locale: bn })} • ৳{sale.totalPrice.toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-profit">+৳{sale.totalProfit}</span>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>কোন বিক্রি পাওয়া যায়নি</p>
          </div>
        )}
      </div>

      {/* Sale Detail Modal */}
      {viewingSale && (
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-card rounded-2xl shadow-soft border border-border p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-foreground">
                বিক্রি #{viewingSale.serialNumber}
              </h2>
              <button onClick={() => setViewingSale(null)} className="p-2 hover:bg-muted rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="p-3 bg-muted/50 rounded-xl">
                <p className="text-sm text-muted-foreground">সময়</p>
                <p className="font-medium">
                  {format(new Date(viewingSale.createdAt), 'dd MMMM yyyy, hh:mm a', { locale: bn })}
                </p>
              </div>
              
              <div>
                <p className="text-sm font-medium mb-2">পণ্যসমূহ:</p>
                <div className="space-y-1">
                  {viewingSale.productNames.map((name, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
                      <Package className="w-4 h-4 text-primary" />
                      <span className="text-sm">{name}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="border-t border-border pt-4">
                <div className="flex justify-between mb-2">
                  <span className="text-muted-foreground">মোট মূল্য:</span>
                  <span className="font-bold text-lg">৳{viewingSale.totalPrice.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">লাভ:</span>
                  <span className="font-bold text-profit">৳{viewingSale.totalProfit.toLocaleString()}</span>
                </div>
              </div>
              
              <Button onClick={() => setViewingSale(null)} variant="outline" className="w-full">
                বন্ধ করুন
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Info about auto-deletion */}
      <div className="text-center text-xs text-muted-foreground p-4 bg-muted/30 rounded-xl">
        <Trash2 className="w-4 h-4 inline mr-1" />
        ২ মাসের পুরোনো বিক্রি স্বয়ংক্রিয়ভাবে মুছে যায়
      </div>
    </div>
  );
}
