import React, { useState, useEffect } from 'react';
import { db, TABLES } from '../lib/db';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Search, 
  Clock, 
  Users, 
  MapPin, 
  Phone, 
  Wrench, 
  CheckCircle2, 
  X,
  ChevronLeft,
  ChevronRight,
  Bot,
  Filter,
  MoreVertical,
  Trash2,
  Edit2,
  ToggleLeft,
  ToggleRight,
  Navigation,
  UserPlus,
  FileSpreadsheet,
  Zap,
  BarChart2,
  FileText,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import ConfirmModal from './ConfirmModal';

interface TeamAvailability {
  teamId: number;
  teamName: string;
  isFull: boolean;
  currentJobs: number;
  maxJobs: number;
  slots: {
    slotId: number;
    label: string;
    available: boolean;
    reason: string | null;
  }[];
}

export default function Booking({ showToast }: { showToast: (msg: string, type?: 'success' | 'error' | 'info') => void }) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [availability, setAvailability] = useState<TeamAvailability[]>([]);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    customerName: '',
    phone: '',
    address: '',
    serviceType: 'Normal Service',
    unitType: '',
    teamId: '',
    slotId: ''
  });

  const fetchBookings = async () => {
    try {
      const [bookings, inventoryData, blockedSlotsData] = await Promise.all([
        db.getAll(TABLES.BOOKINGS),
        db.getAll(TABLES.INVENTORY),
        db.getAll(TABLES.BLOCKED_SLOTS)
      ]);
      setBookings(bookings);
      setInventoryItems(inventoryData);
    } catch (error) {
      showToast('Gagal memuatkan tempahan', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailability = async (date: string) => {
    try {
      const teams = db.getAll<any>(TABLES.TEAMS);
      const slots = db.getAll<any>(TABLES.TIME_SLOTS);
      const bookings = db.getAll<any>(TABLES.BOOKINGS);
      const blockedSlotsRaw = db.getAll<any>(TABLES.BLOCKED_SLOTS) || [];

      const dateBookings = bookings.filter((b: any) => (b.booking_date || b.date) === date);
      const dateBlockedSlots = blockedSlotsRaw.filter((b: any) => b.date === date);

      const availabilityData: TeamAvailability[] = teams.filter((t: any) => t.status === 'active' || t.active === true || t.is_active === true).map((team: any) => {
        const teamBookings = dateBookings.filter((b: any) => (b.teamId || b.team || b.team_id)?.toString() === team.id.toString() || b.team === team.name);
        const aircondJobs = teamBookings.filter((b: any) => {
          const service = b.serviceType || b.service_type || '';
          return service.toLowerCase().includes('pasang');
        }).length;
        const maxAircondJobs = team.maxAircondJobs || team.max_install_jobs || 2;
        const maxJobs = team.maxJobs || team.max_jobs_per_day || team.max_jobs || 4;
        
        const isAircondFull = aircondJobs >= maxAircondJobs;

        // Fetch slots mapping for this team if available
        const mappingsData = db.getAll<any>(TABLES.AI_MAPPINGS) || [];
        const teamAllowedSlots = mappingsData
          .filter(m => m.team_id === team.id && (m.status === 'active' || m.active === true))
          .map(m => m.slot_id);
        
        const teamSlots = slots.map((slot: any) => {
          const slotBookings = teamBookings.filter((b: any) => (b.slotId || b.timeSlot || b.time_slot_id)?.toString() === slot.id.toString() || b.timeSlot === slot.time || b.time_slot === slot.time || b.timeSlot === slot.label || b.time_slot === slot.label);
          
          const isSlotActive = slot.status === 'active' || slot.active === true || slot.is_active === true;
          const isBlocked = dateBlockedSlots.some((b: any) => b.timeSlot === slot.time || b.timeSlot === 'ALL');
          
          let available = isSlotActive && teamBookings.length < maxJobs && slotBookings.length === 0 && !isBlocked;
          let reason = isBlocked ? 'Slot ditutup (Cuti)' : (!isSlotActive ? 'Slot tidak aktif' : (teamBookings.length >= maxJobs ? 'Had Harian Penuh' : (slotBookings.length > 0 ? 'Slot Penuh' : null)));
          
          // Check if team is allowed to take this slot
          const allowedSlots = team.slots || team.allowed_slots || teamAllowedSlots || [];
          if (available && allowedSlots && allowedSlots.length > 0 && !allowedSlots.includes(slot.id)) {
            available = false;
            reason = 'Slot tidak dibenarkan untuk team ini';
          }

          if (available && formData.serviceType && formData.serviceType.toLowerCase().includes('pasang') && isAircondFull) {
             available = false;
             reason = 'Had Pasang Aircond Penuh';
          }

          return {
            slotId: slot.id,
            label: slot.time || slot.label,
            available,
            reason
          };
        });

        return {
          teamId: team.id,
          teamName: team.name,
          isFull: teamBookings.length >= maxJobs || !!(formData.serviceType && formData.serviceType.toLowerCase().includes('pasang') && isAircondFull),
          currentJobs: teamBookings.length,
          maxJobs: maxJobs,
          slots: teamSlots
        };
      });

      // Deduplicate teams by Name to prevent duplicate entries with same name but different IDs
      const uniqueAvailability = Array.from(new Map(availabilityData.map(item => [item.teamName, item])).values());
      setAvailability(uniqueAvailability);
    } catch (error) {
      console.error('Error calculating availability:', error);
      setAvailability([]);
    }
  };

  useEffect(() => {
    fetchBookings();

    const handleUpdate = () => {
      fetchBookings();
      if (selectedDate) fetchAvailability(selectedDate);
    };

    window.addEventListener('booking-update', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('booking-update', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [selectedDate]);

  useEffect(() => {
    if (selectedDate) {
      fetchAvailability(selectedDate);
    }
  }, [selectedDate, formData.serviceType]);

  const handleAddBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.teamId || !formData.slotId) {
      showToast('Sila pilih team dan slot masa', 'error');
      return;
    }

    try {
      const bookings = db.getAll<any>(TABLES.BOOKINGS);
      const isDuplicate = bookings.some(b => 
        (b.phone === formData.phone && b.date === selectedDate && b.timeSlot === (availability.find(t => t.teamId.toString() === formData.teamId.toString())?.slots.find(s => s.slotId.toString() === formData.slotId.toString())?.label || ''))
      );

      if (isDuplicate) {
        showToast('Tempahan sudah wujud untuk pelanggan ini pada tarikh dan masa yang sama.', 'error');
        return;
      }

      const selectedTeam = availability.find(t => t.teamId.toString() === formData.teamId.toString());
      const selectedSlot = selectedTeam?.slots.find(s => s.slotId.toString() === formData.slotId.toString());

      const newBooking = {
        ...formData,
        date: selectedDate,
        booking_date: selectedDate,
        team_name: selectedTeam?.teamName || '',
        team: selectedTeam?.teamName || '',
        slot_label: selectedSlot?.label || '',
        timeSlot: selectedSlot?.label || '',
        status: 'Confirmed',
        created_at: new Date().toISOString()
      };
      
      const { error } = await db.insert(TABLES.BOOKINGS, newBooking);
      
      if (!error) {
        // Sync customer data automatically
        await db.syncCustomer({
          name: formData.customerName,
          phone: formData.phone,
          address: formData.address
        });
        
        showToast('Tempahan berjaya disimpan!', 'success');
        setIsAddModalOpen(false);
        setFormData({
          customerName: '',
          phone: '',
          address: '',
          serviceType: 'Normal Service',
          unitType: '',
          teamId: '',
          slotId: ''
        });
        fetchBookings();
        fetchAvailability(selectedDate);
      } else {
        throw new Error(error.message);
      }
    } catch (error: any) {
      showToast('Gagal menyimpan tempahan: ' + error.message, 'error');
    }
  };

  const handleMarkCompleted = async (booking: any) => {
    try {
      const { error } = await db.update(TABLES.BOOKINGS, booking.id, { status: 'Completed' } as any);
      if (!error) {
        showToast(`Tempahan ${booking.customer_name} telah selesai!`, 'success');
        fetchBookings();
      } else {
        showToast('Gagal mengemaskini status', 'error');
      }
    } catch (error) {
      showToast('Ralat sistem', 'error');
    }
  };

  const handleConvertToInvoice = async (booking: any) => {
    try {
      const nextId = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const newInvoice = {
        id: nextId,
        date: new Date().toISOString().split('T')[0],
        customer_name: booking.customer_name,
        phone: booking.customer_phone,
        address: booking.customer_address,
        type: 'invoice',
        status: 'Draft',
        items: JSON.stringify([{
          description: booking.service_type + (booking.unit_type ? ` (${booking.unit_type})` : ''),
          unit: 'Unit',
          qty: 1,
          unitPrice: 0,
          amount: 0
        }]),
        total: 0,
        created_at: new Date().toISOString()
      };

      const { error } = await db.insert(TABLES.DOCUMENTS, newInvoice);
      if (!error) {
        showToast(`Invois ${nextId} telah dijana! Sila lengkapkan maklumat harga di menu Invois.`, 'success');
      } else {
        showToast('Gagal menjana invois', 'error');
      }
    } catch (error) {
      showToast('Ralat sistem', 'error');
    }
  };

  const handleDeleteBooking = async (id: number) => {
    setDeleteId(id);
    setIsConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      const { error } = await db.delete(TABLES.BOOKINGS, deleteId);
      if (!error) {
        showToast('Tempahan telah dibatalkan', 'success');
        fetchBookings();
        fetchAvailability(selectedDate);
      } else {
        throw new Error(error.message);
      }
    } catch (error: any) {
      showToast('Gagal membatalkan tempahan: ' + error.message, 'error');
    } finally {
      setIsConfirmOpen(false);
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">BOOKING SERVICE</h1>
          <p className="text-slate-400 mt-1">Urus tempahan servis dan tugasan team secara efisien.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-all"
          >
            <Plus size={18} />
            Create Manual Booking
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Calendar Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-panel p-6">
            <div className="flex items-center justify-between mb-4">
              <select 
                value={`${new Date(selectedDate).getFullYear()}-${new Date(selectedDate).getMonth()}`}
                onChange={(e) => {
                  const [year, month] = e.target.value.split('-').map(Number);
                  setSelectedDate(new Date(year, month, 1).toISOString().split('T')[0]);
                }}
                className="bg-darker border border-white/10 rounded-lg px-2 py-1 text-xs text-white font-bold outline-none"
              >
                {Array.from({ length: 12 }).map((_, i) => {
                  const date = new Date(new Date().getFullYear(), i, 1);
                  return (
                    <option key={i} value={`${date.getFullYear()}-${i}`}>
                      {date.toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </option>
                  );
                })}
              </select>
              <div className="flex gap-1">
                <button 
                  onClick={() => {
                    const d = new Date(selectedDate);
                    d.setMonth(d.getMonth() - 1);
                    setSelectedDate(d.toISOString().split('T')[0]);
                  }}
                  className="p-1 hover:bg-white/5 rounded text-slate-400"
                >
                  <ChevronLeft size={16} />
                </button>
                <button 
                  onClick={() => {
                    const d = new Date(selectedDate);
                    d.setMonth(d.getMonth() + 1);
                    setSelectedDate(d.toISOString().split('T')[0]);
                  }}
                  className="p-1 hover:bg-white/5 rounded text-slate-400"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center mb-2">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                <span key={`${d}-${i}`} className="text-[10px] font-bold text-slate-500">{d}</span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {(() => {
                const d = new Date(selectedDate);
                const year = d.getFullYear();
                const month = d.getMonth();
                const firstDay = new Date(year, month, 1).getDay();
                const daysInMonth = new Date(year, month + 1, 0).getDate();
                
                return [
                  ...Array(firstDay).fill(null),
                  ...Array.from({ length: daysInMonth }).map((_, i) => i + 1)
                ].map((day, i) => {
                  const dateStr = day ? `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}` : '';
                  const blockedSlotsRaw = db.getAll<any>(TABLES.BLOCKED_SLOTS) || [];
                  const isHoliday = day ? blockedSlotsRaw.some((b: any) => b.date === dateStr && (b.timeSlot === 'ALL' || b.reason === 'CLOSE_ALL')) : false;

                  return (
                    <button 
                      key={i} 
                      disabled={!day}
                      onClick={() => day && setSelectedDate(dateStr)}
                      className={cn(
                        "aspect-square flex items-center justify-center text-xs rounded-lg transition-all relative",
                        !day ? "cursor-default" : 
                        selectedDate === dateStr
                          ? 'bg-primary text-white font-bold' 
                          : isHoliday 
                            ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
                            : 'hover:bg-white/5 text-slate-400'
                      )}
                    >
                      {day}
                      {isHoliday && <div className="absolute top-1 right-1 w-1 h-1 bg-red-500 rounded-full" />}
                    </button>
                  );
                });
              })()}
            </div>
          </div>

          <div className="glass-panel p-6 space-y-4">
            <h3 className="font-bold text-sm text-white">Ketersediaan Team</h3>
            <div className="space-y-3">
              {availability.map(team => (
                <div key={team.teamId} className="p-3 bg-white/5 rounded-xl border border-white/5 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-white">{team.teamName}</span>
                    <span className={cn(
                      "text-[10px] px-2 py-0.5 rounded-full font-bold",
                      team.isFull ? "bg-accent/20 text-accent" : "bg-emerald-500/20 text-emerald-400"
                    )}>
                      {team.currentJobs}/{team.maxJobs} Jobs
                    </span>
                  </div>
                  <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden">
                    <div 
                      className={cn("h-full transition-all", team.isFull ? "bg-accent" : "bg-emerald-500")} 
                      style={{ width: `${(team.currentJobs / team.maxJobs) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Booking List */}
        <div className="lg:col-span-3 space-y-6">
          <div className="glass-panel overflow-hidden">
            <div className="p-6 border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/5">
              <div className="flex items-center gap-4">
                <h3 className="font-bold text-white">Senarai Tempahan</h3>
                <div className="px-3 py-1 bg-primary/10 border border-primary/20 rounded-full text-[10px] font-bold text-primary uppercase">
                  {selectedDate}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => showToast('Exporting booking list...', 'info')} className="p-2 bg-white/5 border border-white/10 rounded-lg text-slate-400 hover:text-secondary" title="Export List">
                  <FileSpreadsheet size={14} />
                </button>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                  <input type="text" placeholder="Cari booking..." className="bg-darker border border-white/10 rounded-lg py-1.5 pl-9 pr-4 text-xs focus:outline-none focus:border-secondary w-48 text-white" />
                </div>
                <button className="p-2 bg-white/5 border border-white/10 rounded-lg text-slate-400 hover:text-white">
                  <Filter size={14} />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="px-6 py-4">Pelanggan & Alamat</th>
                    <th className="px-6 py-4">Team & Slot</th>
                    <th className="px-6 py-4">Servis & Unit</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {bookings.filter(b => {
                    const bDate = (b.booking_date || b.date || '').toString().split('T')[0];
                    return bDate === selectedDate;
                  }).map((booking) => {
                    const customerName = booking.customer_name || booking.customerName || 'Pelanggan';
                    const customerAddress = booking.customer_address || booking.address || '-';
                    const customerPhone = booking.customer_phone || booking.phone || '-';
                    const teamName = booking.team_name || booking.team || '-';
                    const slotLabel = booking.slot_label || booking.timeSlot || '-';
                    const serviceType = booking.service_type || booking.serviceType || '-';
                    const unitType = booking.unit_type || booking.unitType || '-';
                    
                    return (
                    <tr key={booking.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-white">{customerName}</span>
                          <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-1">
                            <MapPin size={10} />
                            <span className="truncate max-w-[200px]">{customerAddress}</span>
                          </div>
                          <div className="flex items-center gap-1 text-[10px] text-slate-400">
                            <Phone size={10} />
                            <span>{customerPhone}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-white">{teamName}</span>
                          <span className="text-[10px] text-slate-500">{slotLabel}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-secondary">{serviceType}</span>
                          <span className="text-[10px] text-slate-500 mt-1">{unitType}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                          booking.status === 'Confirmed' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                        }`}>
                          {booking.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleMarkCompleted(booking)} 
                            className="p-2 hover:bg-emerald-500/10 text-emerald-500 rounded-lg" 
                            title="Mark as Completed"
                            disabled={booking.status === 'Completed'}
                          >
                            <CheckCircle2 size={14} />
                          </button>
                          <button onClick={() => showToast('Opening GPS Location...', 'info')} className="p-2 hover:bg-blue-500/10 text-blue-500 rounded-lg" title="View GPS">
                            <Navigation size={14} />
                          </button>
                          <button 
                            onClick={() => handleConvertToInvoice(booking)} 
                            className="p-2 hover:bg-orange-500/10 text-orange-500 rounded-lg" 
                            title="Convert to Invoice"
                          >
                            <FileText size={14} />
                          </button>
                          <button className="p-2 hover:bg-white/5 rounded-lg text-slate-400 hover:text-secondary">
                            <Edit2 size={14} />
                          </button>
                          <button 
                            onClick={() => handleDeleteBooking(booking.id)}
                            className="p-2 hover:bg-red-500/10 rounded-lg text-slate-400 hover:text-red-500"
                            title="Cancel Booking"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )})}
                  {bookings.filter(b => (b.booking_date || b.date) === selectedDate).length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-500 text-sm">
                        Apabila AI Agent mengesahkan tempahan melalui WhatsApp, ia akan muncul di sini secara automatik.senarai tempahan
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Add Booking Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-dark border border-white/10 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden my-8"
            >
              <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                <div className="flex items-center gap-3 text-white">
                  <div className="p-2 bg-primary/20 text-primary rounded-lg">
                    <CalendarIcon size={20} />
                  </div>
                  <h3 className="font-bold text-lg">Borang Tempahan Servis</h3>
                </div>
                <button onClick={() => setIsAddModalOpen(false)} className="text-slate-500 hover:text-white">
                  <X size={24} />
                </button>
              </div>
              <form onSubmit={handleAddBooking} className="p-6 space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tarikh Servis</label>
                      <input 
                        required 
                        type="date" 
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-full bg-darker border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-secondary outline-none text-white" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nama Pelanggan</label>
                      <input 
                        required 
                        type="text" 
                        value={formData.customerName}
                        onChange={(e) => setFormData({...formData, customerName: e.target.value})}
                        className="w-full bg-darker border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-secondary outline-none text-white" 
                        placeholder="Nama penuh pelanggan" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">No. Telefon</label>
                      <input 
                        required 
                        type="text" 
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        className="w-full bg-darker border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-secondary outline-none text-white" 
                        placeholder="e.g. 0123456789" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Alamat</label>
                      <textarea 
                        required 
                        value={formData.address}
                        onChange={(e) => setFormData({...formData, address: e.target.value})}
                        className="w-full bg-darker border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-secondary outline-none h-24 text-white" 
                        placeholder="Alamat lengkap lokasi servis" 
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Jenis Servis</label>
                        <select 
                          value={formData.serviceType}
                          onChange={(e) => setFormData({...formData, serviceType: e.target.value})}
                          className="w-full bg-darker border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-secondary outline-none text-white"
                        >
                          <option className="bg-dark">Normal Service</option>
                          <option className="bg-dark">Chemical Overhaul</option>
                          <option className="bg-dark">Gas Top-up</option>
                          <option className="bg-dark">Repair / Troubleshooting</option>
                          <option className="bg-dark">Installation</option>
                          {inventoryItems.length > 0 && (
                            <optgroup label="Inventori" className="bg-dark">
                              {inventoryItems.map(item => (
                                <option key={item.id} value={item.itemName} className="bg-dark">
                                  {item.itemName}
                                </option>
                              ))}
                            </optgroup>
                          )}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Jenis Unit</label>
                        <input 
                          required 
                          type="text" 
                          value={formData.unitType}
                          onChange={(e) => setFormData({...formData, unitType: e.target.value})}
                          className="w-full bg-darker border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-secondary outline-none text-white" 
                          placeholder="e.g. 1.5HP Wall Mounted" 
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Pilih Team</label>
                        <select 
                          required
                          value={formData.teamId}
                          onChange={(e) => setFormData({...formData, teamId: e.target.value, slotId: ''})}
                          className="w-full bg-darker border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-secondary outline-none text-white"
                        >
                          <option value="">Pilih Team</option>
                          {availability.map(team => (
                            <option key={team.teamId} value={team.teamId} disabled={team.isFull}>
                              {team.teamName} {team.isFull ? '(Penuh)' : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Pilih Slot Masa</label>
                        <select 
                          required
                          disabled={!formData.teamId}
                          value={formData.slotId}
                          onChange={(e) => setFormData({...formData, slotId: e.target.value})}
                          className="w-full bg-darker border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-secondary outline-none text-white disabled:opacity-50"
                        >
                          <option value="">Pilih Slot Masa</option>
                          {formData.teamId && availability.find(t => t.teamId.toString() === formData.teamId)?.slots.map(slot => (
                            <option key={slot.slotId} value={slot.slotId} disabled={!slot.available}>
                              {slot.label} {!slot.available ? `(${slot.reason})` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="p-4 bg-primary/10 border border-primary/20 rounded-2xl space-y-3">
                      <div className="flex gap-3">
                        <Bot className="text-primary shrink-0" size={20} />
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-white">AI Smart Suggestion</p>
                          <p className="text-[10px] text-slate-300 leading-relaxed">
                            Sistem AI akan mengehadkan 4 tugasan sehari bagi setiap team untuk kualiti kerja yang optimum.
                          </p>
                        </div>
                      </div>
                      <button 
                        type="button"
                        onClick={() => {
                          const availableSlot = availability
                            .flatMap(t => t.slots.map(s => ({ teamId: t.teamId, slotId: s.slotId, available: s.available })))
                            .find(s => s.available);
                          
                          if (availableSlot) {
                            setFormData({
                              ...formData,
                              teamId: availableSlot.teamId.toString(),
                              slotId: availableSlot.slotId.toString()
                            });
                            showToast('AI telah mencadangkan slot terbaik untuk anda!', 'info');
                          } else {
                            showToast('Tiada slot kosong tersedia untuk tarikh ini.', 'error');
                          }
                        }}
                        className="w-full py-2 bg-primary/20 hover:bg-primary/30 text-primary text-[10px] font-bold rounded-lg transition-all flex items-center justify-center gap-2 border border-primary/30"
                      >
                        <Zap size={12} />
                        Cadangkan Slot Kosong
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="flex-1 py-3 bg-white/5 text-white rounded-xl font-bold hover:bg-white/10 transition-all"
                  >
                    Batal
                  </button>
                  <button type="submit" className="flex-[2] py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all flex items-center justify-center gap-2">
                    <CheckCircle2 size={18} />
                    Simpan Tempahan
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmModal 
        isOpen={isConfirmOpen}
        title="Batal Tempahan?"
        message="Adakah anda pasti mahu membatalkan tempahan ini? Tindakan ini tidak boleh diundur."
        onConfirm={confirmDelete}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </div>
  );
}
