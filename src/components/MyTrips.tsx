import React, { useState, useEffect, useCallback } from 'react';
import { supabase, CHALO_WHATSAPP_NUMBER } from '../lib/supabase';
import { formatRupees, formatISTSchedule, cleanPhone } from '../utils/format';
import { 
  Car, 
  Bike, 
  Navigation, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Loader2, 
  RefreshCw, 
  Copy, 
  Check, 
  Calendar, 
  MapPin, 
  User, 
  MessageSquare,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import { VehicleIcon } from './VehicleIcons';

export interface MyBookingItem {
  code: string;
  status: string;
  from_city: string;
  to_city: string;
  trip_type: string;
  vehicle_type: string;
  scheduled_at: string;
  pickup_address: string;
  drop_address: string;
  fare_quote: number | null;
  driver_name: string | null;
  vehicle_reg: string | null;
  pickup_lat?: number | null;
  pickup_lng?: number | null;
}

interface MyTripsProps {
  onCheckBooking?: (code: string, phone: string) => void;
  currentUserPhone?: string;
}

export const MyTrips: React.FC<MyTripsProps> = ({ onCheckBooking, currentUserPhone }) => {
  const [trips, setTrips] = useState<MyBookingItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Cancellation state
  const [cancellingCode, setCancellingCode] = useState<string | null>(null);
  const [showCancelConfirmFor, setShowCancelConfirmFor] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<{ code: string; message: string; is2Hour: boolean } | null>(null);

  const fetchTrips = useCallback(async () => {
    setLoading(true);
    setErrorText(null);
    try {
      const { data, error } = await supabase.rpc('get_my_bookings');
      if (error) {
        throw new Error(error.message || 'Failed to load your trips.');
      }
      setTrips(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.warn('get_my_bookings error:', err);
      setErrorText(err.message || 'Could not load your trips. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2500);
    } catch {
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2500);
    }
  };

  const handleCancelBooking = async (tripCode: string) => {
    setCancellingCode(tripCode);
    setCancelError(null);

    try {
      const phoneToUse = cleanPhone(currentUserPhone || '');
      const { data, error } = await supabase.rpc('rider_cancel_booking', {
        p_code: tripCode.trim().toUpperCase(),
        p_phone: phoneToUse,
      });

      if (error) {
        const errorMsg = error.message || 'Failed to cancel booking.';
        const is2Hour = errorMsg.toLowerCase().includes('2 hour') || 
                        errorMsg.toLowerCase().includes('two hour') ||
                        errorMsg.toLowerCase().includes('closed within');
        setCancelError({ code: tripCode, message: errorMsg, is2Hour });
        return;
      }

      setShowCancelConfirmFor(null);
      await fetchTrips();
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to cancel booking.';
      const is2Hour = errorMsg.toLowerCase().includes('2 hour') || 
                      errorMsg.toLowerCase().includes('two hour') ||
                      errorMsg.toLowerCase().includes('closed within');
      setCancelError({ code: tripCode, message: errorMsg, is2Hour });
    } finally {
      setCancellingCode(null);
    }
  };

  // Status Badge Component
  const renderStatusBadge = (statusStr: string) => {
    const s = (statusStr || '').toLowerCase();
    if (s === 'requested') {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30">
          <Clock className="w-3.5 h-3.5" />
          <span>Requested</span>
        </span>
      );
    }
    if (s === 'assigned') {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30">
          <Car className="w-3.5 h-3.5" />
          <span>Assigned</span>
        </span>
      );
    }
    if (s === 'confirmed') {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-[#22c55e]/15 text-[#22c55e] border border-[#22c55e]/30">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Confirmed</span>
        </span>
      );
    }
    if (s === 'completed') {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-[#22c55e]/15 text-[#22c55e] border border-[#22c55e]/30">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Completed</span>
        </span>
      );
    }
    if (s === 'cancelled') {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30">
          <XCircle className="w-3.5 h-3.5" />
          <span>Cancelled</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-neutral-800 text-neutral-300 border border-[#262626] capitalize">
        {statusStr}
      </span>
    );
  };

  // Status message
  const getStatusMessage = (statusStr: string) => {
    const s = (statusStr || '').toLowerCase();
    switch (s) {
      case 'requested':
        return {
          message: "We're finding a driver for you.",
          colorClass: 'bg-[#F59E0B]/10 border-[#F59E0B]/30 text-[#F59E0B]',
          icon: <Clock className="w-4 h-4 text-[#F59E0B] shrink-0" />,
        };
      case 'assigned':
        return {
          message: 'A driver has been assigned and will confirm shortly.',
          colorClass: 'bg-[#F59E0B]/10 border-[#F59E0B]/30 text-[#F59E0B]',
          icon: <Car className="w-4 h-4 text-[#F59E0B] shrink-0" />,
        };
      case 'confirmed':
        return {
          message: 'Your driver is confirmed.',
          colorClass: 'bg-[#22c55e]/10 border-[#22c55e]/30 text-[#22c55e]',
          icon: <CheckCircle2 className="w-4 h-4 text-[#22c55e] shrink-0" />,
        };
      case 'completed':
        return {
          message: 'Trip completed. Thank you for riding with Chalo.',
          colorClass: 'bg-[#22c55e]/10 border-[#22c55e]/30 text-[#22c55e]',
          icon: <CheckCircle2 className="w-4 h-4 text-[#22c55e] shrink-0" />,
        };
      case 'cancelled':
        return {
          message: 'This booking was cancelled.',
          colorClass: 'bg-[#EF4444]/10 border-[#EF4444]/30 text-[#EF4444]',
          icon: <XCircle className="w-4 h-4 text-[#EF4444] shrink-0" />,
        };
      default:
        return {
          message: `Booking status: ${statusStr}`,
          colorClass: 'bg-[#141414] border-[#262626] text-white',
          icon: <Car className="w-4 h-4 text-[#A3A3A3] shrink-0" />,
        };
    }
  };

  return (
    <div className="bg-[#141414] border border-[#262626] rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[20px] font-bold tracking-tight text-white flex items-center gap-2">
            <span>My Trips</span>
            {trips.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white font-mono">
                {trips.length}
              </span>
            )}
          </h2>
          <p className="text-xs text-[#A3A3A3] mt-0.5">
            Bookings saved to your Chalo account
          </p>
        </div>

        <button
          type="button"
          onClick={fetchTrips}
          disabled={loading}
          aria-label="Refresh trips"
          className="p-2 rounded-lg bg-transparent hover:bg-white/5 text-[#A3A3A3] hover:text-white border border-white/10 transition-colors cursor-pointer"
          title="Refresh trips"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#F59E0B]' : ''}`} />
        </button>
      </div>

      {/* Loading state */}
      {loading && trips.length === 0 && (
        <div className="p-8 text-center text-[#A3A3A3] space-y-2">
          <Loader2 className="w-6 h-6 animate-spin text-[#F59E0B] mx-auto" />
          <p className="text-xs">Loading your trips...</p>
        </div>
      )}

      {/* Error state */}
      {errorText && (
        <div className="p-3.5 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/30 text-[#EF4444] text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[#EF4444] shrink-0" />
            <span>{errorText}</span>
          </div>
          <button
            type="button"
            onClick={fetchTrips}
            className="text-white hover:underline font-semibold cursor-pointer shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty State: "No trips yet" */}
      {!loading && trips.length === 0 && !errorText && (
        <div className="p-8 text-center bg-[#0A0A0A] border border-[#262626] rounded-xl space-y-2">
          <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-[#A3A3A3]">
            <Car className="w-6 h-6" />
          </div>
          <p className="text-base font-bold text-white">No trips yet</p>
          <p className="text-xs text-[#A3A3A3] max-w-sm mx-auto">
            Book an outstation cab above. Your confirmed trips and live driver updates will show up here.
          </p>
        </div>
      )}

      {/* Trips List */}
      <div className="space-y-3.5">
        {trips.map((trip) => {
          const statusInfo = getStatusMessage(trip.status);
          const statusLower = (trip.status || '').toLowerCase();
          const canCancel = ['requested', 'assigned', 'confirmed'].includes(statusLower);
          
          // Hours until pickup check
          const scheduledTime = trip.scheduled_at ? new Date(trip.scheduled_at).getTime() : NaN;
          const hoursUntilPickup = !isNaN(scheduledTime) ? (scheduledTime - Date.now()) / (1000 * 60 * 60) : null;
          const isWithin2Hours = hoursUntilPickup !== null && hoursUntilPickup < 2;

          const tripVehicle = (trip.vehicle_type || '').toLowerCase();

          return (
            <div
              key={trip.code}
              className="p-4 sm:p-5 rounded-xl bg-[#0A0A0A] border border-[#262626] space-y-3.5 transition-all"
            >
              {/* Top Row: Code, copy, status badge, vehicle pill, fare */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2 border-b border-[#262626]">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-base font-extrabold tracking-wider text-white">
                    {trip.code}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyCode(trip.code)}
                    className="p-1.5 text-[#A3A3A3] hover:text-white rounded-md transition-colors cursor-pointer"
                    title="Copy code"
                  >
                    {copiedCode === trip.code ? (
                      <Check className="w-3.5 h-3.5 text-[#22c55e]" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                  {renderStatusBadge(trip.status)}
                </div>

                {/* Right: Fare in saffron */}
                <div className="text-right">
                  <span className="text-xl sm:text-2xl font-bold text-[#F59E0B] tabular-nums block leading-none">
                    {formatRupees(trip.fare_quote)}
                  </span>
                  <span className="text-[10px] text-[#A3A3A3] font-medium">Tolls included</span>
                </div>
              </div>

              {/* Status Message Box */}
              <div className={`p-2.5 rounded-lg border text-xs flex items-center gap-2 ${statusInfo.colorClass}`}>
                {statusInfo.icon}
                <span className="font-medium">{statusInfo.message}</span>
              </div>

              {/* Route line & details */}
              <div className="flex items-start gap-3 pt-1">
                <div className="flex flex-col items-center mt-1 shrink-0">
                  <div className="w-2.5 h-2.5 rounded-full bg-white shadow-sm" />
                  <div className="w-0.5 h-7 bg-[#262626] my-0.5" />
                  <div className="w-2.5 h-2.5 rounded-full border-2 border-[#F59E0B] bg-[#141414]" />
                </div>
                <div className="flex-1 space-y-1.5 text-xs">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-[#A3A3A3] block">
                      Pickup ({trip.from_city})
                    </span>
                    <span className="text-white font-medium block">{trip.pickup_address}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-[#A3A3A3] block">
                      Drop ({trip.to_city})
                    </span>
                    <span className="text-white font-medium block">{trip.drop_address}</span>
                  </div>
                </div>
              </div>

              {/* Meta details: Trip type, vehicle, schedule in IST */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1 border-t border-[#262626]">
                <div className="flex items-center gap-2 text-[#A3A3A3]">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] font-bold text-white uppercase tracking-wider">
                    <VehicleIcon vehicle={trip.vehicle_type} className="w-4 h-4 text-[#A3A3A3]" />
                    <span>{trip.vehicle_type}</span>
                  </span>
                  <span className="capitalize text-white font-medium">
                    {trip.trip_type === 'round_trip' ? 'Round Trip' : 'One Way'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-white">
                  <Calendar className="w-3.5 h-3.5 text-[#F59E0B] shrink-0" />
                  <span className="font-medium">{formatISTSchedule(trip.scheduled_at)}</span>
                </div>
              </div>

              {/* Driver & vehicle reg if set */}
              {trip.driver_name && (
                <div className="p-3 bg-[#141414] border border-[#262626] rounded-lg text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-[#A3A3A3] flex items-center gap-1.5">
                      <User className="w-3 h-3 text-[#22c55e]" />
                      <span>Driver Assigned</span>
                    </span>
                    {trip.vehicle_reg && (
                      <span className="font-mono font-bold text-white bg-black/40 px-2 py-0.5 rounded border border-white/10">
                        {trip.vehicle_reg}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-bold text-white">{trip.driver_name}</p>
                </div>
              )}

              {/* Actions on Trip: Check live status and Cancel */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-2">
                {onCheckBooking && (
                  <button
                    type="button"
                    onClick={() => onCheckBooking(trip.code, currentUserPhone || '')}
                    className="text-xs text-white hover:text-[#F59E0B] font-semibold inline-flex items-center gap-1.5 py-1.5 px-2.5 rounded-lg border border-white/20 hover:border-[#F59E0B] transition-colors cursor-pointer"
                  >
                    <span>Check live status</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}

                {canCancel && (
                  <div>
                    {showCancelConfirmFor === trip.code ? (
                      <div className="p-3 bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-xl space-y-2 animate-in fade-in">
                        <div className="flex items-center gap-2 text-[#EF4444] text-xs font-bold">
                          <AlertTriangle className="w-4 h-4 shrink-0" />
                          <span>Cancel booking?</span>
                        </div>
                        <p className="text-xs text-[#A3A3A3]">
                          If a driver is assigned, they will be notified.
                        </p>
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => handleCancelBooking(trip.code)}
                            disabled={cancellingCode === trip.code}
                            className="px-3 py-1.5 bg-[#EF4444] hover:bg-red-600 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer disabled:opacity-50"
                          >
                            {cancellingCode === trip.code ? 'Cancelling...' : 'Yes, cancel'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowCancelConfirmFor(null)}
                            className="px-3 py-1.5 bg-transparent hover:bg-white/10 text-white border border-white/20 rounded-lg text-xs transition-colors cursor-pointer"
                          >
                            No, keep it
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setShowCancelConfirmFor(trip.code);
                          setCancelError(null);
                        }}
                        className="text-xs text-[#EF4444] hover:text-red-300 font-semibold py-1 px-2 border border-[#EF4444]/40 rounded-lg hover:bg-[#EF4444]/10 transition-colors cursor-pointer"
                      >
                        Cancel booking
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* 2-hour rule notice under button if applicable */}
              {canCancel && isWithin2Hours && showCancelConfirmFor !== trip.code && (
                <div className="p-2.5 rounded-lg bg-[#F59E0B]/10 border border-[#F59E0B]/30 text-xs text-[#F59E0B] space-y-1.5">
                  <p>
                    Cancellations are closed within 2 hours of pickup. To cancel now, message Chalo on WhatsApp.
                  </p>
                  <a
                    href={`https://wa.me/${CHALO_WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hello Chalo team, I need to cancel booking ${trip.code} for pickup at ${formatISTSchedule(trip.scheduled_at)}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-black bg-[#F59E0B] hover:bg-amber-400 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Message Chalo on WhatsApp</span>
                  </a>
                </div>
              )}

              {/* Cancel error display */}
              {cancelError && cancelError.code === trip.code && (
                <div className="p-2.5 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/30 text-xs text-[#EF4444] space-y-1.5">
                  <p className="flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{cancelError.message}</span>
                  </p>
                  {cancelError.is2Hour && (
                    <a
                      href={`https://wa.me/${CHALO_WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hello Chalo team, I need to cancel booking ${trip.code}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-black/60 border border-white/20 px-2.5 py-1 rounded-md hover:bg-white/10 transition-colors"
                    >
                      <MessageSquare className="w-3 h-3 text-[#22c55e]" />
                      <span>Message Chalo on WhatsApp</span>
                    </a>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
