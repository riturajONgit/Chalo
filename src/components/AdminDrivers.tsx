import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Check, 
  X, 
  AlertTriangle, 
  RefreshCw, 
  Phone, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Clock, 
  ShieldAlert, 
  FileText,
  ExternalLink,
  Download,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export type DocType = 'rc' | 'permit' | 'insurance' | 'dl';

export interface DocItemConfig {
  type: DocType;
  label: string;
  title: string;
  field: 'rc_doc_url' | 'permit_doc_url' | 'insurance_doc_url' | 'dl_doc_url';
}

export const ADMIN_DOC_ITEMS: DocItemConfig[] = [
  { type: 'rc', label: 'RC', title: 'Registration Certificate (RC)', field: 'rc_doc_url' },
  { type: 'permit', label: 'Permit', title: 'Commercial / State Permit', field: 'permit_doc_url' },
  { type: 'insurance', label: 'Insurance', title: 'Vehicle Insurance Policy', field: 'insurance_doc_url' },
  { type: 'dl', label: 'Licence', title: 'Driving Licence (DL)', field: 'dl_doc_url' },
];

interface VehicleItem {
  id: string;
  vehicle_type: string;
  reg_no: string;
  status: string;
  rc_doc_url?: string | null;
  permit_doc_url?: string | null;
  insurance_doc_url?: string | null;
  dl_doc_url?: string | null;
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

interface ViewerModalState {
  driver: DriverOwner;
  docIndex: number; // 0 to 3
  signedUrl: string | null;
  isLoading: boolean;
  error: string | null;
  path: string | null;
}

export const AdminDrivers: React.FC<AdminDriversProps> = () => {
  // Read initial filter from URL parameter: ?filter=pending (or approved, suspended, all)
  const getInitialFilter = (): DriverFilterTab => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const f = params.get('filter')?.toLowerCase();
      if (f === 'approved') return 'Approved';
      if (f === 'suspended') return 'Suspended';
      if (f === 'all') return 'All';
      if (f === 'pending') return 'Pending';
    }
    return 'Pending';
  };

  const [drivers, setDrivers] = useState<DriverOwner[]>([]);
  const [activeTab, setActiveTab] = useState<DriverFilterTab>(getInitialFilter);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);
  const [confirmingAction, setConfirmingAction] = useState<{
    driverId: string;
    action: 'suspend' | 'reject';
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // In-page full-screen Document Viewer Modal State
  const [viewerModal, setViewerModal] = useState<ViewerModalState | null>(null);

  // Helper to extract vehicle record
  const getVehicle = (driver: DriverOwner): VehicleItem | null => {
    if (!driver.vehicles) return null;
    if (Array.isArray(driver.vehicles)) {
      return driver.vehicles[0] || null;
    }
    return driver.vehicles;
  };

  // Sync tab & filter to URL search params
  const handleFilterChange = (tab: DriverFilterTab) => {
    setActiveTab(tab);
    setConfirmingAction(null);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', 'drivers');
      url.searchParams.set('filter', tab.toLowerCase());
      window.history.replaceState({}, '', url.toString());
    }
  };

  // Initial sync to ensure ?tab=drivers&filter=... is always in URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      let changed = false;
      if (url.searchParams.get('tab') !== 'drivers') {
        url.searchParams.set('tab', 'drivers');
        changed = true;
      }
      if (!url.searchParams.get('filter')) {
        url.searchParams.set('filter', activeTab.toLowerCase());
        changed = true;
      }
      if (changed) {
        window.history.replaceState({}, '', url.toString());
      }
    }
  }, [activeTab]);

  // Open Document Viewer Modal
  const openDocViewer = useCallback(async (driver: DriverOwner, docIndex: number) => {
    const vehicle = getVehicle(driver);
    const docConfig = ADMIN_DOC_ITEMS[docIndex];
    const path = vehicle ? vehicle[docConfig.field] : null;

    setViewerModal({
      driver,
      docIndex,
      signedUrl: null,
      isLoading: true,
      error: null,
      path: path || null,
    });

    if (!path) {
      setViewerModal((prev) =>
        prev
          ? {
              ...prev,
              isLoading: false,
              error: `No ${docConfig.title} uploaded for this driver.`,
            }
          : null
      );
      return;
    }

    try {
      const { data, error } = await supabase.storage
        .from('driver-docs')
        .createSignedUrl(path, 300);

      if (error) {
        setViewerModal((prev) =>
          prev
            ? {
                ...prev,
                isLoading: false,
                error: `Could not open document: ${error.message || 'Storage request failed'}`,
              }
            : null
        );
        return;
      }

      if (!data?.signedUrl) {
        setViewerModal((prev) =>
          prev
            ? {
                ...prev,
                isLoading: false,
                error: 'Could not open document: No URL returned from storage',
              }
            : null
        );
        return;
      }

      setViewerModal((prev) =>
        prev
          ? {
              ...prev,
              signedUrl: data.signedUrl,
              isLoading: false,
              error: null,
            }
          : null
      );
    } catch (err: any) {
      console.warn('Error creating signed URL:', err);
      setViewerModal((prev) =>
        prev
          ? {
              ...prev,
              isLoading: false,
              error: `Could not open document: ${err?.message || 'Unexpected error'}`,
            }
          : null
      );
    }
  }, []);

  // Modal navigation handler (Previous / Next / Direct Pill Click)
  const handleNavigateDoc = useCallback((newIndex: number) => {
    if (!viewerModal) return;
    if (newIndex < 0 || newIndex >= ADMIN_DOC_ITEMS.length) return;
    openDocViewer(viewerModal.driver, newIndex);
  }, [viewerModal, openDocViewer]);

  // Keyboard navigation for document viewer (Esc to close, Left/Right arrows to navigate)
  useEffect(() => {
    if (!viewerModal) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setViewerModal(null);
      } else if (e.key === 'ArrowLeft' && viewerModal.docIndex > 0) {
        handleNavigateDoc(viewerModal.docIndex - 1);
      } else if (e.key === 'ArrowRight' && viewerModal.docIndex < ADMIN_DOC_ITEMS.length - 1) {
        handleNavigateDoc(viewerModal.docIndex + 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [viewerModal, handleNavigateDoc]);

  // Load owners joined to vehicles with document URLs
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
        .select('id, name, phone, status, vehicles(id, vehicle_type, reg_no, status, rc_doc_url, permit_doc_url, insurance_doc_url, dl_doc_url)')
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message || 'Failed to load drivers.');
      }

      const driverList = (data as DriverOwner[]) || [];
      setDrivers(driverList);
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

  // Helper to determine if a document is PDF
  const isPdf = Boolean(
    (viewerModal?.path && viewerModal.path.toLowerCase().endsWith('.pdf')) ||
    (viewerModal?.signedUrl && viewerModal.signedUrl.toLowerCase().includes('.pdf'))
  );

  const activeDocConfig = viewerModal ? ADMIN_DOC_ITEMS[viewerModal.docIndex] : null;

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
              onClick={() => handleFilterChange(tab)}
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

            // Count a document as uploaded when its URL field is not null
            const uploadedCount = vehicle
              ? ADMIN_DOC_ITEMS.filter((item) => vehicle[item.field] != null && vehicle[item.field] !== '').length
              : 0;

            return (
              <div
                key={driver.id}
                id={`driver-card-${driver.id}`}
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

                {/* Driver Documents Section */}
                <div className="space-y-2 pt-2 border-t border-white/5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Driver Documents</span>
                    </span>
                    <span className="text-[11px] text-zinc-400 font-medium">
                      {uploadedCount} of 4 uploaded
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {ADMIN_DOC_ITEMS.map((item, docIdx) => {
                      const docPath = vehicle ? vehicle[item.field] : null;
                      const isUploaded = docPath != null && docPath !== '';

                      return (
                        <button
                          key={item.type}
                          type="button"
                          disabled={!isUploaded}
                          onClick={() => openDocViewer(driver, docIdx)}
                          className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-between gap-1.5 border ${
                            isUploaded
                              ? 'bg-emerald-950/30 hover:bg-emerald-900/40 active:bg-emerald-800/50 text-emerald-200 border-emerald-500/30 hover:border-emerald-500/50 cursor-pointer shadow-sm'
                              : 'bg-white/5 text-zinc-500 border-white/5 cursor-not-allowed opacity-60'
                          }`}
                          title={isUploaded ? `View ${item.title}` : `${item.label} not uploaded`}
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            <span
                              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                isUploaded ? 'bg-emerald-400' : 'bg-zinc-600'
                              }`}
                            />
                            <span className="truncate">{item.label}</span>
                          </div>
                          <ExternalLink
                            className={`w-3.5 h-3.5 shrink-0 ${
                              isUploaded ? 'text-emerald-400' : 'text-zinc-600'
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>
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

      {/* 1. Full-Screen In-Page Document Viewer Modal */}
      {viewerModal && activeDocConfig && (
        <div 
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col p-3 sm:p-5 animate-in fade-in duration-150"
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between gap-3 bg-[#121820] border border-white/10 rounded-2xl p-3 sm:p-4 shadow-xl">
            {/* Driver & Document Info */}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm sm:text-base font-bold text-white truncate">
                  {viewerModal.driver.name}
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {activeDocConfig.title}
                </span>
                <span className="text-xs text-zinc-400 font-mono hidden sm:inline">
                  ({viewerModal.docIndex + 1} of 4)
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-zinc-400 mt-0.5">
                <span>Phone: +91 {viewerModal.driver.phone}</span>
                {getVehicle(viewerModal.driver)?.reg_no && (
                  <span className="font-mono text-zinc-300 font-bold">
                    Reg: {getVehicle(viewerModal.driver)?.reg_no}
                  </span>
                )}
              </div>
            </div>

            {/* Modal Actions: Download & Close */}
            <div className="flex items-center gap-2 shrink-0">
              {viewerModal.signedUrl && (
                <a
                  href={viewerModal.signedUrl}
                  download={`${viewerModal.driver.name.replace(/\s+/g, '_')}_${activeDocConfig.type}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-black font-bold text-xs rounded-xl shadow-md transition-all min-h-[40px] cursor-pointer"
                  title="Download Document"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Download</span>
                </a>
              )}

              <button
                type="button"
                onClick={() => setViewerModal(null)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white/10 hover:bg-white/20 active:bg-white/25 text-white font-semibold text-xs rounded-xl border border-white/10 transition-colors min-h-[40px] cursor-pointer"
                title="Close Viewer (Esc)"
              >
                <X className="w-4 h-4" />
                <span>Close</span>
              </button>
            </div>
          </div>

          {/* Modal Body: File View / Loading / Error Display */}
          <div className="flex-1 min-h-0 relative flex items-center justify-center bg-[#0b0f14] border border-white/10 rounded-2xl overflow-hidden my-3 p-1 sm:p-3">
            {viewerModal.isLoading ? (
              <div className="flex flex-col items-center justify-center p-8 space-y-3">
                <Loader2 className="w-9 h-9 animate-spin text-emerald-400" />
                <p className="text-sm text-zinc-400 font-medium">
                  Loading {activeDocConfig.title}...
                </p>
              </div>
            ) : viewerModal.error ? (
              /* Requirement 6: "If the signed URL fails, show 'Could not open document' inside the modal with the error text. Do not navigate away." */
              <div className="flex flex-col items-center justify-center p-6 space-y-4 max-w-md mx-auto text-center animate-in fade-in">
                <div className="w-14 h-14 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center justify-center text-red-400">
                  <AlertCircle className="w-7 h-7" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-base font-bold text-white">Could not open document</h3>
                  <p className="text-xs text-red-300 font-mono bg-red-950/60 p-3 rounded-xl border border-red-500/30 break-all leading-relaxed">
                    {viewerModal.error}
                  </p>
                </div>
                {viewerModal.path && (
                  <button
                    type="button"
                    onClick={() => openDocViewer(viewerModal.driver, viewerModal.docIndex)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-white/10 hover:bg-white/15 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Try Again</span>
                  </button>
                )}
              </div>
            ) : viewerModal.signedUrl ? (
              /* Requirement 2: "The modal shows the file: use an <img> for JPG and PNG, and an <iframe> for PDF." */
              isPdf ? (
                <iframe
                  src={viewerModal.signedUrl}
                  title={`${viewerModal.driver.name} - ${activeDocConfig.title}`}
                  className="w-full h-full rounded-xl bg-white border border-white/10 shadow-inner"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center overflow-auto p-2">
                  <img
                    src={viewerModal.signedUrl}
                    alt={`${viewerModal.driver.name} - ${activeDocConfig.title}`}
                    className="max-w-full max-h-[72vh] sm:max-h-[76vh] object-contain rounded-xl shadow-2xl border border-white/10 select-none"
                  />
                </div>
              )
            ) : null}
          </div>

          {/* Modal Footer: Previous / Next & Document Jump Pills */}
          {/* Requirement 4: "Add 'Previous' and 'Next' buttons in the modal to move between the driver's documents (RC → Permit → Insurance → Licence) without closing it." */}
          <div className="flex items-center justify-between gap-2 bg-[#121820] border border-white/10 rounded-2xl p-2.5 sm:p-3 shadow-xl">
            {/* Previous Button */}
            <button
              type="button"
              disabled={viewerModal.docIndex === 0 || viewerModal.isLoading}
              onClick={() => handleNavigateDoc(viewerModal.docIndex - 1)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all min-h-[42px] ${
                viewerModal.docIndex === 0
                  ? 'bg-white/5 text-zinc-600 border border-white/5 cursor-not-allowed'
                  : 'bg-[#0b0f14] hover:bg-white/10 active:bg-white/15 text-zinc-200 hover:text-white border border-white/15 cursor-pointer shadow-md'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
              {viewerModal.docIndex > 0 && (
                <span className="hidden sm:inline text-[11px] text-zinc-400 font-mono">
                  ({ADMIN_DOC_ITEMS[viewerModal.docIndex - 1].label})
                </span>
              )}
            </button>

            {/* Document Step Pills (RC → Permit → Insurance → Licence) */}
            <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 no-scrollbar">
              {ADMIN_DOC_ITEMS.map((item, idx) => {
                const isCurrent = idx === viewerModal.docIndex;
                const v = getVehicle(viewerModal.driver);
                const hasDoc = Boolean(v && v[item.field]);

                return (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => handleNavigateDoc(idx)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                      isCurrent
                        ? 'bg-emerald-500 text-black shadow-md'
                        : hasDoc
                        ? 'bg-white/10 text-zinc-300 hover:text-white hover:bg-white/15'
                        : 'bg-white/5 text-zinc-500 hover:text-zinc-400 opacity-60'
                    }`}
                    title={`${item.title} ${hasDoc ? '(Uploaded)' : '(Not Uploaded)'}`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isCurrent ? 'bg-black' : hasDoc ? 'bg-emerald-400' : 'bg-zinc-600'
                      }`}
                    />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Next Button */}
            <button
              type="button"
              disabled={viewerModal.docIndex === ADMIN_DOC_ITEMS.length - 1 || viewerModal.isLoading}
              onClick={() => handleNavigateDoc(viewerModal.docIndex + 1)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all min-h-[42px] ${
                viewerModal.docIndex === ADMIN_DOC_ITEMS.length - 1
                  ? 'bg-white/5 text-zinc-600 border border-white/5 cursor-not-allowed'
                  : 'bg-[#0b0f14] hover:bg-white/10 active:bg-white/15 text-zinc-200 hover:text-white border border-white/15 cursor-pointer shadow-md'
              }`}
            >
              <span>Next</span>
              {viewerModal.docIndex < ADMIN_DOC_ITEMS.length - 1 && (
                <span className="hidden sm:inline text-[11px] text-zinc-400 font-mono">
                  ({ADMIN_DOC_ITEMS[viewerModal.docIndex + 1].label})
                </span>
              )}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
