import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://cvlfqofnavcxgdrzjyol.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_hcoiqTbP8cGVqwxC5g0iDg_Poe-V6sW';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export type VehicleType = 'sedan' | 'suv';
export type TripType = 'one_way' | 'round_trip';

export interface RouteInfo {
  id: string;
  name: string;
  distanceKm: number;
  approxTime: string;
  popularDrop: string[];
}

export const FROM_CITY = 'Rewa';

export const REWA_PICKUP_SUGGESTIONS = [
  'Rewa Railway Station (Station Road)',
  'Civil Lines, Rewa',
  'Sirmour Chowk, Rewa',
  'APS University Gate, Rewa',
  'Bichhiya, Rewa',
  'Jayanti Kunj / Kothi Road, Rewa',
];

export const DESTINATIONS: RouteInfo[] = [
  {
    id: 'Satna',
    name: 'Satna',
    distanceKm: 55,
    approxTime: '1h 15m',
    popularDrop: ['Satna Junction Railway Station', 'Circuit House Road', 'Pateri', 'Sohawal'],
  },
  {
    id: 'Prayagraj',
    name: 'Prayagraj',
    distanceKm: 130,
    approxTime: '3h 00m',
    popularDrop: ['Prayagraj Junction', 'Civil Lines', 'Bamrauli Airport', 'Sangam Area'],
  },
  {
    id: 'Varanasi',
    name: 'Varanasi',
    distanceKm: 230,
    approxTime: '5h 00m',
    popularDrop: ['Varanasi Cantt Station', 'Lal Bahadur Shastri Airport', 'Godowlia / Ghats', 'BHU Campus'],
  },
  {
    id: 'Jabalpur',
    name: 'Jabalpur',
    distanceKm: 240,
    approxTime: '4h 45m',
    popularDrop: ['Jabalpur Railway Station', 'Dumna Airport', 'Civil Lines', 'Bhedaghat'],
  },
  {
    id: 'Khajuraho',
    name: 'Khajuraho',
    distanceKm: 165,
    approxTime: '3h 45m',
    popularDrop: ['Khajuraho Airport', 'Western Group of Temples', 'Khajuraho Railway Station', 'Sevagram'],
  },
  {
    id: 'Bhopal',
    name: 'Bhopal',
    distanceKm: 540,
    approxTime: '10h 30m',
    popularDrop: ['Bhopal Junction', 'Rani Kamlapati Station', 'Raja Bhoj Airport', 'MP Nagar'],
  },
];

export interface BookingResult {
  code: string;
  fare: number;
}

// Known base fares from database for fallback when network is interrupted
const FARE_MAP: Record<string, { sedan: number; suv: number }> = {
  Satna: { sedan: 800, suv: 1000 },
  Prayagraj: { sedan: 1500, suv: 1820 },
  Varanasi: { sedan: 2310, suv: 2990 },
  Jabalpur: { sedan: 2420, suv: 3120 },
  Khajuraho: { sedan: 3080, suv: 3960 },
  Bhopal: { sedan: 4290, suv: 5590 },
};

export function getEstimatedFare(dest: string, vehicle: VehicleType, trip: TripType): number {
  const rates = FARE_MAP[dest] || { sedan: 1500, suv: 1820 };
  const base = rates[vehicle] || 1500;
  if (trip === 'round_trip') {
    return Math.round(base * 1.9);
  }
  return base;
}
