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
  Loader2
} from 'lucide-react';
import { db, TABLES } from '../lib/db';
import { TIME_SLOTS, TEAMS } from '../constants';

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
  slots: number[]; // IDs of slots this team handles
}

export default function OperationsSettings({ showToast }: { showToast: any }) {
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  const [editingTeam, setEditingTeam] = useState<number | null>(null);
  const [newTeamName, setNewTeamName] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const slotsData = db.getAll<any>(TABLES.TIME_SLOTS) || [];
      const teamsData = db.getAll<any>(TABLES.TEAMS) || [];
      const mappingsData = db.getAll<any>(TABLES.AI_MAPPINGS) || [];

      // If DB is empty, initialize with defaults
      if (slotsData.length === 0 && teamsData.length === 0) {
        await initializeDefaults();
        return;
      }

      setSlots(slotsData.map(s => ({
        id: s.id,
        time: s.label || s.time || 'Unknown Slot',
        active: s.status === 'active' || s.active === true
      })));

      setTeams(teamsData.map(t => ({
        id: t.id,
        name: t.name || 'Unknown Team',
        active: t.status === 'active' || t.active === true,
        maxJobs: t.max_jobs || t.maxJobs || 4,
        slots: mappingsData
          .filter(m => m.team_id === t.id && (m.status === 'active' || m.active === true))
          .map(m => m.slot_id)
      })));
    } catch (error) {
      console.error("Error fetching data:", error);
      showToast('Gagal memuatkan data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const initializeDefaults = async () => {
    const defaultSlots = TIME_SLOTS.map((slot, index) => ({
      id: Date.now() + index,
      label: slot,
      status: 'active'
    }));

    const defaultTeams = TEAMS.map((team, index) => ({
      id: Date.now() + 100 + index,
      name: team,
      status: index < 2 ? 'active' : 'inactive',
      max_jobs: 4
    }));

    for (const slot of defaultSlots) await db.insert(TABLES.TIME_SLOTS, slot);
    for (const team of defaultTeams) {
      await db.insert(TABLES.TEAMS, team);
      for (const slot of defaultSlots) {
        await db.insert(TABLES.AI_MAPPINGS, {
          id: Date.now() + Math.random(),
          team_id: team.id,
          slot_id: slot.id,
          status: 'active'
        });
      }
    }
    
    fetchData();
  };

  const handleAddSlot = async () => {
    const newId = Date.now();
    const newSlot = { id: newId, label: 'New Slot', status: 'active' };
    
    setSlots([...slots, { id: newId, time: 'New Slot', active: true }]);
    
    const { error } = await db.insert(TABLES.TIME_SLOTS, newSlot);
    if (error) {
      showToast('Gagal menambah slot', 'error');
      fetchData();
    } else {
      showToast('Slot masa baharu ditambah');
    }
  };

  const handleRemoveSlot = async (id: number) => {
    if (!confirm('Padam slot masa ini?')) return;
    setSlots(slots.filter(s => s.id !== id));
    setTeams(teams.map(t => ({
      ...t,
      slots: t.slots.filter(sid => sid !== id)
    })));

    const { error } = await db.delete(TABLES.TIME_SLOTS, id);
    if (error) {
      showToast('Gagal memadam slot', 'error');
      fetchData();
    }
  };

  const handleUpdateSlot = async (id: number, time: string) => {
    setSlots(slots.map(s => s.id === id ? { ...s, time } : s));
    await db.update<any>(TABLES.TIME_SLOTS, id, { label: time });
  };

  const handleToggleSlot = async (id: number) => {
    const slot = slots.find(s => s.id === id);
    if (!slot) return;
    const newActive = !slot.active;
    
    setSlots(slots.map(s => s.id === id ? { ...s, active: newActive } : s));
    await db.update<any>(TABLES.TIME_SLOTS, id, { status: newActive ? 'active' : 'inactive' });
  };

  const handleAddTeam = async () => {
    const newId = Date.now();
    const teamName = `Team ${String.fromCharCode(64 + (teams.length % 26) + 1)}`;
    const newTeam = { id: newId, name: teamName, status: 'active', max_jobs: 4 };

    setTeams([...teams, { 
      id: newId, 
      name: teamName, 
      active: true, 
      maxJobs: 4, 
      slots: slots.map(s => s.id) 
    }]);

    const { error } = await db.insert(TABLES.TEAMS, newTeam);
    if (error) {
      showToast('Gagal menambah team', 'error');
      fetchData();
    } else {
      for (const slot of slots) {
        await db.insert(TABLES.AI_MAPPINGS, {
          id: Date.now() + Math.random(),
          team_id: newId,
          slot_id: slot.id,
          status: 'active'
        });
      }
      showToast(`${teamName} ditambah`);
    }
  };

  const handleRemoveTeam = async (id: number) => {
    if (!confirm('Padam team ini?')) return;
    setTeams(teams.filter(t => t.id !== id));
    const { error } = await db.delete(TABLES.TEAMS, id);
    if (error) {
      showToast('Gagal memadam team', 'error');
      fetchData();
    } else {
      showToast('Team dipadam', 'success');
    }
  };

  const handleToggleTeam = async (id: number) => {
    const team = teams.find(t => t.id === id);
    if (!team) return;
    const newActive = !team.active;

    setTeams(teams.map(t => t.id === id ? { ...t, active: newActive } : t));
    await db.update<any>(TABLES.TEAMS, id, { status: newActive ? 'active' : 'inactive' });
  };

  const handleUpdateTeamJobs = async (id: number, maxJobs: number) => {
    setTeams(teams.map(t => t.id === id ? { ...t, maxJobs } : t));
    await db.update<any>(TABLES.TEAMS, id, { max_jobs: maxJobs });
  };

  const handleToggleTeamSlot = async (teamId: number, slotId: number) => {
    const team = teams.find(t => t.id === teamId);
    if (!team) return;
    
    const hasSlot = team.slots.includes(slotId);
    
    setTeams(teams.map(t => {
      if (t.id === teamId) {
        return {
          ...t,
          slots: hasSlot 
            ? t.slots.filter(id => id !== slotId) 
            : [...t.slots, slotId]
        };
      }
      return t;
    }));

    const mappingsData = db.getAll<any>(TABLES.AI_MAPPINGS) || [];
    const existingMapping = mappingsData.find(m => m.team_id === teamId && m.slot_id === slotId);

    if (existingMapping) {
      await db.update<any>(TABLES.AI_MAPPINGS, existingMapping.id, { 
        status: hasSlot ? 'inactive' : 'active' 
      });
    } else {
      await db.insert(TABLES.AI_MAPPINGS, {
        id: Date.now(),
        team_id: teamId,
        slot_id: slotId,
        status: 'active'
      });
    }
  };

  const saveTeamName = async (id: number) => {
    if (!newTeamName.trim()) return;
    setTeams(teams.map(t => t.id === id ? { ...t, name: newTeamName } : t));
    setEditingTeam(null);
    setNewTeamName('');
    
    await db.update<any>(TABLES.TEAMS, id, { name: newTeamName });
    showToast('Nama team dikemaskini');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Combined Slot & Team Management */}
          <div className="glass-panel rounded-[2rem] overflow-hidden shadow-sm">
            <div className="p-6 md:p-8 border-b border-white/10 bg-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h3 className="font-black flex items-center gap-3 text-lg text-white">
                <div className="flex -space-x-2">
                  <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 ring-2 ring-slate-900 z-10"><Clock size={14} /></div>
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 ring-2 ring-slate-900"><Users size={14} /></div>
                </div>
                Konfigurasi Slot & Pasukan
              </h3>
              <div className="flex items-center gap-3">
                <button 
                  onClick={handleAddSlot}
                  className="flex items-center gap-2 px-3 py-1.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-lg text-xs font-bold hover:bg-cyan-500/20 transition-all"
                >
                  <Plus size={14} /> Slot
                </button>
                <button 
                  onClick={handleAddTeam}
                  className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-bold hover:bg-emerald-500/20 transition-all"
                >
                  <Plus size={14} /> Team
                </button>
              </div>
            </div>

            <div className="p-6 md:p-8 space-y-8">
              {/* 1. Slot Masa Utama */}
              <div className="space-y-4">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">1. Slot Masa Utama</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {slots.map((slot) => (
                    <div key={slot.id} className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-xl group hover:border-white/20 transition-all">
                      <div className="flex-1">
                        <input 
                          type="text" 
                          value={slot.time} 
                          onChange={(e) => handleUpdateSlot(slot.id, e.target.value)}
                          className="w-full bg-transparent border-none text-sm font-bold text-white focus:ring-0 outline-none"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handleToggleSlot(slot.id)}
                          className={`p-1.5 rounded-lg transition-all ${slot.active ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-500 bg-white/5'}`}
                          title={slot.active ? "Aktif" : "Nyahaktif"}
                        >
                          {slot.active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                        </button>
                        <button 
                          onClick={() => handleRemoveSlot(slot.id)}
                          className="p-1.5 text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-lg opacity-100 transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="h-px w-full bg-white/10"></div>

              {/* 2. Pasukan Bertugas */}
              <div className="space-y-4">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">2. Pasukan Bertugas (Teams)</h4>
                <div className="space-y-4">
                  {teams.map((team) => (
                    <div key={team.id} className="p-5 bg-white/5 border border-white/10 rounded-2xl space-y-5 hover:border-white/20 transition-all">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${team.active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
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
                                  className="bg-slate-900 border border-cyan-500 rounded px-2 py-1 text-sm font-bold outline-none text-white"
                                />
                                <button onClick={() => saveTeamName(team.id)} className="text-emerald-400"><CheckCircle2 size={18} /></button>
                                <button onClick={() => setEditingTeam(null)} className="text-red-400"><X size={18} /></button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <p className="font-bold text-lg text-white">{team.name}</p>
                                <button onClick={() => { setEditingTeam(team.id); setNewTeamName(team.name); }} className="text-slate-500 hover:text-cyan-400"><Edit2 size={14} /></button>
                              </div>
                            )}
                            <p className="text-xs text-slate-500">Mempunyai slot masa sendiri & had kerja</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase">Had Kerja Harian</label>
                            <div className="flex items-center gap-2">
                              <input 
                                type="number" 
                                value={team.maxJobs} 
                                onChange={(e) => handleUpdateTeamJobs(team.id, parseInt(e.target.value))}
                                className="w-20 bg-slate-900 border border-white/10 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-cyan-500 font-bold text-white"
                              />
                              <span className="text-xs text-slate-500">Jobs</span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase">Status Team</label>
                            <button 
                              onClick={() => handleToggleTeam(team.id)}
                              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-all ${
                                team.active 
                                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                                  : 'bg-slate-800 text-slate-500'
                              }`}
                            >
                              {team.active ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                              {team.active ? 'AKTIF' : 'OFF'}
                            </button>
                          </div>
                          <button onClick={() => handleRemoveTeam(team.id)} className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-all">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>

                      {/* Team Specific Slots */}
                      <div className="pt-4 border-t border-white/10">
                        <p className="text-[10px] font-black text-slate-500 uppercase mb-3 tracking-widest">Ketersediaan Slot Masa Pasukan:</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {slots.map(slot => (
                            <button
                              key={slot.id}
                              disabled={!slot.active}
                              onClick={() => handleToggleTeamSlot(team.id, slot.id)}
                              className={`px-3 py-2 rounded-lg text-[10px] font-bold border transition-all ${
                                !slot.active 
                                  ? 'bg-slate-900 border-white/5 text-slate-600 cursor-not-allowed'
                                  : team.slots.includes(slot.id)
                                    ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'
                                    : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20'
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
          </div>
        </div>

        <div className="space-y-6">
          {/* Kawalan Slot Penuh */}
          <div className="glass-panel p-8 rounded-[2rem] space-y-6 shadow-sm">
            <h3 className="font-black flex items-center gap-2 mb-4 text-white">
              <ShieldCheck size={18} className="text-cyan-400" />
              Kawalan Slot Penuh
            </h3>
            <div className="space-y-4">
              <div className="p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={16} className="text-cyan-400" />
                  <p className="text-xs font-black text-cyan-400 uppercase tracking-widest">Had Maksimum: 4 Job Sehari</p>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Sistem akan menyemak slot Team A, B, dan C secara automatik. Jika semua pasukan penuh pada slot tertentu, slot tersebut akan disorokkan dari pelanggan.
                </p>
              </div>
              
              <div className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-3">
                <p className="text-xs font-black flex items-center gap-2 text-white">
                  <Bot size={14} className="text-emerald-400" />
                  AI Agent Automation
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                    Cadangkan slot lain jika penuh
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                    Maklumkan pelanggan dengan mesej sopan
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                    Auto-assign team berdasarkan beban kerja
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="p-6 bg-indigo-500/10 border border-indigo-500/20 rounded-[2rem]">
            <h4 className="text-sm font-black text-indigo-400 mb-2">Nota Penting</h4>
            <ul className="text-xs text-indigo-300/80 space-y-2 list-disc pl-4 font-medium">
              <li>Slot utama yang dinyahaktifkan akan memberi kesan kepada semua pasukan.</li>
              <li>Setiap pasukan boleh mempunyai ketersediaan slot yang berbeza.</li>
              <li>Had kerja harian membantu AI menguruskan jadual dengan lebih efisien.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
