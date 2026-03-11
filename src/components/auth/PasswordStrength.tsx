import { useMemo } from 'react';

interface Props {
  password: string;
}

export function PasswordStrength({ password }: Props) {
  const { score, label, color } = useMemo(() => {
    if (!password) return { score: 0, label: '', color: '' };
    
    let s = 0;
    if (password.length >= 8) s++;
    if (password.length >= 12) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[a-zA-Z]/.test(password)) s++;
    if (/[^a-zA-Z0-9]/.test(password)) s++;

    if (s <= 1) return { score: 20, label: 'খুব দুর্বল', color: 'bg-destructive' };
    if (s === 2) return { score: 40, label: 'দুর্বল', color: 'bg-orange-500' };
    if (s === 3) return { score: 60, label: 'মাঝারি', color: 'bg-yellow-500' };
    if (s === 4) return { score: 80, label: 'শক্তিশালী', color: 'bg-emerald-500' };
    return { score: 100, label: 'অত্যন্ত শক্তিশালী', color: 'bg-emerald-600' };
  }, [password]);

  if (!password) return null;

  const hasMinLength = password.length >= 8;
  const hasNumber = /[0-9]/.test(password);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${color}`}
            style={{ width: `${score}%` }}
          />
        </div>
        <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">{label}</span>
      </div>
      <div className="flex gap-3 text-xs">
        <span className={hasMinLength ? 'text-emerald-600' : 'text-muted-foreground'}>
          {hasMinLength ? '✓' : '○'} ৮+ অক্ষর
        </span>
        <span className={hasNumber ? 'text-emerald-600' : 'text-muted-foreground'}>
          {hasNumber ? '✓' : '○'} ১টি সংখ্যা
        </span>
      </div>
    </div>
  );
}
