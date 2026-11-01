import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { formatRupees, formatISTSchedule } from '../../utils/format';
import { 
  Check, 
  X, 
  RefreshCw, 
  MapPin, 
  Calendar, 
  Car, 
  User, 
  Phone, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  LogOut, 
  MessageSquare,
  ExternalLink
} from 'lucide-react';

interface OfferTripItem {
  assignment_id: string;
  code: string;
  from_city: string;
  to_city: string;
  trip_type: string;
  vehicle_type: string;
  scheduled_at: string;
  pickup_address: string;
  drop_address: string;
  fare_quote: number | null;
  rider_name?: string;
  rider_phone?: string;
  booking_status?: string;
  assignment_status?: string;
  pickup_lat?: number | null;
  pickup_lng?: number | null;
}

interface DriverOffersProps {
  owner: {
    id?: string;
    name: string;
    phone: string;
    status: string;
  };
  vehicle: {
    reg_no: string;
    vehicle_type: string;
  } | null;
  onSignOut: () => void;
}

export const DriverOffers: React.FC<DriverOffersProps> = ({
  owner,
  vehicle,
  onSignOut,
}) => {
  const [items, setItems] = useState<OfferTripItem[]>([]);
  const [activeTab, setActiveTab] = useState<'offered' | 'accepted'>('offered');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [confirmCancelAssignmentId, setConfirmCancelAssignmentId] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<{ id: string; message: string } | null>(null);

  // Pull to refresh gesture support
  const touchStartY = useRef<number>(0);
  const [pullOffset, setPullOffset] = useState<number>(0);

  // Fetch offers or accepted trips via database RPCs
  const fetchOffersOrTrips = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setErrorMessage(null);
    setConfirmCancelAssignmentId(null);
    setCancelError(null);

    try {
      if (activeTab === 'offered') {
        // Offers Inbox: call supabase.rpc('get_my_offers')
        const { data, error } = await supabase.rpc('get_my_offers');
        if (error) {
          throw new Error(error.message || 'Failed to fetch offers.');
        }
        setItems((data as OfferTripItem[]) || []);
      } else {
        // Accepted Trips: call supabase.rpc('get_my_trips')
        const { data, error } = await supabase.rpc('get_my_trips');
        if (error) {
          throw new Error(error.message || 'Failed to fetch accepted trips.');
        }
        setItems((data as OfferTripItem[]) || []);
      }
    } catch (err: any) {
      console.warn('Error fetching driver offers/trips notice:', err);
      setErrorMessage(err.message || 'Could not load data.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      setPullOffset(0);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchOffersOrTrips();
  }, [fetchOffersOrTrips]);

  // Handle Accept / Decline via respond_to_offer RPC
  const handleRespond = async (assignmentId: string, action: 'accept' | 'decline') => {
    setActionInProgressId(assignmentId);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const { error } = await supabase.rpc('respond_to_offer', {
        p_assignment: assignmentId,
        p_action: action,
      });

      if (error) {
        throw new Error(error.message || `Failed to ${action} offer.`);
      }

      // Remove the card immediately from local list
      setItems((prev) => prev.filter((item) => item.assignment_id !== assignmentId));

      if (action === 'accept') {
        setSuccessMessage('Trip accepted! Switched to Accepted Trips.');
        setActiveTab('accepted');
      } else {
        setSuccessMessage('Trip offer declined.');
        // Refresh list afterwards
        await fetchOffersOrTrips(true);
      }

      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err: any) {
      console.warn('respond_to_offer notice:', err);
      setErrorMessage(err.message || `Failed to ${action} offer.`);
    } finally {
      setActionInProgressId(null);
    }
  };

  // Handle Driver Cancel Trip on Confirmed Trips in Accepted Trips
  const handleDriverCancelTrip = async (assignmentId: string) => {
    setActionInProgressId(assignmentId);
    setErrorMessage(null);
    setCancelError(null);
    setSuccessMessage(null);

    try {
      const { error } = await supabase.rpc('driver_cancel_trip', {
        p_assignment: assignmentId,
        p_reason: null,
      });

      if (error) {
        throw new Error(error.message || 'Failed to cancel trip.');
      }

      setConfirmCancelAssignmentId(null);
      setSuccessMessage('Trip cancelled and returned to admin for reassignment.');
      setTimeout(() => setSuccessMessage(null), 3500);
      // Refresh list afterwards
      await fetchOffersOrTrips(true);
    } catch (err: any) {
      console.warn('driver_cancel_trip notice:', err);
      const msg = err.message || 'Failed to cancel trip.';
      setErrorMessage(msg);
      setCancelError({ id: assignmentId, message: msg });
    } finally {
      setActionInProgressId(null);
    }
  };

  // Pull-down gesture handlers for touch screens
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const currentY = e.touches[0].clientY;
    const diff = currentY - touchStartY.current;
    if (diff > 0 && window.scrollY <= 5) {
      setPullOffset(Math.min(diff * 0.4, 60));
    }
  };

  const handleTouchEnd = () => {
    if (pullOffset > 40) {
      fetchOffersOrTrips(true);
    }
    setPullOffset(0);
  };

  return (
    <div 
      className="w-full max-w-xl mx-auto space-y-4 pb-12 animate-in fade-in duration-200"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull down indicator */}
      {pullOffset > 10 && (
        <div 
          className="flex items-center justify-center py-2 text-xs text-emerald-400 font-semibold transition-all"
          style={{ height: `${pullOffset}px` }}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${pullOffset > 40 ? 'animate-spin' : ''}`} />
          <span>{pullOffset > 40 ? 'Release to refresh' : 'Pull down to refresh'}</span>
        </div>
      )}

      {/* Driver Header Strip */}
      <div className="bg-[#141414] border border-[#262626] rounded-2xl p-4 sm:p-5 shadow-lg space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[20px] font-bold tracking-tight text-white">{owner.name}</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#22c55e]/15 text-[#22c55e] border border-[#22c55e]/30">
                <CheckCircle2 className="w-3 h-3" />
                <span>Approved</span>
              </span>
            </div>

            {vehicle && (
              <p className="text-xs text-[#A3A3A3] mt-1 flex items-center gap-2">
                <span className="font-mono text-white font-bold">{vehicle.reg_no}</span>
                <span>·</span>
                <span className="uppercase">{vehicle.vehicle_type}</span>
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Refresh Button */}
            <button
              onClick={() => fetchOffersOrTrips(true)}
              disabled={isRefreshing || isLoading}
              className="p-2.5 rounded-xl bg-transparent hover:bg-white/5 active:bg-white/10 text-white transition-colors border border-white/20 min-h-[44px] min-w-[44px] flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-white cursor-pointer"
              title="Refresh"
              aria-label="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#F59E0B]' : ''}`} />
            </button>

            {/* Sign Out Button */}
            <button
              onClick={onSignOut}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-transparent hover:bg-white/5 border border-white/20 rounded-xl transition-colors min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-white cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs: Offers Inbox vs Accepted Trips */}
        <div className="grid grid-cols-2 p-1 bg-[#0A0A0A] rounded-xl border border-[#262626]">
          <button
            onClick={() => setActiveTab('offered')}
            className={`min-h-[40px] py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'offered'
                ? 'bg-white text-black shadow-sm'
                : 'text-[#A3A3A3] hover:text-white'
            }`}
          >
            <span>Offers Inbox</span>
            {activeTab === 'offered' && items.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-black/20 text-black text-[10px] font-extrabold">
                {items.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('accepted')}
            className={`min-h-[40px] py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'accepted'
                ? 'bg-white text-black shadow-sm'
                : 'text-[#A3A3A3] hover:text-white'
            }`}
          >
            <span>Accepted Trips</span>
            {activeTab === 'accepted' && items.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-black/20 text-black text-[10px] font-extrabold">
                {items.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-red-950/40 border border-[#EF4444]/30 text-red-300 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-[#EF4444] shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* List content */}
      {isLoading ? (
        <div className="p-12 text-center bg-[#141414] border border-[#262626] rounded-2xl space-y-3">
          <Loader2 className="w-7 h-7 animate-spin text-[#F59E0B] mx-auto" />
          <p className="text-sm text-[#A3A3A3]">Loading {activeTab === 'offered' ? 'offers' : 'trips'}...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="p-12 text-center bg-[#141414] border border-[#262626] rounded-2xl space-y-3">
          <div className="w-12 h-12 rounded-full bg-white/5 border border-[#262626] flex items-center justify-center mx-auto text-[#A3A3A3]">
            <Car className="w-6 h-6" />
          </div>
          <p className="text-base font-bold text-white">
            {activeTab === 'offered' ? 'No offers right now' : 'No accepted trips yet'}
          </p>
          <p className="text-xs text-[#A3A3A3] max-w-xs mx-auto">
            {activeTab === 'offered'
              ? 'New outstation ride requests assigned to your vehicle will appear here. Pull down to refresh.'
              : 'Trip offers you accept will show here along with rider name and phone.'}
          </p>
          {activeTab === 'offered' && (
            <button
              onClick={() => fetchOffersOrTrips(true)}
              className="mt-2 text-xs font-bold text-[#F59E0B] hover:text-[#fbbf24] inline-flex items-center gap-1.5 cursor-pointer py-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Check for New Offers</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((row) => {
            const isAcceptedView = activeTab === 'accepted';
            const isProcessing = actionInProgressId === row.assignment_id;
            const bookingStatus = (row.booking_status || '').toLowerCase();

            // 1. Title: from_city → to_city
            const fromCity = row.from_city || 'Rewa';
            const toCity = row.to_city || '';

            // 2. Badge: code
            const bookingCode = row.code || '';

            // 3. Trip line: trip_type ("One Way" or "Round Trip") · vehicle_type in uppercase
            const tripTypeLabel = (row.trip_type || '').toLowerCase() === 'round_trip' 
              ? 'Round Trip' 
              : 'One Way';
            const vehicleTypeLabel = (row.vehicle_type || '').toUpperCase();

            // 4. Scheduled pickup: format scheduled_at in IST
            const scheduledFormatted = row.scheduled_at 
              ? formatISTSchedule(row.scheduled_at) 
              : '';

            // 5. Addresses: pickup_address and drop_address
            const pickupAddr = row.pickup_address || '';
            const dropAddr = row.drop_address || '';

            // 6. Fare: fare_quote as ₹1,234. Show "₹--" only when fare_quote is null. Label it "Guaranteed fare"
            const fareQuote = row.fare_quote;
            const displayFare = fareQuote !== null && fareQuote !== undefined
              ? formatRupees(fareQuote)
              : '₹--';

            return (
              <div
                key={row.assignment_id}
                className="bg-[#141414] border border-[#262626] rounded-2xl p-4 sm:p-5 space-y-4 shadow-lg hover:border-white/20 transition-all"
              >
                {/* Header row: Status badges and Vehicle Pill */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {bookingCode && (
                      <span className="text-xs font-mono font-bold text-white bg-white/10 border border-white/20 px-2 py-0.5 rounded-md">
                        {bookingCode}
                      </span>
                    )}
                    {isAcceptedView ? (
                      bookingStatus === 'confirmed' ? (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                          Confirmed
                        </span>
                      ) : bookingStatus === 'completed' ? (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          Completed
                        </span>
                      ) : bookingStatus === 'cancelled' ? (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/40">
                          Cancelled
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/40 capitalize">
                          {row.booking_status || 'Trip'}
                        </span>
                      )
                    ) : (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/40 animate-pulse">
                        New Offer
                      </span>
                    )}
                  </div>

                  {/* Vehicle Pill */}
                  {vehicleTypeLabel && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/15 text-[11px] font-bold text-white tracking-wider">
                      <Car className="w-3 h-3 text-[#A3A3A3]" />
                      <span>{vehicleTypeLabel}</span>
                      <span className="text-[#A3A3A3] font-normal">· {tripTypeLabel}</span>
                    </span>
                  )}
                </div>

                {/* Route Line & Fare: route line on left, 32px saffron fare on right */}
                <div className="flex items-start justify-between gap-4 pt-1">
                  <div className="flex gap-3">
                    {/* Visual Route Line: filled dot, vertical line, hollow dot */}
                    <div className="flex flex-col items-center pt-1.5">
                      <div className="w-3 h-3 rounded-full bg-white ring-4 ring-white/10 shrink-0" />
                      <div className="w-0.5 h-10 bg-[#262626] my-1" />
                      <div className="w-3 h-3 rounded-full border-2 border-white bg-[#141414] shrink-0" />
                    </div>

                    <div className="space-y-4">
                      <div>
                        <div className="text-[11px] uppercase tracking-wider font-semibold text-[#A3A3A3]">
                          Pickup
                        </div>
                        <div className="text-base font-bold text-white leading-tight">
                          {fromCity}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] uppercase tracking-wider font-semibold text-[#A3A3A3]">
                          Drop
                        </div>
                        <div className="text-base font-bold text-white leading-tight">
                          {toCity || 'Outstation'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Fare on the right, large 32px in saffron */}
                  <div className="text-right shrink-0">
                    <div className="text-[32px] font-bold text-[#F59E0B] tabular-nums leading-none">
                      {displayFare}
                    </div>
                    <div className="text-[11px] text-[#A3A3A3] uppercase tracking-wider font-semibold mt-1">
                      Guaranteed fare
                    </div>
                  </div>
                </div>

                <div className="h-px bg-[#262626]" />

                {/* Scheduled pickup: formatted in IST */}
                {scheduledFormatted && (
                  <div className="flex items-center gap-2.5 text-xs text-zinc-300">
                    <Calendar className="w-4 h-4 text-[#F59E0B] shrink-0" />
                    <div>
                      <span className="text-[#A3A3A3] block text-[11px] uppercase font-semibold tracking-wider">Scheduled Pickup</span>
                      <span className="font-semibold text-white">
                        {scheduledFormatted}
                      </span>
                    </div>
                  </div>
                )}

                {/* Addresses: pickup_address and drop_address */}
                {(pickupAddr || dropAddr) && (
                  <div className="space-y-2 text-xs bg-[#0A0A0A] p-3 rounded-xl border border-[#262626]">
                    {pickupAddr && (
                      <div className="flex items-start gap-2.5">
                        <MapPin className="w-4 h-4 text-white shrink-0 mt-0.5" />
                        <div>
                          <span className="text-[#A3A3A3] block text-[11px] uppercase font-semibold tracking-wider">Pickup Address</span>
                          <span className="text-neutral-200">{pickupAddr}</span>
                          {row.pickup_lat != null && row.pickup_lng != null && (
                            <a
                              href={`https://www.google.com/maps?q=${row.pickup_lat},${row.pickup_lng}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#F59E0B] hover:text-[#fbbf24] transition-colors mt-1 underline underline-offset-2 cursor-pointer"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>Open pickup in Maps</span>
                            </a>
                          )}
                        </div>
                      </div>
                    )}

                    {dropAddr && (
                      <div className="flex items-start gap-2.5">
                        <MapPin className="w-4 h-4 text-[#A3A3A3] shrink-0 mt-0.5" />
                        <div>
                          <span className="text-[#A3A3A3] block text-[11px] uppercase font-semibold tracking-wider">Drop Address</span>
                          <span className="text-neutral-200">{dropAddr}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Rider details: shown in Accepted Trips strictly for confirmed trips; hidden when completed, cancelled, or not confirmed */}
                {isAcceptedView && bookingStatus === 'confirmed' && (
                  <>
                    <div className="h-px bg-[#262626]" />
                    <div className="bg-[#0A0A0A] p-3 rounded-xl border border-emerald-500/30 space-y-2 text-xs animate-in fade-in">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-emerald-400" />
                          <div>
                            <span className="text-[#A3A3A3] text-[11px] uppercase font-semibold block tracking-wider">Rider Name</span>
                            <span className="font-bold text-white text-sm">{row.rider_name || 'Rider'}</span>
                          </div>
                        </div>

                        {row.rider_phone && (
                          <div className="flex items-center gap-2">
                            <a
                              href={`tel:${row.rider_phone}`}
                              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-mono text-xs border border-white/20 min-h-[44px]"
                            >
                              <Phone className="w-3.5 h-3.5 text-emerald-400" />
                              <span>+91 {row.rider_phone}</span>
                            </a>

                            <a
                              href={`https://wa.me/91${row.rider_phone}?text=${encodeURIComponent(
                                `Hello ${row.rider_name || 'Rider'}, I am your Chalo driver for your trip from ${fromCity} to ${toCity}. My vehicle registration is ${vehicle?.reg_no || ''}.`
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                              title="Chat on WhatsApp"
                            >
                              <MessageSquare className="w-4 h-4" />
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* Cancel trip button on confirmed trips only in Accepted Trips; hidden for completed, cancelled, or non-confirmed trips */}
                {isAcceptedView && bookingStatus === 'confirmed' && (
                  <div className="pt-1">
                    {cancelError && cancelError.id === row.assignment_id && (
                      <div className="mb-2 p-2.5 rounded-xl bg-red-950/40 border border-[#EF4444]/40 text-red-200 text-xs flex items-start gap-2">
                        <AlertCircle className="w-3.5 h-3.5 text-[#EF4444] shrink-0 mt-0.5" />
                        <span>{cancelError.message}</span>
                      </div>
                    )}

                    {confirmCancelAssignmentId === row.assignment_id ? (
                      <div className="p-3.5 rounded-xl bg-red-950/40 border border-[#EF4444]/40 space-y-3">
                        <p className="text-xs text-red-200 font-medium leading-relaxed">
                          Cancel this trip? It will go back to the admin for reassignment.
                        </p>
                        <div className="grid grid-cols-2 gap-2.5">
                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() => {
                              setConfirmCancelAssignmentId(null);
                              setCancelError(null);
                            }}
                            className="min-h-[44px] px-3 py-1.5 rounded-xl bg-transparent border border-white/20 text-white text-xs font-medium hover:bg-white/5 flex items-center justify-center transition-colors cursor-pointer"
                          >
                            No, keep it
                          </button>
                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() => handleDriverCancelTrip(row.assignment_id)}
                            className="min-h-[44px] px-3 py-1.5 rounded-xl border border-[#EF4444] bg-[#EF4444] hover:bg-red-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          >
                            {isProcessing ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Cancelling...</span>
                              </>
                            ) : (
                              <span>Yes, cancel</span>
                            )}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => {
                          setConfirmCancelAssignmentId(row.assignment_id);
                          setCancelError(null);
                        }}
                        className="w-full min-h-[48px] rounded-xl border border-[#EF4444] text-[#EF4444] hover:bg-[#EF4444]/10 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Cancel trip</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Accept / Decline Action Buttons (Shown strictly in Offers Inbox) */}
                {!isAcceptedView && (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    {/* Decline Button: secondary border-white/20 */}
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleRespond(row.assignment_id, 'decline')}
                      className="min-h-[52px] rounded-xl bg-transparent border border-white/20 text-white hover:bg-white/5 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      {isProcessing ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <>
                          <X className="w-4 h-4" />
                          <span>Decline</span>
                        </>
                      )}
                    </button>

                    {/* Accept Button: primary white background, black text, 52px tall */}
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleRespond(row.assignment_id, 'accept')}
                      className="h-[52px] rounded-xl bg-white hover:bg-neutral-200 text-black font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Accepting...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4 stroke-[2.5]" />
                          <span>Accept Trip</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
