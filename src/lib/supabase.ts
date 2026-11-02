import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://cvlfqofnavcxgdrzjyol.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_hcoiqTbP8cGVqwxC5g0iDg_Poe-V6sW';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const CHALO_WHATSAPP_NUMBER = '918319687057';
export const CHALO_WHATSAPP_DISPLAY = '+91 8319687057';

export type VehicleType = 'sedan' | 'suv' | 'auto' | 'bike' | 'tempo';
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

export interface DestinationItem {
  destination: string;
  km: number;
  bookable: boolean;
}

// 6 Outstation cities for Sedan and SUV (all bookable, in km order)
export const OUTSTATION_DESTINATIONS: DestinationItem[] = [
  { destination: 'Satna', km: 55, bookable: true },
  { destination: 'Prayagraj', km: 130, bookable: true },
  { destination: 'Khajuraho', km: 165, bookable: true },
  { destination: 'Varanasi', km: 230, bookable: true },
  { destination: 'Jabalpur', km: 240, bookable: true },
  { destination: 'Bhopal', km: 540, bookable: true },
];

export async function fetchDestinationsForVehicle(vehicle: VehicleType): Promise<DestinationItem[]> {
  if (vehicle === 'auto' || vehicle === 'bike') {
    const { data, error } = await supabase.rpc('list_destinations', { p_vehicle: vehicle });
    if (!error && Array.isArray(data)) {
      return [...data].sort((a, b) => (Number(a.km) || 0) - (Number(b.km) || 0));
    }
    return [];
  }
  return OUTSTATION_DESTINATIONS;
}

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
