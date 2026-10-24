import React, { useState, useEffect, useCallback } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import { DriverAuth } from './DriverAuth';
import { DriverStatus } from './DriverStatus';
import { DriverOffers } from './DriverOffers';
import { Loader2, ArrowLeft, LogOut, UserX, Car } from 'lucide-react';

export interface OwnerData {
  id?: string;
  name: string;
  phone: string;
  status: string;
}

export interface VehicleData {
  id?: string;
  reg_no: string;
  vehicle_type: string;
  status?: string;
}

interface DriverAppProps {
  onNavigate: (path: string) => void;
}

export const DriverApp: React.FC<DriverAppProps> = ({ onNavigate }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [owner, setOwner] = useState<OwnerData | null>(null);
  const [vehicle, setVehicle] = useState<VehicleData | null>(null);
  const [hasCheckedOwner, setHasCheckedOwner] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isRegisteringMissingProfile, setIsRegisteringMissingProfile] = useState<boolean>(false);

  // Clear all driver state
  const clearDriverState = useCallback(() => {
    setCurrentUser(null);
    setOwner(null);
    setVehicle(null);
    setHasCheckedOwner(false);
    setIsRegisteringMissingProfile(false);
  }, []);

  // Fetch driver data for the currently authenticated user
  const checkDriverAuth = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        clearDriverState();
        setHasCheckedOwner(true);
        return;
      }

      setCurrentUser(user);

      // Query owners table for this authenticated user only (with joined vehicles)
      const { data: ownerData, error: ownerError } = await supabase
        .from('owners')
        .select('id, name, phone, status, vehicles(id, vehicle_type, reg_no, status)')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (ownerError) {
        console.warn('Driver owner query notice:', ownerError);
      }

      if (ownerData) {
        setOwner({
          id: ownerData.id,
          name: ownerData.name,
          phone: ownerData.phone,
          status: ownerData.status,
        });

        // Extract vehicle from joined relation
        const vehiclesRaw = (ownerData as any).vehicles;
        const vehicleItem = Array.isArray(vehiclesRaw) ? vehiclesRaw[0] : vehiclesRaw;
        if (vehicleItem) {
          setVehicle({
            id: vehicleItem.id,
            reg_no: vehicleItem.reg_no,
            vehicle_type: vehicleItem.vehicle_type,
            status: vehicleItem.status,
          });
        } else {
          setVehicle(null);
        }
      } else {
        setOwner(null);
        setVehicle(null);
      }
      setHasCheckedOwner(true);
    } catch (err) {
      console.warn('Driver check notice:', err);
      clearDriverState();
      setHasCheckedOwner(true);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [clearDriverState]);

  useEffect(() => {
    checkDriverAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        clearDriverState();
        setIsLoading(false);
        setHasCheckedOwner(true);
      } else {
        await checkDriverAuth();
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [checkDriverAuth, clearDriverState]);

  const handleSignOut = async () => {
    clearDriverState();
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Driver sign out notice:', err);
    }
    setHasCheckedOwner(true);
  };

  // 1. Loading state
  if (isLoading && !hasCheckedOwner) {
    return (
      <div className="w-full max-w-md mx-auto py-16 text-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mx-auto" />
        <p className="text-sm text-zinc-400">Loading driver portal...</p>
      </div>
    );
  }

  // 2. Unauthenticated: show Driver Sign In / Sign Up
  if (!currentUser) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => onNavigate('/')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-white transition-colors min-h-[44px] py-1 px-2 rounded-lg"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Rider Booking</span>
        </button>
        <DriverAuth onAuthComplete={() => checkDriverAuth()} />
      </div>
    );
  }

  // 3. User is authenticated, but NO owners row exists -> show "No driver profile for this account"
  // Starts with empty state and only shows database profile
  if (!owner) {
    return (
      <div className="w-full max-w-md mx-auto space-y-4 animate-in fade-in duration-200">
        <button
          type="button"
          onClick={() => onNavigate('/')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-white transition-colors min-h-[44px] py-1 px-2 rounded-lg"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Booking</span>
        </button>

        {!isRegisteringMissingProfile ? (
          <div className="bg-[#121820] border border-white/10 rounded-2xl p-6 sm:p-7 shadow-xl text-center space-y-5">
            <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center justify-center mx-auto text-red-400">
              <UserX className="w-8 h-8 stroke-[2]" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                No driver profile for this account
              </h2>
              <p className="text-xs text-zinc-400 max-w-xs mx-auto">
                Signed in as <span className="text-zinc-200 font-mono font-semibold">{currentUser.email || 'authenticated user'}</span>. This account does not have an attached driver or vehicle profile.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[#0b0f14] border border-white/5 text-xs text-zinc-400 text-left space-y-1.5">
              <p className="font-semibold text-zinc-300">What would you like to do?</p>
              <p>• Sign out to sign in with your driver partner credentials.</p>
              <p>• Or register this account as a new Chalo driver partner.</p>
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

              <button
                type="button"
                onClick={() => setIsRegisteringMissingProfile(true)}
                className="w-full min-h-[44px] rounded-xl bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-black font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md shadow-emerald-950/30"
              >
                <Car className="w-4 h-4" />
                <span>Register this account as a driver</span>
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="text-xs text-emerald-400 hover:text-emerald-300 underline underline-offset-4 min-h-[44px] px-2 inline-flex items-center cursor-pointer"
                >
                  Link to Driver Sign-Up
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setIsRegisteringMissingProfile(false)}
              className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 p-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Account Notice</span>
            </button>
            <DriverAuth initialMode="step2" onAuthComplete={() => checkDriverAuth()} />
          </div>
        )}
      </div>
    );
  }

  // 4. Authenticated with verified owner profile from database
  const status = (owner.status || '').toLowerCase();

  // Screen 3: Pending or Suspended -> Show Status Screen (do not show offers)
  if (status !== 'approved') {
    return (
      <DriverStatus
        owner={owner}
        vehicle={vehicle}
        onRefresh={() => checkDriverAuth(true)}
        onSignOut={handleSignOut}
        isRefreshing={isRefreshing}
      />
    );
  }

  // Screen 4: Approved -> Show Offers Inbox & Accepted Trips
  return (
    <DriverOffers
      key={currentUser.id}
      owner={owner}
      vehicle={vehicle}
      onSignOut={handleSignOut}
    />
  );
};
