'use client';

import { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface PhoneNumberResult {
  phoneNumber: string;
  friendlyName: string;
  locality: string;
  region: string;
  isoCountry: string;
  capabilities: {
    voice: boolean;
    sms: boolean;
    mms: boolean;
  };
}

interface PhoneNumberSelectorProps {
  selectedPhoneNumber: string | null;
  selectedCountryCode: string;
  onPhoneNumberSelect: (phoneNumber: string) => void;
  onCountryCodeChange: (countryCode: string) => void;
}

const COUNTRIES = [
  { code: 'US', label: 'US (+1)', placeholder: 'e.g., 415', digitsHint: 'Enter a 3-digit area code' },
  { code: 'MX', label: 'Mexico (+52)', placeholder: 'e.g., 664', digitsHint: 'Enter your city\'s prefix digits' },
];

export function PhoneNumberSelector({
  selectedPhoneNumber,
  selectedCountryCode,
  onPhoneNumberSelect,
  onCountryCodeChange,
}: PhoneNumberSelectorProps) {
  const [digits, setDigits] = useState('');
  const [results, setResults] = useState<PhoneNumberResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const currentCountry = COUNTRIES.find((c) => c.code === selectedCountryCode) || COUNTRIES[0];

  const handleSearch = async () => {
    if (!digits || digits.length < 2) {
      setSearchError('Please enter at least 2 digits');
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    setResults([]);
    setHasSearched(true);

    try {
      const response = await fetch('/api/twilio/search-numbers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          countryCode: selectedCountryCode,
          digits,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to search numbers');
      }

      const data = await response.json();
      setResults(data.results || []);
    } catch (err) {
      setSearchError(
        err instanceof Error ? err.message : 'Failed to search phone numbers'
      );
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Choose a Phone Number</Label>
        <p className="text-sm text-muted-foreground/80 mt-1">
          Search for available phone numbers in your area
        </p>
      </div>

      {/* Country selector */}
      <div className="space-y-2">
        <Label htmlFor="country-select">Country</Label>
        <select
          id="country-select"
          value={selectedCountryCode}
          onChange={(e) => {
            onCountryCodeChange(e.target.value);
            setResults([]);
            setHasSearched(false);
            setSearchError(null);
          }}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {COUNTRIES.map((country) => (
            <option key={country.code} value={country.code}>
              {country.label}
            </option>
          ))}
        </select>
      </div>

      {/* Search input */}
      <div className="space-y-2">
        <Label htmlFor="digits-input">{currentCountry.digitsHint}</Label>
        <div className="flex gap-2">
          <Input
            id="digits-input"
            placeholder={currentCountry.placeholder}
            value={digits}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '');
              setDigits(val);
            }}
            onKeyDown={handleKeyDown}
            maxLength={10}
          />
          <Button
            onClick={handleSearch}
            disabled={isSearching || digits.length < 2}
            type="button"
          >
            {isSearching ? 'Searching...' : 'Search'}
          </Button>
        </div>
      </div>

      {/* Error */}
      {searchError && (
        <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-3">
          <p className="text-sm text-red-500">{searchError}</p>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-2">
          <Label>Available Numbers ({results.length})</Label>
          <div className="max-h-64 overflow-y-auto space-y-1">
            {results.map((num) => (
              <button
                key={num.phoneNumber}
                type="button"
                onClick={() => onPhoneNumberSelect(num.phoneNumber)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  selectedPhoneNumber === num.phoneNumber
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-mono font-medium text-sm">
                      {num.phoneNumber}
                    </div>
                    {(num.locality || num.region) && (
                      <div className="text-xs text-muted-foreground/80 mt-0.5">
                        {[num.locality, num.region].filter(Boolean).join(', ')}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1.5">
                    {num.capabilities.voice && (
                      <span className="text-xs bg-muted px-1.5 py-0.5 rounded">Voice</span>
                    )}
                    {num.capabilities.sms && (
                      <span className="text-xs bg-muted px-1.5 py-0.5 rounded">SMS</span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {hasSearched && !isSearching && results.length === 0 && !searchError && (
        <div className="rounded-lg border border-dashed p-6 text-center">
          <p className="text-sm text-muted-foreground/80">
            No numbers found for &quot;{digits}&quot;. Try different digits.
          </p>
        </div>
      )}

      {/* Skip option */}
      {!selectedPhoneNumber && (
        <p className="text-xs text-muted-foreground/80 text-center">
          You can skip this step and a number will be assigned automatically.
        </p>
      )}
    </div>
  );
}
