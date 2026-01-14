import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  variant?: 'default' | 'profit' | 'due' | 'warning';
}

export function StatCard({ title, value, subtitle, icon: Icon, variant = 'default' }: StatCardProps) {
  const variantStyles = {
    default: 'bg-card',
    profit: 'bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-900/20 dark:to-emerald-800/10',
    due: 'bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-900/20 dark:to-red-800/10',
    warning: 'bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-900/20 dark:to-amber-800/10',
  };

  const iconStyles = {
    default: 'bg-primary/10 text-primary',
    profit: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    due: 'bg-red-500/10 text-red-600 dark:text-red-400',
    warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  };

  const valueStyles = {
    default: 'text-foreground',
    profit: 'text-emerald-600 dark:text-emerald-400',
    due: 'text-red-600 dark:text-red-400',
    warning: 'text-amber-600 dark:text-amber-400',
  };

  return (
    <div className={`stat-card ${variantStyles[variant]}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-muted-foreground font-medium mb-1">{title}</p>
          <p className={`text-2xl font-bold ${valueStyles[variant]}`}>{value}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`p-3 rounded-xl ${iconStyles[variant]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}
