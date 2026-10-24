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
  MessageSquare
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
      <div className="bg-[#121820] border border-white/10 rounded-2xl p-4 sm:p-5 shadow-lg space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-white">{owner.name}</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                <CheckCircle2 className="w-3 h-3" />
                <span>You're approved</span>
              </span>
            </div>

            {vehicle && (
              <p className="text-xs text-zinc-400 mt-1 flex items-center gap-2">
                <span className="font-mono text-zinc-200 font-bold">{vehicle.reg_no}</span>
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
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/15 text-zinc-300 transition-colors border border-white/10 min-h-[44px] min-w-[44px] flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 cursor-pointer"
              title="Refresh"
              aria-label="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
            </button>

            {/* Sign Out Button */}
            <button
              onClick={onSignOut}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-300 hover:text-red-200 bg-red-950/40 hover:bg-red-950/60 border border-red-500/30 rounded-xl transition-colors min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs: Offers Inbox vs Accepted Trips */}
        <div className="grid grid-cols-2 p-1 bg-[#0b0f14] rounded-xl border border-white/10">
          <button
            onClick={() => setActiveTab('offered')}
            className={`min-h-[44px] py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'offered'
                ? 'bg-emerald-500 text-black shadow-md'
                : 'text-zinc-400 hover:text-white'
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
            className={`min-h-[44px] py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'accepted'
                ? 'bg-emerald-500 text-black shadow-md'
                : 'text-zinc-400 hover:text-white'
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
        <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-start gap-2.5 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* List content */}
      {isLoading ? (
        <div className="p-12 text-center bg-[#121820] border border-white/10 rounded-2xl space-y-3">
          <Loader2 className="w-7 h-7 animate-spin text-emerald-400 mx-auto" />
          <p className="text-sm text-zinc-400">Loading {activeTab === 'offered' ? 'offers' : 'trips'}...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="p-12 text-center bg-[#121820] border border-white/10 rounded-2xl space-y-3">
          <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-zinc-500">
            <Car className="w-6 h-6" />
          </div>
          <p className="text-base font-semibold text-white">
            {activeTab === 'offered' ? 'No offers right now' : 'No accepted trips yet'}
          </p>
          <p className="text-xs text-zinc-400 max-w-xs mx-auto">
            {activeTab === 'offered'
              ? 'New outstation ride requests assigned to your vehicle will appear here. Pull down to refresh.'
              : 'Trip offers you accept will show here along with rider name and phone.'}
          </p>
          {activeTab === 'offered' && (
            <button
              onClick={() => fetchOffersOrTrips(true)}
              className="mt-2 text-xs font-semibold text-emerald-400 hover:text-emerald-300 underline inline-flex items-center gap-1.5 cursor-pointer py-1"
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
            const routeTitle = toCity ? `${fromCity} → ${toCity}` : fromCity;

            // 2. Badge: code
            const bookingCode = row.code || '';

            // 3. Trip line: trip_type ("One Way" or "Round Trip") · vehicle_type in uppercase
            const tripTypeLabel = (row.trip_type || '').toLowerCase() === 'round_trip' 
              ? 'Round Trip' 
              : 'One Way';
            const vehicleTypeLabel = (row.vehicle_type || '').toUpperCase();
            const tripLine = vehicleTypeLabel 
              ? `${tripTypeLabel} · ${vehicleTypeLabel}` 
              : tripTypeLabel;

            // 4. Scheduled pickup: format scheduled_at in IST
            const scheduledFormatted = row.scheduled_at 
              ? formatISTSchedule(row.scheduled_at) 
              : '';

            // 5. Addresses: pickup_address and drop_address
            const pickupAddr = row.pickup_address || '';
            const dropAddr = row.drop_address || '';

            // 6. Fare: fare_quote as ₹1,234. Show "₹--" only when fare_quote is null. Label it "Guaranteed Fare"
            const fareQuote = row.fare_quote;
            const displayFare = fareQuote !== null && fareQuote !== undefined
              ? formatRupees(fareQuote)
              : '₹--';

            return (
              <div
                key={row.assignment_id}
                className="bg-[#121820] border border-white/10 rounded-2xl p-4 sm:p-5 space-y-4 shadow-lg hover:border-white/20 transition-all"
              >
                {/* Route & Fare Header */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    {/* Badges: code & booking status */}
                    <div className="flex items-center gap-2">
                      {bookingCode && (
                        <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded">
                          {bookingCode}
                        </span>
                      )}
                      {isAcceptedView ? (
                        bookingStatus === 'confirmed' ? (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            Confirmed
                          </span>
                        ) : bookingStatus === 'completed' ? (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                            Completed
                          </span>
                        ) : bookingStatus === 'cancelled' ? (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/40">
                            Cancelled
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 capitalize">
                            {row.booking_status || 'Trip'}
                          </span>
                        )
                      ) : (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                          New Offer
                        </span>
                      )}
                    </div>

                    {/* Title: from_city → to_city */}
                    <h2 className="text-base font-extrabold text-white mt-1.5">
                      {routeTitle}
                    </h2>

                    {/* Trip line: trip_type · vehicle_type in uppercase */}
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {tripLine}
                    </p>
                  </div>

                  {/* Fare: fare_quote as ₹1,234. Label it "Guaranteed Fare" */}
                  <div className="text-right shrink-0">
                    <span className="text-xl font-extrabold text-emerald-400 tabular-nums">
                      {displayFare}
                    </span>
                    <p className="text-[10px] text-zinc-400 font-medium">Guaranteed Fare</p>
                  </div>
                </div>

                <div className="h-px bg-white/5" />

                {/* Scheduled pickup: formatted in IST */}
                {scheduledFormatted && (
                  <div className="flex items-center gap-2.5 text-xs text-zinc-300">
                    <Calendar className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <span className="text-zinc-500 block text-[10px] uppercase font-semibold">Scheduled Pickup</span>
                      <span className="font-semibold text-white">
                        {scheduledFormatted}
                      </span>
                    </div>
                  </div>
                )}

                {/* Addresses: pickup_address and drop_address */}
                {(pickupAddr || dropAddr) && (
                  <div className="space-y-2 text-xs">
                    {pickupAddr && (
                      <div className="flex items-start gap-2.5">
                        <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-zinc-500 block text-[10px] uppercase font-semibold">Pickup Address</span>
                          <span className="text-zinc-200">{pickupAddr}</span>
                        </div>
                      </div>
                    )}

                    {dropAddr && (
                      <div className="flex items-start gap-2.5">
                        <MapPin className="w-4 h-4 text-white shrink-0 mt-0.5" />
                        <div>
                          <span className="text-zinc-500 block text-[10px] uppercase font-semibold">Drop Address</span>
                          <span className="text-zinc-200">{dropAddr}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Rider details: shown in Accepted Trips strictly for confirmed trips; hidden when completed, cancelled, or not confirmed */}
                {isAcceptedView && bookingStatus === 'confirmed' && (
                  <>
                    <div className="h-px bg-white/5" />
                    <div className="bg-[#0b0f14] p-3 rounded-xl border border-emerald-500/30 space-y-2 text-xs animate-in fade-in">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-emerald-400" />
                          <div>
                            <span className="text-zinc-500 text-[10px] block">Rider Name</span>
                            <span className="font-bold text-white text-sm">{row.rider_name || 'Rider'}</span>
                          </div>
                        </div>

                        {row.rider_phone && (
                          <div className="flex items-center gap-2">
                            <a
                              href={`tel:${row.rider_phone}`}
                              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white font-mono text-xs border border-white/10 min-h-[44px]"
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
                              className="p-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
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

                {/* Accept / Decline Action Buttons (Shown strictly in Offers Inbox) */}
                {!isAcceptedView && (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    {/* Decline Button: respond_to_offer action='decline' */}
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleRespond(row.assignment_id, 'decline')}
                      className="min-h-[46px] rounded-xl bg-white/5 hover:bg-red-950/40 active:bg-red-950/60 border border-white/10 hover:border-red-500/40 text-zinc-300 hover:text-red-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
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

                    {/* Accept Button: respond_to_offer action='accept' */}
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleRespond(row.assignment_id, 'accept')}
                      className="min-h-[46px] rounded-xl bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-black font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-950/40 cursor-pointer"
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
