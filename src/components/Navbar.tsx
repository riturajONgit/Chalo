import React from 'react';
import { Car, PhoneCall } from 'lucide-react';

export type AppRoute = '/' | '/driver' | '/admin';

interface NavbarProps {
  onReset?: () => void;
  currentRoute: string;
  onNavigate: (route: string) => void;
  isAdminLoggedIn?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  onReset, 
  currentRoute, 
  onNavigate,
  isAdminLoggedIn 
}) => {
  const isDriverRoute = currentRoute === '/driver' || currentRoute.startsWith('/driver');
  const isAdminRoute = currentRoute === '/admin' || currentRoute.startsWith('/admin');
  const isRiderRoute = !isDriverRoute && !isAdminRoute;

  return (
    <header className="sticky top-0 z-30 bg-[#0b0f14]/95 backdrop-blur-md border-b border-white/10 px-3 py-2.5 sm:px-6">
      <div className="max-w-2xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand */}
        <button
          onClick={onReset || (() => onNavigate('/'))}
          className="flex items-center gap-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-lg py-1 cursor-pointer shrink-0"
          aria-label="Chalo Outstation Cabs"
        >
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Car className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
          </div>
          <div>
            <span className="text-base sm:text-lg font-extrabold tracking-tight text-white flex items-center gap-1.5 leading-none">
              Chalo
              <span className="text-emerald-400 text-[10px] sm:text-xs font-semibold px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30">
                Rewa
              </span>
            </span>
            <p className="text-[10px] text-zinc-400 mt-0.5 font-medium hidden sm:block">Outstation Cabs from Rewa</p>
          </div>
        </button>

        {/* Navigation Selector & Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Route Navigation: / | /driver | /admin */}
          <div className="flex items-center p-1 bg-[#121820] border border-white/10 rounded-xl">
            <button
              onClick={() => onNavigate('/')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all min-h-[38px] flex items-center gap-1 cursor-pointer ${
                isRiderRoute
                  ? 'bg-emerald-500 text-black shadow-sm font-bold'
                  : 'text-zinc-300 hover:text-white'
              }`}
            >
              <span>Rider</span>
            </button>

            <button
              onClick={() => onNavigate('/driver')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all min-h-[38px] flex items-center gap-1 cursor-pointer ${
                isDriverRoute
                  ? 'bg-emerald-500 text-black shadow-sm font-bold'
                  : 'text-zinc-300 hover:text-white'
              }`}
            >
              <span>Driver</span>
            </button>

            <button
              onClick={() => onNavigate('/admin')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all min-h-[38px] flex items-center gap-1 cursor-pointer ${
                isAdminRoute
                  ? 'bg-emerald-500 text-black shadow-sm font-bold'
                  : 'text-zinc-300 hover:text-white'
              }`}
            >
              <span>Admin</span>
              {isAdminLoggedIn && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              )}
            </button>
          </div>

          {/* WhatsApp Support affordance */}
          <a
            href="https://wa.me/919425178000?text=Hello%20Chalo%20Cabs%2C%20I%20need%20assistance%20with%20an%20outstation%20booking%20from%20Rewa"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 sm:px-3 sm:py-2 text-xs font-semibold text-zinc-200 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 shrink-0"
            title="WhatsApp Support"
            aria-label="WhatsApp Support"
          >
            <PhoneCall className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden md:inline ml-1.5">Support</span>
          </a>
        </div>
      </div>
    </header>
  );
};
