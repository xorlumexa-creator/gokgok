import { Store } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WelcomeStepProps {
  storeName: string;
  onStoreNameChange: (name: string) => void;
  onNext: () => void;
}

export function WelcomeStep({ storeName, onStoreNameChange, onNext }: WelcomeStepProps) {
  const isValid = storeName.trim().length >= 2;

  return (
    <div className="animate-fade-in">
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-accent rounded-full flex items-center justify-center mx-auto mb-6">
          <Store className="w-10 h-10 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-3">
          আপনার দোকানের হিসাব সহজ করার জন্য স্বাগতম! 🎉
        </h1>
        <p className="text-muted-foreground text-lg">
          প্রথমে আপনার দোকানের নাম লিখুন এবং কয়েকটি পণ্য যোগ করুন।
          <br />
          <span className="text-primary font-medium">৩ দিন ফ্রি ট্রায়াল শুরু হবে।</span>
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            দোকানের নাম
          </label>
          <input
            type="text"
            value={storeName}
            onChange={(e) => onStoreNameChange(e.target.value)}
            placeholder="আপনার দোকানের নাম লিখুন"
            className="input-field text-lg"
            autoFocus
          />
          <p className="text-sm text-muted-foreground mt-2">
            উদাহরণ: রহিম স্টোর, করিম ভাইয়ের দোকান
          </p>
        </div>

        <Button
          onClick={onNext}
          disabled={!isValid}
          className="w-full btn-primary py-6 text-lg rounded-xl"
        >
          পরবর্তী ধাপে যান →
        </Button>
      </div>
    </div>
  );
}
