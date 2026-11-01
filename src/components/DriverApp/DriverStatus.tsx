import React, { useState } from 'react';
import { 
  Clock, 
  AlertTriangle, 
  MessageSquare, 
  RefreshCw, 
  LogOut 
} from 'lucide-react';
import { DriverDocUploads } from './DriverDocUploads';

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

  // Read initial document count from cached storage to prevent flash of wrong UI state
  const [uploadedCount, setUploadedCount] = useState<number>(() => {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('chalo_driver_docs_')) {
          const val = localStorage.getItem(key);
          if (val) {
            const parsed = JSON.parse(val);
            return Object.values(parsed).filter((v: any) => v?.isUploaded).length;
          }
        }
      }
    } catch {
      // Ignore localStorage errors
    }
    return 0;
  });

  // 4. Once status is 'suspended', show the suspended notice only
  if (isSuspended) {
    return (
      <div className="w-full max-w-xl mx-auto space-y-4 animate-in fade-in duration-200">
        {/* Top Bar with Sign Out */}
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-[#A3A3A3]">Driver Account Status</span>
          <button
            onClick={onSignOut}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#EF4444] hover:bg-[#EF4444]/10 border border-[#EF4444] rounded-xl min-h-[44px] transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>

        {/* Suspended Notice Only */}
        <div className="bg-[#141414] border border-[#262626] rounded-2xl p-6 shadow-xl text-center space-y-5">
          <div className="space-y-4">
            <div className="w-16 h-16 bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-full flex items-center justify-center mx-auto text-[#EF4444]">
              <AlertTriangle className="w-8 h-8 stroke-[2.2]" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-[20px] font-bold tracking-tight text-white">
                Account Suspended
              </h2>
              <p className="text-sm text-red-200 font-medium leading-relaxed max-w-xs mx-auto">
                Your account is suspended. Contact Chalo support.
              </p>
            </div>
          </div>

          {/* Driver Details Summary */}
          <div className="pt-4 border-t border-[#262626] text-left space-y-2.5 text-xs bg-[#0A0A0A] p-4 rounded-xl border border-[#262626]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-[#A3A3A3]">Driver Name</span>
              <span className="font-semibold text-white">{owner.name}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-[#A3A3A3]">Mobile</span>
              <span className="font-mono text-white">+91 {owner.phone}</span>
            </div>

            {vehicle && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-wider font-semibold text-[#A3A3A3]">Vehicle Type</span>
                  <span className="font-semibold text-white">{vehicle.vehicle_type}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-wider font-semibold text-[#A3A3A3]">Registration</span>
                  <span className="font-mono text-[#F59E0B] font-bold">{vehicle.reg_no}</span>
                </div>
              </>
            )}

            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-[#A3A3A3]">Review Status</span>
              <span className="font-semibold capitalize px-2 py-0.5 rounded text-[11px] bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/30">
                Suspended
              </span>
            </div>
          </div>

          {/* WhatsApp Support button */}
          <div className="pt-2">
            <a
              href={`https://wa.me/918319687057?text=${encodeURIComponent(
                `Hello Chalo Support, my driver account (${owner.name}, Phone: ${owner.phone}) is suspended. Please assist.`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full min-h-[52px] rounded-xl bg-white hover:bg-neutral-200 text-black font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-md cursor-pointer"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Contact Support on WhatsApp</span>
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Pending flow: Documents first at top, then review status below once all 4 are uploaded
  return (
    <div className="w-full max-w-xl mx-auto space-y-4 animate-in fade-in duration-200">
      {/* Top Bar with Sign Out */}
      <div className="flex items-center justify-between px-1">
        <span className="text-[11px] uppercase tracking-wider font-semibold text-[#A3A3A3]">Driver Account Status</span>
        <button
          onClick={onSignOut}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#EF4444] hover:bg-[#EF4444]/10 border border-[#EF4444] rounded-xl min-h-[44px] transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* 1. Driver Documents section at the top of the screen */}
      <DriverDocUploads 
        status={owner.status} 
        onUploadCountChange={setUploadedCount} 
      />

      {/* 2. Under Review card shown ONLY once all 4 documents are uploaded and status is still 'pending' */}
      {uploadedCount >= 4 && isPending && (
        <div className="bg-[#141414] border border-[#262626] rounded-2xl p-6 shadow-xl text-center space-y-5 animate-in fade-in">
          <div className="space-y-4">
            <div className="w-16 h-16 bg-[#F59E0B]/10 border border-[#F59E0B]/30 rounded-full flex items-center justify-center mx-auto text-[#F59E0B]">
              <Clock className="w-8 h-8 stroke-[2.2] animate-pulse" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-[20px] font-bold tracking-tight text-white">
                Under Review
              </h2>
              <p className="text-sm text-amber-200 font-medium leading-relaxed max-w-sm mx-auto">
                Your documents are with our team. We will contact you on WhatsApp once approved.
              </p>
            </div>

            <p className="text-xs text-[#A3A3A3]">
              Our Rewa fleet coordination team verifies driver and vehicle details before activating your account.
            </p>
          </div>

          {/* Driver Details Summary */}
          <div className="pt-4 border-t border-[#262626] text-left space-y-2.5 text-xs bg-[#0A0A0A] p-4 rounded-xl border border-[#262626]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-[#A3A3A3]">Driver Name</span>
              <span className="font-semibold text-white">{owner.name}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-[#A3A3A3]">Mobile</span>
              <span className="font-mono text-white">+91 {owner.phone}</span>
            </div>

            {vehicle && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-wider font-semibold text-[#A3A3A3]">Vehicle Type</span>
                  <span className="font-semibold text-white">{vehicle.vehicle_type}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-wider font-semibold text-[#A3A3A3]">Registration</span>
                  <span className="font-mono text-[#F59E0B] font-bold">{vehicle.reg_no}</span>
                </div>
              </>
            )}

            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-[#A3A3A3]">Review Status</span>
              <span className="font-semibold capitalize px-2 py-0.5 rounded text-[11px] bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/30">
                {owner.status || 'Pending'}
              </span>
            </div>
          </div>

          {/* Actions: Check Approval Status & WhatsApp */}
          <div className="space-y-3 pt-2">
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="w-full min-h-[52px] rounded-xl bg-transparent border border-white/20 text-white hover:bg-white/5 font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#F59E0B]' : ''}`} />
              <span>Check Approval Status</span>
            </button>

            <a
              href={`https://wa.me/918319687057?text=${encodeURIComponent(
                `Hello Chalo Support, I registered as a driver (${owner.name}, Phone: ${owner.phone}, Reg: ${vehicle?.reg_no || ''}). My documents are uploaded. Please check my account status.`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full min-h-[52px] rounded-xl bg-white hover:bg-neutral-200 text-black font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-md cursor-pointer"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Contact Support on WhatsApp</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
};
