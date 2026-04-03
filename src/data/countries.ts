export interface Country {
  code: string;
  name: string;
  nameLocal: string;
  dialCode: string;
  flag: string;
  currency: string;
  currencySymbol: string;
  proPrice: number;
  premiumPrice: number;
  ultraPrice: number;
  paymentMethods: ('bkash' | 'card' | 'razorpay')[];
}

export const countries: Country[] = [
  {
    code: 'BD', name: 'Bangladesh', nameLocal: 'বাংলাদেশ', dialCode: '+880', flag: '🇧🇩',
    currency: 'BDT', currencySymbol: '৳', proPrice: 80, premiumPrice: 150, ultraPrice: 200, paymentMethods: ['bkash'],
  },
  {
    code: 'IN', name: 'India', nameLocal: 'ভারত', dialCode: '+91', flag: '🇮🇳',
    currency: 'INR', currencySymbol: '₹', proPrice: 80, premiumPrice: 150, ultraPrice: 200, paymentMethods: ['card'],
  },
  {
    code: 'PK', name: 'Pakistan', nameLocal: 'পাকিস্তান', dialCode: '+92', flag: '🇵🇰',
    currency: 'PKR', currencySymbol: '₨', proPrice: 80, premiumPrice: 150, ultraPrice: 200, paymentMethods: ['card'],
  },
  {
    code: 'US', name: 'United States', nameLocal: 'যুক্তরাষ্ট্র', dialCode: '+1', flag: '🇺🇸',
    currency: 'USD', currencySymbol: '$', proPrice: 1, premiumPrice: 2, ultraPrice: 3, paymentMethods: ['card'],
  },
  {
    code: 'GB', name: 'United Kingdom', nameLocal: 'যুক্তরাজ্য', dialCode: '+44', flag: '🇬🇧',
    currency: 'USD', currencySymbol: '$', proPrice: 1, premiumPrice: 2, ultraPrice: 3, paymentMethods: ['card'],
  },
  {
    code: 'AE', name: 'UAE', nameLocal: 'সংযুক্ত আরব আমিরাত', dialCode: '+971', flag: '🇦🇪',
    currency: 'USD', currencySymbol: '$', proPrice: 1, premiumPrice: 2, ultraPrice: 3, paymentMethods: ['card'],
  },
  {
    code: 'SA', name: 'Saudi Arabia', nameLocal: 'সৌদি আরব', dialCode: '+966', flag: '🇸🇦',
    currency: 'USD', currencySymbol: '$', proPrice: 1, premiumPrice: 2, ultraPrice: 3, paymentMethods: ['card'],
  },
  {
    code: 'MY', name: 'Malaysia', nameLocal: 'মালয়েশিয়া', dialCode: '+60', flag: '🇲🇾',
    currency: 'USD', currencySymbol: '$', proPrice: 1, premiumPrice: 2, ultraPrice: 3, paymentMethods: ['card'],
  },
  {
    code: 'SG', name: 'Singapore', nameLocal: 'সিঙ্গাপুর', dialCode: '+65', flag: '🇸🇬',
    currency: 'USD', currencySymbol: '$', proPrice: 1, premiumPrice: 2, ultraPrice: 3, paymentMethods: ['card'],
  },
  {
    code: 'QA', name: 'Qatar', nameLocal: 'কাতার', dialCode: '+974', flag: '🇶🇦',
    currency: 'USD', currencySymbol: '$', proPrice: 1, premiumPrice: 2, ultraPrice: 3, paymentMethods: ['card'],
  },
  {
    code: 'KW', name: 'Kuwait', nameLocal: 'কুয়েত', dialCode: '+965', flag: '🇰🇼',
    currency: 'USD', currencySymbol: '$', proPrice: 1, premiumPrice: 2, ultraPrice: 3, paymentMethods: ['card'],
  },
  {
    code: 'OM', name: 'Oman', nameLocal: 'ওমান', dialCode: '+968', flag: '🇴🇲',
    currency: 'USD', currencySymbol: '$', proPrice: 1, premiumPrice: 2, ultraPrice: 3, paymentMethods: ['card'],
  },
];

export const getCountryByCode = (code: string): Country | undefined => countries.find(c => c.code === code);
export const getCountryByDialCode = (dialCode: string): Country | undefined => countries.find(c => c.dialCode === dialCode);
export const defaultCountry = countries[0];
