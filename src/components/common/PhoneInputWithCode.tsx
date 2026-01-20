import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, Phone } from 'lucide-react';
import { countries, Country, getCountryByDialCode, defaultCountry } from '@/data/countries';

interface PhoneInputWithCodeProps {
  value: string;
  onChange: (fullPhone: string, countryCode: string) => void;
  placeholder?: string;
  required?: boolean;
  label?: string;
  showLabel?: boolean;
}

export function PhoneInputWithCode({
  value,
  onChange,
  placeholder = 'ফোন নম্বর',
  required = false,
  label = 'ফোন নম্বর',
  showLabel = true
}: PhoneInputWithCodeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<Country>(defaultCountry);
  const [localPhone, setLocalPhone] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Parse initial value
  useEffect(() => {
    if (value && value.startsWith('+')) {
      // Try to find matching country code
      for (const country of countries) {
        if (value.startsWith(country.dialCode)) {
          setSelectedCountry(country);
          setLocalPhone(value.slice(country.dialCode.length));
          return;
        }
      }
    }
  }, []);

  // Handle clicks outside dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredCountries = countries.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.dialCode.includes(search)
  );

  const handleCountrySelect = (country: Country) => {
    setSelectedCountry(country);
    setIsOpen(false);
    setSearch('');
    // Update full phone
    const fullPhone = localPhone ? `${country.dialCode}${localPhone}` : '';
    onChange(fullPhone, country.dialCode);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const phone = e.target.value.replace(/\D/g, '');
    setLocalPhone(phone);
    const fullPhone = phone ? `${selectedCountry.dialCode}${phone}` : '';
    onChange(fullPhone, selectedCountry.dialCode);
  };

  return (
    <div className="space-y-2">
      {showLabel && (
        <label className="block text-sm font-medium">
          <Phone className="w-4 h-4 inline mr-1" />
          {label} {required && '*'}
        </label>
      )}
      <div className="flex gap-2">
        {/* Country Code Selector */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2 px-3 py-3 bg-muted rounded-xl border border-border hover:border-primary/50 transition-colors min-w-[100px]"
          >
            <span className="text-lg">{selectedCountry.code === 'BD' ? '🇧🇩' : 
              selectedCountry.code === 'IN' ? '🇮🇳' : 
              selectedCountry.code === 'PK' ? '🇵🇰' : '🌍'}</span>
            <span className="text-sm font-medium">{selectedCountry.dialCode}</span>
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </button>

          {isOpen && (
            <div className="absolute top-full left-0 mt-1 w-64 max-h-60 overflow-auto bg-card border border-border rounded-xl shadow-lg z-50">
              <div className="sticky top-0 bg-card p-2 border-b border-border">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="দেশ খুঁজুন..."
                    className="w-full pl-9 pr-3 py-2 text-sm bg-muted rounded-lg border-0 focus:outline-none focus:ring-2 focus:ring-primary"
                    autoFocus
                  />
                </div>
              </div>
              <div className="py-1">
                {filteredCountries.map((country) => (
                  <button
                    key={country.code}
                    type="button"
                    onClick={() => handleCountrySelect(country)}
                    className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors text-left ${
                      selectedCountry.code === country.code ? 'bg-primary/10' : ''
                    }`}
                  >
                    <span className="text-lg">
                      {country.code === 'BD' ? '🇧🇩' : 
                       country.code === 'IN' ? '🇮🇳' : 
                       country.code === 'PK' ? '🇵🇰' :
                       country.code === 'US' ? '🇺🇸' :
                       country.code === 'GB' ? '🇬🇧' :
                       country.code === 'AE' ? '🇦🇪' :
                       country.code === 'SA' ? '🇸🇦' :
                       country.code === 'MY' ? '🇲🇾' :
                       country.code === 'SG' ? '🇸🇬' : '🌍'}
                    </span>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{country.name}</p>
                      <p className="text-xs text-muted-foreground">{country.dialCode}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Phone Number Input */}
        <input
          type="tel"
          value={localPhone}
          onChange={handlePhoneChange}
          placeholder={placeholder}
          className="input-field flex-1"
          required={required}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        উদাহরণ: {selectedCountry.dialCode}1XXXXXXXXX
      </p>
    </div>
  );
}
