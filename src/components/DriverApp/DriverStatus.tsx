import React from 'react';
import { 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  MessageSquare, 
  RefreshCw, 
  LogOut, 
  Car, 
  User, 
  Phone 
} from 'lucide-react';

interface DriverStatusProps {
  owner: {
    name: string;
    phone: string;
    status: string;
  };
  vehicle: {
    reg_no: string;
    vehicle_type: string;
    status?: string;
  } | null;
  onRefresh: () => void;
  onSignOut: () => void;
  isRefreshing?: boolean;
}

export const DriverStatus: React.FC<DriverStatusProps> = ({
  owner,
  vehicle,
  onRefresh,
  onSignOut,
  isRefreshing = false,
}) => {
  const status = (owner.status || '').toLowerCase();
  const isPending = status === 'pending';
  const isSuspended = status === 'suspended';

  return (
    <div className="w-full max-w-md mx-auto space-y-4 animate-in fade-in duration-200">
      {/* Top Bar with Sign Out */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-semibold text-zinc-400">Driver Account Status</span>
        <button
          onClick={onSignOut}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-300 hover:text-red-200 bg-red-950/40 border border-red-500/30 rounded-lg min-h-[44px] transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* Status Card */}
      <div className="bg-[#121820] border border-white/10 rounded-2xl p-6 shadow-xl text-center space-y-5">
        {/* Pending Screen */}
        {isPending && (
          <div className="space-y-4">
            <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 rounded-full flex items-center justify-center mx-auto text-amber-400">
              <Clock className="w-8 h-8 stroke-[2.2] animate-pulse" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-xl font-bold tracking-tight text-white">
                Under Review
              </h2>
              <p className="text-sm text-amber-200 font-medium leading-relaxed max-w-xs mx-auto">
                Your account is under review. We will contact you on WhatsApp.
              </p>
            </div>

            <p className="text-xs text-zinc-400">
              Our Rewa fleet coordination team verifies driver and vehicle details before activating your account.
            </p>
          </div>
        )}

        {/* Suspended Screen */}
        {isSuspended && (
          <div className="space-y-4">
            <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-full flex items-center justify-center mx-auto text-red-400">
              <AlertTriangle className="w-8 h-8 stroke-[2.2]" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-xl font-bold tracking-tight text-white">
                Account Suspended
              </h2>
              <p className="text-sm text-red-200 font-medium leading-relaxed max-w-xs mx-auto">
                Your account is suspended. Contact Chalo support.
              </p>
            </div>
          </div>
        )}

        {/* Driver Details Summary */}
        <div className="pt-4 border-t border-white/10 text-left space-y-2.5 text-xs text-zinc-300">
          <div className="flex items-center justify-between">
            <span className="text-zinc-500">Driver Name</span>
            <span className="font-semibold text-white">{owner.name}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-zinc-500">Mobile</span>
            <span className="font-mono text-white">+91 {owner.phone}</span>
          </div>

          {vehicle && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Vehicle Type</span>
                <span className="font-semibold text-white">{vehicle.vehicle_type}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Registration</span>
                <span className="font-mono text-emerald-400 font-bold">{vehicle.reg_no}</span>
              </div>
            </>
          )}

          <div className="flex items-center justify-between">
            <span className="text-zinc-500">Review Status</span>
            <span className={`font-semibold capitalize px-2 py-0.5 rounded text-[11px] ${
              isPending 
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'bg-red-500/20 text-red-300 border border-red-500/30'
            }`}>
              {owner.status || 'Pending'}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2.5 pt-2">
          {/* Refresh button */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="w-full min-h-[46px] rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/15 border border-white/10 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
            <span>Check Approval Status</span>
          </button>

          {/* WhatsApp Support button */}
          <a
            href={`https://wa.me/919425178000?text=${encodeURIComponent(
              `Hello Chalo Support, I registered as a driver (${owner.name}, Phone: ${owner.phone}, Reg: ${vehicle?.reg_no || ''}). Please check my account status.`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full min-h-[46px] rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors shadow-md cursor-pointer"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Contact Support on WhatsApp</span>
          </a>
        </div>
      </div>
    </div>
  );
};
