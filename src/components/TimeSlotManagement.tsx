import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  Users, 
  Plus, 
  Trash2, 
  ToggleLeft, 
  ToggleRight, 
  ShieldCheck, 
  AlertTriangle, 
  Bot,
  Edit2,
  Save,
  X,
  CheckCircle2,
  CalendarOff,
  Calendar,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ConfirmModal from './ConfirmModal';
import { db, TABLES } from '../lib/db';
import { BlockedSlot } from '../types';

interface TimeSlot {
  id: number;
  time: string;
  active: boolean;
}

interface Team {
  id: number;
  name: string;
  active: boolean;
  maxJobs: number;
  maxAircondJobs: number;
  slots: number[]; // IDs of slots this team handles
}

export default function TimeSlotManagement({ showToast }: { showToast: any }) {
  const [slots, setSlots] = useState<TimeSlot[]>(() => db.getAll<TimeSlot>(TABLES.TIME_SLOTS).length > 0 ? db.getAll<TimeSlot>(TABLES.TIME_SLOTS) : [
    { id: 1, time: '9:00 AM – 12:00 PM', active: true },
    { id: 2, time: '12:00 PM – 3:00 PM', active: true },
    { id: 3, time: '3:00 PM – 6:00 PM', active: true },
    { id: 4, time: '6:00 PM – 9:00 PM', active: true },
  ]);

  const [teams, setTeams] = useState<Team[]>(() => db.getAll<Team>(TABLES.TEAMS).length > 0 ? db.getAll<Team>(TABLES.TEAMS) : [
    { id: 1, name: 'Team A', active: true, maxJobs: 4, maxAircondJobs: 2, slots: [1, 2, 3, 4] },
    { id: 2, name: 'Team B', active: true, maxJobs: 4, maxAircondJobs: 2, slots: [1, 2, 3, 4] },
    { id: 3, name: 'Team C', active: false, maxJobs: 4, maxAircondJobs: 2, slots: [1, 2, 3, 4] },
  ]);

  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>(() => db.getAll<BlockedSlot>(TABLES.BLOCKED_SLOTS));
  const [newBlockDate, setNewBlockDate] = useState(''); // Empty to start, allows manual entry
  const [newBlockSlot, setNewBlockSlot] = useState('ALL'); // 'ALL' or slot label
  const [isBlocking, setIsBlocking] = useState(false);

  const [editingTeam, setEditingTeam] = useState<number | null>(null);
  const [newTeamName, setNewTeamName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<{ type: 'slot' | 'team', id: number } | null>(null);

  const handleSetConfirmDelete = (val: { type: 'slot' | 'team', id: number } | null) => {
    console.log('setConfirmDelete called with:', val);
    setConfirmDelete(val);
  };

  const handleAddSlot = () => {
    const maxId = slots.length > 0 ? Math.max(...slots.map(s => Number(s.id) || 0)) : 0;
    const newId = maxId > 0 ? maxId + 1 : Date.now();
    setSlots([...slots, { id: newId, time: 'New Slot', active: true }]);
    showToast('Slot masa baharu ditambah');
  };

  const performRemoveSlot = (id: number) => {
    console.log('performRemoveSlot called with id:', id);
    setSlots(slots.filter(s => s.id !== id));
    // Also remove from teams
    setTeams(teams.map(t => ({
      ...t,
      slots: t.slots.filter(sid => sid !== id)
    })));
    showToast('Slot masa dipadam', 'success');
    setConfirmDelete(null);
  };

  const handleUpdateSlot = (id: number, time: string) => {
    setSlots(slots.map(s => s.id === id ? { ...s, time } : s));
  };

  const normalizeDate = (d: string) => {
    let date = d.trim();
    if (!date) return null;
    
    // Handle DD/MM/YYYY
    if (date.includes('/')) {
      const p = date.split('/');
      if (p.length === 3) {
        // Assume DD/MM/YYYY
        let day = p[0].padStart(2, '0');
        let month = p[1].padStart(2, '0');
        let year = p[2];
        if (year.length === 2) year = '20' + year;
        return `${year}-${month}-${day}`;
      }
    }
    
    // Handle YYYY-MM-DD
    if (date.includes('-')) {
      const p = date.split('-');
      if (p.length === 3) {
        if (p[0].length === 4) return date; // Already YYYY-MM-DD
        // Assume DD-MM-YYYY
        let day = p[0].padStart(2, '0');
        let month = p[1].padStart(2, '0');
        let year = p[2];
        if (year.length === 2) year = '20' + year;
        return `${year}-${month}-${day}`;
      }
    }
    
    return date;
  };

  const handleAddBlock = async () => {
    if (!newBlockDate.trim()) {
      showToast('Sila masukkan tarikh', 'error');
      return;
    }
    setIsBlocking(true);
    try {
      let finalDates: string[] = [];
      const segments = newBlockDate.split(',');

      for (const segment of segments) {
        const trimmed = segment.trim();
        if (!trimmed) continue;

        // Check if it's a range (contains '-' and NOT a single date with dashes)
        const isSingleDashDate = trimmed.match(/^\d{4}-\d{2}-\d{2}$/) || trimmed.match(/^\d{2}-\d{2}-\d{4}$/);
        
        if (trimmed.includes('-') && !isSingleDashDate) {
          // It's likely a range like 14/4/2026-19/4/2026
          // We find the split point. Splitting by '-' is risky if dates have dashes.
          // Let's see if we can identify two date parts.
          let startPart = '';
          let endPart = '';

          // If they use slashes, it's easy
          if (trimmed.includes('/')) {
            const parts = trimmed.split('-');
            if (parts.length === 2) {
              startPart = parts[0].trim();
              endPart = parts[1].trim();
            }
          } else {
            // If they use dashes like 14-4-2026-19-4-2026 (very rare but possible)
            // We split by all dashes and try to guess the middle
            const allParts = trimmed.split('-');
            if (allParts.length === 6) { // DD-MM-YYYY-DD-MM-YYYY
              startPart = allParts.slice(0, 3).join('-');
              endPart = allParts.slice(3, 6).join('-');
            } else if (allParts.length === 2) { // YYYY-YYYY or something simple
              startPart = allParts[0].trim();
              endPart = allParts[1].trim();
            }
          }

          const startDateStr = normalizeDate(startPart);
          const endDateStr = normalizeDate(endPart);

          if (startDateStr && endDateStr) {
            const start = new Date(startDateStr);
            const end = new Date(endDateStr);
            const current = new Date(start);

            while (current <= end) {
              finalDates.push(current.toISOString().split('T')[0]);
              current.setDate(current.getDate() + 1);
            }
          } else {
            const single = normalizeDate(trimmed);
            if (single) finalDates.push(single);
          }
        } else {
          const single = normalizeDate(trimmed);
          if (single) finalDates.push(single);
        }
      }
      
      const uniqueDates = Array.from(new Set(finalDates));

      if (uniqueDates.length === 0) {
        showToast('Format tarikh tidak sah', 'error');
        return;
      }

      for (const date of uniqueDates) {
        if (newBlockSlot === 'ALL') {
          // Block all active slots for this date
          const activeSlots = slots.filter(s => s.active);
          for (const slot of activeSlots) {
            // Check if already blocked to avoid duplicates
            const existing = db.getAll<BlockedSlot>(TABLES.BLOCKED_SLOTS).find(b => b.date === date && b.timeSlot === slot.time);
            if (!existing) {
              await db.insert(TABLES.BLOCKED_SLOTS, {
                date: date,
                timeSlot: slot.time,
                reason: 'CLOSE_ALL'
              });
            }
          }
        } else {
          const existing = db.getAll<BlockedSlot>(TABLES.BLOCKED_SLOTS).find(b => b.date === date && b.timeSlot === newBlockSlot);
          if (!existing) {
            await db.insert(TABLES.BLOCKED_SLOTS, {
              date: date,
              timeSlot: newBlockSlot
            });
          }
        }
      }
      
      setBlockedSlots(db.getAll<BlockedSlot>(TABLES.BLOCKED_SLOTS));
      setNewBlockDate('');
      showToast(`${uniqueDates.length} hari berjaya diproses!`, 'success');
      window.dispatchEvent(new CustomEvent('booking-update')); // Trigger AI sync
    } catch (e) {
      showToast('Gagal menutup slot', 'error');
    } finally {
      setIsBlocking(false);
    }
  };

  const handleRemoveBlock = async (id: string) => {
    try {
      await db.delete(TABLES.BLOCKED_SLOTS, id);
      setBlockedSlots(db.getAll<BlockedSlot>(TABLES.BLOCKED_SLOTS));
      showToast('Slot dibuka semula', 'info');
      window.dispatchEvent(new CustomEvent('booking-update')); // Trigger AI sync
    } catch (e) {
      showToast('Gagal membuka slot', 'error');
    }
  };

  const handleToggleSlot = (id: number) => {
    setSlots(slots.map(s => s.id === id ? { ...s, active: !s.active } : s));
  };

  const handleAddTeam = () => {
    const maxId = teams.length > 0 ? Math.max(...teams.map(t => Number(t.id) || 0)) : 0;
    const newId = maxId > 0 ? maxId + 1 : Date.now();
    const teamName = `Team ${String.fromCharCode(64 + (teams.length + 1))}`;
    setTeams([...teams, { 
      id: newId, 
      name: teamName, 
      active: true, 
      maxJobs: 4, 
      maxAircondJobs: 2,
      slots: slots.map(s => s.id) 
    }]);
    showToast(`${teamName} ditambah`);
  };

  const performRemoveTeam = (id: number) => {
    console.log('performRemoveTeam called with id:', id);
    setTeams(teams.filter(t => t.id !== id));
    showToast('Team dipadam', 'success');
    setConfirmDelete(null);
  };

  const handleToggleTeam = (id: number) => {
    setTeams(teams.map(t => t.id === id ? { ...t, active: !t.active } : t));
  };

  const handleUpdateTeamJobs = (id: number, maxJobs: number) => {
    setTeams(teams.map(t => t.id === id ? { ...t, maxJobs } : t));
  };

  const handleUpdateTeamAircondJobs = (id: number, maxAircondJobs: number) => {
    setTeams(teams.map(t => t.id === id ? { ...t, maxAircondJobs } : t));
  };

  const handleToggleTeamSlot = (teamId: number, slotId: number) => {
    setTeams(teams.map(t => {
      if (t.id === teamId) {
        const hasSlot = t.slots.includes(slotId);
        return {
          ...t,
          slots: hasSlot 
            ? t.slots.filter(id => id !== slotId) 
            : [...t.slots, slotId]
        };
      }
      return t;
    }));
  };

  const saveTeamName = (id: number) => {
    if (!newTeamName.trim()) return;
    setTeams(teams.map(t => t.id === id ? { ...t, name: newTeamName } : t));
    setEditingTeam(null);
    setNewTeamName('');
    showToast('Nama team dikemaskini');
  };

  const handleSave = () => {
    localStorage.setItem('mnf_time_slots', JSON.stringify(slots));
    localStorage.setItem('mnf_teams', JSON.stringify(teams));
    window.dispatchEvent(new Event('storage'));
    showToast('Konfigurasi disimpan!', 'success');
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Slot Masa & Pengurusan Team</h1>
          <p className="text-gray-500 mt-1">Urus ketersediaan slot masa dan kapasiti pasukan.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleAddTeam}
            className="flex items-center gap-2 px-4 py-2 bg-secondary/10 text-secondary rounded-lg text-sm font-bold hover:bg-secondary/20 transition-all"
          >
            <Plus size={18} />
            Tambah Team
          </button>
          <button 
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-lg text-sm font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-all"
          >
            <Save size={18} />
            Simpan Semua
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Slot Masa Tempahan */}
          <div className="bg-dark-card border border-dark-border p-8 rounded-2xl space-y-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold flex items-center gap-2">
                <Clock size={18} className="text-secondary" />
                Sistem Slot Masa Utama
              </h3>
              <button 
                onClick={handleAddSlot}
                className="p-2 bg-secondary/10 text-secondary rounded-lg hover:bg-secondary/20 transition-all"
              >
                <Plus size={16} />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {slots.map((slot) => (
                <div key={slot.id} className="flex items-center gap-3 p-4 bg-white/5 border border-dark-border rounded-xl group">
                  <div className="flex-1">
                    <input 
                      type="text" 
                      value={slot.time} 
                      onChange={(e) => handleUpdateSlot(slot.id, e.target.value)}
                      className="w-full bg-transparent border-none text-sm font-bold focus:ring-0 outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleToggleSlot(slot.id)}
                      className={`p-1.5 rounded-lg transition-all ${slot.active ? 'text-green-500 bg-green-500/10' : 'text-gray-500 bg-gray-500/10'}`}
                      title={slot.active ? "Aktif" : "Nyahaktif"}
                    >
                      {slot.active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSetConfirmDelete({ type: 'slot', id: slot.id });
                      }}
                      className="p-1.5 text-red-500 bg-red-500/10 rounded-lg opacity-100 transition-all hover:scale-110 hover:bg-red-500/20"
                      title="Padam Slot"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pengurusan Team */}
          <div className="bg-dark-card border border-dark-border p-8 rounded-2xl space-y-6">
            <h3 className="font-bold flex items-center gap-2 mb-4">
              <Users size={18} className="text-primary" />
              Konfigurasi Pasukan (Team)
            </h3>
            <div className="space-y-6">
              {teams.map((team) => (
                <div key={team.id} className="p-6 bg-white/5 border border-dark-border rounded-2xl space-y-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${team.active ? 'bg-primary/20 text-primary' : 'bg-gray-500/20 text-gray-500'}`}>
                        <Users size={24} />
                      </div>
                      <div>
                        {editingTeam === team.id ? (
                          <div className="flex items-center gap-2">
                            <input 
                              autoFocus
                              type="text" 
                              value={newTeamName} 
                              onChange={(e) => setNewTeamName(e.target.value)}
                              className="bg-dark-bg border border-primary rounded px-2 py-1 text-sm font-bold outline-none"
                            />
                            <button onClick={() => saveTeamName(team.id)} className="text-green-500"><CheckCircle2 size={18} /></button>
                            <button onClick={() => setEditingTeam(null)} className="text-red-500"><X size={18} /></button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-lg">{team.name}</p>
                            <button onClick={() => { setEditingTeam(team.id); setNewTeamName(team.name); }} className="text-gray-500 hover:text-white"><Edit2 size={14} /></button>
                          </div>
                        )}
                        <p className="text-xs text-gray-500">Mempunyai slot masa sendiri & had kerja</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase">Had Kerja Harian</label>
                        <div className="flex items-center gap-2">
                          <input 
                            type="number" 
                            value={team.maxJobs} 
                            onChange={(e) => handleUpdateTeamJobs(team.id, parseInt(e.target.value))}
                            className="w-20 bg-dark-bg border border-dark-border rounded-lg px-3 py-1.5 text-sm outline-none focus:border-primary font-bold"
                          />
                          <span className="text-xs text-gray-500">Jobs</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase">Had Pasang/Install</label>
                        <div className="flex items-center gap-2">
                          <input 
                            type="number" 
                            value={team.maxAircondJobs} 
                            onChange={(e) => handleUpdateTeamAircondJobs(team.id, parseInt(e.target.value))}
                            className="w-20 bg-dark-bg border border-dark-border rounded-lg px-3 py-1.5 text-sm outline-none focus:border-primary font-bold"
                          />
                          <span className="text-xs text-gray-500">Jobs</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase">Status Team</label>
                        <button 
                          onClick={() => handleToggleTeam(team.id)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-all ${
                            team.active 
                              ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                              : 'bg-gray-700 text-gray-400'
                          }`}
                        >
                          {team.active ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                          {team.active ? 'AKTIF' : 'OFF'}
                        </button>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSetConfirmDelete({ type: 'team', id: team.id });
                        }}
                        className="p-2 text-red-500 hover:bg-red-500/20 rounded-lg transition-all hover:scale-110"
                        title="Padam Team"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>

                  {/* Team Specific Slots */}
                  <div className="pt-4 border-t border-white/5">
                    <p className="text-[10px] font-bold text-gray-500 uppercase mb-3 tracking-wider">Ketersediaan Slot Masa Pasukan:</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {slots.map(slot => (
                        <button
                          key={slot.id}
                          disabled={!slot.active}
                          onClick={() => handleToggleTeamSlot(team.id, slot.id)}
                          className={`px-3 py-2 rounded-lg text-[10px] font-bold border transition-all ${
                            !slot.active 
                              ? 'bg-gray-800/50 border-gray-800 text-gray-600 cursor-not-allowed'
                              : team.slots.includes(slot.id)
                                ? 'bg-secondary/20 border-secondary text-secondary'
                                : 'bg-white/5 border-dark-border text-gray-500 hover:border-gray-500'
                          }`}
                        >
                          {slot.time}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Cuti / Tutup Slot (Block Date) */}
          <div className="bg-dark-card border border-dark-border p-8 rounded-2xl space-y-6">
            <h3 className="font-bold flex items-center gap-2 mb-4 text-white">
              <CalendarOff size={18} className="text-primary" />
              Cuti / Tutup Slot (Multi-Date)
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 ml-1 tracking-widest">Tarikh (Contoh: 14/04-19/04)</label>
                  <div className="relative">
                    <textarea 
                      placeholder="Contoh: 14/4/2026-19/4/2026 atau 18/04, 20/04"
                      rows={2}
                      value={newBlockDate}
                      onChange={(e) => setNewBlockDate(e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-primary transition-all font-bold placeholder:text-slate-700"
                    />
                    <div className="absolute right-4 bottom-3 text-slate-700 pointer-events-none">
                        <Calendar size={14} />
                    </div>
                  </div>
                  <p className="text-[8px] text-slate-500 font-bold ml-1 uppercase">* Masukkan tarikh tunggal, senarai (koma), atau julat (sengkang -).</p>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 ml-1 tracking-widest">Jenis Penutupan</label>
                  <div className="relative">
                    <select 
                      value={newBlockSlot}
                      onChange={(e) => setNewBlockSlot(e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-primary transition-all appearance-none font-bold"
                    >
                      <option value="ALL" className="bg-slate-900">Tutup Sepenuhnya (Cuti / Holiday)</option>
                      {slots.filter(s => s.active).map(s => (
                        <option key={s.id} value={s.time} className="bg-slate-900">{s.time}</option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-700">
                      <Clock size={14} />
                    </div>
                  </div>
                </div>
                <button 
                  onClick={handleAddBlock}
                  disabled={isBlocking}
                  className="w-full py-4 bg-primary text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-primary/80 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-50 active:scale-95"
                >
                  {isBlocking ? <RefreshCw size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                  <span>Proses Penutupan Slot</span>
                </button>
              </div>

              {/* List of Blocked Slots */}
              <div className="pt-6 border-t border-white/5 space-y-3">
                <p className="text-[10px] font-black uppercase text-slate-500 ml-1 tracking-widest">Senarai Tarikh Cuti:</p>
                <div className="max-h-[200px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                  {blockedSlots.length === 0 ? (
                    <p className="text-[10px] text-slate-600 italic ml-1 font-bold uppercase tracking-tighter">Tiada tarikh cuti yang ditetapkan.</p>
                  ) : (
                    blockedSlots
                      .sort((a, b) => a.date.localeCompare(b.date))
                      .map(block => (
                      <div key={block.id} className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-xl group hover:border-primary/30 transition-all">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary/10 rounded-lg text-primary">
                            <Calendar size={14} />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-white">{block.date}</p>
                            <p className="text-[10px] text-gray-500">{block.timeSlot}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleRemoveBlock(block.id)}
                          className="p-2 text-gray-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Kawalan Slot Penuh */}
          <div className="bg-dark-card border border-dark-border p-8 rounded-2xl space-y-6">
            <h3 className="font-bold flex items-center gap-2 mb-4">
              <ShieldCheck size={18} className="text-secondary" />
              Kawalan Slot Penuh
            </h3>
            <div className="space-y-4">
              <div className="p-4 bg-secondary/10 border border-secondary/20 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={16} className="text-secondary" />
                  <p className="text-xs font-bold text-secondary uppercase tracking-wider">Had Maksimum: 4 Job Sehari</p>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Sistem akan menyemak slot Team A, B, dan C secara automatik. Jika semua pasukan penuh pada slot tertentu, slot tersebut akan disorokkan dari pelanggan.
                </p>
              </div>
              
              <div className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-3">
                <p className="text-xs font-bold flex items-center gap-2">
                  <Bot size={14} className="text-primary" />
                  AI Agent Automation
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[10px] text-gray-400">
                    <div className="w-1 h-1 bg-primary rounded-full" />
                    Cadangkan slot lain jika penuh
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-gray-400">
                    <div className="w-1 h-1 bg-primary rounded-full" />
                    Maklumkan pelanggan dengan mesej sopan
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-gray-400">
                    <div className="w-1 h-1 bg-primary rounded-full" />
                    Auto-assign team berdasarkan beban kerja
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="p-6 bg-primary/5 border border-primary/10 rounded-2xl">
            <h4 className="text-sm font-bold text-primary mb-2">Nota Penting</h4>
            <ul className="text-xs text-gray-400 space-y-2 list-disc pl-4">
              <li>Slot utama yang dinyahaktifkan akan memberi kesan kepada semua pasukan.</li>
              <li>Setiap pasukan boleh mempunyai ketersediaan slot yang berbeza.</li>
              <li>Had kerja harian membantu AI menguruskan jadual dengan lebih efisien.</li>
            </ul>
          </div>
        </div>
      </div>
      <ConfirmModal 
        isOpen={!!confirmDelete}
        title={confirmDelete?.type === 'slot' ? 'Padam Slot Masa' : 'Padam Pasukan'}
        message={confirmDelete?.type === 'slot' ? 'Adakah anda pasti mahu memadam slot masa ini? Tindakan ini tidak boleh diubah.' : 'Adakah anda pasti mahu memadam pasukan ini? Tindakan ini tidak boleh diubah.'}
        onConfirm={() => {
          confirmDelete && (confirmDelete.type === 'slot' ? performRemoveSlot(confirmDelete.id) : performRemoveTeam(confirmDelete.id));
        }}
        onCancel={() => {
          setConfirmDelete(null);
        }}
      />
    </div>
  );
}
