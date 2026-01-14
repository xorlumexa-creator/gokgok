import { CheckCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CompletionStepProps {
  storeName: string;
  productCount: number;
  onGoToDashboard: () => void;
}

export function CompletionStep({ storeName, productCount, onGoToDashboard }: CompletionStepProps) {
  return (
    <div className="animate-fade-in text-center">
      <div className="w-24 h-24 bg-accent rounded-full flex items-center justify-center mx-auto mb-6">
        <CheckCircle className="w-12 h-12 text-primary" />
      </div>

      <h1 className="text-2xl font-bold text-foreground mb-4">
        আপনার দোকান সেটআপ হয়েছে! 🎊
      </h1>

      <div className="card-elevated p-6 mb-6 text-left">
        <div className="space-y-3">
          <div className="flex justify-between items-center py-2 border-b border-border">
            <span className="text-muted-foreground">দোকানের নাম</span>
            <span className="font-semibold text-foreground">{storeName}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-border">
            <span className="text-muted-foreground">প্রোডাক্ট যোগ হয়েছে</span>
            <span className="font-semibold text-foreground">{productCount}টি</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-muted-foreground">ফ্রি ট্রায়াল</span>
            <span className="font-semibold text-profit">১৫ দিন বাকি</span>
          </div>
        </div>
      </div>

      <p className="text-muted-foreground mb-6">
        এখন বিক্রি শুরু করুন এবং আপনার লাভ ও বাকি একদম সহজে ট্র্যাক করুন।
      </p>

      <Button
        onClick={onGoToDashboard}
        className="w-full btn-primary py-6 text-lg rounded-xl flex items-center justify-center gap-2"
      >
        ড্যাশবোর্ডে যান
        <ArrowRight className="w-5 h-5" />
      </Button>
    </div>
  );
}
