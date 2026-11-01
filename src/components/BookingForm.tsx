import React, { useState, useEffect, useCallback, useId } from 'react';
import { 
  Car, 
  MapPin, 
  Calendar, 
  User, 
  Phone, 
  Loader2, 
  Check, 
  AlertCircle, 
  ArrowRight, 
  ShieldCheck, 
  Clock, 
  Sparkles,
  RefreshCw,
  Users,
  Luggage,
  Info,
  Crosshair,
  CheckCircle2
} from 'lucide-react';
import { 
  supabase, 
  DESTINATIONS, 
  FROM_CITY, 
  VehicleType, 
  TripType
} from '../lib/supabase';
import { formatRupees, isValidIndianPhone, cleanPhone, formatFriendlyDate } from '../utils/format';

interface BookingFormProps {
  onSuccess: (bookingData: {
    bookingCode: string;
    fare: number;
    riderName: string;
    riderPhone: string;
    pickupAddress: string;
    dropAddress: string;
    fromCity: string;
    toCity: string;
    vehicleType: VehicleType;
    tripType: TripType;
    pickupWhen: string;
    pickupLat?: number | null;
    pickupLng?: number | null;
  }) => void;
  onOpenCheckBooking?: () => void;
}

export const BookingForm: React.FC<BookingFormProps> = ({ onSuccess, onOpenCheckBooking }) => {
  const fromCityId = useId();
  const toCityId = useId();
  const pickupTimeId = useId();
  const pickupAddressId = useId();
  const dropAddressId = useId();
  const riderNameId = useId();
  const riderPhoneId = useId();

  // Form State
  const [toCity, setToCity] = useState<string>('Prayagraj');
  const [vehicleType, setVehicleType] = useState<VehicleType>('sedan');
  const [tripType, setTripType] = useState<TripType>('one_way');
  const [pickupAddress, setPickupAddress] = useState<string>('');
  const [dropAddress, setDropAddress] = useState<string>('');
  
  // Geolocation State
  const [pickupCoords, setPickupCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Tapping "Use my current location" calls navigator.geolocation.getCurrentPosition with enableHighAccuracy: true and 15s timeout
  const handleGetCurrentLocation = () => {
    setLocationError(null);
    if (!navigator.geolocation) {
      setLocationError("Couldn't get your location. Please type your address.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setPickupCoords({ lat, lng });
        setIsLocating(false);
        setLocationError(null);
        // Keep typed address as it is. If empty, fill with "Pinned location"
        setPickupAddress((current) => current.trim().length > 0 ? current : 'Pinned location');
      },
      (err) => {
        console.warn('Geolocation error:', err);
        setIsLocating(false);
        setLocationError("Couldn't get your location. Please type your address.");
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
      }
    );
  };

  const handleClearLocation = () => {
    setPickupCoords(null);
    setLocationError(null);
    if (pickupAddress === 'Pinned location') {
      setPickupAddress('');
    }
  };
  
  // Default pickup time: 2 hours from now, formatted for datetime-local
  const getDefaultPickupTime = () => {
    const d = new Date();
    d.setHours(d.getHours() + 2);
    d.setMinutes(0);
    d.setSeconds(0);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const getMinPickupTime = () => {
    const d = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const [pickupWhen, setPickupWhen] = useState<string>(getDefaultPickupTime());
  const [riderName, setRiderName] = useState<string>('');
  const [riderPhone, setRiderPhone] = useState<string>('');

  // Fare State
  const [fare, setFare] = useState<number | null>(null);
  const [fareLoading, setFareLoading] = useState<boolean>(false);
  const [fareError, setFareError] = useState<string | null>(null);

  // Submit State
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Active destination route data
  const activeRoute = DESTINATIONS.find((d) => d.id === toCity) || DESTINATIONS[0];

  // Fetch live fare quote via RPC - strictly required from quote_fare RPC, never hardcoded
  const fetchFare = useCallback(async (dest: string, vehicle: VehicleType, trip: TripType) => {
    setFareLoading(true);
    setFareError(null);
    try {
      const { data, error } = await supabase.rpc('quote_fare', {
        p_from: FROM_CITY,
        p_to: dest,
        p_vehicle: vehicle,
        p_trip: trip,
      });

      if (error || data === null || data === undefined) {
        throw new Error('Fare unavailable. Please check your connection and try again.');
      }

      const numericFare = typeof data === 'number' ? data : Number(data);
      if (isNaN(numericFare) || numericFare <= 0) {
        throw new Error('Fare unavailable. Please check your connection and try again.');
      }
      setFare(numericFare);
      setFareError(null);
    } catch (err: any) {
      setFare(null);
      setFareError('Fare unavailable. Please check your connection and try again.');
    } finally {
      setFareLoading(false);
    }
  }, []);

  // Update fare whenever destination, vehicle, or trip changes
  useEffect(() => {
    fetchFare(toCity, vehicleType, tripType);
  }, [toCity, vehicleType, tripType, fetchFare]);

  // Validation
  const cleanedPhone = cleanPhone(riderPhone);
  const isPhoneValid = isValidIndianPhone(cleanedPhone);
  const isNameValid = riderName.trim().length >= 2;
  const isPickupValid = pickupAddress.trim().length > 0;
  const isDropValid = dropAddress.trim().length >= 3;
  
  const isTimeValid = (() => {
    if (!pickupWhen) return false;
    const pickedDate = new Date(pickupWhen);
    return !isNaN(pickedDate.getTime()) && pickedDate.getTime() > Date.now() - 60000;
  })();

  const isFormValid = 
    Boolean(toCity) &&
    isPickupValid &&
    isDropValid &&
    isNameValid &&
    isPhoneValid &&
    isTimeValid &&
    fare !== null &&
    !fareError &&
    !fareLoading &&
    !isSubmitting;

  // Validation helper message
  const getValidationHint = () => {
    if (!isPickupValid) return 'Enter pickup address';
    if (!isDropValid) return `Enter drop address in ${toCity}`;
    if (!isTimeValid) return 'Select a valid future pickup time';
    if (!isNameValid) return 'Enter your name';
    if (!isPhoneValid) return 'Enter a valid 10-digit Indian phone number';
    if (fareLoading) return 'Calculating fare...';
    if (fareError) return fareError;
    if (fare === null) return 'Fare unavailable. Please check your connection and try again.';
    return null;
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || fare === null || Boolean(fareError)) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const isoTimestamp = new Date(pickupWhen).toISOString();

      const { data, error } = await supabase.rpc('create_booking_with_location', {
        p_name: riderName.trim(),
        p_phone: cleanedPhone,
        p_pickup: pickupAddress.trim(),
        p_drop: dropAddress.trim(),
        p_from: FROM_CITY,
        p_to: toCity,
        p_vehicle: vehicleType,
        p_trip: tripType,
        p_when: isoTimestamp,
        p_lat: pickupCoords ? pickupCoords.lat : null,
        p_lng: pickupCoords ? pickupCoords.lng : null,
      });

      if (error) {
        throw new Error(error.message || 'Booking could not be created');
      }

      // Supabase RPC create_booking_with_location returns table with code and fare
      const bookingRecord = Array.isArray(data) ? data[0] : data;
      if (!bookingRecord || !bookingRecord.code) {
        throw new Error('Booking confirmed but no reference code was received. Please contact support.');
      }

      const finalFare = typeof bookingRecord.fare === 'number' ? bookingRecord.fare : fare;

      onSuccess({
        bookingCode: bookingRecord.code,
        fare: finalFare,
        riderName: riderName.trim(),
        riderPhone: cleanedPhone,
        pickupAddress: pickupAddress.trim(),
        dropAddress: dropAddress.trim(),
        fromCity: FROM_CITY,
        toCity,
        vehicleType,
        tripType,
        pickupWhen: isoTimestamp,
        pickupLat: pickupCoords ? pickupCoords.lat : null,
        pickupLng: pickupCoords ? pickupCoords.lng : null,
      });
    } catch (err: any) {
      console.warn('Booking submission notice:', err?.message || err);
      setSubmitError(err?.message || 'Something went wrong while booking. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick Time Shortcut Helpers
  const setQuickTime = (hoursFromNow: number) => {
    const d = new Date();
    d.setHours(d.getHours() + hoursFromNow);
    d.setMinutes(0);
    d.setSeconds(0);
    const pad = (n: number) => n.toString().padStart(2, '0');
    setPickupWhen(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
  };

  const setTomorrowMorning = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(8, 0, 0, 0);
    const pad = (n: number) => n.toString().padStart(2, '0');
    setPickupWhen(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-xl mx-auto space-y-4 pb-8">
      {/* Check my booking banner link */}
      {onOpenCheckBooking && (
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#141414] border border-[#262626] text-xs shadow-md">
          <div className="flex items-center gap-2 text-[#A3A3A3] font-medium">
            <span className="w-2 h-2 rounded-full bg-[#F59E0B] animate-pulse" />
            <span className="text-white">Already have a booking?</span>
          </div>
          <button
            type="button"
            onClick={onOpenCheckBooking}
            className="text-white hover:text-neutral-300 font-bold underline underline-offset-4 cursor-pointer inline-flex items-center gap-1.5 min-h-[44px] px-2 py-1 transition-colors"
          >
            <span>Check my booking</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#F59E0B]" />
          </button>
        </div>
      )}

      {/* Route & Trip Type Section */}
      <div className="bg-[#141414] border border-[#262626] rounded-2xl p-4 sm:p-5 space-y-4">
        {/* Origin & Destination */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[20px] font-bold tracking-tight text-white">
              Trip Route
            </h2>
            <span className="text-xs text-[#A3A3A3]">
              {activeRoute.distanceKm} km · approx {activeRoute.approxTime}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Origin (Always Rewa) */}
            <div>
              <label htmlFor={fromCityId} className="block text-[11px] uppercase tracking-wider font-semibold text-[#A3A3A3] mb-1.5">
                From City
              </label>
              <div className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl bg-[#0A0A0A] border border-[#262626] text-white min-h-[48px]">
                <div className="w-2.5 h-2.5 rounded-full bg-white shrink-0" />
                <span id={fromCityId} className="text-sm font-semibold">Rewa, Madhya Pradesh</span>
              </div>
            </div>

            {/* Destination Dropdown */}
            <div>
              <label htmlFor={toCityId} className="block text-[11px] uppercase tracking-wider font-semibold text-[#A3A3A3] mb-1.5">
                Destination (To City)
              </label>
              <div className="relative">
                <select
                  id={toCityId}
                  value={toCity}
                  onChange={(e) => {
                    setToCity(e.target.value);
                    setDropAddress(''); // reset drop address for new city
                  }}
                  className="w-full px-3.5 py-3 rounded-xl bg-[#0A0A0A] border border-[#262626] text-white font-medium text-sm focus:outline-none focus:ring-1 focus:ring-white min-h-[48px] appearance-none cursor-pointer pr-10"
                >
                  {DESTINATIONS.map((dest) => (
                    <option key={dest.id} value={dest.id} className="bg-[#141414] text-white">
                      {dest.name} ({dest.distanceKm} km)
                    </option>
                  ))}
                </select>
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#A3A3A3]">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Trip Type Toggle (One Way vs Round Trip) */}
        <div>
          <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#A3A3A3] mb-1.5">
            Trip Type
          </label>
          <div className="grid grid-cols-2 gap-2 p-1 bg-[#0A0A0A] rounded-xl border border-[#262626]">
            <button
              type="button"
              onClick={() => setTripType('one_way')}
              className={`min-h-[44px] px-4 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                tripType === 'one_way'
                  ? 'bg-white text-black font-bold shadow-sm'
                  : 'text-[#A3A3A3] hover:text-white'
              }`}
            >
              <span>One Way Drop</span>
            </button>
            <button
              type="button"
              onClick={() => setTripType('round_trip')}
              className={`min-h-[44px] px-4 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                tripType === 'round_trip'
                  ? 'bg-white text-black font-bold shadow-sm'
                  : 'text-[#A3A3A3] hover:text-white'
              }`}
            >
              <span>Round Trip (Return)</span>
            </button>
          </div>
        </div>

        {/* Vehicle Selection Toggle */}
        <div>
          <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#A3A3A3] mb-1.5">
            Vehicle Class
          </label>
          <div className="grid grid-cols-2 gap-3">
            {/* Sedan */}
            <button
              type="button"
              onClick={() => setVehicleType('sedan')}
              className={`p-3.5 rounded-xl border text-left transition-all min-h-[76px] flex flex-col justify-between cursor-pointer ${
                vehicleType === 'sedan'
                  ? 'bg-white/10 border-2 border-white text-white'
                  : 'bg-[#0A0A0A] border-[#262626] text-[#A3A3A3] hover:border-neutral-500'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Car className={`w-4 h-4 ${vehicleType === 'sedan' ? 'text-white' : 'text-[#A3A3A3]'}`} />
                  <span className="font-bold text-sm text-white">Sedan</span>
                </div>
                {vehicleType === 'sedan' && (
                  <span className="w-5 h-5 rounded-full bg-white text-black flex items-center justify-center text-xs">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </span>
                )}
              </div>
              <div className="text-[11px] text-[#A3A3A3] mt-1 flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" /> 4 Seats
                </span>
                <span className="flex items-center gap-1">
                  <Luggage className="w-3 h-3" /> 2 Bags
                </span>
                <span>AC</span>
              </div>
              <p className="text-[10px] text-[#A3A3A3] mt-1 truncate">Dzire, Etios or equivalent</p>
            </button>

            {/* SUV */}
            <button
              type="button"
              onClick={() => setVehicleType('suv')}
              className={`p-3.5 rounded-xl border text-left transition-all min-h-[76px] flex flex-col justify-between cursor-pointer ${
                vehicleType === 'suv'
                  ? 'bg-white/10 border-2 border-white text-white'
                  : 'bg-[#0A0A0A] border-[#262626] text-[#A3A3A3] hover:border-neutral-500'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Car className={`w-4 h-4 ${vehicleType === 'suv' ? 'text-white' : 'text-[#A3A3A3]'}`} />
                  <span className="font-bold text-sm text-white">SUV</span>
                </div>
                {vehicleType === 'suv' && (
                  <span className="w-5 h-5 rounded-full bg-white text-black flex items-center justify-center text-xs">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </span>
                )}
              </div>
              <div className="text-[11px] text-[#A3A3A3] mt-1 flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" /> 6-7 Seats
                </span>
                <span className="flex items-center gap-1">
                  <Luggage className="w-3 h-3" /> 4 Bags
                </span>
                <span>AC</span>
              </div>
              <p className="text-[10px] text-[#A3A3A3] mt-1 truncate">Ertiga, Innova or equivalent</p>
            </button>
          </div>
        </div>
      </div>

      {/* Addresses & Pickup Schedule Section */}
      <div className="bg-[#141414] border border-[#262626] rounded-2xl p-4 sm:p-5 space-y-4">
        <h2 className="text-[20px] font-bold tracking-tight text-white">
          Pickup & Drop Details
        </h2>

        {/* Pickup Address */}
        <div>
          <label htmlFor={pickupAddressId} className="block text-[11px] uppercase tracking-wider font-semibold text-[#A3A3A3] mb-1.5">
            Pickup Address <span className="text-[#F59E0B]">*</span>
          </label>
          <div className="relative">
            <input
              id={pickupAddressId}
              type="text"
              required
              value={pickupAddress}
              onChange={(e) => setPickupAddress(e.target.value)}
              placeholder="Area, landmark or street in Rewa"
              className="w-full px-3.5 py-3 rounded-xl bg-[#0A0A0A] border border-[#262626] text-white placeholder-[#737373] text-sm focus:outline-none focus:ring-1 focus:ring-white min-h-[48px]"
            />
          </div>

          {/* Location Picker Option */}
          <div className="mt-2 flex flex-col gap-1.5">
            {pickupCoords ? (
              <div className="flex items-center justify-between px-1 py-0.5">
                <span className="text-xs font-semibold text-[#22c55e] flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Location captured</span>
                </span>
                <button
                  type="button"
                  onClick={handleClearLocation}
                  className="text-xs text-[#A3A3A3] hover:text-white underline underline-offset-2 cursor-pointer transition-colors"
                >
                  Clear
                </button>
              </div>
            ) : (
              <div>
                <button
                  type="button"
                  onClick={handleGetCurrentLocation}
                  disabled={isLocating}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-transparent hover:bg-white/5 active:bg-white/10 text-white border border-white/20 text-xs font-medium transition-colors cursor-pointer min-h-[36px]"
                >
                  {isLocating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#F59E0B]" />
                      <span>Getting your location...</span>
                    </>
                  ) : (
                    <>
                      <Crosshair className="w-3.5 h-3.5 text-[#F59E0B]" />
                      <span>Use my current location</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {locationError && (
              <p className="text-xs text-[#EF4444] flex items-center gap-1.5 px-1 animate-in fade-in">
                <AlertCircle className="w-3.5 h-3.5 text-[#EF4444] shrink-0" />
                <span>{locationError}</span>
              </p>
            )}
          </div>
        </div>

        {/* Drop Address */}
        <div>
          <label htmlFor={dropAddressId} className="block text-[11px] uppercase tracking-wider font-semibold text-[#A3A3A3] mb-1.5">
            Drop Address in {toCity} <span className="text-[#F59E0B]">*</span>
          </label>
          <div className="relative">
            <input
              id={dropAddressId}
              type="text"
              required
              value={dropAddress}
              onChange={(e) => setDropAddress(e.target.value)}
              placeholder={`e.g. Railway Station / Airport / Hotel in ${toCity}`}
              className="w-full px-3.5 py-3 rounded-xl bg-[#0A0A0A] border border-[#262626] text-white placeholder-[#737373] text-sm focus:outline-none focus:ring-1 focus:ring-white min-h-[48px]"
            />
          </div>

          {/* Quick Drop Suggestions for selected city */}
          {activeRoute.popularDrop.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5 items-center">
              <span className="text-[11px] text-[#A3A3A3] mr-1">Popular in {toCity}:</span>
              {activeRoute.popularDrop.map((spot) => (
                <button
                  key={spot}
                  type="button"
                  onClick={() => setDropAddress(spot)}
                  className="text-[11px] px-2.5 py-1 rounded-md bg-transparent hover:bg-white/5 text-white border border-white/20 transition-colors cursor-pointer"
                >
                  {spot}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Pickup Date & Time */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor={pickupTimeId} className="block text-[11px] uppercase tracking-wider font-semibold text-[#A3A3A3]">
              Pickup Date & Time <span className="text-[#F59E0B]">*</span>
            </label>
            {pickupWhen && (
              <span className="text-xs text-[#F59E0B] font-medium">
                {formatFriendlyDate(pickupWhen)}
              </span>
            )}
          </div>

          <input
            id={pickupTimeId}
            type="datetime-local"
            required
            min={getMinPickupTime()}
            value={pickupWhen}
            onChange={(e) => setPickupWhen(e.target.value)}
            className="w-full px-3.5 py-3 rounded-xl bg-[#0A0A0A] border border-[#262626] text-white text-sm focus:outline-none focus:ring-1 focus:ring-white min-h-[48px]"
          />

          {/* Quick Schedule Buttons */}
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setQuickTime(2)}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-transparent hover:bg-white/5 text-white border border-white/20 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5 text-[#F59E0B]" />
              <span>Today (+2 hrs)</span>
            </button>
            <button
              type="button"
              onClick={setTomorrowMorning}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-transparent hover:bg-white/5 text-white border border-white/20 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5 text-[#F59E0B]" />
              <span>Tomorrow 08:00 AM</span>
            </button>
          </div>
        </div>
      </div>

      {/* Rider Information Section */}
      <div className="bg-[#141414] border border-[#262626] rounded-2xl p-4 sm:p-5 space-y-4">
        <h2 className="text-[20px] font-bold tracking-tight text-white">
          Rider Contact Information
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Rider Name */}
          <div>
            <label htmlFor={riderNameId} className="block text-[11px] uppercase tracking-wider font-semibold text-[#A3A3A3] mb-1.5">
              Full Name <span className="text-[#F59E0B]">*</span>
            </label>
            <div className="relative">
              <input
                id={riderNameId}
                type="text"
                required
                value={riderName}
                onChange={(e) => setRiderName(e.target.value)}
                placeholder="Enter full name"
                className="w-full px-3.5 py-3 rounded-xl bg-[#0A0A0A] border border-[#262626] text-white placeholder-[#737373] text-sm focus:outline-none focus:ring-1 focus:ring-white min-h-[48px]"
              />
            </div>
          </div>

          {/* Indian Phone Number */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor={riderPhoneId} className="block text-[11px] uppercase tracking-wider font-semibold text-[#A3A3A3]">
                10-Digit Mobile Number <span className="text-[#F59E0B]">*</span>
              </label>
              {isPhoneValid && (
                <span className="text-[11px] text-[#22c55e] font-semibold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" /> Valid
                </span>
              )}
            </div>
            <div className="relative flex">
              <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-[#262626] bg-[#0A0A0A] text-[#A3A3A3] text-sm font-semibold select-none">
                +91
              </span>
              <input
                id={riderPhoneId}
                type="tel"
                required
                maxLength={14}
                value={riderPhone}
                onChange={(e) => setRiderPhone(e.target.value)}
                placeholder="98765 43210"
                className={`w-full px-3.5 py-3 rounded-r-xl bg-[#0A0A0A] border border-[#262626] text-white placeholder-[#737373] text-sm font-mono focus:outline-none focus:ring-1 focus:ring-white min-h-[48px] ${
                  isPhoneValid
                    ? 'border-[#22c55e]/50'
                    : ''
                }`}
              />
            </div>
            <p className="text-[11px] text-[#A3A3A3] mt-1">
              WhatsApp driver confirmation will be sent to this number.
            </p>
          </div>
        </div>
      </div>

      {/* Booking Card: Route line, vehicle pill, large saffron fare & "Guaranteed fare" */}
      <div className={`bg-[#141414] border ${fareError ? 'border-[#EF4444]/40' : 'border-[#262626]'} rounded-2xl p-4 sm:p-5 shadow-lg relative overflow-hidden`}>
        <div className="flex items-center justify-between gap-4">
          {/* Left: Route line with filled dot for pickup, vertical line, hollow dot for drop */}
          <div className="flex items-start gap-3">
            <div className="flex flex-col items-center pt-1 shrink-0">
              {/* Pickup filled dot */}
              <div className="w-2.5 h-2.5 rounded-full bg-white shadow-sm" />
              {/* Vertical route line */}
              <div className="w-0.5 h-6 bg-[#262626] my-0.5" />
              {/* Drop hollow dot */}
              <div className="w-2.5 h-2.5 rounded-full border-2 border-[#F59E0B] bg-[#141414]" />
            </div>

            <div className="space-y-1.5">
              <div>
                <span className="text-[10px] uppercase tracking-wider font-semibold text-[#A3A3A3] block leading-none">
                  Pickup
                </span>
                <span className="text-sm font-bold text-white leading-tight">
                  Rewa
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider font-semibold text-[#A3A3A3] block leading-none">
                  Drop
                </span>
                <span className="text-sm font-bold text-white leading-tight">
                  {toCity}
                </span>
              </div>
              <div className="flex items-center gap-2 pt-0.5">
                {/* Vehicle type as a small pill (SEDAN, SUV) with a simple outline icon */}
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 border border-white/20 text-[10px] font-bold text-white uppercase tracking-wider">
                  <Car className="w-3 h-3 text-[#A3A3A3]" />
                  <span>{vehicleType}</span>
                </span>
                <span className="text-[10px] font-semibold text-[#A3A3A3] uppercase tracking-wider">
                  {tripType === 'round_trip' ? 'Round Trip' : 'One Way'}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Fare in 32px bold saffron with "Guaranteed fare" beneath it */}
          <div className="text-right shrink-0">
            {fareLoading ? (
              <div className="flex items-center gap-2 text-[#A3A3A3] py-2">
                <Loader2 className="w-5 h-5 animate-spin text-[#F59E0B]" />
                <span className="text-xs font-semibold">Calculating...</span>
              </div>
            ) : fareError ? (
              <div className="text-right">
                <span className="text-sm font-semibold text-[#EF4444] block">Unavailable</span>
                <button
                  type="button"
                  onClick={() => fetchFare(toCity, vehicleType, tripType)}
                  className="text-xs text-[#F59E0B] hover:text-white font-medium inline-flex items-center gap-1.5 mt-1 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry</span>
                </button>
              </div>
            ) : fare !== null ? (
              <div>
                <span className="text-[32px] font-bold text-[#F59E0B] leading-none tabular-nums block">
                  {formatRupees(fare)}
                </span>
                <span className="block text-[11px] text-[#A3A3A3] font-medium mt-1">Guaranteed fare</span>
              </div>
            ) : null}
          </div>
        </div>

        {/* Fare Unavailable Error Message */}
        {fareError && (
          <div className="mt-3.5 p-3 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/30 text-[#EF4444] text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[#EF4444] shrink-0" />
              <span>Fare unavailable. Please check your connection and try again.</span>
            </div>
            <button
              type="button"
              onClick={() => fetchFare(toCity, vehicleType, tripType)}
              className="text-xs text-[#EF4444] hover:text-white font-semibold underline underline-offset-2 shrink-0 cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Fare Inclusions */}
        <div className="mt-3.5 pt-3.5 border-t border-[#262626] grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-[#A3A3A3]">
          <div className="flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-[#22c55e] shrink-0" />
            <span>Toll Taxes & Permits</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-[#22c55e] shrink-0" />
            <span>Driver Allowance</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-[#22c55e] shrink-0" />
            <span>AC Vehicle Guarantee</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-[#22c55e] shrink-0" />
            <span>No Hidden Surges</span>
          </div>
        </div>
      </div>

      {/* Error Banner if submit failed */}
      {submitError && (
        <div className="p-4 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/40 text-[#EF4444] text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-[#EF4444] shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-white">Booking Request Failed</p>
            <p className="text-xs text-[#EF4444] mt-0.5">{submitError}</p>
          </div>
        </div>
      )}

      {/* Submit Button: Primary 52px tall, white background, black text, rounded-xl */}
      <div className="space-y-2 pt-1">
        <button
          type="submit"
          disabled={!isFormValid || isSubmitting || fare === null || Boolean(fareError)}
          className={`w-full h-[52px] rounded-xl font-bold text-base flex items-center justify-center gap-2.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white ${
            isFormValid && !isSubmitting && fare !== null && !fareError
              ? 'bg-white hover:bg-neutral-200 active:bg-neutral-300 text-black cursor-pointer'
              : 'bg-neutral-800 text-neutral-500 border border-[#262626] cursor-not-allowed'
          }`}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Confirming Booking...</span>
            </>
          ) : (
            <>
              <span>Book Cab Now</span>
              {fare !== null && !fareLoading && !fareError && (
                <span className="font-mono">· {formatRupees(fare)}</span>
              )}
            </>
          )}
        </button>

        {/* Validation hint if disabled */}
        {!isFormValid && !isSubmitting && (
          <p className="text-center text-xs text-[#A3A3A3] flex items-center justify-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-[#F59E0B]" />
            <span>{getValidationHint()}</span>
          </p>
        )}

        <p className="text-center text-[11px] text-[#A3A3A3]">
          Book as guest without login. No upfront payment required.
        </p>

        {onOpenCheckBooking && (
          <div className="text-center pt-2 border-t border-[#262626]">
            <button
              type="button"
              onClick={onOpenCheckBooking}
              className="text-xs text-[#A3A3A3] hover:text-white transition-colors cursor-pointer inline-flex items-center gap-1.5 min-h-[44px] px-3 py-1"
            >
              <span>Need to look up an existing trip?</span>
              <span className="text-white font-bold underline underline-offset-4">Check my booking</span>
            </button>
          </div>
        )}
      </div>
    </form>
  );
};
