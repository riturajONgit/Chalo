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
        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/40">
          Requested
        </span>
      );
    }
    if (s === 'assigned') {
      return (
        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/40">
          Assigned
        </span>
      );
    }
    if (s === 'confirmed') {
      return (
        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
          Confirmed
        </span>
      );
    }
    if (s === 'completed') {
      return (
        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
          Completed
        </span>
      );
    }
    if (s === 'cancelled') {
      return (
        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/40">
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
        <div className="flex items-center justify-between gap-3 bg-[#141414] border border-[#262626] rounded-2xl p-4 sm:p-5">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[20px] font-bold tracking-tight text-white">
                Booking Queue
              </h1>
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/40">
                Admin
              </span>
            </div>
            <p className="text-xs text-[#A3A3A3] mt-0.5">
              {bookings.length} total bookings · Rewa Outstation Fleet
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => loadData(true)}
              disabled={isRefreshing || isLoading}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/15 text-white transition-colors border border-white/20 min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
              title="Refresh bookings"
              aria-label="Refresh bookings"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#F59E0B]' : ''}`} />
            </button>

            {onSignOut && (
              <button
                onClick={onSignOut}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#EF4444] hover:bg-[#EF4444]/10 border border-[#EF4444] rounded-xl transition-colors min-h-[44px] cursor-pointer"
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
        <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{assignSuccess}</span>
        </div>
      )}

      {/* Status update error */}
      {statusUpdateError && (
        <div className="p-3.5 rounded-xl bg-red-950/40 border border-[#EF4444]/30 text-red-200 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-[#EF4444] shrink-0 mt-0.5" />
          <span>{statusUpdateError}</span>
        </div>
      )}

      {/* Fetch error state */}
      {error && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-[#EF4444]/40 text-red-200 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-[#EF4444] shrink-0 mt-0.5" />
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
              className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-all flex items-center gap-1.5 cursor-pointer ${
                isActive
                  ? 'bg-white text-black shadow-sm'
                  : 'bg-[#141414] text-[#A3A3A3] hover:text-white border border-[#262626]'
              }`}
            >
              <span>{tab}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  isActive ? 'bg-black/20 text-black' : 'bg-white/10 text-[#A3A3A3]'
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
        <div className="p-12 text-center bg-[#141414] border border-[#262626] rounded-2xl space-y-3">
          <Loader2 className="w-7 h-7 animate-spin text-[#F59E0B] mx-auto" />
          <p className="text-sm text-[#A3A3A3]">Loading booking queue...</p>
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="p-12 text-center bg-[#141414] border border-[#262626] rounded-2xl space-y-2">
          <p className="text-base font-bold text-white">No {activeTab.toLowerCase()} bookings</p>
          <p className="text-xs text-[#A3A3A3]">
            {activeTab === 'All'
              ? 'No outstation bookings have been requested yet.'
              : `There are currently no bookings with status "${activeTab}".`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
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
                className={`bg-[#141414] border rounded-2xl p-4 sm:p-5 transition-all shadow-md ${
                  isExpanded ? 'border-white/40 ring-1 ring-white/20' : 'border-[#262626] hover:border-white/20'
                }`}
              >
                {/* Header row: Code, Status, and Vehicle Pill */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-white bg-white/10 border border-white/20 px-2 py-0.5 rounded-md">
                      #{booking.code}
                    </span>
                    {getStatusBadge(booking.status)}
                  </div>

                  {/* Vehicle Pill */}
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/15 text-[11px] font-bold text-white tracking-wider">
                    <Car className="w-3 h-3 text-[#A3A3A3]" />
                    <span>{vehicleType}</span>
                    <span className="text-[#A3A3A3] font-normal">· {tripType}</span>
                  </span>
                </div>

                {/* Route Line & Fare: route line on left, 32px saffron fare on right */}
                <div className="flex items-start justify-between gap-4 pt-3">
                  <div className="flex gap-3">
                    {/* Visual Route Line: filled dot, vertical line, hollow dot */}
                    <div className="flex flex-col items-center pt-1.5">
                      <div className="w-3 h-3 rounded-full bg-white ring-4 ring-white/10 shrink-0" />
                      <div className="w-0.5 h-10 bg-[#262626] my-1" />
                      <div className="w-3 h-3 rounded-full border-2 border-white bg-[#141414] shrink-0" />
                    </div>

                    <div className="space-y-4">
                      <div>
                        <div className="text-[11px] uppercase tracking-wider font-semibold text-[#A3A3A3]">
                          Pickup
                        </div>
                        <div className="text-base font-bold text-white leading-tight">
                          {fromCity}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] uppercase tracking-wider font-semibold text-[#A3A3A3]">
                          Drop
                        </div>
                        <div className="text-base font-bold text-white leading-tight">
                          {toCity}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Fare on the right, large 32px in saffron */}
                  <div className="text-right shrink-0">
                    <div className="text-[32px] font-bold text-[#F59E0B] tabular-nums leading-none">
                      {displayFare}
                    </div>
                    <div className="text-[11px] text-[#A3A3A3] uppercase tracking-wider font-semibold mt-1">
                      Guaranteed fare
                    </div>
                  </div>
                </div>

                <div className="h-px bg-[#262626] my-3" />

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
                  <div className="mt-3 p-3 rounded-xl bg-[#0A0A0A] border border-[#262626] space-y-1.5 text-xs text-[#A3A3A3]">
                    {booking.pickup_address && (
                      <p className="flex items-start gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-white shrink-0 mt-0.5" />
                        <span className="text-neutral-200"><strong className="text-[#A3A3A3]">Pickup:</strong> {booking.pickup_address}</span>
                      </p>
                    )}
                    {booking.drop_address && (
                      <p className="flex items-start gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#A3A3A3] shrink-0 mt-0.5" />
                        <span className="text-neutral-200"><strong className="text-[#A3A3A3]">Drop:</strong> {booking.drop_address}</span>
                      </p>
                    )}
                  </div>
                )}

                {/* Confirmation Box for Cancellation */}
                {isConfirmingCancel && (
                  <div className="mt-4 pt-3 border-t border-[#262626] p-3.5 rounded-xl bg-red-950/40 border border-[#EF4444]/40 space-y-2 animate-in fade-in">
                    <div className="flex items-center gap-2 text-xs text-red-200 font-semibold">
                      <AlertTriangle className="w-4 h-4 text-[#EF4444] shrink-0" />
                      <span>Are you sure you want to cancel booking #{booking.code}?</span>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        disabled={isProcessingThisBooking}
                        onClick={() => handleUpdateBookingStatus(booking.id, 'cancelled')}
                        className="min-h-[44px] px-3.5 py-1.5 bg-[#EF4444] hover:bg-red-600 text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        {isProcessingThisBooking ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <>
                            <X className="w-3.5 h-3.5" />
                            <span>Yes, cancel</span>
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        disabled={isProcessingThisBooking}
                        onClick={() => setConfirmingCancelId(null)}
                        className="min-h-[44px] px-3.5 py-1.5 bg-transparent border border-white/20 text-white text-xs font-medium hover:bg-white/5 rounded-xl transition-colors cursor-pointer"
                      >
                        No, keep it
                      </button>
                    </div>
                  </div>
                )}

                {/* Action Controls */}
                {!isConfirmingCancel && (
                  <div className="mt-4 pt-3 border-t border-[#262626] space-y-3">
                    {/* Error text if action on this booking fails */}
                    {statusUpdateError && cardErrorBookingId === booking.id && (
                      <div className="p-3 rounded-xl bg-red-950/40 border border-[#EF4444]/40 text-red-200 text-xs flex items-start gap-2">
                        <AlertCircle className="w-3.5 h-3.5 text-[#EF4444] shrink-0 mt-0.5" />
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
                          className="min-h-[44px] px-3.5 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
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

                      {/* Cancel button: red outline, red text */}
                      {canCancel && (
                        <button
                          type="button"
                          disabled={isProcessingThisBooking}
                          onClick={() => setConfirmingCancelId(booking.id)}
                          className="min-h-[44px] px-3.5 py-2 border border-[#EF4444] text-[#EF4444] hover:bg-[#EF4444]/10 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5 text-[#EF4444]" />
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
                            className="w-full min-h-[48px] px-4 py-2 bg-transparent hover:bg-white/5 border border-white/20 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
                          >
                            <Car className="w-4 h-4 text-[#F59E0B]" />
                            <span>Tap to Assign Vehicle</span>
                            <ChevronDown className="w-4 h-4 ml-auto" />
                          </button>
                        ) : (
                          <div className="space-y-3 bg-[#0A0A0A] p-4 rounded-xl border border-[#262626]">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                                <Car className="w-4 h-4 text-[#F59E0B]" />
                                <span>Assign Approved Vehicle</span>
                              </span>
                              <button
                                onClick={() => setSelectedBookingId(null)}
                                className="text-xs text-[#A3A3A3] hover:text-white p-1 cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>

                            {assignError && (
                              <div className="p-2.5 rounded-lg bg-red-950/40 border border-[#EF4444]/40 text-red-200 text-xs flex items-start gap-2">
                                <AlertCircle className="w-3.5 h-3.5 text-[#EF4444] shrink-0 mt-0.5" />
                                <span>{assignError}</span>
                              </div>
                            )}

                            {matchingVehicles.length === 0 ? (
                              <div className="p-3.5 rounded-xl bg-[#141414] border border-[#F59E0B]/30 text-amber-200 text-xs font-medium">
                                No approved {bookingVehicleType} drivers available
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#A3A3A3]">
                                  Select Approved {bookingVehicleType.toUpperCase()} from Fleet
                                </label>
                                <select
                                  value={selectedVehicleId}
                                  onChange={(e) => setSelectedVehicleId(e.target.value)}
                                  className="w-full px-3.5 py-3 rounded-xl bg-[#141414] border border-[#262626] text-white font-medium text-xs focus:outline-none focus:border-white min-h-[48px]"
                                >
                                  <option value="">-- Choose Approved Vehicle --</option>
                                  {matchingVehicles.map((v) => (
                                    <option key={v.id} value={v.id} className="bg-[#141414] text-white">
                                      {v.reg_no} · {(v.vehicle_type || 'Cab').toUpperCase()}
                                    </option>
                                  ))}
                                </select>

                                <button
                                  onClick={() => handleAssignVehicle(booking)}
                                  disabled={!selectedVehicleId || isAssigning}
                                  className={`w-full h-[52px] rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                                    selectedVehicleId && !isAssigning
                                      ? 'bg-white hover:bg-neutral-200 text-black cursor-pointer shadow-md'
                                      : 'bg-[#262626] text-[#A3A3A3] cursor-not-allowed'
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
export default AdminQueue;
