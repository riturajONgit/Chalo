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
  Share2
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

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

  return (
    <div className="w-full max-w-xl mx-auto space-y-5 animate-in fade-in duration-300">
      {/* Success Banner */}
      <div className="bg-[#121820] border border-emerald-500/30 rounded-2xl p-6 text-center shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-green-400 to-emerald-500" />
        
        <div className="w-14 h-14 bg-emerald-500/15 border border-emerald-500/40 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-400">
          <CheckCircle2 className="w-8 h-8 stroke-[2.2]" />
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-white">
          Booking Confirmed!
        </h1>
        <p className="text-sm text-zinc-300 mt-1">
          Your outstation cab request has been registered.
        </p>

        {/* Large Booking Code Display */}
        <div className="mt-5 p-4 bg-[#0b0f14] border border-white/10 rounded-xl inline-block w-full max-w-sm">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 block mb-1">
            Booking Code
          </span>
          <div className="flex items-center justify-center gap-3">
            <span className="font-mono text-3xl sm:text-4xl font-extrabold tracking-widest text-emerald-400 select-all">
              {bookingCode}
            </span>
            <button
              onClick={handleCopyCode}
              aria-label="Copy booking code"
              className="p-2.5 rounded-lg bg-white/5 hover:bg-white/10 active:bg-white/15 text-zinc-200 transition-colors border border-white/10 min-h-[44px] min-w-[44px] flex items-center justify-center"
              title="Copy Booking Code"
            >
              {copied ? (
                <Check className="w-5 h-5 text-emerald-400" />
              ) : (
                <Copy className="w-5 h-5" />
              )}
            </button>
          </div>
          {copied && (
            <p className="text-xs text-emerald-400 font-medium mt-1.5 animate-in fade-in">
              Booking code copied to clipboard!
            </p>
          )}
        </div>

        {/* Crucial Required WhatsApp Message */}
        <div className="mt-5 p-3.5 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-left flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0 text-emerald-400 mt-0.5">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-emerald-200">
              Save this code. Our team will confirm your driver on WhatsApp.
            </p>
            <p className="text-xs text-zinc-400 mt-0.5">
              We verify driver details and vehicle registration numbers directly with you before departure.
            </p>
          </div>
        </div>

        {/* Fare Callout */}
        <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
          <span className="text-xs text-zinc-400">Total Fixed Fare</span>
          <div className="text-right">
            <span className="text-2xl font-extrabold text-white tabular-nums">
              {formatRupees(fare)}
            </span>
            <p className="text-[11px] text-zinc-400">Pay directly to driver after trip</p>
          </div>
        </div>
      </div>

      {/* Ride Details Card */}
      <div className="bg-[#121820] border border-white/10 rounded-2xl p-5 space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400">
          Trip Summary
        </h2>

        {/* Route */}
        <div className="flex items-start gap-3">
          <div className="flex flex-col items-center mt-1">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <div className="w-0.5 h-7 bg-zinc-700 my-0.5" />
            <div className="w-2.5 h-2.5 rounded-full bg-white" />
          </div>
          <div className="flex-1 space-y-2">
            <div>
              <p className="text-xs text-zinc-400">From</p>
              <p className="text-sm font-semibold text-white">{fromCity}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-400">To Destination</p>
              <p className="text-sm font-semibold text-white">{toCity}</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-semibold px-2.5 py-1 rounded bg-white/5 border border-white/10 text-zinc-200">
              {tripLabel}
            </span>
          </div>
        </div>

        <div className="h-px bg-white/5" />

        {/* Vehicle & Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2.5 text-zinc-300">
            <Car className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <p className="text-[11px] text-zinc-400">Vehicle Type</p>
              <p className="font-medium text-white">{vehicleLabel}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 text-zinc-300">
            <Calendar className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <p className="text-[11px] text-zinc-400">Pickup Date & Time</p>
              <p className="font-medium text-white">{formattedDate}</p>
            </div>
          </div>
        </div>

        <div className="h-px bg-white/5" />

        {/* Addresses */}
        <div className="space-y-2.5 text-sm">
          <div className="flex items-start gap-2.5">
            <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-[11px] text-zinc-400">Pickup Address</p>
              <p className="text-zinc-200 font-medium">{pickupAddress}</p>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <MapPin className="w-4 h-4 text-white shrink-0 mt-0.5" />
            <div>
              <p className="text-[11px] text-zinc-400">Drop Address</p>
              <p className="text-zinc-200 font-medium">{dropAddress}</p>
            </div>
          </div>
        </div>

        <div className="h-px bg-white/5" />

        {/* Rider */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2.5">
            <User className="w-4 h-4 text-zinc-400 shrink-0" />
            <div>
              <p className="text-[11px] text-zinc-400">Rider Name</p>
              <p className="text-zinc-200 font-medium">{riderName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <Phone className="w-4 h-4 text-zinc-400 shrink-0" />
            <div>
              <p className="text-[11px] text-zinc-400">Contact Number</p>
              <p className="text-zinc-200 font-medium font-mono">+91 {riderPhone}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3 pt-2">
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full min-h-[50px] bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2.5 transition-colors shadow-lg shadow-emerald-950/40 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
        >
          <MessageSquare className="w-4 h-4" />
          <span>Save on WhatsApp & Message Us</span>
        </a>

        {onCheckBooking && (
          <button
            type="button"
            onClick={() => onCheckBooking(bookingCode, riderPhone)}
            className="w-full min-h-[48px] bg-emerald-500/10 hover:bg-emerald-500/20 active:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 font-semibold rounded-xl flex items-center justify-center gap-2 text-sm transition-colors cursor-pointer"
          >
            <span>Live Ride Status · Check my booking</span>
          </button>
        )}

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleShare}
            className="min-h-[48px] bg-white/5 hover:bg-white/10 active:bg-white/15 border border-white/10 text-zinc-200 font-medium rounded-xl flex items-center justify-center gap-2 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <Share2 className="w-4 h-4" />
            <span>{shared ? 'Copied Details!' : 'Share Details'}</span>
          </button>

          <button
            onClick={onBookAnother}
            className="min-h-[48px] bg-white/5 hover:bg-white/10 active:bg-white/15 border border-white/10 text-zinc-200 font-medium rounded-xl flex items-center justify-center gap-2 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Book Another Ride</span>
          </button>
        </div>
      </div>
    </div>
  );
};
