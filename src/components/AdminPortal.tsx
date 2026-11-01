import React, { useState, useEffect } from 'react';
import { AdminQueue } from './AdminQueue';
import { AdminDrivers } from './AdminDrivers';
import { LogOut, Calendar, Users, Shield } from 'lucide-react';

interface AdminPortalProps {
  onSignOut: () => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({ onSignOut }) => {
  // Read initial tab from URL query params (e.g. ?tab=drivers)
  const [adminTab, setAdminTab] = useState<'bookings' | 'drivers'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab')?.toLowerCase();
      if (tab === 'drivers' || tab === 'bookings') {
        return tab;
      }
    }
    return 'bookings';
  });

  // Keep URL in sync when tab is selected
  const handleTabChange = (tab: 'bookings' | 'drivers') => {
    setAdminTab(tab);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tab);
      if (tab === 'bookings') {
        url.searchParams.delete('filter');
      }
      window.history.replaceState({}, '', url.toString());
    }
  };

  // Sync if URL didn't have tab specified initially
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (!url.searchParams.get('tab')) {
        url.searchParams.set('tab', adminTab);
        window.history.replaceState({}, '', url.toString());
      }
    }
  }, [adminTab]);

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4 pb-12 animate-in fade-in duration-200">
      {/* Top Header Strip */}
      <div className="bg-[#121820] border border-white/10 rounded-2xl p-4 sm:p-5 shadow-lg space-y-3.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Admin Dashboard
                </h1>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Rewa Fleet
                </span>
              </div>
              <p className="text-xs text-zinc-400">Manage bookings, fleet dispatch, and driver approvals.</p>
            </div>
          </div>

          {/* Sign Out Button */}
          <button
            onClick={onSignOut}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-300 hover:text-red-200 bg-red-950/40 hover:bg-red-950/60 border border-red-500/30 rounded-xl transition-colors min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>

        {/* 1. Tabs in the admin app: Bookings | Drivers */}
        <div className="grid grid-cols-2 p-1 bg-[#0b0f14] rounded-xl border border-white/10">
          <button
            onClick={() => handleTabChange('bookings')}
            className={`min-h-[44px] py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              adminTab === 'bookings'
                ? 'bg-emerald-500 text-black shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Bookings</span>
          </button>

          <button
            onClick={() => handleTabChange('drivers')}
            className={`min-h-[44px] py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              adminTab === 'drivers'
                ? 'bg-emerald-500 text-black shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Drivers</span>
          </button>
        </div>
      </div>

      {/* Tab Panels */}
      {adminTab === 'bookings' ? (
        <AdminQueue hideHeader={true} onSignOut={onSignOut} />
      ) : (
        <AdminDrivers />
      )}
    </div>
  );
};
