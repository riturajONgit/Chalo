import React, { useState, useId } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import { isValidIndianPhone, cleanPhone } from '../../utils/format';
import { 
  Car, 
  User as UserIcon, 
  Phone, 
  LogOut, 
  AlertCircle, 
  Loader2, 
  ArrowLeft,
  CheckCircle2,
  FileText
} from 'lucide-react';

export const VEHICLE_OPTIONS = [
  { value: 'sedan', label: 'Sedan' },
  { value: 'suv', label: 'SUV' },
  { value: 'tempo', label: 'Tempo' },
  { value: 'auto', label: 'Auto' },
  { value: 'bike', label: 'Bike' },
] as const;

export type DriverVehicleType = typeof VEHICLE_OPTIONS[number]['value'];

interface DriverProfileFormProps {
  currentUser: User;
  onProfileCompleted: () => void;
  onSignOut: () => void;
  onNavigateHome: () => void;
  initialValues?: {
    name?: string;
    phone?: string;
    vehicleType?: DriverVehicleType;
    regNo?: string;
  };
}

export const DriverProfileForm: React.FC<DriverProfileFormProps> = ({
  currentUser,
  onProfileCompleted,
  onSignOut,
  onNavigateHome,
  initialValues,
}) => {
  const [name, setName] = useState(
    initialValues?.name || (typeof window !== 'undefined' ? sessionStorage.getItem('chalo_driver_reg_name') || '' : '')
  );
  const [phone, setPhone] = useState(
    initialValues?.phone || (typeof window !== 'undefined' ? sessionStorage.getItem('chalo_driver_reg_phone') || '' : '')
  );
  const [vehicleType, setVehicleType] = useState<DriverVehicleType>(
    initialValues?.vehicleType || 
    (typeof window !== 'undefined' ? (sessionStorage.getItem('chalo_driver_reg_vehicle_type') as DriverVehicleType) || 'sedan' : 'sedan')
  );
  const [regNo, setRegNo] = useState(
    initialValues?.regNo || (typeof window !== 'undefined' ? sessionStorage.getItem('chalo_driver_reg_no') || '' : '')
  );

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const nameId = useId();
  const phoneId = useId();
  const vehicleTypeId = useId();
  const regNoId = useId();

  const cleanedPhone = cleanPhone(phone);
  const isPhoneValid = isValidIndianPhone(cleanedPhone);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMessage('Please enter your full name.');
      return;
    }

    if (!isPhoneValid) {
      setErrorMessage('Enter a valid 10-digit mobile number.');
      return;
    }

    const trimmedRegNo = regNo.trim().toUpperCase();
    if (!trimmedRegNo) {
      setErrorMessage('Please enter your vehicle registration number.');
      return;
    }

    setIsLoading(true);

    try {
      // Call supabase.rpc('register_driver', { p_name, p_phone, p_vehicle_type, p_reg_no }) with vehicle type in lowercase
      const { data, error } = await supabase.rpc('register_driver', {
        p_name: trimmedName,
        p_phone: cleanedPhone,
        p_vehicle_type: vehicleType.toLowerCase().trim(),
        p_reg_no: trimmedRegNo,
      });

      if (error) {
        // Display exact error text returned by register_driver RPC
        setErrorMessage(error.message || 'Driver registration failed. Please try again.');
        setIsLoading(false);
        return;
      }

      // Success: advance to document upload step / under-review status
      try {
        sessionStorage.removeItem('chalo_driver_reg_name');
        sessionStorage.removeItem('chalo_driver_reg_phone');
        sessionStorage.removeItem('chalo_driver_reg_vehicle_type');
        sessionStorage.removeItem('chalo_driver_reg_no');
      } catch {
        // Ignore
      }
      onProfileCompleted();
    } catch (err: any) {
      console.warn('Driver registration exception:', err);
      setErrorMessage(err?.message || 'Driver registration failed. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-4 animate-in fade-in duration-200">
      {/* Top Bar with Navigation and Sign Out */}
      <div className="flex items-center justify-between px-1">
        <button
          type="button"
          onClick={onNavigateHome}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#A3A3A3] hover:text-white transition-colors min-h-[44px] py-1 px-2 rounded-lg"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Booking</span>
        </button>

        <button
          type="button"
          onClick={onSignOut}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#EF4444] hover:bg-[#EF4444]/10 border border-[#EF4444] rounded-xl min-h-[44px] transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* Main Profile Form Card */}
      <div className="bg-[#141414] border border-[#262626] rounded-2xl p-5 sm:p-6 shadow-xl space-y-5">
        {/* Header */}
        <div className="text-center space-y-1.5">
          <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center mx-auto text-white mb-2">
            <Car className="w-6 h-6 stroke-[2.2]" />
          </div>
          <h1 className="text-[28px] font-bold tracking-tight text-white leading-tight">
            Complete your driver profile
          </h1>
          <p className="text-xs text-[#A3A3A3] max-w-sm mx-auto">
            Signed in as <span className="text-white font-mono font-semibold">{currentUser.email || 'authenticated user'}</span>. Enter your details to attach your vehicle and start receiving trip offers.
          </p>
        </div>

        {/* Error notification from register_driver RPC */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-red-950/40 border border-[#EF4444]/40 text-red-200 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-[#EF4444] shrink-0 mt-0.5" />
            <p className="leading-relaxed font-medium">{errorMessage}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          <div>
            <label htmlFor={nameId} className="block text-[11px] uppercase tracking-wider font-semibold text-[#A3A3A3] mb-1.5">
              Full Name <span className="text-[#F59E0B]">*</span>
            </label>
            <div className="relative">
              <input
                id={nameId}
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ramesh Patel"
                className="w-full pl-10 pr-3.5 py-3 rounded-xl bg-[#0A0A0A] border border-[#262626] text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-white min-h-[48px]"
              />
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A3A3A3] pointer-events-none">
                <UserIcon className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* 10-Digit Mobile Number */}
          <div>
            <label htmlFor={phoneId} className="block text-[11px] uppercase tracking-wider font-semibold text-[#A3A3A3] mb-1.5">
              10-Digit Mobile Number <span className="text-[#F59E0B]">*</span>
            </label>
            <div className="relative flex">
              <span className="inline-flex items-center px-3.5 rounded-l-xl border border-r-0 border-[#262626] bg-[#0A0A0A] text-[#A3A3A3] text-xs font-semibold select-none min-h-[48px]">
                +91
              </span>
              <input
                id={phoneId}
                type="tel"
                required
                maxLength={14}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="98765 43210"
                className="w-full px-3.5 py-3 rounded-r-xl bg-[#0A0A0A] border border-[#262626] text-white placeholder-zinc-500 text-sm font-mono focus:outline-none focus:border-white min-h-[48px]"
              />
            </div>
            {phone && !isPhoneValid && (
              <p className="text-[11px] text-[#F59E0B] mt-1">
                Enter a valid 10-digit mobile number
              </p>
            )}
          </div>

          {/* Vehicle Type & Registration Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label htmlFor={vehicleTypeId} className="block text-[11px] uppercase tracking-wider font-semibold text-[#A3A3A3] mb-1.5">
                Vehicle Type <span className="text-[#F59E0B]">*</span>
              </label>
              <select
                id={vehicleTypeId}
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value as DriverVehicleType)}
                className="w-full px-3.5 py-3 rounded-xl bg-[#0A0A0A] border border-[#262626] text-white text-sm focus:outline-none focus:border-white min-h-[48px] cursor-pointer"
              >
                {VEHICLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-[#141414] text-white">
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor={regNoId} className="block text-[11px] uppercase tracking-wider font-semibold text-[#A3A3A3] mb-1.5">
                Registration No. <span className="text-[#F59E0B]">*</span>
              </label>
              <input
                id={regNoId}
                type="text"
                required
                value={regNo}
                onChange={(e) => setRegNo(e.target.value)}
                placeholder="MP17 AB 1234"
                className="w-full px-3.5 py-3 rounded-xl bg-[#0A0A0A] border border-[#262626] text-white placeholder-zinc-500 text-sm font-mono uppercase focus:outline-none focus:border-white min-h-[48px]"
              />
            </div>
          </div>

          {/* Registration Notice */}
          <div className="p-3.5 bg-[#0A0A0A] border border-[#262626] rounded-xl text-xs text-[#A3A3A3] space-y-1">
            <p className="font-semibold text-white">Next Step: Document Verification</p>
            <p>After registering your vehicle, you will upload RC, Permit, Insurance, and Driving Licence for fleet verification.</p>
          </div>

          {/* Submit Button: Primary 52px white button */}
          <button
            type="submit"
            disabled={isLoading || !name.trim() || !isPhoneValid || !regNo.trim()}
            className={`w-full h-[52px] rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg ${
              !isLoading && name.trim() && isPhoneValid && regNo.trim()
                ? 'bg-white hover:bg-neutral-200 text-black cursor-pointer'
                : 'bg-[#262626] text-[#A3A3A3] cursor-not-allowed'
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Registering Driver Profile...</span>
              </>
            ) : (
              <span>Register & Continue to Documents</span>
            )}
          </button>
        </form>

        {/* Quick action buttons for accessibility */}
        <div className="pt-2 border-t border-[#262626] text-center space-y-2">
          <p className="text-[11px] text-[#A3A3A3]">
            Need to use a different account?
          </p>
          <button
            type="button"
            onClick={onSignOut}
            className="text-xs text-[#A3A3A3] hover:text-white underline underline-offset-4 inline-flex items-center gap-1.5 min-h-[44px] px-2 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};
