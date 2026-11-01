import React, { useState, useEffect, useCallback } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import { DriverAuth } from './DriverAuth';
import { DriverStatus } from './DriverStatus';
import { DriverOffers } from './DriverOffers';
import { DriverProfileForm } from './DriverProfileForm';
import { Loader2, ArrowLeft } from 'lucide-react';

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
  // Clear all driver state
  const clearDriverState = useCallback(() => {
    setCurrentUser(null);
    setOwner(null);
    setVehicle(null);
    setHasCheckedOwner(false);
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

  // 3. User is authenticated, but NO owners row exists -> go straight to "Complete your driver profile" form
  if (!owner) {
    return (
      <DriverProfileForm
        currentUser={currentUser}
        onProfileCompleted={() => checkDriverAuth(true)}
        onSignOut={handleSignOut}
        onNavigateHome={() => onNavigate('/')}
      />
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
