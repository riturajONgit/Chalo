import React from 'react';
import { Car, Shield, User } from 'lucide-react';
import { CHALO_WHATSAPP_NUMBER } from '../lib/supabase';

export type AppRoute = '/' | '/driver' | '/admin';

interface NavbarProps {
  onReset?: () => void;
  currentRoute: string;
  onNavigate: (route: string) => void;
  isAdminLoggedIn?: boolean;
}

// Inline WhatsApp brand icon
const WhatsAppIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.888 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

export const Navbar: React.FC<NavbarProps> = ({ 
  onReset, 
  currentRoute, 
  onNavigate,
  isAdminLoggedIn 
}) => {
  const isDriverRoute = currentRoute === '/driver' || currentRoute.startsWith('/driver');
  const isAdminRoute = currentRoute === '/admin' || currentRoute.startsWith('/admin');
  const isRiderRoute = !isDriverRoute && !isAdminRoute;

  const whatsappUrl = `https://wa.me/${CHALO_WHATSAPP_NUMBER}?text=${encodeURIComponent(
    'Hello Chalo Cabs Rewa, I need assistance with an outstation cab.'
  )}`;

  return (
    <>
      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 bg-[#0A0A0A]/95 backdrop-blur-md border-b border-[#262626] px-4 md:px-8 py-3 w-full">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between gap-3">
          {/* Brand: CHALO in bold with "Rewa" as a small pill on the left */}
          <button
            onClick={onReset || (() => onNavigate('/'))}
            className="flex items-center gap-2.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-lg py-1 cursor-pointer shrink-0"
            aria-label="CHALO Rewa Outstation Cabs"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/10 border border-[#262626] flex items-center justify-center text-white shrink-0">
              <Car className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg sm:text-xl font-extrabold tracking-tight text-white leading-none">
                CHALO
              </span>
              <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full bg-white/10 border border-[#262626] text-white">
                Rewa
              </span>
            </div>
          </button>

          {/* Desktop Only: Centered Segmented Control with equal-width segments */}
          <div className="hidden md:flex items-center justify-center flex-1 max-w-xs mx-auto">
            <div className="grid grid-cols-3 w-full p-1 bg-[#141414] border border-[#262626] rounded-xl">
              <button
                onClick={() => onNavigate('/')}
                className={`py-1.5 px-3 rounded-lg text-xs transition-all flex items-center justify-center cursor-pointer ${
                  isRiderRoute
                    ? 'bg-white text-black font-bold shadow-sm'
                    : 'text-[#A3A3A3] hover:text-white font-medium'
                }`}
              >
                <span>Rider</span>
              </button>

              <button
                onClick={() => onNavigate('/driver')}
                className={`py-1.5 px-3 rounded-lg text-xs transition-all flex items-center justify-center cursor-pointer ${
                  isDriverRoute
                    ? 'bg-white text-black font-bold shadow-sm'
                    : 'text-[#A3A3A3] hover:text-white font-medium'
                }`}
              >
                <span>Driver</span>
              </button>

              <button
                onClick={() => onNavigate('/admin')}
                className={`py-1.5 px-3 rounded-lg text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
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
          </div>

          {/* Right: Green WhatsApp button (WhatsApp icon + label "Chat" on desktop, icon only on mobile) */}
          <div className="flex items-center shrink-0">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#22c55e] hover:bg-[#16a34a] active:bg-[#15803d] text-white rounded-xl transition-all flex items-center justify-center gap-1.5 font-bold shadow-sm min-h-[38px] px-3 py-2 sm:px-3.5 sm:py-2 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-[#22c55e]"
              title="Chat on WhatsApp (+91 8319687057)"
              aria-label="Chat on WhatsApp"
            >
              <WhatsAppIcon className="w-4 h-4 text-white shrink-0" />
              <span className="hidden sm:inline font-semibold">Chat</span>
            </a>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Tab Bar (under 768px): Rider, Driver, Admin tabs */}
      <nav 
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-16 bg-[#0A0A0A]/95 backdrop-blur-md border-t border-[#262626] px-2 flex items-center justify-around"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <button
          onClick={() => onNavigate('/')}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 px-2 rounded-lg transition-colors cursor-pointer min-h-[48px] ${
            isRiderRoute ? 'text-white' : 'text-[#A3A3A3] hover:text-white'
          }`}
        >
          <Car className={`w-5 h-5 mb-0.5 ${isRiderRoute ? 'text-white stroke-[2.4]' : 'text-[#A3A3A3]'}`} />
          <span className={`text-[11px] ${isRiderRoute ? 'font-bold text-white' : 'font-medium text-[#A3A3A3]'}`}>
            Rider
          </span>
        </button>

        <button
          onClick={() => onNavigate('/driver')}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 px-2 rounded-lg transition-colors cursor-pointer min-h-[48px] ${
            isDriverRoute ? 'text-white' : 'text-[#A3A3A3] hover:text-white'
          }`}
        >
          <User className={`w-5 h-5 mb-0.5 ${isDriverRoute ? 'text-white stroke-[2.4]' : 'text-[#A3A3A3]'}`} />
          <span className={`text-[11px] ${isDriverRoute ? 'font-bold text-white' : 'font-medium text-[#A3A3A3]'}`}>
            Driver
          </span>
        </button>

        <button
          onClick={() => onNavigate('/admin')}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 px-2 rounded-lg transition-colors cursor-pointer min-h-[48px] relative ${
            isAdminRoute ? 'text-white' : 'text-[#A3A3A3] hover:text-white'
          }`}
        >
          <div className="relative">
            <Shield className={`w-5 h-5 mb-0.5 ${isAdminRoute ? 'text-white stroke-[2.4]' : 'text-[#A3A3A3]'}`} />
            {isAdminLoggedIn && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#22c55e] ring-2 ring-[#0A0A0A]" />
            )}
          </div>
          <span className={`text-[11px] ${isAdminRoute ? 'font-bold text-white' : 'font-medium text-[#A3A3A3]'}`}>
            Admin
          </span>
        </button>
      </nav>
    </>
  );
};
