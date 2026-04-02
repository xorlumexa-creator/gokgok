import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Store, Phone, Mail, MapPin, Lock, Eye, EyeOff, Loader2, ArrowLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useStore } from '@/context/StoreContext';
import { toast } from '@/hooks/use-toast';
import { LocationPicker } from '@/components/auth/LocationPicker';
import { PhoneInputWithCode } from '@/components/common/PhoneInputWithCode';

export default function Profile() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { storeInfo, setStoreInfo } = useStore();

  const [fullName, setFullName] = useState('');
  const [shopName, setShopName] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [whatsappCountryCode, setWhatsappCountryCode] = useState('+880');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showPasswordWarning, setShowPasswordWarning] = useState(false);

  useEffect(() => {
    const warning = sessionStorage.getItem('password_change_warning');
    if (warning === 'true') {
      setShowPasswordWarning(true);
      setShowPasswordSection(true);
      sessionStorage.removeItem('password_change_warning');
    }
  }, []);

  useEffect(() => {
    if (user) loadProfile();
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        setFullName(profile.full_name || user.user_metadata?.full_name || '');
        setShopName(profile.shop_name || '');
        setWhatsappNumber(profile.phone || '');
        setEmail(profile.email || '');
        setAddress(profile.address || '');
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          shop_name: shopName.trim(),
          phone: whatsappNumber.trim(),
          email: email.trim(),
          address: address.trim(),
        })
        .eq('user_id', user.id);

      if (error) throw error;

      if (storeInfo) {
        setStoreInfo({
          ...storeInfo,
          name: shopName.trim() || storeInfo.name,
          phone: whatsappNumber.trim(),
          location: address.trim(),
        });
      }

      await supabase.auth.updateUser({
        data: { full_name: fullName.trim() }
      });

      toast({ title: "প্রোফাইল আপডেট হয়েছে ✓" });
    } catch (error: any) {
      toast({ title: error.message || "সমস্যা হয়েছে", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast({ title: "পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "পাসওয়ার্ড মিলেনি!", variant: "destructive" });
      return;
    }
    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast({ title: "পাসওয়ার্ড পরিবর্তন হয়েছে ✓" });
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordSection(false);
    } catch (error: any) {
      toast({ title: error.message || "সমস্যা হয়েছে", variant: "destructive" });
    } finally {
      setPasswordLoading(false);
    }
  };

  if (loadingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold text-foreground">প্রোফাইল সেটিংস</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {showPasswordWarning && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="font-bold text-destructive">পাসওয়ার্ড পরিবর্তন করুন!</p>
              <p className="text-sm text-muted-foreground mt-1">
                মুখ স্ক্যানের মাধ্যমে লগইন করেছেন। অনুগ্রহ করে এখনই নতুন পাসওয়ার্ড সেট করুন এবং ভুলবেন না! 😄
              </p>
            </div>
          </div>
        )}

        <div className="card-elevated p-5 space-y-4">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            ব্যক্তিগত তথ্য
          </h2>

          <div>
            <label className="block text-sm font-medium mb-1.5">
              <User className="w-4 h-4 inline mr-1" />আপনার নাম
            </label>
            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="পুরো নাম" className="input-field" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">
              <Store className="w-4 h-4 inline mr-1" />দোকানের নাম
            </label>
            <input type="text" value={shopName} onChange={(e) => setShopName(e.target.value)} placeholder="আপনার দোকানের নাম" className="input-field" />
          </div>

          <PhoneInputWithCode
            value={whatsappNumber}
            onChange={(phone, countryCode) => {
              setWhatsappNumber(phone);
              setWhatsappCountryCode(countryCode);
            }}
            label="WhatsApp নম্বর"
          />

          <div>
            <label className="block text-sm font-medium mb-1.5">
              <Mail className="w-4 h-4 inline mr-1" />ইমেইল
            </label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" className="input-field" />
          </div>

          <LocationPicker address={address} onAddressChange={setAddress} />

          <Button onClick={handleSaveProfile} disabled={loading} className="w-full py-5 rounded-xl">
            {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
            সংরক্ষণ করুন
          </Button>
        </div>

        <div className="card-elevated p-5 space-y-4">
          <button onClick={() => setShowPasswordSection(!showPasswordSection)} className="w-full flex items-center justify-between">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" />
              পাসওয়ার্ড পরিবর্তন
            </h2>
            <span className="text-sm text-primary">{showPasswordSection ? 'বন্ধ করুন' : 'পরিবর্তন করুন'}</span>
          </button>

          {showPasswordSection && (
            <div className="space-y-4 pt-2">
              <div>
                <label className="block text-sm font-medium mb-1.5">নতুন পাসওয়ার্ড</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input type={showPassword ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" className="input-field pl-10 pr-10" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">পাসওয়ার্ড নিশ্চিত করুন</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" className="input-field pl-10" />
                </div>
              </div>

              <Button onClick={handleChangePassword} disabled={passwordLoading} className="w-full py-5 rounded-xl">
                {passwordLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                পাসওয়ার্ড আপডেট করুন
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
