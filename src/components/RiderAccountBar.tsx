import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { User, LogIn, UserPlus, LogOut, Loader2, ShieldCheck } from 'lucide-react';

interface RiderAccountBarProps {
  currentUser: any | null;
  riderProfile: { name: string; phone: string } | null;
  onOpenSignIn: () => void;
  onOpenSignUp: () => void;
  onSignOut: () => void;
}

export const RiderAccountBar: React.FC<RiderAccountBarProps> = ({
  currentUser,
  riderProfile,
  onOpenSignIn,
  onOpenSignUp,
  onSignOut,
}) => {
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await supabase.auth.signOut();
      onSignOut();
    } catch (err) {
      console.warn('Sign out notice:', err);
    } finally {
      setIsSigningOut(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="bg-[#141414] border border-[#262626] rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#F59E0B] shrink-0">
            <User className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-white">Rider Account</p>
            <p className="text-[11px] text-[#A3A3A3]">
              Sign in or create an account to save your trips and autofill bookings
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenSignIn}
            className="flex-1 sm:flex-none px-3.5 py-2 text-xs font-semibold text-white bg-transparent hover:bg-white/5 border border-white/20 rounded-xl transition-colors cursor-pointer min-h-[38px] flex items-center justify-center gap-1.5"
          >
            <LogIn className="w-3.5 h-3.5 text-[#A3A3A3]" />
            <span>Sign in</span>
          </button>

          <button
            type="button"
            onClick={onOpenSignUp}
            className="flex-1 sm:flex-none px-3.5 py-2 text-xs font-bold text-black bg-white hover:bg-neutral-200 active:bg-neutral-300 rounded-xl transition-colors cursor-pointer min-h-[38px] flex items-center justify-center gap-1.5 shadow-sm"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Create account</span>
          </button>
        </div>
      </div>
    );
  }

  // Signed in state
  const displayName = riderProfile?.name || currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'Rider';
  const displayPhone = riderProfile?.phone || '';

  return (
    <div className="bg-[#141414] border border-[#262626] rounded-2xl p-3.5 sm:p-4 flex items-center justify-between gap-3 shadow-md">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-xl bg-[#22c55e]/15 border border-[#22c55e]/30 flex items-center justify-center text-[#22c55e] shrink-0">
          <ShieldCheck className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-white truncate">
              {displayName}
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/10 text-white font-medium">
              Signed in
            </span>
          </div>
          <p className="text-[11px] text-[#A3A3A3] truncate">
            {displayPhone ? `+91 ${displayPhone} · ` : ''}{currentUser.email}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={handleSignOut}
        disabled={isSigningOut}
        className="px-3 py-1.5 text-xs font-semibold text-[#A3A3A3] hover:text-white bg-transparent hover:bg-white/5 border border-white/10 rounded-xl transition-colors cursor-pointer min-h-[36px] flex items-center gap-1.5 shrink-0"
      >
        {isSigningOut ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <LogOut className="w-3.5 h-3.5" />
        )}
        <span>Sign out</span>
      </button>
    </div>
  );
};
