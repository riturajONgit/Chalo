import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { formatRupees, formatISTSchedule } from '../utils/format';
import { 
  LogOut, 
  RefreshCw, 
  Car, 
  MapPin, 
  Calendar, 
  User, 
  Phone, 
  Check, 
  X,
  ChevronDown, 
  AlertCircle, 
  Loader2, 
  Clock, 
  CheckCircle2,
  XCircle,
  AlertTriangle
} from 'lucide-react';

interface BookingRecord {
  id: string;
  code: string;
  created_at?: string;
  rider_name?: string;
  name?: string;
  rider_phone?: string;
  phone?: string;
  from_city?: string;
  to_city?: string;
  vehicle_type?: string;
  vehicle?: string;
  trip_type?: string;
  trip?: string;
  scheduled_at?: string;
  fare_quote?: number | null;
  status: string;
  pickup_address?: string;
  drop_address?: string;
  assigned_vehicle_id?: string;
}

interface VehicleOwner {
  id?: string;
  name?: string;
  phone?: string;
  status?: string;
}

interface VehicleRecord {
  id: string;
  reg_no: string;
  vehicle_type: string;
  status?: string;
  owner_id?: string;
  owners?: VehicleOwner | VehicleOwner[] | null;
}

interface AdminQueueProps {
  onSignOut?: () => void;
  hideHeader?: boolean;
}

type FilterTab = 'Requested' | 'Assigned' | 'Confirmed' | 'Completed' | 'Cancelled' | 'All';

export const AdminQueue: React.FC<AdminQueueProps> = ({ onSignOut, hideHeader = false }) => {
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [vehicles, setVehicles] = useState<VehicleRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>('Requested');
  const [error, setError] = useState<string | null>(null);

  // Expanded booking for vehicle assignment
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [assignSuccess, setAssignSuccess] = useState<string | null>(null);

  // Status update actions
  const [actionInProgressBookingId, setActionInProgressBookingId] = useState<string | null>(null);
  const [confirmingCancelId, setConfirmingCancelId] = useState<string | null>(null);
  const [statusUpdateError, setStatusUpdateError] = useState<string | null>(null);
  const [cardErrorBookingId, setCardErrorBookingId] = useState<string | null>(null);

  // Client-side verification helper
  const isVehicleApproved = (v: VehicleRecord) => {
    const vStatus = (v.status || '').toLowerCase();
    const owner = Array.isArray(v.owners) ? v.owners[0] : v.owners;
    const oStatus = (owner?.status || '').toLowerCase();
    return vStatus === 'approved' && oStatus === 'approved';
  };

  // Fetch bookings and vehicles
  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      // 1. Fetch bookings sorted newest first with fare_quote selected
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('*, fare_quote')
        .order('created_at', { ascending: false });

      if (bookingsError) {
        throw new Error(bookingsError.message || 'Failed to load bookings');
      }

      setBookings(bookingsData || []);

      // 2. Fetch vehicles where vehicles.status = 'approved' and owners.status = 'approved'
      const { data: vehiclesData, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('id, reg_no, vehicle_type, status, owner_id, owners!inner(id, name, phone, status)')
        .eq('status', 'approved')
        .eq('owners.status', 'approved');

      if (vehiclesError) {
        console.warn('Could not load approved vehicles:', vehiclesError);
        setVehicles([]);
      } else {
        // Double filter on client side as specified
        const approvedOnClient = (vehiclesData || []).filter((v) => isVehicleApproved(v as any));
        setVehicles(approvedOnClient);
      }
    } catch (err: any) {
      console.warn('Error fetching admin data notice:', err);
      setError(err.message || 'Unable to fetch booking queue.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle vehicle assignment via assign_booking RPC
  const handleAssignVehicle = async (booking: BookingRecord) => {
    if (!selectedVehicleId || isAssigning) return;

    setIsAssigning(true);
    setAssignError(null);
    setAssignSuccess(null);

    try {
      const { error: rpcError } = await supabase.rpc('assign_booking', {
        p_booking: booking.id,
        p_vehicle: selectedVehicleId,
      });

      if (rpcError) {
        throw new Error(rpcError.message || 'Failed to assign vehicle');
      }

      setAssignSuccess(`Vehicle assigned to booking #${booking.code}!`);
      setTimeout(() => setAssignSuccess(null), 3000);
      setSelectedBookingId(null);
      setSelectedVehicleId('');
      
      // Refresh list
      await loadData(true);
    } catch (err: any) {
      console.warn('Assign vehicle notice:', err);
      setAssignError(err.message || 'Failed to assign vehicle');
    } finally {
      setIsAssigning(false);
    }
  };

  // Update booking status via admin_set_booking_status RPC (Mark Completed or Cancel)
  const handleUpdateBookingStatus = async (bookingId: string, newStatus: 'completed' | 'cancelled') => {
    setActionInProgressBookingId(bookingId);
    setStatusUpdateError(null);
    setCardErrorBookingId(null);
    setConfirmingCancelId(null);

    try {
      const { error: rpcError } = await supabase.rpc('admin_set_booking_status', {
        p_booking: bookingId,
        p_status: newStatus,
      });

      if (rpcError) {
        throw new Error(rpcError.message || `Failed to update booking status to ${newStatus}`);
      }

      setAssignSuccess(
        newStatus === 'completed' 
          ? 'Booking marked as completed!' 
          : 'Booking cancelled.'
      );
      setTimeout(() => setAssignSuccess(null), 3000);
    } catch (err: any) {
      console.warn('admin_set_booking_status notice:', err);
      setStatusUpdateError(err.message || `Failed to update booking status to ${newStatus}`);
      setCardErrorBookingId(bookingId);
    } finally {
      setActionInProgressBookingId(null);
      // Always refresh the list afterwards
      await loadData(true);
    }
  };

  // Filter tabs calculation
  const getTabCount = (tab: FilterTab) => {
    if (tab === 'All') return bookings.length;
    return bookings.filter(
      (b) => (b.status || '').toLowerCase() === tab.toLowerCase()
    ).length;
  };

  const filteredBookings = bookings.filter((b) => {
    if (activeTab === 'All') return true;
    return (b.status || '').toLowerCase() === activeTab.toLowerCase();
  });

  const getStatusBadge = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'requested') {
      return (
        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
          Requested
        </span>
      );
    }
    if (s === 'assigned') {
      return (
        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30">
          Assigned
        </span>
      );
    }
    if (s === 'confirmed') {
      return (
        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
          Confirmed
        </span>
      );
    }
    if (s === 'completed') {
      return (
        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-zinc-700/50 text-zinc-300 border border-white/10">
          Completed
        </span>
      );
    }
    if (s === 'cancelled') {
      return (
        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-red-500/15 text-red-300 border border-red-500/30">
          Cancelled
        </span>
      );
    }
    return (
      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-white/5 text-zinc-300 border border-white/10 capitalize">
        {status || 'Unknown'}
      </span>
    );
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Optional Top Header Strip if not rendered inside parent header */}
      {!hideHeader && (
        <div className="flex items-center justify-between gap-3 bg-[#121820] border border-white/10 rounded-2xl p-4 sm:p-5">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                Booking Queue
              </h1>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Admin
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              {bookings.length} total bookings · Rewa Outstation Fleet
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => loadData(true)}
              disabled={isRefreshing || isLoading}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/15 text-zinc-300 transition-colors border border-white/10 min-h-[44px] min-w-[44px] flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 cursor-pointer"
              title="Refresh bookings"
              aria-label="Refresh bookings"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
            </button>

            {onSignOut && (
              <button
                onClick={onSignOut}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-red-300 hover:text-red-200 bg-red-950/40 hover:bg-red-950/60 border border-red-500/30 rounded-xl transition-colors min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Global Success Notification */}
      {assignSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{assignSuccess}</span>
        </div>
      )}

      {/* Status update error */}
      {statusUpdateError && (
        <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-start gap-2.5 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <span>{statusUpdateError}</span>
        </div>
      )}

      {/* Fetch error state */}
      {error && (
        <div className="p-4 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-xs">Failed to load bookings</p>
            <p className="text-xs text-red-300 mt-0.5">{error}</p>
          </div>
          <button
            onClick={() => loadData(false)}
            className="text-xs font-semibold underline text-red-200 hover:text-white"
          >
            Retry
          </button>
        </div>
      )}

      {/* Filter Tabs: Requested, Assigned, Confirmed, Completed, Cancelled, All */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {(['Requested', 'Assigned', 'Confirmed', 'Completed', 'Cancelled', 'All'] as FilterTab[]).map((tab) => {
          const count = getTabCount(tab);
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setConfirmingCancelId(null);
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

      {/* Booking List */}
      {isLoading ? (
        <div className="p-12 text-center bg-[#121820] border border-white/10 rounded-2xl space-y-3">
          <Loader2 className="w-7 h-7 animate-spin text-emerald-400 mx-auto" />
          <p className="text-sm text-zinc-400">Loading booking queue...</p>
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="p-12 text-center bg-[#121820] border border-white/10 rounded-2xl space-y-2">
          <p className="text-base font-semibold text-white">No {activeTab.toLowerCase()} bookings</p>
          <p className="text-xs text-zinc-400">
            {activeTab === 'All'
              ? 'No outstation bookings have been requested yet.'
              : `There are currently no bookings with status "${activeTab}".`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredBookings.map((booking) => {
            const riderName = booking.rider_name || booking.name || 'Anonymous Rider';
            const riderPhone = booking.rider_phone || booking.phone || 'N/A';
            const fromCity = booking.from_city || 'Rewa';
            const toCity = booking.to_city || 'Destination';
            const vehicleType = (booking.vehicle_type || booking.vehicle || 'sedan').toUpperCase();
            const tripType = (booking.trip_type || booking.trip || 'one_way') === 'round_trip' ? 'Round Trip' : 'One Way';
            
            // Format dates in IST: e.g. "Sun, 25 Oct 2026, 08:00 am"
            const scheduled = booking.scheduled_at ? formatISTSchedule(booking.scheduled_at) : '';
            
            // Format fare_quote as ₹1,234. Show "₹--" only when null
            const displayFare = booking.fare_quote !== null && booking.fare_quote !== undefined
              ? formatRupees(booking.fare_quote)
              : '₹--';

            const status = (booking.status || '').toLowerCase();
            const isRequested = status === 'requested';
            const isAssigned = status === 'assigned';
            const isConfirmed = status === 'confirmed';
            const isExpanded = selectedBookingId === booking.id;

            // Button visibility rules:
            // "Mark completed": Available when status is 'assigned' or 'confirmed'
            const canMarkCompleted = isAssigned || isConfirmed;
            // "Cancel": Available when status is 'requested', 'assigned' or 'confirmed'
            const canCancel = isRequested || isAssigned || isConfirmed;

            const isProcessingThisBooking = actionInProgressBookingId === booking.id;
            const isConfirmingCancel = confirmingCancelId === booking.id;

            const bookingVehicleType = (booking.vehicle_type || booking.vehicle || 'sedan').toLowerCase();
            const matchingVehicles = vehicles.filter((v) => {
              if (!isVehicleApproved(v)) return false;
              return (v.vehicle_type || '').toLowerCase() === bookingVehicleType;
            });

            return (
              <div
                key={booking.id}
                className={`bg-[#121820] border rounded-2xl p-4 sm:p-5 transition-all shadow-md ${
                  isExpanded ? 'border-emerald-500/60 ring-1 ring-emerald-500/40' : 'border-white/10 hover:border-white/20'
                }`}
              >
                {/* Header row: Code, Route, Status, Fare */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm sm:text-base font-extrabold text-emerald-400 tracking-wider">
                        #{booking.code}
                      </span>
                      {getStatusBadge(booking.status)}
                    </div>
                    <p className="text-sm font-bold text-white mt-1">
                      {fromCity} ➔ {toCity}
                    </p>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {tripType} · {vehicleType}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-lg sm:text-xl font-extrabold text-white tabular-nums tracking-tight">
                      {displayFare}
                    </span>
                    <p className="text-[11px] text-zinc-400">Guaranteed Fare</p>
                  </div>
                </div>

                <div className="h-px bg-white/5 my-3" />

                {/* Rider & Schedule info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <div className="flex items-center gap-2 text-zinc-300">
                    <User className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <span className="font-medium text-white truncate">{riderName}</span>
                  </div>

                  <div className="flex items-center gap-2 text-zinc-300">
                    <Phone className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <a
                      href={`tel:${riderPhone}`}
                      className="font-mono text-emerald-400 hover:underline min-h-[36px] flex items-center"
                    >
                      +91 {riderPhone}
                    </a>
                  </div>

                  <div className="flex items-center gap-2 text-zinc-300 sm:col-span-2">
                    <Calendar className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Pickup: {scheduled || 'Not specified'}</span>
                  </div>
                </div>

                {/* Pickup & Drop Addresses */}
                {(booking.pickup_address || booking.drop_address) && (
                  <div className="mt-3 pt-3 border-t border-white/5 space-y-1.5 text-xs text-zinc-400">
                    {booking.pickup_address && (
                      <p className="flex items-start gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span className="text-zinc-300"><strong className="text-zinc-400">Pickup:</strong> {booking.pickup_address}</span>
                      </p>
                    )}
                    {booking.drop_address && (
                      <p className="flex items-start gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-white shrink-0 mt-0.5" />
                        <span className="text-zinc-300"><strong className="text-zinc-400">Drop:</strong> {booking.drop_address}</span>
                      </p>
                    )}
                  </div>
                )}

                {/* Confirmation Box for Cancellation */}
                {isConfirmingCancel && (
                  <div className="mt-4 pt-3 border-t border-white/10 p-3.5 rounded-xl bg-red-950/60 border border-red-500/40 space-y-2 animate-in fade-in">
                    <div className="flex items-center gap-2 text-xs text-red-200 font-semibold">
                      <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                      <span>Are you sure you want to cancel booking #{booking.code}?</span>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        disabled={isProcessingThisBooking}
                        onClick={() => handleUpdateBookingStatus(booking.id, 'cancelled')}
                        className="min-h-[44px] px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        {isProcessingThisBooking ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <>
                            <X className="w-3.5 h-3.5" />
                            <span>Confirm Cancel</span>
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        disabled={isProcessingThisBooking}
                        onClick={() => setConfirmingCancelId(null)}
                        className="min-h-[44px] px-3.5 py-1.5 bg-white/10 hover:bg-white/15 text-zinc-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                      >
                        Back
                      </button>
                    </div>
                  </div>
                )}

                {/* Action Controls */}
                {!isConfirmingCancel && (
                  <div className="mt-4 pt-3 border-t border-white/10 space-y-3">
                    {/* Error text if action on this booking fails */}
                    {statusUpdateError && cardErrorBookingId === booking.id && (
                      <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-start gap-2 animate-in fade-in">
                        <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                        <span>{statusUpdateError}</span>
                      </div>
                    )}

                    {/* Action buttons row: Mark completed & Cancel */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Mark Completed button */}
                      {canMarkCompleted && (
                        <button
                          type="button"
                          disabled={isProcessingThisBooking}
                          onClick={() => handleUpdateBookingStatus(booking.id, 'completed')}
                          className="min-h-[44px] px-3.5 py-2 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          {isProcessingThisBooking ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Mark Completed</span>
                            </>
                          )}
                        </button>
                      )}

                      {/* Cancel button */}
                      {canCancel && (
                        <button
                          type="button"
                          disabled={isProcessingThisBooking}
                          onClick={() => setConfirmingCancelId(booking.id)}
                          className="min-h-[44px] px-3.5 py-2 bg-white/5 hover:bg-red-950/40 border border-white/10 hover:border-red-500/40 text-zinc-300 hover:text-red-300 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5 text-red-400" />
                          <span>Cancel Booking</span>
                        </button>
                      )}
                    </div>

                    {/* Assign vehicle card toggle for Requested bookings */}
                    {isRequested && (
                      <div>
                        {!isExpanded ? (
                          <button
                            onClick={() => {
                              setSelectedBookingId(booking.id);
                              setAssignError(null);
                              setSelectedVehicleId(matchingVehicles[0]?.id || '');
                            }}
                            className="w-full min-h-[44px] px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
                          >
                            <Car className="w-4 h-4 text-emerald-400" />
                            <span>Tap to Assign Vehicle</span>
                            <ChevronDown className="w-4 h-4 ml-auto" />
                          </button>
                        ) : (
                          <div className="space-y-3 bg-[#0b0f14] p-3.5 rounded-xl border border-emerald-500/40">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                                <Car className="w-4 h-4 text-emerald-400" />
                                <span>Assign Approved Vehicle</span>
                              </span>
                              <button
                                onClick={() => setSelectedBookingId(null)}
                                className="text-xs text-zinc-400 hover:text-white p-1 cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>

                            {assignError && (
                              <div className="p-2.5 rounded-lg bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-start gap-2">
                                <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                                <span>{assignError}</span>
                              </div>
                            )}

                            {matchingVehicles.length === 0 ? (
                              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium">
                                No approved {bookingVehicleType} drivers available
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <label className="block text-[11px] font-medium text-zinc-400">
                                  Select Approved {bookingVehicleType.toUpperCase()} from Fleet
                                </label>
                                <select
                                  value={selectedVehicleId}
                                  onChange={(e) => setSelectedVehicleId(e.target.value)}
                                  className="w-full px-3 py-2.5 rounded-lg bg-[#121820] border border-white/20 text-white font-medium text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
                                >
                                  <option value="">-- Choose Approved Vehicle --</option>
                                  {matchingVehicles.map((v) => (
                                    <option key={v.id} value={v.id}>
                                      {v.reg_no} · {(v.vehicle_type || 'Cab').toUpperCase()}
                                    </option>
                                  ))}
                                </select>

                                <button
                                  onClick={() => handleAssignVehicle(booking)}
                                  disabled={!selectedVehicleId || isAssigning}
                                  className={`w-full min-h-[44px] rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                                    selectedVehicleId && !isAssigning
                                      ? 'bg-emerald-500 hover:bg-emerald-400 text-black cursor-pointer shadow-md'
                                      : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                                  }`}
                                >
                                  {isAssigning ? (
                                    <>
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                      <span>Assigning...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                                      <span>Confirm Assignment</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
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
