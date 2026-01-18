import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Phone } from 'lucide-react';
import { countries, Country, defaultCountry } from '@/data/countries';

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  selectedCountry: Country;
  onCountryChange: (country: Country) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export function PhoneInput({
  value,
  onChange,
  selectedCountry,
  onCountryChange,
  placeholder = "ফোন নম্বর",
  autoFocus = false
}: PhoneInputProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredCountries = countries.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.nameLocal.includes(search) ||
    c.dialCode.includes(search)
  );

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="flex">
        {/* Country Code Selector */}
        <button
          type="button"
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-1 px-3 py-3 bg-muted rounded-l-lg border border-r-0 border-input hover:bg-muted/80 transition-colors min-w-[100px]"
        >
          <span className="text-xl">{selectedCountry.flag}</span>
          <span className="text-sm font-medium">{selectedCountry.dialCode}</span>
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </button>

        {/* Phone Input */}
        <div className="relative flex-1">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="tel"
            value={value}
            onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, ''))}
            placeholder={placeholder}
            className="w-full px-4 py-3 pl-10 rounded-r-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
            autoFocus={autoFocus}
          />
        </div>
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg z-50 max-h-64 overflow-hidden animate-fade-in">
          {/* Search */}
          <div className="p-2 border-b border-border">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="দেশ খুঁজুন..."
              className="w-full px-3 py-2 text-sm bg-muted rounded-lg border-0 focus:outline-none focus:ring-1 focus:ring-ring"
              autoFocus
            />
          </div>
          
          {/* Country List */}
          <div className="overflow-y-auto max-h-48">
            {filteredCountries.map((country) => (
              <button
                key={country.code}
                type="button"
                onClick={() => {
                  onCountryChange(country);
                  setShowDropdown(false);
                  setSearch('');
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors text-left ${
                  selectedCountry.code === country.code ? 'bg-primary/10' : ''
                }`}
              >
                <span className="text-xl">{country.flag}</span>
                <div className="flex-1">
                  <p className="font-medium text-sm">{country.nameLocal}</p>
                  <p className="text-xs text-muted-foreground">{country.name}</p>
                </div>
                <span className="text-sm text-muted-foreground">{country.dialCode}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
