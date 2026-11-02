import React, { useState, useEffect, useCallback, useId } from 'react';
import { 
  Calendar, 
  User, 
  Phone, 
  Loader2, 
  Check, 
  AlertCircle, 
  ArrowRight, 
  Clock, 
  RefreshCw, 
  Users, 
  Crosshair, 
  CheckCircle2, 
  X,
  ChevronUp
} from 'lucide-react';
import { 
  supabase, 
  FROM_CITY, 
  VehicleType, 
  TripType,
  DestinationItem,
  OUTSTATION_DESTINATIONS
} from '../lib/supabase';
import { formatRupees, isValidIndianPhone, cleanPhone, formatFriendlyDate } from '../utils/format';
import { SedanIcon, SuvIcon, AutoIcon, BikeIcon, VehicleIcon } from './VehicleIcons';
import { PlaceSearchInput } from './PlaceSearchInput';

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
    isGuestBooking?: boolean;
  }) => void;
  onOpenCheckBooking?: () => void;
  externalSelectedCity?: string;
}

export const BookingForm: React.FC<BookingFormProps> = ({ 
  onSuccess, 
  onOpenCheckBooking,
  externalSelectedCity
}) => {
  const pickupTimeId = useId();
  const riderNameId = useId();
  const riderPhoneId = useId();

  // Form State
  const [toCity, setToCity] = useState<string>('Prayagraj');
  const [vehicleType, setVehicleType] = useState<VehicleType>('sedan');
  const [tripType, setTripType] = useState<TripType>('one_way');
  const [pickupAddress, setPickupAddress] = useState<string>('');
  const [dropAddress, setDropAddress] = useState<string>('');
  
  // Mobile Fare Summary Modal / Sheet
  const [showMobileFareSummary, setShowMobileFareSummary] = useState<boolean>(false);

  // Sync external selection if clicked from RateCard
  useEffect(() => {
    if (externalSelectedCity) {
      setToCity(externalSelectedCity);
    }
  }, [externalSelectedCity]);

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

  // Pre-fill name and phone from rider profile when signed in (riders table where auth_user_id = user.id)
  useEffect(() => {
    let isMounted = true;
    async function loadRiderProfile() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data, error } = await supabase
          .from('riders')
          .select('name, phone')
          .eq('auth_user_id', user.id)
          .maybeSingle();

        if (!isMounted || error || !data) return;

        // Keep both editable: pre-fill only if not already modified or empty
        if (data.name) {
          setRiderName((prev) => (prev.trim() === '' ? data.name : prev));
        }
        if (data.phone) {
          setRiderPhone((prev) => (prev.trim() === '' ? data.phone : prev));
        }
      } catch (err) {
        console.warn('Error reading rider profile:', err);
      }
    }

    loadRiderProfile();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        loadRiderProfile();
      }
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Cache of destinations per vehicle:
  // For Sedan and SUV, keep 6 outstation cities.
  // For Auto and Bike, get destination list from supabase.rpc('list_destinations', { p_vehicle })
  const [destinationsMap, setDestinationsMap] = useState<Record<string, DestinationItem[]>>({
    sedan: OUTSTATION_DESTINATIONS,
    suv: OUTSTATION_DESTINATIONS,
  });

  // Preload destinations for Auto and Bike on mount
  useEffect(() => {
    let isMounted = true;
    Promise.all([
      supabase.rpc('list_destinations', { p_vehicle: 'auto' }),
      supabase.rpc('list_destinations', { p_vehicle: 'bike' }),
    ])
      .then(([autoRes, bikeRes]) => {
        if (!isMounted) return;
        setDestinationsMap((prev) => ({
          ...prev,
          ...(Array.isArray(autoRes.data)
            ? { auto: [...autoRes.data].sort((a, b) => (Number(a.km) || 0) - (Number(b.km) || 0)) }
            : {}),
          ...(Array.isArray(bikeRes.data)
            ? { bike: [...bikeRes.data].sort((a, b) => (Number(a.km) || 0) - (Number(b.km) || 0)) }
            : {}),
        }));
      })
      .catch((err) => {
        console.warn('Preload destinations notice:', err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Active destinations list in km order
  const currentDestinations: DestinationItem[] = 
    destinationsMap[vehicleType] || (vehicleType === 'auto' || vehicleType === 'bike' ? [] : OUTSTATION_DESTINATIONS);

  const selectedDestItem = currentDestinations.find((d) => d.destination === toCity);

  // When vehicle changes:
  // - Auto and Bike: get destination list from supabase.rpc('list_destinations', { p_vehicle })
  // - Sedan and SUV: keep the 6 outstation cities as they are
  // - Clear selected destination if it's not bookable for the new vehicle
  const handleVehicleSelect = async (newVehicle: VehicleType) => {
    setVehicleType(newVehicle);
    setSubmitError(null);

    let newDestList: DestinationItem[] = destinationsMap[newVehicle];
    if (!newDestList && (newVehicle === 'auto' || newVehicle === 'bike')) {
      try {
        const { data, error } = await supabase.rpc('list_destinations', { p_vehicle: newVehicle });
        if (!error && Array.isArray(data)) {
          newDestList = [...data].sort((a, b) => (Number(a.km) || 0) - (Number(b.km) || 0));
          setDestinationsMap((prev) => ({ ...prev, [newVehicle]: newDestList }));
        } else {
          newDestList = [];
        }
      } catch {
        newDestList = [];
      }
    } else if (!newDestList) {
      newDestList = OUTSTATION_DESTINATIONS;
    }

    // Clear selected destination if it's not bookable for the new vehicle
    const targetDest = newDestList.find((d) => d.destination === toCity);
    if (!targetDest || !targetDest.bookable) {
      setToCity('');
      setDropAddress('');
      setFare(null);
      setFareError(null);
    }
  };

  // Fetch live fare quote via RPC - strictly required from quote_fare RPC, never hardcoded
  const fetchFare = useCallback(async (dest: string, vehicle: VehicleType, trip: TripType) => {
    if (!dest) {
      setFare(null);
      setFareError(null);
      setFareLoading(false);
      return;
    }

    setFareLoading(true);
    setFareError(null);
    try {
      const { data, error } = await supabase.rpc('quote_fare', {
        p_from: FROM_CITY,
        p_to: dest,
        p_vehicle: vehicle,
        p_trip: trip,
      });

      if (error) {
        throw new Error(error.message || 'Fare calculation unavailable. Please try again.');
      }
      if (data === null || data === undefined) {
        throw new Error('Fare quote unavailable for this route.');
      }

      const numericFare = typeof data === 'number' ? data : Number(data);
      if (isNaN(numericFare) || numericFare <= 0) {
        throw new Error('Fare quote returned an invalid amount.');
      }

      setFare(numericFare);
      setFareError(null);
    } catch (err: any) {
      console.warn('Fare quote fetch notice:', err);
      setFare(null);
      setFareError(err?.message || 'Fare unavailable. Please check your connection and try again.');
    } finally {
      setFareLoading(false);
    }
  }, []);

  // Re-fetch fare on route/vehicle/trip change
  useEffect(() => {
    if (toCity) {
      fetchFare(toCity, vehicleType, tripType);
    } else {
      setFare(null);
      setFareError(null);
    }
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

  const isDestinationBookable = Boolean(selectedDestItem && selectedDestItem.bookable);

  const isFormValid = 
    Boolean(toCity) &&
    isDestinationBookable &&
    isPickupValid &&
    isDropValid &&
    isNameValid &&
    isPhoneValid &&
    isTimeValid &&
    fare !== null &&
    !fareError &&
    !fareLoading &&
    !isSubmitting;

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const currentItem = currentDestinations.find((d) => d.destination === toCity);
    if (currentItem && !currentItem.bookable) {
      setSubmitError('This route is coming soon. Please choose a nearer destination.');
      return;
    }

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

      const bookingRecord = Array.isArray(data) ? data[0] : data;
      if (!bookingRecord || !bookingRecord.code) {
        throw new Error('Booking confirmed but no reference code was received. Please contact support.');
      }

      const { data: authUserData } = await supabase.auth.getUser();
      const isGuest = !authUserData?.user;

      onSuccess({
        bookingCode: bookingRecord.code,
        fare: typeof bookingRecord.fare === 'number' ? bookingRecord.fare : fare,
        riderName: riderName.trim(),
        riderPhone: cleanedPhone,
        pickupAddress: pickupAddress.trim(),
        dropAddress: dropAddress.trim(),
        fromCity: FROM_CITY,
        toCity: toCity,
        vehicleType: vehicleType,
        tripType: tripType,
        pickupWhen: isoTimestamp,
        pickupLat: pickupCoords ? pickupCoords.lat : null,
        pickupLng: pickupCoords ? pickupCoords.lng : null,
        isGuestBooking: isGuest,
      });
    } catch (err: any) {
      console.warn('Booking submission error:', err);
      setSubmitError(err.message || 'Failed to confirm booking. Please verify details and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

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
    setPickupWhen(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T08:00`);
  };

  // Reusable Fare Card JSX used in Desktop Sticky column, Tablet inline, and Mobile summary sheet
  const renderFareCardContent = (showSubmitBtn: boolean = true) => (
    <div className={`rounded-xl bg-[#141414] border ${fareError ? 'border-[#EF4444]/40' : 'border-[#262626]'} p-4 sm:p-5 shadow-lg space-y-4`}>
      {/* Route & Fare Heading */}
      <div className="flex items-start justify-between gap-3 border-b border-[#262626] pb-4">
        {/* Route Line */}
        <div className="flex items-start gap-2.5">
          <div className="flex flex-col items-center pt-1 shrink-0">
            <div className="w-2.5 h-2.5 rounded-full bg-white shadow-sm" />
            <div className="w-0.5 h-6 bg-[#262626] my-0.5" />
            <div className="w-2.5 h-2.5 rounded-full border-2 border-[#F59E0B] bg-[#141414]" />
          </div>

          <div className="space-y-1">
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
                {toCity || 'Select destination'}
              </span>
            </div>
            <div className="flex items-center gap-2 pt-0.5">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 border border-white/20 text-[10px] font-bold text-white uppercase tracking-wider">
                <VehicleIcon vehicle={vehicleType} className="w-3 h-3 text-[#A3A3A3]" />
                <span>{vehicleType}</span>
              </span>
              <span className="text-[10px] font-semibold text-[#A3A3A3] uppercase tracking-wider">
                {tripType === 'round_trip' ? 'Round Trip' : 'One Way'}
              </span>
            </div>
          </div>
        </div>

        {/* Fare Display */}
        <div className="text-right shrink-0">
          {!toCity ? (
            <span className="text-xs text-[#A3A3A3] block">Select destination</span>
          ) : fareLoading ? (
            <div className="flex items-center gap-2 text-[#A3A3A3] py-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#F59E0B]" />
              <span className="text-xs font-semibold">Calculating...</span>
            </div>
          ) : fareError ? (
            <div className="text-right">
              <span className="text-sm font-semibold text-[#EF4444] block">Unavailable</span>
              <button
                type="button"
                onClick={() => fetchFare(toCity, vehicleType, tripType)}
                className="text-xs text-[#F59E0B] hover:text-white font-medium inline-flex items-center gap-1 mt-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Retry</span>
              </button>
            </div>
          ) : fare !== null ? (
            <div>
              <span className="text-[32px] font-bold text-[#F59E0B] leading-none tabular-nums block">
                {formatRupees(fare)}
              </span>
              <span className="block text-[11px] text-[#A3A3A3] font-medium mt-1 max-w-[200px]">
                Tolls, state tax and driver allowance included
              </span>
            </div>
          ) : null}
        </div>
      </div>

      {/* Fare error banner if any */}
      {fareError && (
        <div className="p-3 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/30 text-[#EF4444] text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[#EF4444] shrink-0" />
            <span>{fareError}</span>
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

      {/* Included in your fare & Not included */}
      <div className="space-y-4 pt-1">
        {/* Included in your fare */}
        <div>
          <h4 className="text-[11px] uppercase tracking-wider font-semibold text-[#22c55e] flex items-center gap-1.5 mb-2">
            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Included in your fare</span>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#A3A3A3]">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] shrink-0" />
              <span>AC vehicle and driver</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] shrink-0" />
              <span>Fuel</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] shrink-0" />
              <span>Tolls (included in the fare)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] shrink-0" />
              <span>State tax</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] shrink-0" />
              <span>Permits</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] shrink-0" />
              <span>Driver allowance</span>
            </div>
          </div>
        </div>

        {/* Not included */}
        <div>
          <h4 className="text-[11px] uppercase tracking-wider font-semibold text-[#EF4444] flex items-center gap-1.5 mb-2">
            <X className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Not included</span>
          </h4>
          <div className="grid grid-cols-1 gap-2.5 text-xs text-[#A3A3A3]">
            <div className="flex items-start gap-2.5 text-left">
              <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444] shrink-0 mt-1.5" />
              <span className="flex-1 text-left leading-relaxed">Parking</span>
            </div>
            <div className="flex items-start gap-2.5 text-left">
              <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444] shrink-0 mt-1.5" />
              <span className="flex-1 text-left leading-relaxed">Extra kilometres beyond route: ₹17/km (Sedan), ₹20/km (SUV)</span>
            </div>
            <div className="flex items-start gap-2.5 text-left">
              <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444] shrink-0 mt-1.5" />
              <span className="flex-1 text-left leading-relaxed">Extra hours beyond booked time: ₹100/hr (Sedan), ₹150/hr (SUV)</span>
            </div>
            <div className="flex items-start gap-2.5 text-left">
              <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444] shrink-0 mt-1.5" />
              <span className="flex-1 text-left leading-relaxed">Night travel after 11 PM: ₹200 per night</span>
            </div>
          </div>
        </div>
      </div>

      {/* Book Button (when rendered inside fare card) */}
      {showSubmitBtn && (
        <div className="pt-2">
          {submitError && (
            <div className="p-3 mb-3 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/30 text-[#EF4444] text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[#EF4444] shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={!isFormValid || isSubmitting || fare === null || Boolean(fareError)}
            className={`w-full h-[52px] rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg disabled:cursor-not-allowed ${
              isFormValid && !isSubmitting && fare !== null && !fareError
                ? 'bg-white hover:bg-neutral-200 active:bg-neutral-300 text-black'
                : 'bg-neutral-800 text-neutral-500 border border-[#262626]'
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Confirming Booking...</span>
              </>
            ) : (
              <>
                <span>
                  {vehicleType === 'bike' ? 'Book Bike Taxi' : vehicleType === 'auto' ? 'Book Auto Now' : 'Book Cab Now'}
                </span>
                {fare !== null && !fareLoading && !fareError && (
                  <span className="font-mono">· {formatRupees(fare)}</span>
                )}
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="w-full pb-[calc(130px+env(safe-area-inset-bottom,0px))] md:pb-0">
      {/* 
        Responsive Layout Matrix:
        - Mobile (<768px): Single column, strict order 1-8
        - Desktop (>=1024px): Two columns (Left ~60% form sections, Right ~40% sticky fare card)
        - Tablet (768px - 1024px): Single column with full width fare card underneath
      */}
      <div className="lg:grid lg:grid-cols-12 lg:gap-8 items-start">
        {/* Left Column: Form Sections */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* SECTION 1: Trip Type */}
          <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 sm:p-5 shadow-md space-y-3">
            <div>
              <span className="text-[11px] uppercase tracking-wider font-semibold text-[#A3A3A3] block">
                Step 1 · Journey Mode
              </span>
              <h2 className="text-[20px] font-bold text-white tracking-tight">
                Trip Type
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-2.5 p-1 bg-[#0A0A0A] rounded-lg border border-[#262626]">
              <button
                type="button"
                onClick={() => setTripType('one_way')}
                className={`min-h-[58px] p-3 rounded-lg text-left transition-all flex flex-col justify-center cursor-pointer ${
                  tripType === 'one_way'
                    ? 'bg-white text-black font-bold shadow-sm'
                    : 'text-[#A3A3A3] hover:text-white'
                }`}
              >
                <span className="text-sm font-bold">One Way</span>
                <span className={`text-[11px] ${tripType === 'one_way' ? 'text-neutral-700 font-medium' : 'text-[#A3A3A3]'}`}>
                  Get dropped off
                </span>
              </button>

              <button
                type="button"
                onClick={() => setTripType('round_trip')}
                className={`min-h-[58px] p-3 rounded-lg text-left transition-all flex flex-col justify-center cursor-pointer ${
                  tripType === 'round_trip'
                    ? 'bg-white text-black font-bold shadow-sm'
                    : 'text-[#A3A3A3] hover:text-white'
                }`}
              >
                <span className="text-sm font-bold">Round Trip</span>
                <span className={`text-[11px] ${tripType === 'round_trip' ? 'text-neutral-700 font-medium' : 'text-[#A3A3A3]'}`}>
                  Car stays with you until return
                </span>
              </button>
            </div>
          </div>

          {/* SECTION 2: Destination */}
          <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 sm:p-5 shadow-md space-y-3">
            <div>
              <span className="text-[11px] uppercase tracking-wider font-semibold text-[#A3A3A3] block">
                Step 2 · Route Selection
              </span>
              <h2 className="text-[20px] font-bold text-white tracking-tight">
                Destination City
              </h2>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#A3A3A3] mb-1.5">
                  Pickup City
                </label>
                <div className="px-3.5 py-3 rounded-lg bg-[#0A0A0A] border border-[#262626] text-white text-sm font-medium flex items-center justify-between">
                  <span>Rewa (M.P.)</span>
                  <span className="text-[11px] text-[#A3A3A3]">Origin</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#A3A3A3] mb-1.5">
                  Destination City <span className="text-[#F59E0B]">*</span>
                </label>
                <div className="relative">
                  <select
                    value={toCity}
                    onChange={(e) => {
                      const chosen = e.target.value;
                      const item = currentDestinations.find((d) => d.destination === chosen);
                      if (item && !item.bookable) {
                        setSubmitError('This route is coming soon. Please choose a nearer destination.');
                        return;
                      }
                      setToCity(chosen);
                      setDropAddress('');
                      setSubmitError(null);
                    }}
                    className={`w-full px-3.5 py-3 rounded-lg bg-[#0A0A0A] border ${
                      !toCity ? 'border-[#F59E0B]' : 'border-[#262626]'
                    } text-white font-medium text-sm focus:outline-none focus:ring-1 focus:ring-white min-h-[48px] appearance-none cursor-pointer pr-10`}
                  >
                    <option value="" disabled={Boolean(toCity)} className="bg-[#141414] text-[#A3A3A3]">
                      -- Select Destination --
                    </option>
                    {currentDestinations.map((item) => (
                      <option
                        key={item.destination}
                        value={item.destination}
                        disabled={!item.bookable}
                        className={
                          item.bookable
                            ? 'bg-[#141414] text-white font-medium'
                            : 'bg-[#141414] text-neutral-500 font-normal'
                        }
                      >
                        {item.destination} ({item.km} km){!item.bookable ? ' — Coming soon' : ''}
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

          {/* SECTION 3: Vehicle Class */}
          <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 sm:p-5 shadow-md space-y-3">
            <div>
              <span className="text-[11px] uppercase tracking-wider font-semibold text-[#A3A3A3] block">
                Step 3 · Fleet Option
              </span>
              <h2 className="text-[20px] font-bold text-white tracking-tight">
                Select Vehicle
              </h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {/* Sedan */}
              <button
                type="button"
                onClick={() => handleVehicleSelect('sedan')}
                className={`p-3 rounded-xl border text-left transition-all min-h-[102px] flex flex-col justify-between cursor-pointer ${
                  vehicleType === 'sedan'
                    ? 'bg-white/10 border-2 border-white text-white'
                    : 'bg-[#0A0A0A] border-[#262626] text-[#A3A3A3] hover:border-neutral-500'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <SedanIcon className={`w-6 h-4 ${vehicleType === 'sedan' ? 'text-white' : 'text-[#A3A3A3]'}`} />
                    <span className="font-bold text-sm text-white">Sedan</span>
                  </div>
                  {vehicleType === 'sedan' && (
                    <span className="w-4 h-4 rounded-full bg-white text-black flex items-center justify-center text-[10px]">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-[#A3A3A3] mt-1 flex items-center gap-2">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" /> 4 Seats
                  </span>
                  <span>AC</span>
                </div>
                <p className="text-[10px] text-[#A3A3A3] truncate">Dzire, Etios</p>
              </button>

              {/* SUV */}
              <button
                type="button"
                onClick={() => handleVehicleSelect('suv')}
                className={`p-3 rounded-xl border text-left transition-all min-h-[102px] flex flex-col justify-between cursor-pointer ${
                  vehicleType === 'suv'
                    ? 'bg-white/10 border-2 border-white text-white'
                    : 'bg-[#0A0A0A] border-[#262626] text-[#A3A3A3] hover:border-neutral-500'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <SuvIcon className={`w-6 h-4 ${vehicleType === 'suv' ? 'text-white' : 'text-[#A3A3A3]'}`} />
                    <span className="font-bold text-sm text-white">SUV</span>
                  </div>
                  {vehicleType === 'suv' && (
                    <span className="w-4 h-4 rounded-full bg-white text-black flex items-center justify-center text-[10px]">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-[#A3A3A3] mt-1 flex items-center gap-2">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" /> 6-7 Seats
                  </span>
                  <span>AC</span>
                </div>
                <p className="text-[10px] text-[#A3A3A3] truncate">Ertiga, Innova</p>
              </button>

              {/* Auto */}
              <button
                type="button"
                onClick={() => handleVehicleSelect('auto')}
                className={`p-3 rounded-xl border text-left transition-all min-h-[102px] flex flex-col justify-between cursor-pointer ${
                  vehicleType === 'auto'
                    ? 'bg-white/10 border-2 border-white text-white'
                    : 'bg-[#0A0A0A] border-[#262626] text-[#A3A3A3] hover:border-neutral-500'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <AutoIcon className={`w-6 h-4 ${vehicleType === 'auto' ? 'text-white' : 'text-[#A3A3A3]'}`} />
                    <span className="font-bold text-sm text-white">Auto</span>
                  </div>
                  {vehicleType === 'auto' && (
                    <span className="w-4 h-4 rounded-full bg-white text-black flex items-center justify-center text-[10px]">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-[#A3A3A3] mt-1 flex items-center gap-2">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" /> 3 Seats
                  </span>
                  <span>Local</span>
                </div>
                <p className="text-[10px] text-[#A3A3A3] truncate">Auto Rickshaw</p>
              </button>

              {/* Bike */}
              <button
                type="button"
                onClick={() => handleVehicleSelect('bike')}
                className={`p-3 rounded-xl border text-left transition-all min-h-[102px] flex flex-col justify-between cursor-pointer ${
                  vehicleType === 'bike'
                    ? 'bg-white/10 border-2 border-white text-white'
                    : 'bg-[#0A0A0A] border-[#262626] text-[#A3A3A3] hover:border-neutral-500'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <BikeIcon className={`w-6 h-4 ${vehicleType === 'bike' ? 'text-white' : 'text-[#A3A3A3]'}`} />
                    <span className="font-bold text-sm text-white">Bike</span>
                  </div>
                  {vehicleType === 'bike' && (
                    <span className="w-4 h-4 rounded-full bg-white text-black flex items-center justify-center text-[10px]">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-[#A3A3A3] mt-1 flex items-center gap-2">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" /> 1 Seat
                  </span>
                  <span>Fast</span>
                </div>
                <p className="text-[10px] text-[#A3A3A3] truncate">Two-Wheeler</p>
              </button>
            </div>
          </div>

          {/* SECTION 4: Pickup & Drop Address (Local places list debounced 300ms) */}
          <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 sm:p-5 shadow-md space-y-4">
            <div>
              <span className="text-[11px] uppercase tracking-wider font-semibold text-[#A3A3A3] block">
                Step 4 · Addresses
              </span>
              <h2 className="text-[20px] font-bold text-white tracking-tight">
                Pickup & Drop Details
              </h2>
            </div>

            {/* Pickup Address with search_places(p_city: 'Rewa') */}
            <div>
              <PlaceSearchInput
                id="pickup-address"
                label="Pickup Address in Rewa"
                required
                value={pickupAddress}
                onChange={setPickupAddress}
                city="Rewa"
                placeholder="Type 2+ letters (e.g. Nehru Nagar, New Bus Stand)"
              />

              {/* Use my current location button */}
              <div className="mt-2.5">
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
                      className="text-xs text-white hover:text-[#F59E0B] font-medium flex items-center gap-1.5 py-1 px-2 rounded-lg bg-transparent hover:bg-white/5 border border-white/10 transition-colors cursor-pointer"
                    >
                      {isLocating ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#F59E0B]" />
                          <span>Detecting GPS location...</span>
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
                  <p className="mt-1.5 text-xs text-[#EF4444] flex items-center gap-1.5 px-1 animate-in fade-in">
                    <AlertCircle className="w-3.5 h-3.5 text-[#EF4444] shrink-0" />
                    <span>{locationError}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Drop Address with search_places(p_city: toCity) */}
            <div>
              <PlaceSearchInput
                id="drop-address"
                label={`Drop Address ${toCity ? `in ${toCity}` : ''}`}
                required
                disabled={!toCity}
                value={dropAddress}
                onChange={setDropAddress}
                city={toCity || 'Prayagraj'}
                placeholder={toCity ? `Type 2+ letters in ${toCity} or enter landmark` : 'Select a destination first'}
              />
            </div>
          </div>

          {/* SECTION 5: Date and Time */}
          <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 sm:p-5 shadow-md space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] uppercase tracking-wider font-semibold text-[#A3A3A3] block">
                  Step 5 · Schedule
                </span>
                <h2 className="text-[20px] font-bold text-white tracking-tight">
                  Pickup Date & Time
                </h2>
              </div>
              {pickupWhen && (
                <span className="text-xs text-[#F59E0B] font-medium hidden sm:inline">
                  {formatFriendlyDate(pickupWhen)}
                </span>
              )}
            </div>

            <div>
              <input
                id={pickupTimeId}
                type="datetime-local"
                required
                min={getMinPickupTime()}
                value={pickupWhen}
                onChange={(e) => setPickupWhen(e.target.value)}
                className="w-full px-3.5 py-3 rounded-lg bg-[#0A0A0A] border border-[#262626] text-white text-sm focus:outline-none focus:ring-1 focus:ring-white min-h-[48px]"
              />

              {/* Quick Schedule Buttons */}
              <div className="mt-2.5 flex flex-wrap gap-2">
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

          {/* SECTION 6: Rider Details */}
          <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 sm:p-5 shadow-md space-y-4">
            <div>
              <span className="text-[11px] uppercase tracking-wider font-semibold text-[#A3A3A3] block">
                Step 6 · Contact
              </span>
              <h2 className="text-[20px] font-bold text-white tracking-tight">
                Rider Information
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
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
                    className="w-full px-3.5 py-3 rounded-lg bg-[#0A0A0A] border border-[#262626] text-white placeholder-[#737373] text-sm focus:outline-none focus:ring-1 focus:ring-white min-h-[48px]"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor={riderPhoneId} className="block text-[11px] uppercase tracking-wider font-semibold text-[#A3A3A3]">
                    10-Digit Mobile <span className="text-[#F59E0B]">*</span>
                  </label>
                  {isPhoneValid && (
                    <span className="text-[11px] text-[#22c55e] font-semibold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" /> Valid
                    </span>
                  )}
                </div>
                <div className="relative flex">
                  <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-[#262626] bg-[#0A0A0A] text-[#A3A3A3] text-sm font-semibold select-none">
                    +91
                  </span>
                  <input
                    id={riderPhoneId}
                    type="tel"
                    required
                    maxLength={10}
                    value={riderPhone}
                    onChange={(e) => setRiderPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="9876543210"
                    className="w-full px-3.5 py-3 rounded-r-lg bg-[#0A0A0A] border border-[#262626] text-white placeholder-[#737373] text-sm font-mono focus:outline-none focus:ring-1 focus:ring-white min-h-[48px]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* TABLET ONLY (768px - 1024px): Fare Card renders full width underneath form */}
          <div className="hidden md:block lg:hidden pt-2">
            {renderFareCardContent(true)}
          </div>

          {/* MOBILE ONLY (<768px): Fare Summary & Book Button (Order items 7 & 8) */}
          <div className="block md:hidden pt-2">
            {renderFareCardContent(true)}
          </div>
        </div>

        {/* Right Column (Desktop >=1024px, ~40% width): Sticky Fare Card */}
        <div className="hidden lg:block lg:col-span-5 lg:sticky lg:top-24 self-start space-y-4">
          {renderFareCardContent(true)}
        </div>
      </div>

      {/* 
        SECTION 7: Mobile Sticky Fare Bar (under 768px)
        - A sticky bar at the bottom on mobile: fare on the left, "Book now" on the right.
        - Tapping the fare opens the full summary.
        - Sits above the 64px mobile navigation tabs: bottom: calc(64px + env(safe-area-inset-bottom, 0px)).
      */}
      <div 
        className="md:hidden fixed left-0 right-0 z-30 bg-[#141414]/98 backdrop-blur-md border-t border-[#262626] px-4 py-2.5 flex items-center justify-between gap-3 shadow-2xl"
        style={{ bottom: 'calc(64px + env(safe-area-inset-bottom, 0px))' }}
      >
        {/* Left: Fare and tap trigger */}
        <button
          type="button"
          onClick={() => setShowMobileFareSummary(true)}
          className="text-left flex items-center gap-1.5 group cursor-pointer"
        >
          <div>
            <div className="flex items-center gap-1">
              <span className="text-xl font-extrabold text-[#F59E0B] leading-none tabular-nums">
                {fare !== null ? formatRupees(fare) : fareLoading ? 'Calculating...' : 'Select route'}
              </span>
              <ChevronUp className="w-4 h-4 text-[#A3A3A3] group-hover:text-white transition-transform" />
            </div>
            <span className="text-[10px] text-[#A3A3A3] block mt-0.5">
              Tolls included · Tap for details
            </span>
          </div>
        </button>

        {/* Right: Book Now button */}
        <button
          type="submit"
          disabled={!isFormValid || isSubmitting || fare === null || Boolean(fareError)}
          className={`px-5 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md disabled:cursor-not-allowed ${
            isFormValid && !isSubmitting && fare !== null && !fareError
              ? 'bg-white hover:bg-neutral-200 active:bg-neutral-300 text-black'
              : 'bg-neutral-800 text-neutral-500 border border-[#262626]'
          }`}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Booking...</span>
            </>
          ) : (
            <span>Book now</span>
          )}
        </button>
      </div>

      {/* Mobile Fare Summary Drawer / Modal when user taps fare bar */}
      {showMobileFareSummary && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#141414] border-t border-[#262626] rounded-t-2xl p-5 max-h-[85vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#262626]">
              <div>
                <span className="text-[10px] uppercase tracking-wider font-semibold text-[#A3A3A3]">
                  Trip Breakdown
                </span>
                <h3 className="text-lg font-bold text-white">Fare Summary</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowMobileFareSummary(false)}
                className="p-1.5 text-[#A3A3A3] hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {renderFareCardContent(false)}

            <button
              type="button"
              onClick={() => setShowMobileFareSummary(false)}
              className="w-full py-3 bg-white text-black font-bold rounded-xl text-sm"
            >
              Close Summary
            </button>
          </div>
        </div>
      )}
    </form>
  );
};
