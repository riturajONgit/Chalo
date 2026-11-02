import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { MapPin, Loader2, Building2 } from 'lucide-react';

interface PlaceItem {
  name: string;
  kind?: string;
  [key: string]: any;
}

interface PlaceSearchInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (val: string) => void;
  city: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  sublabel?: string;
  autoFocus?: boolean;
}

// Format raw backend kind, e.g. "bus_stand" -> "Bus stand", "area" -> "Area"
function formatPlaceKind(raw?: string): string {
  if (!raw) return 'Place';
  const clean = raw.replace(/_/g, ' ').trim();
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

export const PlaceSearchInput: React.FC<PlaceSearchInputProps> = ({
  id,
  label,
  value,
  onChange,
  city,
  placeholder,
  required = false,
  disabled = false,
  sublabel,
}) => {
  const [results, setResults] = useState<PlaceItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<any>(null);

  // Debounced search: 300 ms, min 2 characters
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const trimmed = value.trim();
    if (disabled || !city || trimmed.length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const { data, error } = await supabase.rpc('search_places', {
          p_city: city,
          p_query: trimmed,
        });

        if (error || !Array.isArray(data)) {
          setResults([]);
        } else {
          // Show up to 8 results in dropdown
          setResults(data.slice(0, 8));
          if (data.length > 0) {
            setIsOpen(true);
          }
        }
      } catch {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [value, city, disabled]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelectPlace = (placeName: string) => {
    onChange(placeName);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="flex items-center justify-between mb-1.5">
        <label htmlFor={id} className="block text-[11px] uppercase tracking-wider font-semibold text-[#A3A3A3]">
          {label} {required && <span className="text-[#F59E0B]">*</span>}
        </label>
        {sublabel && (
          <span className="text-[11px] text-[#737373]">{sublabel}</span>
        )}
      </div>

      <div className="relative">
        <input
          id={id}
          type="text"
          required={required}
          disabled={disabled}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full px-3.5 py-3 rounded-lg bg-[#0A0A0A] border border-[#262626] text-white placeholder-[#737373] text-sm focus:outline-none focus:ring-1 focus:ring-white min-h-[48px] disabled:opacity-50 transition-colors"
        />

        {isLoading && (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#F59E0B]">
            <Loader2 className="w-4 h-4 animate-spin" />
          </div>
        )}
      </div>

      {/* Places Dropdown */}
      {isOpen && results.length > 0 && !disabled && (
        <ul className="absolute z-50 left-0 right-0 mt-1 bg-[#141414] border border-[#262626] rounded-xl shadow-2xl max-h-64 overflow-y-auto divide-y divide-[#262626]/50 animate-in fade-in duration-150">
          {results.map((item, idx) => (
            <li key={`${item.name}-${idx}`}>
              <button
                type="button"
                onClick={() => handleSelectPlace(item.name)}
                className="w-full text-left px-3.5 py-2.5 hover:bg-white/5 active:bg-white/10 flex items-center justify-between gap-3 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <MapPin className="w-3.5 h-3.5 text-[#A3A3A3] group-hover:text-[#F59E0B] shrink-0 transition-colors" />
                  <span className="text-sm font-medium text-white truncate group-hover:text-white">
                    {item.name}
                  </span>
                </div>
                {item.kind && (
                  <span className="text-[11px] text-[#A3A3A3] group-hover:text-white/80 shrink-0 font-normal">
                    {formatPlaceKind(item.kind)}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
