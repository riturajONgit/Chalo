import React, { useState, useId } from 'react';
import { supabase } from '../../lib/supabase';
import { isValidIndianPhone, cleanPhone } from '../../utils/format';
import { 
  Car, 
  Lock, 
  Mail, 
  User, 
  Phone, 
  FileText, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight,
  ShieldCheck,
  Upload,
  RefreshCw,
  Check
} from 'lucide-react';
import { DOC_CONFIGS, DocType, validateDocFile } from './DriverDocUploads';

export const VEHICLE_OPTIONS = [
  { value: 'sedan', label: 'Sedan' },
  { value: 'suv', label: 'SUV' },
  { value: 'tempo', label: 'Tempo' },
  { value: 'auto', label: 'Auto' },
  { value: 'bike', label: 'Bike' },
] as const;

export type DriverVehicleType = typeof VEHICLE_OPTIONS[number]['value'];

interface DriverAuthProps {
  onAuthComplete: () => void;
  initialMode?: 'signin' | 'signup' | 'step2';
}

export const DriverAuth: React.FC<DriverAuthProps> = ({ 
  onAuthComplete, 
  initialMode = 'signin' 
}) => {
  const [mode, setMode] = useState<'signin' | 'signup' | 'step2'>(initialMode);
  
  // Sign up & Step 2 form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [vehicleType, setVehicleType] = useState<DriverVehicleType>('sedan');
  const [regNo, setRegNo] = useState('');

  // Sign in form states
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');

  // Status & loading states
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // Document upload state for sign up and step 2
  const [selectedFiles, setSelectedFiles] = useState<Partial<Record<DocType, File>>>({});
  const [docErrors, setDocErrors] = useState<Partial<Record<DocType, string>>>({});

  const handleDocFileSelect = (docType: DocType, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const validationError = validateDocFile(file);
    if (validationError) {
      setDocErrors((prev) => ({ ...prev, [docType]: validationError }));
      return;
    }

    setDocErrors((prev) => ({ ...prev, [docType]: undefined }));
    setSelectedFiles((prev) => ({ ...prev, [docType]: file }));
  };

  const uploadSelectedDocuments = async (userId: string) => {
    const entries = Object.entries(selectedFiles) as [DocType, File][];
    for (const [docType, file] of entries) {
      if (!file) continue;
      const sanitized = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const uploadPath = `${userId}/${docType}-${Date.now()}-${sanitized}`;
      
      const { error: upErr } = await supabase.storage
        .from('driver-docs')
        .upload(uploadPath, file, { upsert: true });
        
      if (upErr) {
        throw new Error(`Failed to upload ${docType.toUpperCase()}: ${upErr.message}`);
      }

      const { error: rpcErr } = await supabase.rpc('set_driver_document', {
        p_doc_type: docType,
        p_path: uploadPath,
      });

      if (rpcErr) {
        throw new Error(`Failed to save ${docType.toUpperCase()}: ${rpcErr.message}`);
      }

      try {
        const cacheKey = `chalo_driver_docs_${userId}`;
        const existing = JSON.parse(localStorage.getItem(cacheKey) || '{}');
        existing[docType] = { isUploaded: true, fileName: file.name, path: uploadPath };
        localStorage.setItem(cacheKey, JSON.stringify(existing));
      } catch {
        // Ignore cache write error
      }
    }
  };

  const renderDocUploadCards = () => {
    const uploadedCount = (Object.keys(selectedFiles) as DocType[]).filter((k) => Boolean(selectedFiles[k])).length;
    const progress = Math.round((uploadedCount / 4) * 100);

    return (
      <div className="pt-2 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
            <FileText className="w-4 h-4 text-emerald-400" />
            <span>Driver Documents</span>
          </div>
          <span className="text-[11px] font-mono font-bold text-emerald-400 bg-emerald-950/50 border border-emerald-500/30 px-2 py-0.5 rounded-full">
            {uploadedCount} of 4 uploaded
          </span>
        </div>

        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-1.5">
          <p className="text-xs text-amber-200 font-medium leading-relaxed">
            Upload all four documents. We review them before activating your account.
          </p>
          <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden">
            <div 
              className="bg-emerald-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-[10px] text-zinc-400">PDF, JPG, PNG up to 5 MB</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {DOC_CONFIGS.map((config) => {
            const file = selectedFiles[config.type];
            const isSelected = Boolean(file);
            const error = docErrors[config.type];

            return (
              <div 
                key={config.type} 
                className={`p-3 rounded-xl border text-xs transition-all ${
                  isSelected 
                    ? 'bg-emerald-950/20 border-emerald-500/30' 
                    : 'bg-[#0b0f14] border-white/10'
                }`}
              >
                <div className="flex items-start justify-between gap-1.5">
                  <div>
                    <span className="font-bold text-white block">{config.title}</span>
                    <span className="text-[10px] text-zinc-400">{config.description}</span>
                  </div>
                  {isSelected && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shrink-0">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                      <span>Uploaded ✓</span>
                    </span>
                  )}
                </div>

                {error && (
                  <p className="text-[11px] text-red-300 mt-1.5 flex items-start gap-1">
                    <AlertCircle className="w-3 h-3 text-red-400 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </p>
                )}

                <div className="mt-2.5">
                  <label className="cursor-pointer block">
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                      className="hidden"
                      onChange={(e) => handleDocFileSelect(config.type, e)}
                    />
                    {isSelected ? (
                      <span className="w-full min-h-[36px] px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors">
                        <RefreshCw className="w-3 h-3 text-zinc-400" />
                        <span>Replace</span>
                      </span>
                    ) : (
                      <span className="w-full min-h-[36px] px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-black text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-sm">
                        <Upload className="w-3 h-3 stroke-[2.5]" />
                        <span>Upload</span>
                      </span>
                    )}
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const cleanedPhone = cleanPhone(phone);
  const isPhoneValid = isValidIndianPhone(cleanedPhone);
  const isPasswordValid = password.length >= 8;

  // Form IDs for accessibility
  const nameId = useId();
  const phoneId = useId();
  const emailId = useId();
  const passwordId = useId();
  const vehicleTypeId = useId();
  const regNoId = useId();
  const signInEmailId = useId();
  const signInPasswordId = useId();

  // Handle Step 2 driver registration RPC call
  const callRegisterDriver = async (driverName: string, driverPhone: string, vType: string, registration: string) => {
    // register_driver database RPC requires vehicle type in lowercase ('sedan', 'suv', 'tempo', 'auto', 'bike')
    const normalizedVehicleType = (vType || 'sedan').trim().toLowerCase();

    const { data, error } = await supabase.rpc('register_driver', {
      p_name: driverName.trim(),
      p_phone: cleanPhone(driverPhone),
      p_vehicle_type: normalizedVehicleType,
      p_reg_no: registration.trim().toUpperCase(),
    });

    if (error) {
      throw new Error(error.message || 'Driver registration failed.');
    }

    return data;
  };

  // Sign Up Handler
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);

    if (!name.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }
    if (!isPhoneValid) {
      setErrorMessage('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!isPasswordValid) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }
    if (!regNo.trim()) {
      setErrorMessage('Please enter your vehicle registration number.');
      return;
    }

    setIsLoading(true);

    try {
      try {
        sessionStorage.setItem('chalo_driver_reg_name', name.trim());
        sessionStorage.setItem('chalo_driver_reg_phone', phone.trim());
        sessionStorage.setItem('chalo_driver_reg_vehicle_type', vehicleType);
        sessionStorage.setItem('chalo_driver_reg_no', regNo.trim().toUpperCase());
      } catch {
        // Ignore
      }

      // Step 1: supabase.auth.signUp({ email, password })
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password: password.trim(),
      });

      if (signUpError) {
        setErrorMessage(signUpError.message || 'Sign up failed.');
        setIsLoading(false);
        return;
      }

      // If no session returned, email confirmation is required
      if (!signUpData.session) {
        setInfoMessage('Check your email to confirm, then sign in.');
        setIsLoading(false);
        return;
      }

      // Step 2: Session exists immediately -> call register_driver RPC
      await callRegisterDriver(name, phone, vehicleType, regNo);

      try {
        sessionStorage.removeItem('chalo_driver_reg_name');
        sessionStorage.removeItem('chalo_driver_reg_phone');
        sessionStorage.removeItem('chalo_driver_reg_vehicle_type');
        sessionStorage.removeItem('chalo_driver_reg_no');
      } catch {
        // Ignore
      }

      // Step 3: Upload any documents selected during sign up
      if (signUpData.user) {
        await uploadSelectedDocuments(signUpData.user.id);
      }

      // Successfully registered & signed in -> advance
      onAuthComplete();
    } catch (err: any) {
      setErrorMessage(err?.message || 'An error occurred during registration.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2 Completion Handler (for users signed in but missing owners row)
  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }
    if (!isPhoneValid) {
      setErrorMessage('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!regNo.trim()) {
      setErrorMessage('Please enter your vehicle registration number.');
      return;
    }

    setIsLoading(true);

    try {
      await callRegisterDriver(name, phone, vehicleType, regNo);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await uploadSelectedDocuments(user.id);
      }

      onAuthComplete();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Driver profile creation failed.');
    } finally {
      setIsLoading(false);
    }
  };

  // Sign In Handler
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);

    if (!signInEmail.trim() || !signInPassword.trim()) {
      setErrorMessage('Please enter email and password.');
      return;
    }

    setIsLoading(true);

    try {
      // supabase.auth.signInWithPassword
      const { data, error } = await supabase.auth.signInWithPassword({
        email: signInEmail.trim(),
        password: signInPassword.trim(),
      });

      if (error) {
        setErrorMessage(error.message || 'Invalid email or password.');
        setIsLoading(false);
        return;
      }

      if (!data.user) {
        setErrorMessage('User data not found.');
        setIsLoading(false);
        return;
      }

      // Check if user has an owners row
      const { data: owner, error: ownerError } = await supabase
        .from('owners')
        .select('name, phone, status')
        .eq('auth_user_id', data.user.id)
        .maybeSingle();

      if (ownerError) {
        console.warn('Error fetching owner profile:', ownerError);
      }

      // User is authenticated. Whether owner exists or not, notify parent to route to profile form or status/offers
      onAuthComplete();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Sign in failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-4 animate-in fade-in duration-200">
      {/* Mode Switcher Tabs */}
      {mode !== 'step2' && (
        <div className="grid grid-cols-2 p-1 bg-[#121820] border border-white/10 rounded-xl">
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setErrorMessage(null);
              setInfoMessage(null);
            }}
            className={`min-h-[44px] py-2 rounded-lg text-xs font-bold transition-all ${
              mode === 'signin'
                ? 'bg-emerald-500 text-black shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Driver Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setErrorMessage(null);
              setInfoMessage(null);
            }}
            className={`min-h-[44px] py-2 rounded-lg text-xs font-bold transition-all ${
              mode === 'signup'
                ? 'bg-emerald-500 text-black shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            New Driver Sign Up
          </button>
        </div>
      )}

      {/* Main Form Container */}
      <div className="bg-[#121820] border border-white/10 rounded-2xl p-5 sm:p-6 shadow-xl space-y-5">
        {/* Header */}
        <div className="text-center space-y-1">
          <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center mx-auto text-emerald-400 mb-2">
            <Car className="w-6 h-6 stroke-[2.2]" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            {mode === 'signin'
              ? 'Driver Sign In'
              : mode === 'signup'
              ? 'Partner with Chalo'
              : 'Complete Registration'}
          </h1>
          <p className="text-xs text-zinc-400">
            {mode === 'signin'
              ? 'Access outstation trip offers and driver dispatch.'
              : mode === 'signup'
              ? 'Attach your vehicle and receive outstation bookings from Rewa.'
              : 'Enter your vehicle and contact details to finish setup.'}
          </p>
        </div>

        {/* Error notification */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-start gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">{errorMessage}</p>
          </div>
        )}

        {/* Info / Email verification banner */}
        {infoMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs flex items-start gap-2.5 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed font-semibold">{infoMessage}</p>
          </div>
        )}

        {/* ----------------- SCREEN 2: SIGN IN FORM ----------------- */}
        {mode === 'signin' && (
          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label htmlFor={signInEmailId} className="block text-xs font-medium text-zinc-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <input
                  id={signInEmailId}
                  type="email"
                  required
                  autoComplete="email"
                  value={signInEmail}
                  onChange={(e) => setSignInEmail(e.target.value)}
                  placeholder="driver@example.com"
                  className="w-full pl-10 pr-3.5 py-3 rounded-xl bg-[#0b0f14] border border-white/15 text-white placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[48px]"
                />
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none">
                  <Mail className="w-4 h-4" />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor={signInPasswordId} className="block text-xs font-medium text-zinc-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id={signInPasswordId}
                  type="password"
                  required
                  autoComplete="current-password"
                  value={signInPassword}
                  onChange={(e) => setSignInPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3.5 py-3 rounded-xl bg-[#0b0f14] border border-white/15 text-white placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[48px]"
                />
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none">
                  <Lock className="w-4 h-4" />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !signInEmail.trim() || !signInPassword.trim()}
              className={`w-full min-h-[50px] rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg ${
                !isLoading && signInEmail.trim() && signInPassword.trim()
                  ? 'bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-black shadow-emerald-950/50 cursor-pointer'
                  : 'bg-zinc-800 text-zinc-500 border border-white/5 cursor-not-allowed'
              }`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <span>Sign In as Driver</span>
              )}
            </button>
          </form>
        )}

        {/* ----------------- SCREEN 1: FULL SIGN UP FORM ----------------- */}
        {mode === 'signup' && (
          <form onSubmit={handleSignUp} className="space-y-3.5">
            {/* Full Name */}
            <div>
              <label htmlFor={nameId} className="block text-xs font-medium text-zinc-300 mb-1">
                Full Name <span className="text-emerald-400">*</span>
              </label>
              <div className="relative">
                <input
                  id={nameId}
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter full name"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[#0b0f14] border border-white/15 text-white placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
                />
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none">
                  <User className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* 10-Digit Mobile */}
            <div>
              <label htmlFor={phoneId} className="block text-xs font-medium text-zinc-300 mb-1">
                10-Digit Mobile Number <span className="text-emerald-400">*</span>
              </label>
              <div className="relative flex">
                <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-white/15 bg-white/5 text-zinc-400 text-xs font-semibold select-none min-h-[44px]">
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
                  className="w-full px-3.5 py-2.5 rounded-r-xl bg-[#0b0f14] border border-white/15 text-white placeholder-zinc-500 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor={emailId} className="block text-xs font-medium text-zinc-300 mb-1">
                Email Address <span className="text-emerald-400">*</span>
              </label>
              <div className="relative">
                <input
                  id={emailId}
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[#0b0f14] border border-white/15 text-white placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
                />
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none">
                  <Mail className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor={passwordId} className="block text-xs font-medium text-zinc-300 mb-1">
                Password (min 8 characters) <span className="text-emerald-400">*</span>
              </label>
              <div className="relative">
                <input
                  id={passwordId}
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[#0b0f14] border border-white/15 text-white placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
                />
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none">
                  <Lock className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Vehicle Type & Reg No */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label htmlFor={vehicleTypeId} className="block text-xs font-medium text-zinc-300 mb-1">
                  Vehicle Type <span className="text-emerald-400">*</span>
                </label>
                <select
                  id={vehicleTypeId}
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value as DriverVehicleType)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#0b0f14] border border-white/15 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
                >
                  {VEHICLE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value} className="bg-[#121820] text-white">
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor={regNoId} className="block text-xs font-medium text-zinc-300 mb-1">
                  Registration No. <span className="text-emerald-400">*</span>
                </label>
                <input
                  id={regNoId}
                  type="text"
                  required
                  value={regNo}
                  onChange={(e) => setRegNo(e.target.value)}
                  placeholder="e.g. MP17 AB 1234"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0b0f14] border border-white/15 text-white placeholder-zinc-500 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
                />
              </div>
            </div>

            {/* Document Uploads during Sign Up */}
            {renderDocUploadCards()}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading || !name.trim() || !isPhoneValid || !isPasswordValid || !regNo.trim()}
              className={`w-full min-h-[48px] rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg mt-3 ${
                !isLoading && name.trim() && isPhoneValid && isPasswordValid && regNo.trim()
                  ? 'bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-black shadow-emerald-950/50 cursor-pointer'
                  : 'bg-zinc-800 text-zinc-500 border border-white/5 cursor-not-allowed'
              }`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Registering Driver...</span>
                </>
              ) : (
                <span>Register & Continue</span>
              )}
            </button>
          </form>
        )}

        {/* ----------------- STEP 2: FINISH REGISTRATION FORM ----------------- */}
        {mode === 'step2' && (
          <form onSubmit={handleStep2Submit} className="space-y-3.5">
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300">
              Your account is signed in, but vehicle details are required to start receiving bookings.
            </div>

            <div>
              <label htmlFor={nameId} className="block text-xs font-medium text-zinc-300 mb-1">
                Full Name <span className="text-emerald-400">*</span>
              </label>
              <input
                id={nameId}
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter full name"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0b0f14] border border-white/15 text-white placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
              />
            </div>

            <div>
              <label htmlFor={phoneId} className="block text-xs font-medium text-zinc-300 mb-1">
                10-Digit Mobile Number <span className="text-emerald-400">*</span>
              </label>
              <div className="relative flex">
                <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-white/15 bg-white/5 text-zinc-400 text-xs font-semibold select-none min-h-[44px]">
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
                  className="w-full px-3.5 py-2.5 rounded-r-xl bg-[#0b0f14] border border-white/15 text-white placeholder-zinc-500 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor={vehicleTypeId} className="block text-xs font-medium text-zinc-300 mb-1">
                  Vehicle Type <span className="text-emerald-400">*</span>
                </label>
                <select
                  id={vehicleTypeId}
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value as DriverVehicleType)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#0b0f14] border border-white/15 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
                >
                  {VEHICLE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value} className="bg-[#121820] text-white">
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor={regNoId} className="block text-xs font-medium text-zinc-300 mb-1">
                  Registration No. <span className="text-emerald-400">*</span>
                </label>
                <input
                  id={regNoId}
                  type="text"
                  required
                  value={regNo}
                  onChange={(e) => setRegNo(e.target.value)}
                  placeholder="e.g. MP17 AB 1234"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0b0f14] border border-white/15 text-white placeholder-zinc-500 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
                />
              </div>
            </div>

            {/* Document Uploads during Step 2 */}
            {renderDocUploadCards()}

            <button
              type="submit"
              disabled={isLoading || !name.trim() || !isPhoneValid || !regNo.trim()}
              className={`w-full min-h-[48px] rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg mt-2 ${
                !isLoading && name.trim() && isPhoneValid && regNo.trim()
                  ? 'bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-black shadow-emerald-950/50 cursor-pointer'
                  : 'bg-zinc-800 text-zinc-500 border border-white/5 cursor-not-allowed'
              }`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting Details...</span>
                </>
              ) : (
                <span>Complete Driver Setup</span>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
