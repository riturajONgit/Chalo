import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { BookingForm } from './components/BookingForm';
import { ConfirmationScreen } from './components/ConfirmationScreen';
import { CheckBooking } from './components/CheckBooking';
import { AdminView } from './components/AdminView';
import { DriverApp } from './components/DriverApp/DriverApp';
import { RiderAccountBar } from './components/RiderAccountBar';
import { RiderAuthModal } from './components/RiderAuthModal';
import { MyTrips } from './components/MyTrips';
import { RateCard } from './components/RateCard';
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
  pickupLat?: number | null;
  pickupLng?: number | null;
  isGuestBooking?: boolean;
}

export default function App() {
  const [currentPath, setCurrentPath] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return window.location.pathname || '/';
    }
    return '/';
  });

  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(false);
  const [currentRiderUser, setCurrentRiderUser] = useState<any | null>(null);
  const [riderProfile, setRiderProfile] = useState<{ name: string; phone: string } | null>(null);
  const [isRiderAuthModalOpen, setIsRiderAuthModalOpen] = useState<boolean>(false);
  const [riderAuthInitialMode, setRiderAuthInitialMode] = useState<'signin' | 'signup'>('signin');
  const [selectedCityFromRateCard, setSelectedCityFromRateCard] = useState<string>('');

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

  // Auth, profile & Admin indicator check
  useEffect(() => {
    let isMounted = true;

    async function loadAuthAndProfile() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!isMounted) return;
        setCurrentRiderUser(user);

        if (user) {
          const [{ data: isAdminRes }, { data: profileData }] = await Promise.all([
            supabase.rpc('is_admin'),
            supabase.from('riders').select('name, phone').eq('auth_user_id', user.id).maybeSingle(),
          ]);

          if (isMounted) {
            setIsAdminLoggedIn(Boolean(isAdminRes));
            setRiderProfile(profileData || null);
          }
        } else {
          setIsAdminLoggedIn(false);
          setRiderProfile(null);
        }
      } catch {
        if (isMounted) {
          setIsAdminLoggedIn(false);
          setRiderProfile(null);
        }
      }
    }

    loadAuthAndProfile();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      const user = session?.user || null;
      setCurrentRiderUser(user);

      if (event === 'SIGNED_OUT' || !user) {
        setIsAdminLoggedIn(false);
        setRiderProfile(null);
      } else {
        try {
          const [{ data: isAdminRes }, { data: profileData }] = await Promise.all([
            supabase.rpc('is_admin'),
            supabase.from('riders').select('name, phone').eq('auth_user_id', user.id).maybeSingle(),
          ]);

          if (isMounted) {
            setIsAdminLoggedIn(Boolean(isAdminRes));
            setRiderProfile(profileData || null);
          }
        } catch {
          if (isMounted) {
            setIsAdminLoggedIn(false);
            setRiderProfile(null);
          }
        }
      }
    });

    return () => {
      isMounted = false;
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
    <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col font-sans selection:bg-[#F59E0B]/30 selection:text-[#F59E0B]">
      {/* 3px Brand Saffron Stripe */}
      <div className="h-[3px] bg-[#F59E0B] w-full shrink-0" />

      {/* Top Bar */}
      <Navbar 
        onReset={handleBookAnother} 
        currentRoute={currentPath}
        onNavigate={navigate}
        isAdminLoggedIn={isAdminLoggedIn}
      />

      {/* Main Container: max-width 1200px centered, 16px mobile, 32px desktop */}
      <main className="flex-1 px-4 md:px-8 py-4 sm:py-6 max-w-[1200px] mx-auto w-full space-y-6 pb-[calc(64px+env(safe-area-inset-bottom,0px))] md:pb-12">
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
              pickupLat={confirmedBooking.pickupLat}
              pickupLng={confirmedBooking.pickupLng}
              isGuestBooking={confirmedBooking.isGuestBooking}
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
              {/* Rider Account Bar: Sign in / Create account / Sign out */}
              <RiderAccountBar
                currentUser={currentRiderUser}
                riderProfile={riderProfile}
                onOpenSignIn={() => {
                  setRiderAuthInitialMode('signin');
                  setIsRiderAuthModalOpen(true);
                }}
                onOpenSignUp={() => {
                  setRiderAuthInitialMode('signup');
                  setIsRiderAuthModalOpen(true);
                }}
                onSignOut={() => {
                  setCurrentRiderUser(null);
                  setRiderProfile(null);
                }}
              />

              {/* Header Hero Title */}
              <div className="space-y-1.5 text-left pt-1">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-[#F59E0B] block">
                  Direct Outstation Cabs · Rewa (M.P.)
                </span>
                <h1 className="text-[28px] font-bold tracking-tight text-white leading-tight">
                  Book Outstation Cabs from Rewa
                </h1>
                <p className="text-sm text-[#A3A3A3] max-w-xl">
                  Guaranteed upfront pricing to Prayagraj, Varanasi, Satna, Jabalpur, Khajuraho & Bhopal. No advance payment required.
                </p>
              </div>

              {/* Value Props Row */}
              <div className="grid grid-cols-3 gap-2.5 sm:gap-4 text-center">
                <div className="bg-[#141414] border border-[#262626] rounded-xl p-3 sm:p-4">
                  <Shield className="w-4 h-4 text-[#F59E0B] mx-auto mb-1.5" />
                  <p className="text-xs font-bold text-white">Guaranteed Fare</p>
                  <p className="text-[10px] text-[#A3A3A3] mt-0.5">Fixed quote before ride</p>
                </div>
                <div className="bg-[#141414] border border-[#262626] rounded-xl p-3 sm:p-4">
                  <Clock className="w-4 h-4 text-[#F59E0B] mx-auto mb-1.5" />
                  <p className="text-xs font-bold text-white">On-Time Pickup</p>
                  <p className="text-[10px] text-[#A3A3A3] mt-0.5">Doorstep in Rewa</p>
                </div>
                <div className="bg-[#141414] border border-[#262626] rounded-xl p-3 sm:p-4">
                  <Award className="w-4 h-4 text-[#F59E0B] mx-auto mb-1.5" />
                  <p className="text-xs font-bold text-white">AC Vehicles</p>
                  <p className="text-[10px] text-[#A3A3A3] mt-0.5">Clean Sedans & SUVs</p>
                </div>
              </div>

              {/* Booking Form Screen */}
              <BookingForm 
                onSuccess={handleBookingSuccess} 
                onOpenCheckBooking={() => {
                  setIsCheckingBooking(true);
                  navigate('/check');
                }}
                externalSelectedCity={selectedCityFromRateCard}
              />

              {/* When signed in, show a "My trips" section in the Rider tab */}
              {currentRiderUser && (
                <MyTrips
                  currentUserPhone={riderProfile?.phone || ''}
                  onCheckBooking={(code, phone) => {
                    setPrefilledLookup({ code, phone: phone || riderProfile?.phone || '' });
                    setIsCheckingBooking(true);
                    navigate('/check');
                  }}
                />
              )}

              {/* Rate Card: Its own section below the form (stacked on mobile, 3-column grid on desktop) */}
              <RateCard 
                selectedDestination={selectedCityFromRateCard}
                onSelectRoute={(city) => {
                  setSelectedCityFromRateCard(city);
                  window.scrollTo({ top: 120, behavior: 'smooth' });
                }}
              />

              {/* Rider Auth Modal */}
              <RiderAuthModal
                isOpen={isRiderAuthModalOpen}
                onClose={() => setIsRiderAuthModalOpen(false)}
                initialMode={riderAuthInitialMode}
                onSuccess={() => {
                  setIsRiderAuthModalOpen(false);
                }}
              />
            </div>
          )
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-[#262626] py-6 pb-24 md:pb-8 px-4 bg-[#0A0A0A] text-center text-xs text-[#A3A3A3]">
        <div className="max-w-[1200px] mx-auto space-y-2">
          <p className="font-semibold text-white">
            Chalo Outstation Cabs · Serving Rewa, Madhya Pradesh
          </p>
          <p className="text-[11px] text-[#A3A3A3]">
            Proudly made in Rewa by <span className="text-[#F59E0B] font-bold">WHITE TIGER</span>
          </p>
          <p className="text-[11px] text-[#A3A3A3]">
            Civil Lines, Rewa, MP 486001 · 24x7 WhatsApp Driver Coordination
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-[#A3A3A3] pt-1">
            <button
              onClick={() => navigate('/')}
              className={`hover:text-white transition-colors cursor-pointer ${
                !isDriverRoute && !isAdminRoute ? 'text-white font-bold underline underline-offset-4' : ''
              }`}
            >
              Rider Booking
            </button>
            <span>·</span>
            <button
              onClick={() => navigate('/driver')}
              className={`hover:text-white transition-colors cursor-pointer ${
                isDriverRoute ? 'text-white font-bold underline underline-offset-4' : ''
              }`}
            >
              Driver Partner Portal (/driver)
            </button>
            <span>·</span>
            <button
              onClick={() => navigate('/admin')}
              className={`hover:text-white transition-colors cursor-pointer ${
                isAdminRoute ? 'text-white font-bold underline underline-offset-4' : ''
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
