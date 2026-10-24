import React, { useState, useId } from 'react';
import { supabase } from '../lib/supabase';
import { Lock, Mail, Loader2, AlertCircle, ArrowLeft, Shield } from 'lucide-react';

interface AdminLoginProps {
  onLoginSuccess: () => void;
  onBackToBooking: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess, onBackToBooking }) => {
  const emailId = useId();
  const passwordId = useId();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim() || isLoading) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      // 1. Sign in with email and password
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      if (authError) {
        setErrorMessage(authError.message || 'Invalid email or password.');
        setIsLoading(false);
        return;
      }

      if (!authData?.user) {
        setErrorMessage('User session could not be established.');
        setIsLoading(false);
        return;
      }

      // 2. Check if user is an admin by calling the RPC is_admin()
      const { data: isAdmin, error: rpcError } = await supabase.rpc('is_admin');

      if (rpcError) {
        await supabase.auth.signOut();
        setErrorMessage(rpcError.message || 'Failed to verify admin status.');
        setIsLoading(false);
        return;
      }

      if (!isAdmin) {
        // Sign out if not an admin
        await supabase.auth.signOut();
        setErrorMessage('This account is not an admin.');
        setIsLoading(false);
        return;
      }

      // User is verified admin
      onLoginSuccess();
    } catch (err: any) {
      setErrorMessage(err?.message || 'An unexpected error occurred during sign in.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-5 animate-in fade-in duration-200">
      {/* Back button */}
      <button
        type="button"
        onClick={onBackToBooking}
        className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors min-h-[44px] py-1 px-2 rounded-lg -ml-2"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Cab Booking</span>
      </button>

      {/* Login Card */}
      <div className="bg-[#121820] border border-white/10 rounded-2xl p-6 sm:p-7 shadow-xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center mx-auto text-emerald-400">
            <Shield className="w-6 h-6 stroke-[2.2]" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            Admin Portal Login
          </h1>
          <p className="text-xs text-zinc-400">
            Sign in to manage outstation bookings and vehicle dispatch.
          </p>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-sm flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <p className="text-xs leading-relaxed">{errorMessage}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <label htmlFor={emailId} className="block text-xs font-medium text-zinc-300 mb-1.5">
              Admin Email
            </label>
            <div className="relative">
              <input
                id={emailId}
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@chalo.com"
                className="w-full pl-10 pr-3.5 py-3 rounded-xl bg-[#0b0f14] border border-white/15 text-white placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[48px]"
              />
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none">
                <Mail className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Password */}
          <div>
            <label htmlFor={passwordId} className="block text-xs font-medium text-zinc-300 mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                id={passwordId}
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-3.5 py-3 rounded-xl bg-[#0b0f14] border border-white/15 text-white placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[48px]"
              />
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none">
                <Lock className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading || !email.trim() || !password.trim()}
            className={`w-full min-h-[50px] rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg ${
              !isLoading && email.trim() && password.trim()
                ? 'bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-black shadow-emerald-950/50 cursor-pointer'
                : 'bg-zinc-800 text-zinc-500 border border-white/5 cursor-not-allowed'
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verifying credentials...</span>
              </>
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
