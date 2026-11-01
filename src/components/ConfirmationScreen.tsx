import React, { useState } from 'react';
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
  ExternalLink
} from 'lucide-react';
import { formatRupees, formatFriendlyDate } from '../utils/format';
import { VehicleType, TripType } from '../lib/supabase';

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
}) => {
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(bookingCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const formattedDate = formatFriendlyDate(pickupWhen);
  const vehicleLabel = vehicleType === 'suv' ? 'SUV (6-7 Seater, AC)' : 'Sedan (4 Seater, AC)';
  const tripLabel = tripType === 'round_trip' ? 'Round Trip' : 'One Way Drop';

  const shareText = `*Chalo Cab Booking Confirmation*\n` +
    `Booking Code: *${bookingCode}*\n` +
    `Route: ${fromCity} ➔ ${toCity} (${tripLabel})\n` +
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

  const whatsappUrl = `https://wa.me/918319687057?text=${encodeURIComponent(shareText)}`;

  return (
    <div className="w-full max-w-xl mx-auto space-y-4 animate-in fade-in duration-300">
      {/* Success Banner Card */}
      <div className="bg-[#141414] border border-[#262626] rounded-2xl p-5 sm:p-6 text-center shadow-xl relative overflow-hidden">
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

        {/* Required WhatsApp Coordination Notice */}
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

        {/* Fare Callout */}
        <div className="mt-4 pt-4 border-t border-[#262626] flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-[#A3A3A3]">Guaranteed Fare</span>
          <div className="text-right">
            <span className="text-[32px] font-bold text-[#F59E0B] leading-none tabular-nums block">
              {formatRupees(fare)}
            </span>
            <p className="text-[11px] text-[#A3A3A3] mt-0.5">Pay directly to driver after trip</p>
          </div>
        </div>
      </div>

      {/* Ride Details Card: Route line, vehicle pill */}
      <div className="bg-[#141414] border border-[#262626] rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[20px] font-bold tracking-tight text-white">
            Trip Summary
          </h2>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/10 border border-white/20 text-[10px] font-bold text-white uppercase tracking-wider">
            <Car className="w-3 h-3 text-[#A3A3A3]" />
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
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-[#0A0A0A] border border-[#262626] text-white">
              {tripLabel}
            </span>
          </div>
        </div>

        <div className="h-px bg-[#262626]" />

        {/* Vehicle & Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2.5 text-zinc-300">
            <Car className="w-4 h-4 text-[#A3A3A3] shrink-0" />
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
    </div>
  );
};
