import React, { useState, useEffect } from 'react';
import { Download, Share2, X } from 'lucide-react';

const IOS_DISMISSED_KEY = 'chalo_ios_pwa_dismissed';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const PWAInstallBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    );
  });
  const [isIosSafari, setIsIosSafari] = useState<boolean>(false);
  const [isIosDismissed, setIsIosDismissed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem(IOS_DISMISSED_KEY) === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check standalone mode updates
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleMediaChange = (e: MediaQueryListEvent) => {
      setIsStandalone(e.matches);
    };
    mediaQuery.addEventListener('change', handleMediaChange);

    // Detect iOS Safari
    const ua = window.navigator.userAgent.toLowerCase();
    const isIOSDevice =
      /iphone|ipad|ipod/.test(ua) ||
      (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
    const isSafariBrowser =
      ua.includes('safari') && !ua.includes('chrome') && !ua.includes('crios') && !ua.includes('android');

    if (isIOSDevice && isSafariBrowser) {
      setIsIosSafari(true);
    }

    // Android Chrome / Chromium beforeinstallprompt handler
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      mediaQuery.removeEventListener('change', handleMediaChange);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Hide button/card when already in standalone mode
  if (isStandalone) {
    return null;
  }

  // Handle Android Chrome prompt trigger
  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
    } catch (err) {
      console.warn('Install prompt error:', err);
    } finally {
      setDeferredPrompt(null);
    }
  };

  // Handle iPhone Safari dismissal
  const handleDismissIos = () => {
    setIsIosDismissed(true);
    try {
      localStorage.setItem(IOS_DISMISSED_KEY, 'true');
    } catch (err) {
      console.warn('Could not save iOS PWA dismissal:', err);
    }
  };

  // 1. Android Chrome Install Button
  if (deferredPrompt) {
    return (
      <div className="flex items-center justify-between gap-3 bg-[#141414] border border-[#F59E0B]/30 rounded-2xl p-3.5 sm:p-4 shadow-sm animate-in fade-in">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/30 flex items-center justify-center shrink-0 text-[#F59E0B]">
            <Download className="w-4 h-4 stroke-[2.5]" />
          </div>
          <div className="truncate">
            <h4 className="text-xs sm:text-sm font-bold text-white tracking-tight truncate">
              Install Chalo app
            </h4>
            <p className="text-[11px] text-[#A3A3A3] truncate">
              Fast bookings & status updates from your home screen
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleInstallClick}
          className="shrink-0 px-4 py-2 min-h-[38px] bg-white hover:bg-neutral-200 text-black font-bold text-xs rounded-xl transition-colors shadow-sm cursor-pointer flex items-center gap-1.5"
        >
          <Download className="w-3.5 h-3.5 text-black stroke-[2.5]" />
          <span>Install</span>
        </button>
      </div>
    );
  }

  // 2. iPhone Safari "Add to Home Screen" instructions card
  if (isIosSafari && !isIosDismissed) {
    return (
      <div className="flex items-center justify-between gap-3 bg-[#141414] border border-[#262626] rounded-2xl p-3.5 sm:p-4 text-xs text-white shadow-sm animate-in fade-in">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 text-[#F59E0B]">
            <Share2 className="w-4 h-4" />
          </div>
          <p className="text-xs text-[#A3A3A3] leading-snug">
            To install: tap <span className="text-white font-bold">Share</span>, then{' '}
            <span className="text-[#F59E0B] font-bold">Add to Home Screen</span>.
          </p>
        </div>

        <button
          type="button"
          onClick={handleDismissIos}
          className="p-2 text-[#A3A3A3] hover:text-white rounded-lg transition-colors shrink-0 cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
          title="Dismiss"
          aria-label="Dismiss install card"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return null;
};
