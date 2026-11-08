import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { urlBase64ToUint8Array, CHALO_VAPID_PUBLIC_KEY } from '../utils/push';
import { Bell, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface TripAlertsCardProps {
  className?: string;
}

export const TripAlertsCard: React.FC<TripAlertsCardProps> = ({ className = '' }) => {
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Check if already subscribed on mount without prompting for permission
  useEffect(() => {
    let isMounted = true;

    async function checkExistingSubscription() {
      if (typeof window === 'undefined') return;
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

      try {
        const registration = await navigator.serviceWorker.getRegistration('/sw.js');
        if (registration) {
          const sub = await registration.pushManager.getSubscription();
          if (sub && isMounted) {
            setIsSubscribed(true);
          }
        }
      } catch (err) {
        console.warn('Check push subscription notice:', err);
      }
    }

    checkExistingSubscription();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubscribe = async () => {
    setErrorMessage(null);

    // a. Check browser support
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setErrorMessage(
        'Alerts are not supported in this browser. Use Chrome on Android, or add Chalo to your home screen on iPhone.'
      );
      return;
    }

    setIsLoading(true);

    try {
      // b. Request Notification permission
      const permission = await Notification.requestPermission();
      if (permission === 'denied') {
        setErrorMessage(
          'Alerts are blocked. Allow notifications for this site in your browser settings.'
        );
        setIsLoading(false);
        return;
      }

      if (permission !== 'granted') {
        // User closed or dismissed the prompt
        setIsLoading(false);
        return;
      }

      // c. Register the service worker and wait until ready
      await navigator.serviceWorker.register('/sw.js');
      const registration = await navigator.serviceWorker.ready;

      // d. Subscribe: reuse existing subscription if one exists
      let sub = await registration.pushManager.getSubscription();
      if (!sub) {
        const applicationServerKey = urlBase64ToUint8Array(CHALO_VAPID_PUBLIC_KEY);
        sub = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey as unknown as BufferSource,
        });
      }

      // e. Save subscription in database
      const j = sub.toJSON();
      const endpoint = j.endpoint;
      const p256dh = j.keys ? j.keys.p256dh : undefined;
      const auth = j.keys ? j.keys.auth : undefined;

      const { error: rpcError } = await supabase.rpc('save_push_subscription', {
        p_endpoint: endpoint,
        p_p256dh: p256dh,
        p_auth: auth,
      });

      if (rpcError) {
        throw new Error(rpcError.message || 'Failed to save push subscription.');
      }

      // f. On success, show "Trip alerts are on" and hide the button
      setIsSubscribed(true);
    } catch (err: any) {
      console.warn('Subscription error notice:', err);
      setErrorMessage(err?.message || 'Could not turn on trip alerts. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={`bg-[#141414] border border-[#262626] rounded-2xl p-4 sm:p-5 shadow-sm space-y-3 ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              isSubscribed
                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                : 'bg-[#F59E0B]/10 border border-[#F59E0B]/20 text-[#F59E0B]'
            }`}
          >
            {isSubscribed ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            ) : (
              <Bell className="w-5 h-5 text-[#F59E0B]" />
            )}
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">
              {isSubscribed ? 'Trip alerts are on' : 'Turn on trip alerts'}
            </h3>
            <p className="text-xs text-[#A3A3A3] mt-0.5">
              Get a message when your driver is assigned, confirmed or cancels.
            </p>
          </div>
        </div>

        {isSubscribed && (
          <span className="shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Active</span>
          </span>
        )}
      </div>

      {errorMessage && (
        <div className="p-3 rounded-xl bg-red-950/40 border border-[#EF4444]/30 text-red-200 text-xs flex items-start gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-[#EF4444] shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Button is shown ONLY if not subscribed */}
      {!isSubscribed && (
        <div className="pt-1">
          <button
            type="button"
            onClick={handleSubscribe}
            disabled={isLoading}
            className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 bg-white hover:bg-neutral-200 text-black font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-black" />
                <span>Turning on alerts...</span>
              </>
            ) : (
              <>
                <Bell className="w-4 h-4 text-black" />
                <span>Turn on trip alerts</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
