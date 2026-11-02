import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  Copy, 
  Check, 
  MapPin, 
  Calendar, 
  Car, 
  User, 
  Phone, 
  MessageSquare, 
  ArrowLeft,
  Share2,
  ExternalLink,
  X,
  LogIn,
  AlertCircle,
  Loader2,
  ShieldCheck
} from 'lucide-react';
import { formatRupees, formatFriendlyDate, cleanPhone } from '../utils/format';
import { VehicleType, TripType, supabase, CHALO_WHATSAPP_NUMBER } from '../lib/supabase';
import { RiderAuthModal } from './RiderAuthModal';
import { VehicleIcon } from './VehicleIcons';

interface ConfirmationScreenProps {
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
  onBookAnother: () => void;
  onCheckBooking?: (code: string, phone: string) => void;
  isGuestBooking?: boolean;
}

export const ConfirmationScreen: React.FC<ConfirmationScreenProps> = ({
  bookingCode,
  fare,
  riderName,
  riderPhone,
  pickupAddress,
  dropAddress,
  fromCity,
  toCity,
  vehicleType,
  tripType,
  pickupWhen,
  pickupLat,
  pickupLng,
  onBookAnother,
  onCheckBooking,
  isGuestBooking = false,
}) => {
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);

  // Rider Account & Claim State
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [isSavedToAccount, setIsSavedToAccount] = useState<boolean>(!isGuestBooking);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [showSaveModal, setShowSaveModal] = useState<boolean>(false);
  const [claimCode, setClaimCode] = useState<string>(bookingCode);
  const [claimPhone, setClaimPhone] = useState<string>(riderPhone);
  const [isClaiming, setIsClaiming] = useState<boolean>(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Check auth status on mount and trigger Save Trip pop-up ONLY when made as guest AND not signed in
  useEffect(() => {
    let isMounted = true;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!isMounted) return;
      setCurrentUser(user);

      if (!isGuestBooking || user) {
        // If booked while signed in, skip pop-up and mark saved
        setIsSavedToAccount(true);
      } else if (isGuestBooking && !user) {
        // Show Save Trip to Account pop-up ONLY when booking was made as a guest AND rider is not signed in now
        setShowSaveModal(true);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      const user = session?.user || null;
      setCurrentUser(user);
      if (user) {
        if (!isSavedToAccount) {
          // Once signed in, allow linking
          setShowSaveModal(true);
        } else {
          setIsSavedToAccount(true);
        }
      }
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [isGuestBooking, isSavedToAccount]);

  const handleClaimBooking = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!claimCode.trim() || !claimPhone.trim()) {
      setClaimError('Please enter both booking code and phone number.');
      return;
    }

    setIsClaiming(true);
    setClaimError(null);

    try {
      const { data, error } = await supabase.rpc('claim_booking', {
        p_code: claimCode.trim().toUpperCase(),
        p_phone: cleanPhone(claimPhone),
      });

      if (error) {
        const msg = (error.message || '').toLowerCase();
        if (msg.includes('no unclaimed booking matches') || msg.includes('already saved') || msg.includes('already claimed')) {
          setIsSavedToAccount(true);
          setShowSaveModal(false);
          setSuccessToast('Trip is already saved to your account!');
          return;
        }
        throw new Error(error.message || 'Failed to claim booking.');
      }

      setIsSavedToAccount(true);
      setShowSaveModal(false);
      setSuccessToast('Trip saved to your account!');
    } catch (err: any) {
      const msg = (err?.message || '').toLowerCase();
      if (msg.includes('no unclaimed booking matches') || msg.includes('already saved') || msg.includes('already claimed')) {
        setIsSavedToAccount(true);
        setShowSaveModal(false);
        setSuccessToast('Trip is already saved to your account!');
      } else {
        setClaimError(err.message || 'Could not save trip to your account. Please check the code and number.');
      }
    } finally {
      setIsClaiming(false);
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(bookingCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const formattedDate = formatFriendlyDate(pickupWhen);
  const vehicleLabel = 
    vehicleType === 'suv' 
      ? 'SUV (6-7 Seater, AC)' 
      : vehicleType === 'auto'
      ? 'Auto (3 Seater Rickshaw)'
      : vehicleType === 'bike'
      ? 'Bike (Two-Wheeler Taxi)'
      : 'Sedan (4 Seater, AC)';
  const tripLabel = tripType === 'round_trip' ? 'Round Trip' : 'One Way';
  const tripSubLabel = tripType === 'round_trip' ? 'Car stays with you until return' : 'Get dropped off';

  const shareText = `*Chalo Cab Booking Confirmation*\n` +
    `Booking Code: *${bookingCode}*\n` +
    `Route: ${fromCity} ➔ ${toCity} (${tripLabel} · ${tripSubLabel})\n` +
    `Vehicle: ${vehicleLabel}\n` +
    `Pickup Time: ${formattedDate}\n` +
    `Pickup Address: ${pickupAddress}\n` +
    `Drop Address: ${dropAddress}\n` +
    `Rider: ${riderName} (${riderPhone})\n` +
    `Fare: ${formatRupees(fare)} (Pay after trip)\n\n` +
    `Save this code. Our team will confirm your driver on WhatsApp.`;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Chalo Booking ${bookingCode}`,
          text: shareText,
        });
        return;
      } catch {
        // Fallback to clipboard
      }
    }
    await navigator.clipboard.writeText(shareText);
    setShared(true);
    setTimeout(() => setShared(false), 2500);
  };

  const whatsappUrl = `https://wa.me/${CHALO_WHATSAPP_NUMBER}?text=${encodeURIComponent(shareText)}`;

  return (
    <div 
      className="w-full max-w-xl mx-auto space-y-4 animate-in fade-in duration-300"
      style={{ paddingBottom: 'calc(64px + env(safe-area-inset-bottom, 0px))' }}
    >
      {/* Toast Notification */}
      {successToast && (
        <div className="p-3.5 bg-[#22c55e]/15 border border-[#22c55e]/40 rounded-xl text-xs font-semibold text-[#22c55e] flex items-center justify-between gap-2 shadow-lg animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successToast}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setSuccessToast(null)}
            className="text-white hover:text-[#22c55e]"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Confirmation Card */}
      <div className="bg-[#141414] border border-[#262626] rounded-xl p-5 sm:p-6 text-center shadow-xl relative overflow-hidden">
        {/* Success Icon */}
        <div className="w-14 h-14 bg-[#22c55e]/10 border border-[#22c55e]/30 rounded-full flex items-center justify-center mx-auto mb-3.5 text-[#22c55e]">
          <CheckCircle2 className="w-8 h-8 stroke-[2.2]" />
        </div>

        <h1 className="text-[28px] font-bold tracking-tight text-white leading-tight">
          Booking Confirmed!
        </h1>
        <p className="text-sm text-[#A3A3A3] mt-1">
          Your outstation cab request has been registered.
        </p>

        {/* Large Booking Code Display */}
        <div className="mt-4 p-4 bg-[#0A0A0A] border border-[#262626] rounded-xl inline-block w-full max-w-sm">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-[#A3A3A3] block mb-1">
            Booking Code
          </span>
          <div className="flex items-center justify-center gap-3">
            <span className="font-mono text-3xl sm:text-4xl font-extrabold tracking-widest text-white select-all">
              {bookingCode}
            </span>
            <button
              onClick={handleCopyCode}
              aria-label="Copy booking code"
              className="p-2.5 rounded-lg bg-transparent hover:bg-white/5 active:bg-white/10 text-white transition-colors border border-white/20 min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
              title="Copy Booking Code"
            >
              {copied ? (
                <Check className="w-5 h-5 text-[#22c55e]" />
              ) : (
                <Copy className="w-5 h-5" />
              )}
            </button>
          </div>
          {copied && (
            <p className="text-xs text-[#22c55e] font-medium mt-1.5 animate-in fade-in">
              Booking code copied to clipboard!
            </p>
          )}
        </div>

        {/* 
          Fare Figure Near Top of Card:
          Directly under the booking code, with label "Tolls, state tax and driver allowance included"
        */}
        <div className="mt-4 pt-4 border-t border-[#262626] flex items-center justify-between text-left">
          <div>
            <span className="text-[11px] uppercase tracking-wider font-semibold text-[#A3A3A3] block">
              Tolls, state tax and driver allowance included
            </span>
            <p className="text-[11px] text-[#A3A3A3] mt-0.5">Pay directly to driver after trip</p>
          </div>
          <div className="text-right shrink-0">
            <span className="text-[32px] font-bold text-[#F59E0B] leading-none tabular-nums block">
              {formatRupees(fare)}
            </span>
          </div>
        </div>

        {/* Saved to your account / Sign in to save this trip section */}
        {currentUser || isSavedToAccount ? (
          <div className="mt-4 p-3 bg-[#22c55e]/10 border border-[#22c55e]/30 rounded-xl flex items-center justify-center gap-2 text-xs font-semibold text-[#22c55e] max-w-sm mx-auto">
            <CheckCircle2 className="w-4 h-4 text-[#22c55e]" />
            <span>Saved to your account</span>
          </div>
        ) : (
          <div className="mt-4 p-3.5 bg-[#0A0A0A] border border-[#262626] rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-left max-w-sm mx-auto">
            <div>
              <p className="text-xs font-bold text-white">Save trip to account</p>
              <p className="text-[11px] text-[#A3A3A3]">Access your trip anytime under My Trips</p>
            </div>
            <button
              type="button"
              onClick={() => setShowSaveModal(true)}
              className="w-full sm:w-auto px-3.5 py-2 bg-transparent hover:bg-white/5 active:bg-white/10 border border-white/20 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0 min-h-[38px]"
            >
              <LogIn className="w-3.5 h-3.5 text-[#F59E0B]" />
              <span>Save trip to account</span>
            </button>
          </div>
        )}

        {/* WhatsApp Driver Confirmation Notice */}
        <div className="mt-4 p-3.5 bg-[#0A0A0A] border border-[#262626] rounded-xl text-left flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center shrink-0 text-[#F59E0B] mt-0.5">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">
              Save this code. Our team will confirm your driver on WhatsApp.
            </p>
            <p className="text-xs text-[#A3A3A3] mt-0.5">
              We verify driver details and vehicle registration numbers directly with you before departure.
            </p>
          </div>
        </div>

        {/* Full Included & Not Included lists below with hanging indents */}
        <div className="mt-4 pt-4 border-t border-[#262626] space-y-4 text-left">
          {/* Included in your fare */}
          <div>
            <h4 className="text-[11px] uppercase tracking-wider font-semibold text-[#22c55e] flex items-center gap-1.5 mb-2.5">
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Included in your fare</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#A3A3A3]">
              <div className="flex items-start gap-2.5 text-left">
                <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] shrink-0 mt-1.5" />
                <span className="flex-1 text-left">AC vehicle and driver</span>
              </div>
              <div className="flex items-start gap-2.5 text-left">
                <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] shrink-0 mt-1.5" />
                <span className="flex-1 text-left">Fuel</span>
              </div>
              <div className="flex items-start gap-2.5 text-left">
                <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] shrink-0 mt-1.5" />
                <span className="flex-1 text-left">Tolls (included in the fare)</span>
              </div>
              <div className="flex items-start gap-2.5 text-left">
                <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] shrink-0 mt-1.5" />
                <span className="flex-1 text-left">State tax</span>
              </div>
              <div className="flex items-start gap-2.5 text-left">
                <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] shrink-0 mt-1.5" />
                <span className="flex-1 text-left">Permits</span>
              </div>
              <div className="flex items-start gap-2.5 text-left">
                <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] shrink-0 mt-1.5" />
                <span className="flex-1 text-left">Driver allowance</span>
              </div>
            </div>
          </div>

          {/* Not included with left-aligned hanging indent */}
          <div>
            <h4 className="text-[11px] uppercase tracking-wider font-semibold text-[#EF4444] flex items-center gap-1.5 mb-2.5">
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
                <span className="flex-1 text-left leading-relaxed">
                  Extra kilometres beyond the route: ₹17/km for Sedan, ₹20/km for SUV
                </span>
              </div>
              <div className="flex items-start gap-2.5 text-left">
                <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444] shrink-0 mt-1.5" />
                <span className="flex-1 text-left leading-relaxed">
                  Extra hours beyond the booked time: ₹100/hr for Sedan, ₹150/hr for SUV
                </span>
              </div>
              <div className="flex items-start gap-2.5 text-left">
                <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444] shrink-0 mt-1.5" />
                <span className="flex-1 text-left leading-relaxed">
                  Night travel after 11 PM: ₹200 per night
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Ride Details Card: Route line, vehicle pill */}
      <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[20px] font-bold tracking-tight text-white">
            Trip Summary
          </h2>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 border border-white/20 text-[10px] font-bold text-white uppercase tracking-wider">
            <VehicleIcon vehicle={vehicleType} className="w-4 h-4 text-[#A3A3A3]" />
            <span>{vehicleType}</span>
          </span>
        </div>

        {/* Route line */}
        <div className="flex items-start gap-3 pt-1">
          <div className="flex flex-col items-center mt-1 shrink-0">
            {/* Pickup filled dot */}
            <div className="w-2.5 h-2.5 rounded-full bg-white shadow-sm" />
            {/* Vertical line */}
            <div className="w-0.5 h-7 bg-[#262626] my-0.5" />
            {/* Drop hollow dot */}
            <div className="w-2.5 h-2.5 rounded-full border-2 border-[#F59E0B] bg-[#141414]" />
          </div>
          <div className="flex-1 space-y-2">
            <div>
              <p className="text-[11px] uppercase tracking-wider font-semibold text-[#A3A3A3]">Pickup</p>
              <p className="text-sm font-bold text-white">{fromCity}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider font-semibold text-[#A3A3A3]">Drop</p>
              <p className="text-sm font-bold text-white">{toCity}</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-[#0A0A0A] border border-[#262626] text-white block">
              {tripLabel}
            </span>
            <span className="text-[10px] text-[#A3A3A3] mt-1 block">
              {tripSubLabel}
            </span>
          </div>
        </div>

        <div className="h-px bg-[#262626]" />

        {/* Vehicle & Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2.5 text-zinc-300">
            <VehicleIcon vehicle={vehicleType} className="w-5 h-4 text-[#A3A3A3] shrink-0" />
            <div>
              <p className="text-[11px] uppercase tracking-wider font-semibold text-[#A3A3A3]">Vehicle Type</p>
              <p className="font-medium text-white">{vehicleLabel}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 text-zinc-300">
            <Calendar className="w-4 h-4 text-[#F59E0B] shrink-0" />
            <div>
              <p className="text-[11px] uppercase tracking-wider font-semibold text-[#A3A3A3]">Pickup Date & Time</p>
              <p className="font-medium text-white">{formattedDate}</p>
            </div>
          </div>
        </div>

        <div className="h-px bg-[#262626]" />

        {/* Addresses */}
        <div className="space-y-2.5 text-sm">
          <div className="flex items-start gap-2.5">
            <MapPin className="w-4 h-4 text-white shrink-0 mt-0.5" />
            <div>
              <p className="text-[11px] uppercase tracking-wider font-semibold text-[#A3A3A3]">Pickup Address</p>
              <p className="text-white font-medium">{pickupAddress}</p>
              {pickupLat != null && pickupLng != null && (
                <a
                  href={`https://www.google.com/maps?q=${pickupLat},${pickupLng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#F59E0B] hover:text-white transition-colors mt-1 underline underline-offset-2 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open pickup in Maps</span>
                </a>
              )}
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <MapPin className="w-4 h-4 text-[#F59E0B] shrink-0 mt-0.5" />
            <div>
              <p className="text-[11px] uppercase tracking-wider font-semibold text-[#A3A3A3]">Drop Address</p>
              <p className="text-white font-medium">{dropAddress}</p>
            </div>
          </div>
        </div>

        <div className="h-px bg-[#262626]" />

        {/* Rider */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2.5">
            <User className="w-4 h-4 text-[#A3A3A3] shrink-0" />
            <div>
              <p className="text-[11px] uppercase tracking-wider font-semibold text-[#A3A3A3]">Rider Name</p>
              <p className="text-white font-medium">{riderName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <Phone className="w-4 h-4 text-[#A3A3A3] shrink-0" />
            <div>
              <p className="text-[11px] uppercase tracking-wider font-semibold text-[#A3A3A3]">Contact Number</p>
              <p className="text-white font-medium font-mono">+91 {riderPhone}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3 pt-1">
        {/* Primary 52px WhatsApp button */}
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full h-[52px] bg-white hover:bg-neutral-200 active:bg-neutral-300 text-black font-bold rounded-xl flex items-center justify-center gap-2.5 transition-colors shadow-lg text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <MessageSquare className="w-4 h-4" />
          <span>Save on WhatsApp & Message Us</span>
        </a>

        {onCheckBooking && (
          <button
            type="button"
            onClick={() => onCheckBooking(bookingCode, riderPhone)}
            className="w-full h-[48px] bg-transparent hover:bg-white/5 active:bg-white/10 border border-white/20 text-white font-medium rounded-xl flex items-center justify-center gap-2 text-sm transition-colors cursor-pointer"
          >
            <span>Live Ride Status · Check my booking</span>
          </button>
        )}

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleShare}
            className="h-[48px] bg-transparent hover:bg-white/5 active:bg-white/10 border border-white/20 text-white font-medium rounded-xl flex items-center justify-center gap-2 text-sm transition-colors cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            <span>{shared ? 'Copied Details!' : 'Share Details'}</span>
          </button>

          <button
            onClick={onBookAnother}
            className="h-[48px] bg-transparent hover:bg-white/5 active:bg-white/10 border border-white/20 text-white font-medium rounded-xl flex items-center justify-center gap-2 text-sm transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Book Another Ride</span>
          </button>
        </div>
      </div>

      {/* Rider Auth Modal */}
      <RiderAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode="signin"
        title="Sign in to save this trip"
        subtitle="Sign in to your Chalo account so this trip is saved under My Trips."
        onSuccess={() => {
          setIsAuthModalOpen(false);
          setShowSaveModal(true);
        }}
      />

      {/* 
        Save Trip to Account Pop-up:
        Shown ONLY when booking was made as a guest AND rider is not signed in now.
        Includes Skip button.
      */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-[440px] bg-[#141414] border border-[#262626] rounded-xl shadow-2xl p-5 sm:p-6 relative text-white space-y-4">
            <button
              onClick={() => {
                setShowSaveModal(false);
                setClaimError(null);
              }}
              type="button"
              aria-label="Close"
              className="absolute right-4 top-4 p-2 text-[#A3A3A3] hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1 pr-8 text-left">
              <h2 className="text-[20px] font-bold tracking-tight text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#22c55e]" />
                <span>Save Trip to Account</span>
              </h2>
              <p className="text-xs text-[#A3A3A3]">
                {currentUser 
                  ? 'Confirm your booking code and phone number to link this trip to your account.'
                  : 'Sign in to access your trip anytime under My Trips and receive status updates.'}
              </p>
            </div>

            {claimError && (
              <div className="p-3 bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-xl text-xs text-[#EF4444] flex items-start gap-2 text-left">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="flex-1">{claimError}</span>
              </div>
            )}

            {!currentUser ? (
              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowSaveModal(false);
                    setIsAuthModalOpen(true);
                  }}
                  className="w-full h-[52px] bg-white hover:bg-neutral-200 active:bg-neutral-300 text-black font-bold rounded-xl flex items-center justify-center gap-2 text-sm transition-colors cursor-pointer shadow-lg"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Sign in to save this trip</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowSaveModal(false);
                    setClaimError(null);
                  }}
                  className="w-full h-[44px] bg-transparent hover:bg-white/5 border border-white/20 text-[#A3A3A3] hover:text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Skip
                </button>
              </div>
            ) : (
              <form onSubmit={handleClaimBooking} className="space-y-3.5 pt-1 text-left">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#A3A3A3] mb-1.5">
                    Booking Code
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={claimCode}
                    onChange={(e) => {
                      setClaimCode(e.target.value.toUpperCase().slice(0, 6));
                      setClaimError(null);
                    }}
                    placeholder="e.g. 571D1D"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#0A0A0A] border border-[#262626] text-white font-mono font-bold text-sm tracking-wider uppercase focus:outline-none focus:ring-1 focus:ring-white min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#A3A3A3] mb-1.5">
                    10-Digit Mobile Number
                  </label>
                  <div className="relative flex">
                    <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-[#262626] bg-[#0A0A0A] text-[#A3A3A3] text-sm font-semibold select-none">
                      +91
                    </span>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      value={claimPhone}
                      onChange={(e) => {
                        setClaimPhone(e.target.value.replace(/\D/g, '').slice(0, 10));
                        setClaimError(null);
                      }}
                      placeholder="9876543210"
                      className="w-full px-3.5 py-2.5 rounded-r-lg bg-[#0A0A0A] border border-[#262626] text-white text-sm font-mono focus:outline-none focus:ring-1 focus:ring-white min-h-[44px]"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center gap-2.5">
                  <button
                    type="submit"
                    disabled={isClaiming || !claimCode.trim() || !claimPhone.trim()}
                    className="flex-1 h-[48px] bg-white hover:bg-neutral-200 active:bg-neutral-300 text-black font-bold rounded-xl flex items-center justify-center gap-2 text-sm transition-colors cursor-pointer shadow-lg disabled:opacity-50"
                  >
                    {isClaiming ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Saving trip...</span>
                      </>
                    ) : (
                      <span>Save to my account</span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowSaveModal(false);
                      setClaimError(null);
                    }}
                    className="h-[48px] px-4 bg-transparent hover:bg-white/5 border border-white/20 text-[#A3A3A3] hover:text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Skip
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
