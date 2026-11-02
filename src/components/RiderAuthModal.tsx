import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { cleanPhone, isValidIndianPhone } from '../utils/format';
import { X, Lock, Mail, User, Phone, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

interface RiderAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'signin' | 'signup';
  onSuccess?: () => void;
  title?: string;
  subtitle?: string;
}

export const RiderAuthModal: React.FC<RiderAuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'signin',
  onSuccess,
  title,
  subtitle,
}) => {
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 10);
    setPhone(raw);
    if (errorText) setErrorText(null);
  };

  const handleSwitchMode = (newMode: 'signin' | 'signup') => {
    setMode(newMode);
    setErrorText(null);
    setInfoMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText(null);
    setInfoMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setErrorText('Please enter your email and password.');
      return;
    }

    if (mode === 'signup') {
      if (!name.trim()) {
        setErrorText('Please enter your full name.');
        return;
      }

      const cleaned = cleanPhone(phone);
      if (!isValidIndianPhone(cleaned)) {
        setErrorText('Please enter a valid 10-digit Indian phone number.');
        return;
      }

      if (password.length < 8) {
        setErrorText('Password must be at least 8 characters.');
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password: password,
        });

        if (error) {
          throw new Error(error.message || 'Could not create account');
        }

        // If there's a session straight away, call supabase.rpc('save_rider_profile', { p_name, p_phone })
        if (data?.session) {
          const { error: profileError } = await supabase.rpc('save_rider_profile', {
            p_name: name.trim(),
            p_phone: cleaned,
          });

          if (profileError) {
            console.warn('save_rider_profile error:', profileError);
          }

          if (onSuccess) onSuccess();
          onClose();
        } else {
          // If there's no session, show "Check your email to confirm, then sign in."
          setInfoMessage('Check your email to confirm, then sign in.');
          setMode('signin');
        }
      } catch (err: any) {
        setErrorText(err.message || 'Failed to create account.');
      } finally {
        setLoading(false);
      }
    } else {
      // Sign In mode
      setLoading(true);
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: password,
        });

        if (error) {
          throw new Error(error.message || 'Invalid email or password.');
        }

        if (data?.session) {
          if (onSuccess) onSuccess();
          onClose();
        }
      } catch (err: any) {
        setErrorText(err.message || 'Sign in failed. Please check your credentials.');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-[440px] bg-[#141414] border border-[#262626] rounded-xl shadow-2xl p-5 sm:p-6 relative text-white space-y-4">
        {/* Close Button */}
        <button
          onClick={onClose}
          type="button"
          aria-label="Close"
          className="absolute right-4 top-4 p-2 text-[#A3A3A3] hover:text-white rounded-lg transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="space-y-1 pr-8">
          <h2 className="text-[20px] font-bold tracking-tight text-white">
            {title || (mode === 'signin' ? 'Sign in to Chalo' : 'Create Rider Account')}
          </h2>
          <p className="text-xs text-[#A3A3A3]">
            {subtitle || (mode === 'signin' 
              ? 'Access your saved outstation trips and manage bookings.' 
              : 'Save your details for faster booking and trip tracking.')}
          </p>
        </div>

        {/* Tab switch: Sign in | Create account */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-[#0A0A0A] rounded-lg border border-[#262626]">
          <button
            type="button"
            onClick={() => handleSwitchMode('signin')}
            className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              mode === 'signin'
                ? 'bg-white text-black shadow-sm'
                : 'text-[#A3A3A3] hover:text-white'
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => handleSwitchMode('signup')}
            className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              mode === 'signup'
                ? 'bg-white text-black shadow-sm'
                : 'text-[#A3A3A3] hover:text-white'
            }`}
          >
            Create account
          </button>
        </div>

        {/* Info message banner */}
        {infoMessage && (
          <div className="p-3 bg-[#22c55e]/10 border border-[#22c55e]/30 rounded-xl text-xs text-[#22c55e] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{infoMessage}</span>
          </div>
        )}

        {/* Error message banner */}
        {errorText && (
          <div className="p-3 bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-xl text-xs text-[#EF4444] flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="flex-1">{errorText}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5 pt-1">
          {mode === 'signup' && (
            <>
              {/* Full Name */}
              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#A3A3A3] mb-1.5">
                  Full Name <span className="text-[#F59E0B]">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#A3A3A3]">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (errorText) setErrorText(null);
                    }}
                    placeholder="Enter your full name"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-lg bg-[#0A0A0A] border border-[#262626] text-white placeholder-[#737373] text-sm focus:outline-none focus:ring-1 focus:ring-white min-h-[44px]"
                  />
                </div>
              </div>

              {/* 10-Digit Mobile Number */}
              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#A3A3A3] mb-1.5">
                  10-Digit Mobile Number <span className="text-[#F59E0B]">*</span>
                </label>
                <div className="relative flex">
                  <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-[#262626] bg-[#0A0A0A] text-[#A3A3A3] text-sm font-semibold select-none">
                    +91
                  </span>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={phone}
                    onChange={handlePhoneChange}
                    placeholder="9876543210"
                    className="w-full px-3.5 py-2.5 rounded-r-lg bg-[#0A0A0A] border border-[#262626] text-white placeholder-[#737373] text-sm font-mono focus:outline-none focus:ring-1 focus:ring-white min-h-[44px]"
                  />
                </div>
              </div>
            </>
          )}

          {/* Email */}
          <div>
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#A3A3A3] mb-1.5">
              Email Address <span className="text-[#F59E0B]">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#A3A3A3]">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errorText) setErrorText(null);
                }}
                placeholder="you@example.com"
                autoComplete="email"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-lg bg-[#0A0A0A] border border-[#262626] text-white placeholder-[#737373] text-sm focus:outline-none focus:ring-1 focus:ring-white min-h-[44px]"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#A3A3A3]">
                Password <span className="text-[#F59E0B]">*</span>
              </label>
              {mode === 'signup' && (
                <span className="text-[10px] text-[#A3A3A3]">Min. 8 characters</span>
              )}
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#A3A3A3]">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorText) setErrorText(null);
                }}
                placeholder={mode === 'signup' ? 'Create a secure password' : 'Enter your password'}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-lg bg-[#0A0A0A] border border-[#262626] text-white placeholder-[#737373] text-sm focus:outline-none focus:ring-1 focus:ring-white min-h-[44px]"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-[52px] bg-white hover:bg-neutral-200 active:bg-neutral-300 text-black font-bold rounded-xl flex items-center justify-center gap-2 text-sm transition-colors cursor-pointer mt-4 shadow-lg disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>{mode === 'signup' ? 'Creating account...' : 'Signing in...'}</span>
              </>
            ) : (
              <span>{mode === 'signup' ? 'Create account' : 'Sign in'}</span>
            )}
          </button>
        </form>

        {/* Footer switch prompt */}
        <div className="text-center pt-2">
          {mode === 'signin' ? (
            <p className="text-xs text-[#A3A3A3]">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => handleSwitchMode('signup')}
                className="text-white hover:text-[#F59E0B] font-semibold underline underline-offset-2 cursor-pointer transition-colors"
              >
                Create account
              </button>
            </p>
          ) : (
            <p className="text-xs text-[#A3A3A3]">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => handleSwitchMode('signin')}
                className="text-white hover:text-[#F59E0B] font-semibold underline underline-offset-2 cursor-pointer transition-colors"
              >
                Sign in
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
