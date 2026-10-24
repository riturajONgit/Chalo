import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { BookingForm } from './components/BookingForm';
import { ConfirmationScreen } from './components/ConfirmationScreen';
import { CheckBooking } from './components/CheckBooking';
import { AdminView } from './components/AdminView';
import { DriverApp } from './components/DriverApp/DriverApp';
import { VehicleType, TripType, DESTINATIONS, supabase } from './lib/supabase';
import { Shield, Clock, Award, MapPin } from 'lucide-react';

interface ConfirmedBooking {
  bookingCode: string;
  fare: number;
  riderName: string;
  riderPhone: string;
  pickupAddress: string;
  dropAddress: string;
  fromCity: string;
  toCity: string;
  vehicleType: VehicleType;
  tripType: TripType;
  pickupWhen: string;
}

export default function App() {
  const [currentPath, setCurrentPath] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return window.location.pathname || '/';
    }
    return '/';
  });

  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(false);
  const [confirmedBooking, setConfirmedBooking] = useState<ConfirmedBooking | null>(null);
  const [isCheckingBooking, setIsCheckingBooking] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.location.pathname === '/check';
    }
    return false;
  });
  const [prefilledLookup, setPrefilledLookup] = useState<{ code: string; phone: string }>({ code: '', phone: '' });

  // Router navigation helper
  const navigate = useCallback((path: string) => {
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', path);
      setCurrentPath(path);
      setIsCheckingBooking(path === '/check');
      if (path === '/') {
        setConfirmedBooking(null);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  // Listen to browser popstate (back/forward button)
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname || '/';
      setCurrentPath(path);
      setIsCheckingBooking(path === '/check');
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Admin navbar indicator check
  useEffect(() => {
    async function checkAdminIndicator() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: isAdminRes } = await supabase.rpc('is_admin');
          setIsAdminLoggedIn(Boolean(isAdminRes));
        } else {
          setIsAdminLoggedIn(false);
        }
      } catch {
        setIsAdminLoggedIn(false);
      }
    }

    checkAdminIndicator();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        setIsAdminLoggedIn(false);
      } else {
        const { data: isAdminRes } = await supabase.rpc('is_admin');
        setIsAdminLoggedIn(Boolean(isAdminRes));
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleBookingSuccess = (data: ConfirmedBooking) => {
    setConfirmedBooking(data);
    setIsCheckingBooking(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBookAnother = () => {
    setConfirmedBooking(null);
    setIsCheckingBooking(false);
    setPrefilledLookup({ code: '', phone: '' });
    navigate('/');
  };

  const isDriverRoute = currentPath === '/driver' || currentPath.startsWith('/driver');
  const isAdminRoute = currentPath === '/admin' || currentPath.startsWith('/admin');
  const isCheckRoute = currentPath === '/check' || isCheckingBooking;

  return (
    <div className="min-h-screen bg-[#0b0f14] text-[#f3f4f6] flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-300">
      {/* Top Bar */}
      <Navbar 
        onReset={handleBookAnother} 
        currentRoute={currentPath}
        onNavigate={navigate}
        isAdminLoggedIn={isAdminLoggedIn}
      />

      {/* Main Container */}
      <main className="flex-1 px-4 py-4 sm:py-7 max-w-2xl mx-auto w-full">
        {/* ROUTE 1: /driver -> Dedicated Driver View. No admin components rendered. */}
        {isDriverRoute ? (
          <DriverApp onNavigate={navigate} />
        ) : isAdminRoute ? (
          /* ROUTE 2: /admin -> Dedicated Admin View. No driver components rendered. */
          <AdminView onNavigate={navigate} />
        ) : (
          /* ROUTE 3: / (or rider) -> Rider Booking & Lookup Flow */
          confirmedBooking ? (
            <ConfirmationScreen
              bookingCode={confirmedBooking.bookingCode}
              fare={confirmedBooking.fare}
              riderName={confirmedBooking.riderName}
              riderPhone={confirmedBooking.riderPhone}
              pickupAddress={confirmedBooking.pickupAddress}
              dropAddress={confirmedBooking.dropAddress}
              fromCity={confirmedBooking.fromCity}
              toCity={confirmedBooking.toCity}
              vehicleType={confirmedBooking.vehicleType}
              tripType={confirmedBooking.tripType}
              pickupWhen={confirmedBooking.pickupWhen}
              onBookAnother={handleBookAnother}
              onCheckBooking={(code, phone) => {
                setPrefilledLookup({ code, phone });
                setIsCheckingBooking(true);
                setConfirmedBooking(null);
                navigate('/check');
              }}
            />
          ) : isCheckRoute ? (
            <CheckBooking
              onBack={() => {
                setIsCheckingBooking(false);
                navigate('/');
              }}
              initialCode={prefilledLookup.code}
              initialPhone={prefilledLookup.phone}
            />
          ) : (
            <div className="space-y-6">
              {/* Header Hero Title */}
              <div className="space-y-2 text-center sm:text-left">
                <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-3 py-1 rounded-full">
                  <span>Direct Outstation Taxis</span>
                  <span aria-hidden="true">·</span>
                  <span>Rewa (M.P.)</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
                  Book Outstation Cabs from Rewa
                </h1>
                <p className="text-sm text-zinc-400 max-w-md">
                  Guaranteed upfront pricing to Prayagraj, Varanasi, Satna, Jabalpur, Khajuraho & Bhopal. No advance payment required.
                </p>
              </div>

              {/* Value Props Row */}
              <div className="grid grid-cols-3 gap-2 py-1 text-center">
                <div className="bg-[#121820] border border-white/5 rounded-xl p-2.5">
                  <Shield className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
                  <p className="text-xs font-semibold text-white">Guaranteed Fare</p>
                  <p className="text-[10px] text-zinc-400">Fixed quote before booking</p>
                </div>
                <div className="bg-[#121820] border border-white/5 rounded-xl p-2.5">
                  <Clock className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
                  <p className="text-xs font-semibold text-white">On-Time Pickup</p>
                  <p className="text-[10px] text-zinc-400">Doorstep pickup in Rewa</p>
                </div>
                <div className="bg-[#121820] border border-white/5 rounded-xl p-2.5">
                  <Award className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
                  <p className="text-xs font-semibold text-white">AC Vehicles</p>
                  <p className="text-[10px] text-zinc-400">Clean Sedans & SUVs</p>
                </div>
              </div>

              {/* Booking Form Screen */}
              <BookingForm 
                onSuccess={handleBookingSuccess} 
                onOpenCheckBooking={() => {
                  setIsCheckingBooking(true);
                  navigate('/check');
                }}
              />

              {/* Available Routes Reference Card */}
              <div className="bg-[#121820]/70 border border-white/10 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Direct Outstation Routes From Rewa</span>
                  </h2>
                  <span className="text-[11px] text-zinc-400">One Way & Round Trip</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {DESTINATIONS.map((dest) => (
                    <div
                      key={dest.id}
                      className="p-2.5 rounded-xl bg-[#0b0f14]/80 border border-white/5 text-left"
                    >
                      <p className="text-xs font-semibold text-white">{dest.name}</p>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        {dest.distanceKm} km · {dest.approxTime}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-white/10 py-6 pb-8 px-4 bg-[#0b0f14] text-center text-xs text-zinc-400">
        <div className="max-w-2xl mx-auto space-y-2">
          <p className="font-semibold text-zinc-400">
            Chalo Outstation Cabs · Serving Rewa, Madhya Pradesh
          </p>
          <p className="text-[11px] text-zinc-400">
            Proudly made in Rewa by <span className="text-[#22c55e] font-semibold">WHITE TIGER</span>
          </p>
          <p className="text-[11px] text-zinc-400">
            Civil Lines, Rewa, MP 486001 · 24x7 WhatsApp Driver Coordination
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-zinc-400 pt-1">
            <button
              onClick={() => navigate('/')}
              className={`hover:text-emerald-400 transition-colors cursor-pointer ${
                !isDriverRoute && !isAdminRoute ? 'text-emerald-400 font-bold' : ''
              }`}
            >
              Rider Booking
            </button>
            <span>·</span>
            <button
              onClick={() => navigate('/driver')}
              className={`hover:text-emerald-400 transition-colors cursor-pointer ${
                isDriverRoute ? 'text-emerald-400 font-bold' : ''
              }`}
            >
              Driver Partner Portal (/driver)
            </button>
            <span>·</span>
            <button
              onClick={() => navigate('/admin')}
              className={`hover:text-emerald-400 transition-colors cursor-pointer ${
                isAdminRoute ? 'text-emerald-400 font-bold' : ''
              }`}
            >
              Admin Portal (/admin)
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
