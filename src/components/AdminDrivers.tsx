import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Check, 
  X, 
  AlertTriangle, 
  RefreshCw, 
  User, 
  Phone, 
  Car, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Clock, 
  ShieldAlert, 
  ShieldCheck 
} from 'lucide-react';

interface VehicleItem {
  id: string;
  vehicle_type: string;
  reg_no: string;
  status: string;
}

interface DriverOwner {
  id: string;
  name: string;
  phone: string;
  status: string;
  vehicles?: VehicleItem[] | VehicleItem | null;
}

type DriverFilterTab = 'Pending' | 'Approved' | 'Suspended' | 'All';

interface AdminDriversProps {
  onRefreshStats?: () => void;
}

export const AdminDrivers: React.FC<AdminDriversProps> = () => {
  const [drivers, setDrivers] = useState<DriverOwner[]>([]);
  const [activeTab, setActiveTab] = useState<DriverFilterTab>('Pending');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);
  const [confirmingAction, setConfirmingAction] = useState<{
    driverId: string;
    action: 'suspend' | 'reject';
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load owners joined to vehicles
  const loadDrivers = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setErrorMessage(null);

    try {
      const { data, error } = await supabase
        .from('owners')
        .select('id, name, phone, status, vehicles(id, vehicle_type, reg_no, status)')
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message || 'Failed to load drivers.');
      }

      setDrivers((data as DriverOwner[]) || []);
    } catch (err: any) {
      console.warn('Error fetching drivers notice:', err);
      setErrorMessage(err.message || 'Unable to fetch drivers.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDrivers();
  }, [loadDrivers]);

  // Execute status update on both owners and vehicles tables
  const handleUpdateStatus = async (owner: DriverOwner, targetStatus: 'approved' | 'suspended') => {
    setActionInProgressId(owner.id);
    setErrorMessage(null);
    setSuccessMessage(null);
    setConfirmingAction(null);

    try {
      // 1. Update owners row
      const { error: ownerError } = await supabase
        .from('owners')
        .update({ status: targetStatus })
        .eq('id', owner.id);

      if (ownerError) {
        throw new Error(`Owner update failed: ${ownerError.message}`);
      }

      // 2. Update that driver's vehicles row
      const { error: vehicleError } = await supabase
        .from('vehicles')
        .update({ status: targetStatus })
        .eq('owner_id', owner.id);

      if (vehicleError) {
        throw new Error(`Vehicle update failed: ${vehicleError.message}`);
      }

      setSuccessMessage(
        `Driver ${owner.name} marked as ${targetStatus === 'approved' ? 'Approved' : 'Suspended'}.`
      );
      setTimeout(() => setSuccessMessage(null), 3000);

      // Refresh list
      await loadDrivers(true);
    } catch (err: any) {
      console.warn('Driver status update notice:', err);
      setErrorMessage(err.message || 'Failed to update driver status.');
    } finally {
      setActionInProgressId(null);
    }
  };

  // Helper to extract vehicle record
  const getVehicle = (driver: DriverOwner): VehicleItem | null => {
    if (!driver.vehicles) return null;
    if (Array.isArray(driver.vehicles)) {
      return driver.vehicles[0] || null;
    }
    return driver.vehicles;
  };

  // Tab counts
  const getTabCount = (tab: DriverFilterTab) => {
    if (tab === 'All') return drivers.length;
    return drivers.filter(
      (d) => (d.status || '').toLowerCase() === tab.toLowerCase()
    ).length;
  };

  // Filtered drivers list
  const filteredDrivers = drivers.filter((d) => {
    if (activeTab === 'All') return true;
    return (d.status || '').toLowerCase() === activeTab.toLowerCase();
  });

  const getStatusBadge = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'pending') {
      return (
        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          <span>Pending</span>
        </span>
      );
    }
    if (s === 'approved') {
      return (
        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" />
          <span>Approved</span>
        </span>
      );
    }
    if (s === 'suspended') {
      return (
        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-red-500/15 text-red-300 border border-red-500/30 flex items-center gap-1">
          <ShieldAlert className="w-3 h-3" />
          <span>Suspended</span>
        </span>
      );
    }
    return (
      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-white/5 text-zinc-300 border border-white/10 capitalize">
        {status || 'Unknown'}
      </span>
    );
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Top Strip with count and refresh */}
      <div className="flex items-center justify-between gap-3 bg-[#121820] border border-white/10 rounded-2xl p-4 sm:p-5 shadow-sm">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
            Driver Partner Applications
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Review partner registrations and manage fleet approvals.
          </p>
        </div>

        <button
          onClick={() => loadDrivers(true)}
          disabled={isRefreshing || isLoading}
          className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/15 text-zinc-300 transition-colors border border-white/10 min-h-[44px] min-w-[44px] flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 cursor-pointer"
          title="Refresh Drivers"
          aria-label="Refresh Drivers"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
        </button>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-start gap-2.5 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Filter Tabs: Pending, Approved, Suspended, All (Defaults to Pending) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {(['Pending', 'Approved', 'Suspended', 'All'] as DriverFilterTab[]).map((tab) => {
          const count = getTabCount(tab);
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setConfirmingAction(null);
              }}
              className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all flex items-center gap-1.5 cursor-pointer ${
                isActive
                  ? 'bg-emerald-500 text-black shadow-md'
                  : 'bg-[#121820] text-zinc-300 hover:text-white border border-white/5'
              }`}
            >
              <span>{tab}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  isActive ? 'bg-black/20 text-black' : 'bg-white/10 text-zinc-400'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Drivers List */}
      {isLoading ? (
        <div className="p-12 text-center bg-[#121820] border border-white/10 rounded-2xl space-y-3">
          <Loader2 className="w-7 h-7 animate-spin text-emerald-400 mx-auto" />
          <p className="text-sm text-zinc-400">Loading driver partners...</p>
        </div>
      ) : filteredDrivers.length === 0 ? (
        <div className="p-12 text-center bg-[#121820] border border-white/10 rounded-2xl space-y-2">
          <p className="text-base font-semibold text-white">No {activeTab.toLowerCase()} drivers</p>
          <p className="text-xs text-zinc-400">
            {activeTab === 'All'
              ? 'No driver partners have registered yet.'
              : `There are currently no drivers with status "${activeTab}".`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredDrivers.map((driver) => {
            const vehicle = getVehicle(driver);
            const status = (driver.status || '').toLowerCase();
            const isProcessing = actionInProgressId === driver.id;
            const isConfirming = confirmingAction?.driverId === driver.id;

            return (
              <div
                key={driver.id}
                className="bg-[#121820] border border-white/10 hover:border-white/20 rounded-2xl p-4 sm:p-5 space-y-4 shadow-md transition-all"
              >
                {/* Driver Info Header */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base font-bold text-white">
                        {driver.name}
                      </span>
                      {getStatusBadge(driver.status)}
                    </div>

                    {/* Phone Number */}
                    <div className="flex items-center gap-1.5 text-xs text-zinc-300 mt-1">
                      <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <a
                        href={`tel:${driver.phone}`}
                        className="font-mono text-zinc-200 hover:text-emerald-400 transition-colors min-h-[36px] flex items-center"
                      >
                        +91 {driver.phone}
                      </a>
                    </div>
                  </div>

                  {/* Vehicle Details */}
                  {vehicle && (
                    <div className="text-right shrink-0">
                      <span className="font-mono text-sm sm:text-base font-extrabold text-emerald-400 tracking-wider">
                        {vehicle.reg_no}
                      </span>
                      <p className="text-xs text-zinc-300 uppercase font-semibold">
                        {vehicle.vehicle_type}
                      </p>
                    </div>
                  )}
                </div>

                <div className="h-px bg-white/5" />

                {/* Inline Confirmation Card for Suspend or Reject */}
                {isConfirming && confirmingAction ? (
                  <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-500/40 space-y-2.5 animate-in fade-in">
                    <div className="flex items-center gap-2 text-red-200 text-xs font-semibold">
                      <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                      <span>
                        Are you sure you want to {confirmingAction.action} {driver.name}?
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-300">
                      This will set both owner account and vehicle status to 'suspended'.
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleUpdateStatus(driver, 'suspended')}
                        className="min-h-[44px] px-4 py-2 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        {isProcessing ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Confirm {confirmingAction.action === 'suspend' ? 'Suspend' : 'Reject'}</span>
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => setConfirmingAction(null)}
                        className="min-h-[44px] px-3.5 py-2 bg-white/10 hover:bg-white/15 text-zinc-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Action Buttons: Approve, Suspend, Reject */
                  <div className="flex items-center gap-2 flex-wrap pt-1">
                    {/* Approve Button */}
                    {status !== 'approved' && (
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleUpdateStatus(driver, 'approved')}
                        className="min-h-[44px] px-4 py-2 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-black font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors shadow-md shadow-emerald-950/40 cursor-pointer"
                      >
                        {isProcessing ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <>
                            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>Approve Driver</span>
                          </>
                        )}
                      </button>
                    )}

                    {/* Suspend Button (for approved or active drivers) */}
                    {status === 'approved' && (
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => setConfirmingAction({ driverId: driver.id, action: 'suspend' })}
                        className="min-h-[44px] px-3.5 py-2 bg-white/5 hover:bg-red-950/40 border border-white/10 hover:border-red-500/40 text-zinc-300 hover:text-red-300 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                        <span>Suspend</span>
                      </button>
                    )}

                    {/* Reject Button (for pending applications) */}
                    {status === 'pending' && (
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => setConfirmingAction({ driverId: driver.id, action: 'reject' })}
                        className="min-h-[44px] px-3.5 py-2 bg-white/5 hover:bg-red-950/40 border border-white/10 hover:border-red-500/40 text-zinc-300 hover:text-red-300 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5 text-red-400" />
                        <span>Reject</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
