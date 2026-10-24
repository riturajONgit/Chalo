import React, { useState, useEffect, useCallback } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { AdminLogin } from './AdminLogin';
import { AdminPortal } from './AdminPortal';
import { Loader2, ArrowLeft, Shield, AlertCircle, LogOut } from 'lucide-react';

interface AdminViewProps {
  onNavigate: (path: string) => void;
}

export const AdminView: React.FC<AdminViewProps> = ({ onNavigate }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const checkAdminAuth = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        setCurrentUser(null);
        setIsAdmin(false);
        return;
      }

      setCurrentUser(user);

      // Verify admin status
      const { data: adminData } = await supabase.rpc('is_admin');
      setIsAdmin(Boolean(adminData));
    } catch (err) {
      console.warn('Admin check notice:', err);
      setCurrentUser(null);
      setIsAdmin(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAdminAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        setCurrentUser(null);
        setIsAdmin(false);
        setIsLoading(false);
      } else {
        await checkAdminAuth();
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [checkAdminAuth]);

  const handleSignOut = async () => {
    setCurrentUser(null);
    setIsAdmin(false);
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Admin sign out notice:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full max-w-md mx-auto py-16 text-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mx-auto" />
        <p className="text-sm text-zinc-400">Verifying admin access...</p>
      </div>
    );
  }

  // Not signed in: show Admin Login Screen
  if (!currentUser) {
    return (
      <AdminLogin 
        onLoginSuccess={checkAdminAuth}
        onBackToBooking={() => onNavigate('/')}
      />
    );
  }

  // Signed in, but is_admin() is false
  if (!isAdmin) {
    return (
      <div className="w-full max-w-md mx-auto space-y-4 animate-in fade-in duration-200">
        <button
          type="button"
          onClick={() => onNavigate('/')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-white transition-colors min-h-[44px] py-1 px-2 rounded-lg"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Cab Booking</span>
        </button>

        <div className="bg-[#121820] border border-white/10 rounded-2xl p-6 sm:p-7 shadow-xl text-center space-y-5">
          <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center justify-center mx-auto text-red-400">
            <Shield className="w-8 h-8 stroke-[2]" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">
              This account is not an admin
            </h2>
            <p className="text-xs text-zinc-400 max-w-xs mx-auto">
              Signed in as <span className="text-zinc-200 font-mono font-semibold">{currentUser.email || 'authenticated user'}</span>. This account does not have administrative privileges.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#0b0f14] border border-white/5 text-xs text-zinc-400 text-left space-y-1.5">
            <div className="flex items-center gap-2 text-zinc-300 font-semibold">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Role isolation active</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Driver accounts cannot access admin dispatch features. To manage bookings or drivers, please sign out and sign in with an administrator account.
            </p>
          </div>

          <div className="space-y-2.5 pt-2">
            <button
              type="button"
              onClick={handleSignOut}
              className="w-full min-h-[48px] rounded-xl bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md shadow-red-950/40"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Verified Admin: show Admin Dashboard
  return <AdminPortal onSignOut={handleSignOut} />;
};
