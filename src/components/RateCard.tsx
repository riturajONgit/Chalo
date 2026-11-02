import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { formatRupees } from '../utils/format';
import { SedanIcon, SuvIcon } from './VehicleIcons';
import { MapPin, ArrowRight, Check } from 'lucide-react';

interface DestinationRate {
  destination: string;
  distanceKm: number;
  approxTime: string;
  sedanOneWay: number;
  sedanRoundTrip: number;
  suvOneWay: number;
  suvRoundTrip: number;
}

// Fallback baseline fares computed from quote_fare RPC
const DEFAULT_RATES: DestinationRate[] = [
  {
    destination: 'Satna',
    distanceKm: 55,
    approxTime: '1h 15m',
    sedanOneWay: 1650,
    sedanRoundTrip: 2170,
    suvOneWay: 2050,
    suvRoundTrip: 2510,
  },
  {
    destination: 'Prayagraj',
    distanceKm: 130,
    approxTime: '3h 00m',
    sedanOneWay: 3300,
    sedanRoundTrip: 3660,
    suvOneWay: 4200,
    suvRoundTrip: 4440,
  },
  {
    destination: 'Khajuraho',
    distanceKm: 165,
    approxTime: '3h 45m',
    sedanOneWay: 6560,
    sedanRoundTrip: 6960,
    suvOneWay: 8520,
    suvRoundTrip: 8640,
  },
  {
    destination: 'Varanasi',
    distanceKm: 230,
    approxTime: '5h 00m',
    sedanOneWay: 5020,
    sedanRoundTrip: 5420,
    suvOneWay: 6490,
    suvRoundTrip: 6680,
  },
  {
    destination: 'Jabalpur',
    distanceKm: 240,
    approxTime: '4h 45m',
    sedanOneWay: 5240,
    sedanRoundTrip: 5640,
    suvOneWay: 6780,
    suvRoundTrip: 6960,
  },
  {
    destination: 'Bhopal',
    distanceKm: 540,
    approxTime: '10h 30m',
    sedanOneWay: 8980,
    sedanRoundTrip: 9380,
    suvOneWay: 11710,
    suvRoundTrip: 11720,
  },
];

interface RateCardProps {
  onSelectRoute?: (destination: string, vehicle: 'sedan' | 'suv', trip: 'one_way' | 'round_trip') => void;
  selectedDestination?: string;
}

export const RateCard: React.FC<RateCardProps> = ({ onSelectRoute, selectedDestination }) => {
  const [rates, setRates] = useState<DestinationRate[]>(DEFAULT_RATES);

  // Fetch live quotes from quote_fare RPC for all 6 outstation destinations
  useEffect(() => {
    let isMounted = true;
    async function loadAllQuotes() {
      try {
        const updated = await Promise.all(
          DEFAULT_RATES.map(async (item) => {
            try {
              const [s1, s2, u1, u2] = await Promise.all([
                supabase.rpc('quote_fare', { p_from: 'Rewa', p_to: item.destination, p_vehicle: 'sedan', p_trip: 'one_way' }),
                supabase.rpc('quote_fare', { p_from: 'Rewa', p_to: item.destination, p_vehicle: 'sedan', p_trip: 'round_trip' }),
                supabase.rpc('quote_fare', { p_from: 'Rewa', p_to: item.destination, p_vehicle: 'suv', p_trip: 'one_way' }),
                supabase.rpc('quote_fare', { p_from: 'Rewa', p_to: item.destination, p_vehicle: 'suv', p_trip: 'round_trip' }),
              ]);
              return {
                ...item,
                sedanOneWay: typeof s1.data === 'number' ? s1.data : item.sedanOneWay,
                sedanRoundTrip: typeof s2.data === 'number' ? s2.data : item.sedanRoundTrip,
                suvOneWay: typeof u1.data === 'number' ? u1.data : item.suvOneWay,
                suvRoundTrip: typeof u2.data === 'number' ? u2.data : item.suvRoundTrip,
              };
            } catch {
              return item;
            }
          })
        );
        if (isMounted) {
          setRates(updated);
        }
      } catch {
        // Keep defaults
      }
    }
    loadAllQuotes();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section className="space-y-4 pt-2">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-1 pb-1">
        <div>
          <span className="text-[11px] uppercase tracking-wider font-semibold text-[#A3A3A3] block">
            Guaranteed Pricing
          </span>
          <h2 className="text-[20px] font-bold text-white tracking-tight">
            Direct Outstation Rate Card
          </h2>
        </div>
        <p className="text-xs text-[#A3A3A3]">
          All-in fares with tolls, state tax & driver allowance included
        </p>
      </div>

      {/* Stacked on mobile, 3-column grid on desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rates.map((item) => {
          const isSelected = selectedDestination === item.destination;

          return (
            <div
              key={item.destination}
              className={`rounded-xl bg-[#141414] border p-4.5 space-y-4 transition-all shadow-md ${
                isSelected ? 'border-white ring-1 ring-white' : 'border-[#262626] hover:border-neutral-600'
              }`}
            >
              {/* Destination Header */}
              <div className="flex items-start justify-between gap-2 border-b border-[#262626] pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[#F59E0B] shrink-0">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white leading-tight">
                      Rewa ➔ {item.destination}
                    </h3>
                    <p className="text-[11px] text-[#A3A3A3] mt-0.5">
                      {item.distanceKm} km · {item.approxTime}
                    </p>
                  </div>
                </div>

                {isSelected && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-black">
                    <Check className="w-3 h-3 stroke-[3]" /> Selected
                  </span>
                )}
              </div>

              {/* Sedan Rates */}
              <div className="space-y-1.5 bg-[#0A0A0A] border border-[#262626] rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <SedanIcon className="w-6 h-3.5 text-white" />
                    <span className="text-xs font-bold text-white">Sedan</span>
                  </div>
                  <span className="text-[10px] text-[#A3A3A3]">Dzire, Etios (4-seater)</span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#262626]/60">
                  <div>
                    <span className="text-[10px] text-[#A3A3A3] block uppercase tracking-wider">One Way</span>
                    <span className="text-sm font-bold text-[#F59E0B] tabular-nums">
                      {formatRupees(item.sedanOneWay)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-[#A3A3A3] block uppercase tracking-wider">Round Trip</span>
                    <span className="text-sm font-bold text-[#F59E0B] tabular-nums">
                      {formatRupees(item.sedanRoundTrip)}
                    </span>
                  </div>
                </div>
              </div>

              {/* SUV Rates */}
              <div className="space-y-1.5 bg-[#0A0A0A] border border-[#262626] rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <SuvIcon className="w-6 h-3.5 text-white" />
                    <span className="text-xs font-bold text-white">SUV</span>
                  </div>
                  <span className="text-[10px] text-[#A3A3A3]">Ertiga, Innova (6-7 seater)</span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#262626]/60">
                  <div>
                    <span className="text-[10px] text-[#A3A3A3] block uppercase tracking-wider">One Way</span>
                    <span className="text-sm font-bold text-[#F59E0B] tabular-nums">
                      {formatRupees(item.suvOneWay)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-[#A3A3A3] block uppercase tracking-wider">Round Trip</span>
                    <span className="text-sm font-bold text-[#F59E0B] tabular-nums">
                      {formatRupees(item.suvRoundTrip)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Select Button */}
              {onSelectRoute && (
                <button
                  type="button"
                  onClick={() => onSelectRoute(item.destination, 'sedan', 'one_way')}
                  className="w-full py-2.5 px-3 rounded-lg bg-transparent hover:bg-white/5 active:bg-white/10 border border-white/20 text-xs font-semibold text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>Book ride to {item.destination}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};
