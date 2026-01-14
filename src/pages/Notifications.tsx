import { Bell, AlertTriangle, TrendingUp, Package, Info } from 'lucide-react';
import { useStore } from '@/context/StoreContext';

export default function Notifications() {
  const { products, customers, getDashboardStats } = useStore();
  const stats = getDashboardStats();

  const lowStockProducts = products.filter(p => p.stock <= 5);
  const customersWithDue = customers.filter(c => c.totalDue > 0);

  const notifications = [
    ...lowStockProducts.map(p => ({
      id: `stock-${p.id}`,
      type: 'warning' as const,
      icon: Package,
      title: `${p.name} স্টক কম`,
      description: `মাত্র ${p.stock}টি বাকি আছে। দ্রুত স্টক বাড়ান।`,
      time: 'এখন',
    })),
    ...customersWithDue.map(c => ({
      id: `due-${c.id}`,
      type: 'alert' as const,
      icon: AlertTriangle,
      title: `${c.name} বাকি`,
      description: `৳${c.totalDue.toLocaleString()} বাকি আছে।`,
      time: 'বাকি পরিশোধ করুন',
    })),
    {
      id: 'daily-summary',
      type: 'info' as const,
      icon: TrendingUp,
      title: 'আজকের সারসংক্ষেপ',
      description: `আজ ৳${stats.todaySales.toLocaleString()} বিক্রি হয়েছে এবং ৳${stats.todayProfit.toLocaleString()} লাভ হয়েছে।`,
      time: 'আজ',
    },
  ];

  const typeStyles = {
    warning: 'bg-warning/10 border-l-warning text-warning',
    alert: 'bg-due/10 border-l-due text-due',
    info: 'bg-primary/10 border-l-primary text-primary',
    success: 'bg-profit/10 border-l-profit text-profit',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-primary/10 rounded-xl">
          <Bell className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">বিজ্ঞপ্তি</h1>
          <p className="text-muted-foreground">{notifications.length}টি বিজ্ঞপ্তি</p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card-elevated p-4 text-center">
          <p className="text-3xl font-bold text-warning">{lowStockProducts.length}</p>
          <p className="text-sm text-muted-foreground">স্টক কম আছে</p>
        </div>
        <div className="card-elevated p-4 text-center">
          <p className="text-3xl font-bold text-due">{customersWithDue.length}</p>
          <p className="text-sm text-muted-foreground">বাকিদার আছে</p>
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`card-elevated p-4 border-l-4 ${typeStyles[notification.type]}`}
          >
            <div className="flex items-start gap-4">
              <div className={`p-2 rounded-lg ${
                notification.type === 'warning' ? 'bg-warning/10' :
                notification.type === 'alert' ? 'bg-due/10' :
                'bg-primary/10'
              }`}>
                <notification.icon className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground">{notification.title}</h3>
                  <span className="text-xs text-muted-foreground">{notification.time}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {notification.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {notifications.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>কোন বিজ্ঞপ্তি নেই</p>
        </div>
      )}

      {/* Tips Section */}
      <div className="card-elevated p-4 bg-accent">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-primary mt-0.5" />
          <div>
            <h3 className="font-semibold text-foreground mb-1">টিপস</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• প্রতিদিন বিক্রি রেকর্ড রাখুন</li>
              <li>• স্টক কম হলে দ্রুত অর্ডার করুন</li>
              <li>• বাকি নিয়মিত আদায় করুন</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
