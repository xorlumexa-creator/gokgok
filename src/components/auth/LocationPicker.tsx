import { useState } from 'react';
import { MapPin, Loader2, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { withTimeout } from '@/lib/asyncTimeout';

interface LocationPickerProps {
  address: string;
  onAddressChange: (address: string) => void;
}

export function LocationPicker({ address, onAddressChange }: LocationPickerProps) {
  const [loading, setLoading] = useState(false);

  const handleGetLocation = async () => {
    if (!navigator.geolocation) {
      toast({ title: "আপনার ব্রাউজার লোকেশন সাপোর্ট করে না", variant: "destructive" });
      return;
    }

    setLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          
          // Use reverse geocoding with OpenStreetMap Nominatim
          const response = await withTimeout(fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=bn`
          ), 6000, 'location.reverseGeocode');
          
          if (response.ok) {
            const data = await response.json();
            const addr = data.display_name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
            onAddressChange(addr);
            toast({ title: "ঠিকানা পাওয়া গেছে ✓" });
          } else {
            // Fallback to coordinates
            onAddressChange(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
          }
        } catch (error) {
          toast({ title: "ঠিকানা খুঁজে পাওয়া যায়নি", variant: "destructive" });
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        setLoading(false);
        if (error.code === error.PERMISSION_DENIED) {
          toast({ title: "লোকেশন অনুমতি দিন", variant: "destructive" });
        } else {
          toast({ title: "লোকেশন পাওয়া যায়নি", variant: "destructive" });
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium mb-2">
        <MapPin className="w-4 h-4 inline mr-1" />
        ঠিকানা
      </label>
      
      <div className="flex gap-2">
        <input
          type="text"
          value={address}
          onChange={(e) => onAddressChange(e.target.value)}
          placeholder="আপনার ঠিকানা লিখুন"
          className="input-field flex-1"
        />
        <Button
          type="button"
          variant="outline"
          onClick={handleGetLocation}
          disabled={loading}
          className="px-4 shrink-0"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Navigation className="w-5 h-5" />
          )}
        </Button>
      </div>
      
      <p className="text-xs text-muted-foreground">
        💡 বোতামে ক্লিক করলে আপনার বর্তমান ঠিকানা স্বয়ংক্রিয়ভাবে আসবে
      </p>
    </div>
  );
}
