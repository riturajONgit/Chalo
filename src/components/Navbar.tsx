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
    <header className="sticky top-0 z-30 bg-[#0A0A0A]/95 backdrop-blur-md border-b border-[#262626] px-3 py-2.5 sm:px-4">
      <div className="max-w-2xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand: CHALO in bold with "Rewa" as a small pill */}
        <button
          onClick={onReset || (() => onNavigate('/'))}
          className="flex items-center gap-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-lg py-1 cursor-pointer shrink-0"
          aria-label="CHALO Rewa Outstation Cabs"
        >
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/10 border border-[#262626] flex items-center justify-center text-white">
            <Car className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
          </div>
          <div>
            <span className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-1.5 leading-none">
              CHALO
              <span className="text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full bg-white/10 border border-[#262626] text-white">
                Rewa
              </span>
            </span>
            <p className="text-[10px] text-[#A3A3A3] mt-0.5 font-medium hidden sm:block">Outstation Cabs from Rewa</p>
          </div>
        </button>

        {/* Navigation Selector & Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Segmented Control: Rider | Driver | Admin with active in white */}
          <div className="flex items-center p-1 bg-[#141414] border border-[#262626] rounded-xl">
            <button
              onClick={() => onNavigate('/')}
              className={`px-3 py-1.5 rounded-lg text-xs transition-all min-h-[36px] flex items-center justify-center cursor-pointer ${
                isRiderRoute
                  ? 'bg-white text-black font-bold shadow-sm'
                  : 'text-[#A3A3A3] hover:text-white font-medium'
              }`}
            >
              <span>Rider</span>
            </button>

            <button
              onClick={() => onNavigate('/driver')}
              className={`px-3 py-1.5 rounded-lg text-xs transition-all min-h-[36px] flex items-center justify-center cursor-pointer ${
                isDriverRoute
                  ? 'bg-white text-black font-bold shadow-sm'
                  : 'text-[#A3A3A3] hover:text-white font-medium'
              }`}
            >
              <span>Driver</span>
            </button>

            <button
              onClick={() => onNavigate('/admin')}
              className={`px-3 py-1.5 rounded-lg text-xs transition-all min-h-[36px] flex items-center justify-center gap-1.5 cursor-pointer ${
                isAdminRoute
                  ? 'bg-white text-black font-bold shadow-sm'
                  : 'text-[#A3A3A3] hover:text-white font-medium'
              }`}
            >
              <span>Admin</span>
              {isAdminLoggedIn && (
                <span className={`w-1.5 h-1.5 rounded-full ${isAdminRoute ? 'bg-[#F59E0B]' : 'bg-[#22c55e]'}`} />
              )}
            </button>
          </div>

          {/* WhatsApp Support affordance */}
          <a
            href="https://wa.me/918319687057?text=Hello%20Chalo%20Cabs%2C%20I%20need%20assistance%20with%20an%20outstation%20booking%20from%20Rewa"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 sm:px-3 sm:py-2 text-xs font-medium text-white bg-transparent hover:bg-white/5 border border-white/20 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-white shrink-0"
            title="WhatsApp Support"
            aria-label="WhatsApp Support"
          >
            <PhoneCall className="w-3.5 h-3.5 text-[#F59E0B]" />
            <span className="hidden md:inline ml-1.5">Support</span>
          </a>
        </div>
      </div>
    </header>
  );
};
