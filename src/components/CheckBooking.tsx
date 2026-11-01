import React, { useState } from 'react';
import { supabase, CHALO_WHATSAPP_NUMBER } from '../lib/supabase';
import { formatRupees, formatISTSchedule, cleanPhone, isValidIndianPhone } from '../utils/format';
import { 
  Search, 
  ArrowLeft, 
  Calendar, 
  MapPin, 
  Car, 
  User, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  XCircle, 
  Loader2, 
  RefreshCw,
  Phone,
  ShieldCheck,
  FileQuestion,
  AlertTriangle,
  MessageSquare,
  ExternalLink
} from 'lucide-react';

export interface BookingLookupResult {
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

interface CheckBookingProps {
  onBack: () => void;
  initialCode?: string;
  initialPhone?: string;
}

export const CheckBooking: React.FC<CheckBookingProps> = ({ 
  onBack, 
  initialCode = '', 
  initialPhone = '' 
}) => {
  const [code, setCode] = useState<string>(initialCode.trim().toUpperCase());
  const [phone, setPhone] = useState<string>(initialPhone.trim());
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [booking, setBooking] = useState<BookingLookupResult | null>(null);

  // Cancellation state
  const [showCancelConfirm, setShowCancelConfirm] = useState<boolean>(false);
  const [isCancelling, setIsCancelling] = useState<boolean>(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [is2HourRule, setIs2HourRule] = useState<boolean>(false);

  // Auto-format booking code: 6 alphanumeric uppercase characters
  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    setCode(raw);
    if (errorText) setErrorText(null);
    setShowCancelConfirm(false);
    setCancelError(null);
    setIs2HourRule(false);
  };

  // Phone input: clean to 10 digits
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 10);
    setPhone(raw);
    if (errorText) setErrorText(null);
    setShowCancelConfirm(false);
    setCancelError(null);
    setIs2HourRule(false);
  };

  const cleanedPhone = cleanPhone(phone);
  const isCodeValid = code.trim().length === 6;
  const isPhoneValid = isValidIndianPhone(cleanedPhone);
  const isFormValid = isCodeValid && isPhoneValid;

  const performLookup = async (lookupCode: string, lookupPhone: string) => {
    setIsLoading(true);
    setErrorText(null);
    setHasSearched(true);
    setShowCancelConfirm(false);
    setCancelError(null);
    setIs2HourRule(false);

    try {
      const { data, error } = await supabase.rpc('lookup_booking', {
        p_code: lookupCode.trim().toUpperCase(),
        p_phone: cleanPhone(lookupPhone),
      });

      if (error) {
        throw new Error(error.message || 'Failed to check booking status.');
      }

      // Check if any row was returned
      if (!data || (Array.isArray(data) && data.length === 0)) {
        setBooking(null);
      } else {
        const row = Array.isArray(data) ? data[0] : data;
        setBooking(row as BookingLookupResult);
      }
    } catch (err: any) {
      console.warn('lookup_booking error:', err);
      setErrorText(err.message || 'Failed to lookup booking. Please check your network and try again.');
      setBooking(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;
    performLookup(code, phone);
  };

  // Compute hoursUntilPickup = (scheduled_at - now) in hours
  const hoursUntilPickup = (() => {
    if (!booking?.scheduled_at) return null;
    const scheduledTime = new Date(booking.scheduled_at).getTime();
    if (isNaN(scheduledTime)) return null;
    return (scheduledTime - Date.now()) / (1000 * 60 * 60);
  })();

  const isWithin2Hours = hoursUntilPickup !== null && hoursUntilPickup < 2;

  const whatsappCancelUrl = `https://wa.me/${CHALO_WHATSAPP_NUMBER}?text=${encodeURIComponent(
    `Hello Chalo Support, I need to cancel booking #${booking?.code || code} (${booking?.from_city || 'Rewa'} to ${booking?.to_city || ''}). Phone: ${phone}`
  )}`;

  // Handle rider booking cancellation
  const handleConfirmCancel = async () => {
    if (!booking) return;

    setIsCancelling(true);
    setCancelError(null);
    setIs2HourRule(false);

    const lookupCode = code.trim().toUpperCase();
    const lookupPhone = cleanPhone(phone);

    try {
      const { data, error } = await supabase.rpc('rider_cancel_booking', {
        p_code: lookupCode,
        p_phone: lookupPhone,
      });

      if (error) {
        throw error;
      }

      // Check if data returned an error payload
      if (data && typeof data === 'object' && (data as any).error) {
        throw new Error((data as any).error);
      }

      // Success: Optimistically set status to cancelled and refresh lookup
      setBooking((prev) => (prev ? { ...prev, status: 'cancelled' } : null));
      setShowCancelConfirm(false);
      setCancelError(null);
      setIs2HourRule(false);

      // Refresh latest data from database
      await performLookup(lookupCode, lookupPhone);
    } catch (err: any) {
      console.warn('rider_cancel_booking error:', err);
      const rawMsg = err?.message || err?.error_description || 'Failed to cancel booking.';
      const is2Hr = 
        rawMsg.toLowerCase().includes('2 hour') || 
        rawMsg.toLowerCase().includes('2-hour') || 
        rawMsg.toLowerCase().includes('two hour') ||
        rawMsg.toLowerCase().includes('within 2') ||
        rawMsg.toLowerCase().includes('closed within') ||
        isWithin2Hours;

      if (is2Hr) {
        setCancelError(
          rawMsg.toLowerCase().includes('2 hour') || rawMsg.toLowerCase().includes('closed within')
            ? rawMsg
            : 'Cancellations are closed within 2 hours of pickup. Please call the Chalo team on WhatsApp.'
        );
        setIs2HourRule(true);
      } else {
        setCancelError(rawMsg);
        setIs2HourRule(false);
      }
    } finally {
      setIsCancelling(false);
    }
  };

  // Status Badge Component
  const renderStatusBadge = (statusStr: string) => {
    const s = (statusStr || '').toLowerCase();
    if (s === 'requested') {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
          <Clock className="w-3.5 h-3.5" />
          <span>Requested</span>
        </span>
      );
    }
    if (s === 'assigned') {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/40">
          <Car className="w-3.5 h-3.5" />
          <span>Assigned</span>
        </span>
      );
    }
    if (s === 'confirmed') {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Confirmed</span>
        </span>
      );
    }
    if (s === 'completed') {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-zinc-700/60 text-zinc-300 border border-white/10">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Completed</span>
        </span>
      );
    }
    if (s === 'cancelled') {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-red-500/20 text-red-300 border border-red-500/40">
          <XCircle className="w-3.5 h-3.5" />
          <span>Cancelled</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700 capitalize">
        {statusStr}
      </span>
    );
  };

  // Status message text
  const getStatusMessage = (statusStr: string) => {
    const s = (statusStr || '').toLowerCase();
    switch (s) {
      case 'requested':
        return {
          message: "We're finding a driver for you.",
          colorClass: 'bg-amber-950/40 border-amber-500/30 text-amber-200',
          icon: <Clock className="w-4 h-4 text-amber-400 shrink-0" />,
        };
      case 'assigned':
        return {
          message: 'A driver has been assigned and will confirm shortly.',
          colorClass: 'bg-sky-950/40 border-sky-500/30 text-sky-200',
          icon: <Car className="w-4 h-4 text-sky-400 shrink-0" />,
        };
      case 'confirmed':
        return {
          message: 'Your driver is confirmed.',
          colorClass: 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200',
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />,
        };
      case 'completed':
        return {
          message: 'Trip completed. Thank you for riding with Chalo.',
          colorClass: 'bg-zinc-900 border-white/10 text-zinc-300',
          icon: <CheckCircle2 className="w-4 h-4 text-zinc-400 shrink-0" />,
        };
      case 'cancelled':
        return {
          message: 'This booking was cancelled.',
          colorClass: 'bg-red-950/40 border-red-500/30 text-red-200',
          icon: <XCircle className="w-4 h-4 text-red-400 shrink-0" />,
        };
      default:
        return {
          message: `Booking status: ${statusStr}`,
          colorClass: 'bg-[#121820] border-white/10 text-zinc-300',
          icon: <ShieldCheck className="w-4 h-4 text-zinc-400 shrink-0" />,
        };
    }
  };

  // Show "Cancel booking" button only when status is 'requested', 'assigned' or 'confirmed'
  // Keep it out of completed and cancelled states
  const statusLower = (booking?.status || '').toLowerCase();
  const canCancel = ['requested', 'assigned', 'confirmed'].includes(statusLower);

  return (
    <div className="w-full max-w-xl mx-auto space-y-5 animate-in fade-in duration-200 pb-10">
      {/* Back button */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors min-h-[44px] py-1 px-2 rounded-lg cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Book a Cab</span>
        </button>
      </div>

      {/* Hero Header */}
      <div className="space-y-1.5 text-left">
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-3 py-0.5 rounded-full">
          <Search className="w-3 h-3" />
          <span>Live Ride Tracker</span>
        </div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">
          Check My Booking
        </h1>
        <p className="text-xs text-zinc-400">
          Enter your 6-character booking code and registered 10-digit mobile number to view live status.
        </p>
      </div>

      {/* Lookup Form Card */}
      <form onSubmit={handleSubmit} className="bg-[#121820] border border-white/10 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Booking Code Input */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Booking Code
            </label>
            <div className="relative">
              <input
                type="text"
                value={code}
                onChange={handleCodeChange}
                maxLength={6}
                placeholder="e.g. 571D1D"
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck="false"
                className="w-full px-3.5 py-3 rounded-xl bg-[#0b0f14] border border-white/15 text-white font-mono font-bold text-sm tracking-wider uppercase placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[48px]"
              />
              {code.length === 6 && (
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              )}
            </div>
            <p className="text-[10px] text-zinc-500 mt-1">6-character alphanumeric code</p>
          </div>

          {/* Mobile Number Input */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Mobile Number
            </label>
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400 font-mono">
                +91
              </div>
              <input
                type="tel"
                value={phone}
                onChange={handlePhoneChange}
                maxLength={10}
                placeholder="10-digit number"
                className="w-full pl-12 pr-10 py-3 rounded-xl bg-[#0b0f14] border border-white/15 text-white font-mono text-sm placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[48px]"
              />
              {isPhoneValid && (
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              )}
            </div>
            <p className="text-[10px] text-zinc-500 mt-1">Registered rider phone number</p>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!isFormValid || isLoading}
          className={`w-full min-h-[48px] rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer ${
            isFormValid && !isLoading
              ? 'bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-black shadow-emerald-950/40'
              : 'bg-zinc-800 text-zinc-500 border border-white/5 cursor-not-allowed'
          }`}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Looking up booking...</span>
            </>
          ) : (
            <>
              <Search className="w-4 h-4 stroke-[2.5]" />
              <span>Check Booking Status</span>
            </>
          )}
        </button>
      </form>

      {/* Error Banner if RPC failed */}
      {errorText && (
        <div className="p-4 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-start gap-3 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5 flex-1">
            <p className="font-bold text-white">Error Checking Booking</p>
            <p className="text-zinc-300">{errorText}</p>
          </div>
        </div>
      )}

      {/* No Booking Found Result */}
      {hasSearched && !isLoading && !errorText && !booking && (
        <div className="bg-[#121820] border border-white/10 rounded-2xl p-6 sm:p-7 text-center space-y-4 shadow-xl animate-in fade-in">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
            <FileQuestion className="w-7 h-7 stroke-[2]" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-bold text-white">
              No booking found for this code and number.
            </h2>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto">
              Please double check the 6-character code and the 10-digit phone number entered during booking.
            </p>
          </div>
          <div className="pt-1">
            <button
              type="button"
              onClick={onBack}
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 underline min-h-[44px] px-3 py-1 cursor-pointer"
            >
              Need to book a new cab? Click here
            </button>
          </div>
        </div>
      )}

      {/* Booking Found Details Card */}
      {hasSearched && !isLoading && booking && (
        <div className="bg-[#121820] border border-white/10 rounded-2xl p-4 sm:p-6 space-y-5 shadow-xl animate-in fade-in">
          {/* Card Top: Code & Status Badge */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-[10px] text-zinc-500 block uppercase font-bold tracking-wider">Booking Code</span>
              <span className="text-lg font-mono font-extrabold text-emerald-400">
                #{booking.code}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {renderStatusBadge(booking.status)}
              <button
                type="button"
                onClick={() => performLookup(code, phone)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors border border-white/10 min-h-[38px] min-w-[38px] flex items-center justify-center cursor-pointer"
                title="Refresh Status"
                aria-label="Refresh Status"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Status Message Banner */}
          {(() => {
            const statusInfo = getStatusMessage(booking.status);
            return (
              <div className={`p-3.5 rounded-xl border flex items-center gap-3 text-xs font-medium ${statusInfo.colorClass}`}>
                {statusInfo.icon}
                <span className="font-semibold">{statusInfo.message}</span>
              </div>
            );
          })()}

          {/* Route & Trip Details */}
          <div className="p-4 rounded-xl bg-[#0b0f14] border border-white/5 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[10px] text-zinc-500 uppercase font-semibold block">Route</span>
                <p className="text-base font-extrabold text-white">
                  {booking.from_city || 'Rewa'} → {booking.to_city}
                </p>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {(booking.trip_type || '').toLowerCase() === 'round_trip' ? 'Round Trip' : 'One Way'} · {(booking.vehicle_type || '').toUpperCase()}
                </p>
              </div>

              {/* Fare Display: formatted as ₹1,234 */}
              <div className="text-right shrink-0">
                <span className="text-[10px] text-zinc-500 uppercase font-semibold block">Fare</span>
                <span className="text-xl font-extrabold text-emerald-400 tabular-nums">
                  {formatRupees(booking.fare_quote)}
                </span>
                <span className="text-[10px] text-zinc-400 block">Pay after ride</span>
              </div>
            </div>

            <div className="h-px bg-white/5" />

            {/* Scheduled pickup time in IST */}
            {booking.scheduled_at && (
              <div className="flex items-center gap-2.5 text-xs text-zinc-300">
                <Calendar className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase font-semibold block">Scheduled Pickup (IST)</span>
                  <span className="font-semibold text-white">
                    {formatISTSchedule(booking.scheduled_at)}
                  </span>
                </div>
              </div>
            )}

            {/* Pickup & Drop Addresses */}
            <div className="space-y-2 pt-1 text-xs">
              {booking.pickup_address && (
                <div className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] text-zinc-500 uppercase font-semibold block">Pickup Location</span>
                    <span className="text-zinc-200">{booking.pickup_address}</span>
                    {booking.pickup_lat != null && booking.pickup_lng != null && (
                      <a
                        href={`https://www.google.com/maps?q=${booking.pickup_lat},${booking.pickup_lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors mt-1 underline underline-offset-2 cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Open pickup in Maps</span>
                      </a>
                    )}
                  </div>
                </div>
              )}

              {booking.drop_address && (
                <div className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-white shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] text-zinc-500 uppercase font-semibold block">Drop Location</span>
                    <span className="text-zinc-200">{booking.drop_address}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Driver & Vehicle Details: ONLY if driver_name or vehicle_reg are not null */}
          {(booking.driver_name !== null || booking.vehicle_reg !== null) && (
            <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-2 text-xs">
              <span className="text-[10px] text-emerald-400 uppercase font-bold tracking-wider block">
                Assigned Driver & Vehicle
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {booking.driver_name !== null && (
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-400 block">Driver Name</span>
                      <span className="font-bold text-white text-sm">{booking.driver_name}</span>
                    </div>
                  </div>
                )}

                {booking.vehicle_reg !== null && (
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                      <Car className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-400 block">Vehicle Reg No</span>
                      <span className="font-mono font-bold text-white text-sm uppercase">{booking.vehicle_reg}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Cancel Booking Section (only when status is requested, assigned, or confirmed) */}
          {canCancel && (
            <div className="pt-1 space-y-3">
              {!showCancelConfirm ? (
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCancelConfirm(true);
                      setCancelError(null);
                      setIs2HourRule(false);
                    }}
                    className="w-full min-h-[44px] rounded-xl bg-red-950/30 hover:bg-red-900/40 active:bg-red-900/60 border border-red-500/30 text-red-300 hover:text-red-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <XCircle className="w-4 h-4 text-red-400" />
                    <span>Cancel booking</span>
                  </button>

                  {/* Note under button when hoursUntilPickup is less than 2 */}
                  {isWithin2Hours && (
                    <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-2.5 animate-in fade-in">
                      <div className="flex items-start gap-2.5 text-amber-200">
                        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <p className="leading-relaxed">
                          Cancellations are closed within 2 hours of pickup. To cancel now, message Chalo on WhatsApp.
                        </p>
                      </div>
                      <a
                        href={whatsappCancelUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full min-h-[44px] px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-semibold text-xs rounded-lg flex items-center justify-center gap-2 transition-colors shadow-md cursor-pointer"
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span>Message Chalo on WhatsApp</span>
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/30 space-y-3 animate-in fade-in">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-bold text-white">Cancel booking?</h4>
                      <p className="text-xs text-zinc-300 leading-relaxed">
                        If a driver is assigned, they will be notified.
                      </p>
                    </div>
                  </div>

                  {/* Cancel Error Banner if cancellation RPC failed */}
                  {cancelError && (
                    <div className="p-3 rounded-lg bg-red-950/80 border border-red-500/50 text-xs text-red-200 space-y-2 animate-in fade-in">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                        <p className="leading-relaxed">{cancelError}</p>
                      </div>

                      {/* WhatsApp Button for 2-hour rule */}
                      {(is2HourRule || isWithin2Hours) && (
                        <a
                          href={whatsappCancelUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full min-h-[44px] px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-semibold text-xs rounded-lg flex items-center justify-center gap-2 transition-colors shadow-md cursor-pointer mt-1"
                        >
                          <MessageSquare className="w-4 h-4" />
                          <span>Message Chalo on WhatsApp</span>
                        </a>
                      )}
                    </div>
                  )}

                  {/* Actions: Yes, cancel & No, keep it */}
                  <div className="flex items-center gap-2.5 pt-1">
                    <button
                      type="button"
                      disabled={isCancelling}
                      onClick={handleConfirmCancel}
                      className="flex-1 min-h-[44px] rounded-xl bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md shadow-red-950/40"
                    >
                      {isCancelling ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Cancelling booking...</span>
                        </>
                      ) : (
                        <span>Yes, cancel</span>
                      )}
                    </button>

                    <button
                      type="button"
                      disabled={isCancelling}
                      onClick={() => {
                        setShowCancelConfirm(false);
                        setCancelError(null);
                        setIs2HourRule(false);
                      }}
                      className="flex-1 min-h-[44px] rounded-xl bg-white/10 hover:bg-white/15 active:bg-white/20 text-zinc-200 hover:text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-white/10"
                    >
                      <span>No, keep it</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Quick Navigation Actions */}
          <div className="pt-1 flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="flex-1 min-h-[44px] rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/15 border border-white/10 text-zinc-200 font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Booking</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setCode('');
                setPhone('');
                setBooking(null);
                setHasSearched(false);
                setShowCancelConfirm(false);
                setCancelError(null);
                setIs2HourRule(false);
              }}
              className="min-h-[44px] px-4 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border border-white/10 text-xs font-semibold transition-colors cursor-pointer"
            >
              Check Another
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
