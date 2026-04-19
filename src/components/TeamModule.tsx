import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Briefcase, 
  Calendar, 
  MapPin, 
  Plus, 
  MoreVertical, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Settings2,
  ShieldCheck,
  Zap,
  LayoutDashboard,
  UserPlus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Edit2,
  Save,
  X,
  CheckCircle2,
  Loader2,
  Bot,
  AlertTriangle,
  ChevronRight,
  Info,
  BarChart3,
  TrendingUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
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
  slots: number[];
  leader?: string;
  members?: number;
  status?: string;
  location?: string;
}

const TeamModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'teams' | 'config'>('overview');
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
      const slotsData = await db.getAll(TABLES.TIME_SLOTS) || [];
      const teamsData = await db.getAll(TABLES.TEAMS) || [];
      const mappingsData = await db.getAll(TABLES.AI_MAPPINGS) || [];

      if (slotsData.length === 0 && teamsData.length === 0) {
        await initializeDefaults();
        return;
      }

      setSlots(slotsData.map((s: any) => ({
        id: s.id,
        time: s.label || s.time || 'Unknown Slot',
        active: s.status === 'active' || s.active === true
      })));

      setTeams(teamsData.map((t: any) => ({
        id: t.id,
        name: t.name || 'Unknown Team',
        active: t.status === 'active' || t.active === true,
        maxJobs: t.max_jobs || t.maxJobs || 4,
        leader: t.leader || 'N/A',
        members: t.members || 2,
        status: t.status === 'active' ? 'Idle' : 'Inactive',
        location: t.location || 'HQ',
        slots: mappingsData
          .filter((m: any) => m.team_id === t.id && (m.status === 'active' || m.active === true))
          .map((m: any) => m.slot_id)
      })));
    } catch (error) {
      console.error("Error fetching data:", error);
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
      max_jobs: 4,
      leader: ['Zul Ariffin', 'Samsul Bahri', 'Lim Guan Eng', 'Ramasamy'][index % 4],
      members: 2 + (index % 2),
      location: 'HQ'
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

  const handleToggleTeam = async (id: number) => {
    const team = teams.find(t => t.id === id);
    if (!team) return;
    const newActive = !team.active;
    setTeams(teams.map(t => t.id === id ? { ...t, active: newActive } : t));
    await db.update(TABLES.TEAMS, id.toString(), { status: newActive ? 'active' : 'inactive' } as any);
  };

  const handleToggleTeamSlot = async (teamId: number, slotId: number) => {
    const team = teams.find(t => t.id === teamId);
    if (!team) return;
    const hasSlot = team.slots.includes(slotId);
    
    setTeams(teams.map(t => {
      if (t.id === teamId) {
        return {
          ...t,
          slots: hasSlot ? t.slots.filter(id => id !== slotId) : [...t.slots, slotId]
        };
      }
      return t;
    }));

    const mappingsData = await db.getAll(TABLES.AI_MAPPINGS) || [];
    const existingMapping = mappingsData.find((m: any) => m.team_id === teamId && m.slot_id === slotId) as any;

    if (existingMapping) {
      await db.update(TABLES.AI_MAPPINGS, existingMapping.id.toString(), { 
        status: hasSlot ? 'inactive' : 'active' 
      } as any);
    } else {
      await db.insert(TABLES.AI_MAPPINGS, {
        id: Date.now(),
        team_id: teamId,
        slot_id: slotId,
        status: 'active'
      });
    }
  };

  const handleToggleSlot = async (id: number) => {
    const slot = slots.find(s => s.id === id);
    if (!slot) return;
    const newActive = !slot.active;
    setSlots(slots.map(s => s.id === id ? { ...s, active: newActive } : s));
    await db.update(TABLES.TIME_SLOTS, id.toString(), { status: newActive ? 'active' : 'inactive' } as any);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-[#00BCD4]" />
          <p className="text-gray-500 font-bold uppercase tracking-widest text-xs animate-pulse">Memuatkan Data Pasukan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-b border-white/5 pb-8">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#00BCD4]/10 rounded-2xl border border-[#00BCD4]/20">
              <Users className="text-[#00BCD4]" size={28} />
            </div>
            <h1 className="text-4xl font-black text-white tracking-tighter uppercase">
              Konfigurasi <span className="text-[#00BCD4]">Pasukan</span>
            </h1>
          </div>
          <p className="text-gray-500 text-sm font-medium ml-1">Urus ahli pasukan, slot masa, dan ketersediaan operasi sistem MNF.</p>
        </div>

        <div className="flex items-center gap-1 bg-[#1A1A1A] p-1.5 rounded-2xl border border-white/5 shadow-2xl">
          {[
            { id: 'overview', label: 'Ringkasan', icon: LayoutDashboard },
            { id: 'teams', label: 'Pasukan', icon: Users },
            { id: 'config', label: 'Konfigurasi', icon: Settings2 },
          ].map((tab) => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2 relative overflow-hidden group ${
                activeTab === tab.id 
                  ? 'bg-[#00BCD4] text-white shadow-lg shadow-[#00BCD4]/20' 
                  : 'text-gray-500 hover:text-white hover:bg-white/5'
              }`}
            >
              <tab.icon size={14} className={activeTab === tab.id ? 'animate-pulse' : ''} />
              {tab.label}
              {activeTab === tab.id && (
                <motion.div 
                  layoutId="activeTab"
                  className="absolute inset-0 bg-white/10"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Stats */}
              <div className="lg:col-span-2 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="card-glow bg-gradient-to-br from-[#00BCD4]/10 via-transparent to-transparent p-8 group">
                    <div className="flex justify-between items-start mb-6">
                      <div className="p-4 bg-[#1A1A1A] border border-white/10 rounded-2xl text-[#00BCD4] group-hover:scale-110 transition-transform duration-500">
                        <Users size={32} />
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] font-black text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-full uppercase tracking-widest border border-emerald-400/20">Aktif</span>
                        <p className="text-[9px] text-gray-500 font-bold uppercase mt-1 tracking-tighter">Kemas kini: 2m lalu</p>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-5xl font-black text-white tracking-tighter">{teams.filter(t => t.active).length}</h3>
                      <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Pasukan Beroperasi</p>
                    </div>
                  </div>

                  <div className="card-glow bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent p-8 group">
                    <div className="flex justify-between items-start mb-6">
                      <div className="p-4 bg-[#1A1A1A] border border-white/10 rounded-2xl text-emerald-400 group-hover:scale-110 transition-transform duration-500">
                        <Zap size={32} />
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] font-black text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-full uppercase tracking-widest border border-emerald-400/20">Optimum</span>
                        <p className="text-[9px] text-gray-500 font-bold uppercase mt-1 tracking-tighter">Sasaran: 95%</p>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-5xl font-black text-white tracking-tighter">92%</h3>
                      <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Kesihatan Operasi</p>
                    </div>
                  </div>
                </div>

                {/* Workload Chart */}
                <div className="card-glow p-8">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-lg font-black text-white flex items-center gap-3 uppercase tracking-tighter">
                      <BarChart3 className="text-[#00BCD4]" size={20} /> Beban Kerja Pasukan
                    </h3>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-[#00BCD4]" />
                        <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Kapasiti</span>
                      </div>
                    </div>
                  </div>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={teams.map(t => ({ name: t.name, jobs: t.active ? Math.floor(Math.random() * 4) + 1 : 0 }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                        <XAxis 
                          dataKey="name" 
                          stroke="#666" 
                          fontSize={10} 
                          tickLine={false} 
                          axisLine={false}
                          tick={{ fontWeight: 'bold' }}
                        />
                        <YAxis 
                          stroke="#666" 
                          fontSize={10} 
                          tickLine={false} 
                          axisLine={false}
                          tick={{ fontWeight: 'bold' }}
                        />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #333', borderRadius: '12px' }}
                          itemStyle={{ color: '#00BCD4', fontWeight: 'bold', fontSize: '12px' }}
                        />
                        <Bar dataKey="jobs" radius={[6, 6, 0, 0]}>
                          {teams.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#00BCD4' : '#00838F'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Schedule Table */}
                <div className="card-glow p-0 overflow-hidden">
                  <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                    <h3 className="text-lg font-black text-white flex items-center gap-3 uppercase tracking-tighter">
                      <Clock className="text-[#00BCD4]" size={20} /> Jadual Operasi Hari Ini
                    </h3>
                    <button className="text-[10px] font-black text-[#00BCD4] uppercase tracking-widest hover:underline flex items-center gap-1">
                      Lihat Semua <ChevronRight size={12} />
                    </button>
                  </div>
                  <div className="divide-y divide-white/5">
                    {[
                      { time: '09:00 AM', task: 'Servis Aircond - Pejabat Mara', team: 'Team Alpha', status: 'Completed', color: 'emerald' },
                      { time: '11:30 AM', task: 'Wiring Check - Rumah Teres', team: 'Team Charlie', status: 'In Progress', color: 'blue' },
                      { time: '02:00 PM', task: 'Installation - Kondominium', team: 'Team Alpha', status: 'Pending', color: 'gray' },
                      { time: '04:30 PM', task: 'Maintenance - Kilang B', team: 'Team Bravo', status: 'Pending', color: 'gray' },
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center gap-6 p-6 hover:bg-white/[0.02] transition-all group">
                        <div className="w-24 text-xs font-black text-gray-400 group-hover:text-white transition-colors">{item.time}</div>
                        <div className="flex-1">
                          <h4 className="text-sm font-bold text-white group-hover:text-[#00BCD4] transition-colors">{item.task}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="w-1 h-1 rounded-full bg-gray-600" />
                            <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">{item.team}</p>
                          </div>
                        </div>
                        <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                          item.color === 'emerald' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                          item.color === 'blue' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 
                          'bg-gray-500/10 text-gray-500 border-white/10'
                        }`}>
                          {item.status}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sidebar Info */}
              <div className="space-y-8">
                <div className="card-glow p-8 bg-gradient-to-b from-white/[0.02] to-transparent">
                  <h3 className="text-lg font-black text-white mb-6 flex items-center gap-3 uppercase tracking-tighter">
                    <AlertCircle className="text-[#D32F2F]" size={20} /> Isu & Amaran
                  </h3>
                  <div className="space-y-4">
                    <div className="p-5 bg-red-500/5 border border-red-500/10 rounded-2xl relative overflow-hidden group">
                      <div className="absolute top-0 left-0 w-1 h-full bg-red-500/50" />
                      <p className="text-xs font-black text-red-400 mb-1 uppercase tracking-widest">Team Delta - Lewat</p>
                      <p className="text-[10px] text-gray-500 leading-relaxed font-medium">Kesesakan lalu lintas di Lebuhraya Pasir Gudang. Jangkaan lewat 15 minit.</p>
                    </div>
                    <div className="p-5 bg-yellow-500/5 border border-yellow-500/10 rounded-2xl relative overflow-hidden group">
                      <div className="absolute top-0 left-0 w-1 h-full bg-yellow-500/50" />
                      <p className="text-xs font-black text-yellow-400 mb-1 uppercase tracking-widest">Pemeriksaan Peralatan</p>
                      <p className="text-[10px] text-gray-500 leading-relaxed font-medium">Team Bravo memerlukan set tolok manifold baharu untuk tugasan petang.</p>
                    </div>
                  </div>
                </div>

                <div className="p-8 bg-gradient-to-br from-[#00BCD4]/20 to-[#00BCD4]/5 border border-[#00BCD4]/20 rounded-[2.5rem] relative overflow-hidden group shadow-2xl shadow-[#00BCD4]/10">
                  <div className="absolute -right-8 -bottom-8 text-[#00BCD4]/10 group-hover:scale-110 group-hover:-rotate-12 transition-all duration-1000">
                    <Bot size={160} />
                  </div>
                  <div className="relative z-10 space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-[#00BCD4] animate-ping" />
                      <h3 className="text-lg font-black text-[#00BCD4] uppercase tracking-tighter">AI Agent Aktif</h3>
                    </div>
                    <p className="text-xs text-gray-400 leading-relaxed font-medium">Sistem AI sedang memantau beban kerja pasukan dan akan mencadangkan pengagihan tugas secara automatik berdasarkan lokasi dan kepakaran.</p>
                    <button className="text-[10px] font-black text-white bg-[#00BCD4] px-4 py-2 rounded-xl uppercase tracking-widest hover:bg-[#00BCD4]/80 transition-all">
                      Lihat Cadangan
                    </button>
                  </div>
                </div>

                <div className="card-glow p-6 border-dashed border-white/10 bg-transparent">
                  <div className="flex items-center gap-3 text-gray-500">
                    <Info size={18} />
                    <p className="text-[10px] font-bold uppercase tracking-widest leading-tight">Gunakan tab 'Konfigurasi' untuk melaras slot masa operasi.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'teams' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {teams.map((team) => (
                <motion.div 
                  layout
                  key={team.id} 
                  className={`card-glow group p-8 border-2 transition-all duration-500 ${team.active ? 'border-white/5 hover:border-[#00BCD4]/40' : 'border-white/5 opacity-60 grayscale'}`}
                >
                  <div className="flex justify-between items-start mb-8">
                    <div className={`w-16 h-16 rounded-2xl border flex items-center justify-center transition-all duration-500 ${team.active ? 'bg-[#1A1A1A] border-[#00BCD4]/30 text-[#00BCD4] shadow-lg shadow-[#00BCD4]/10' : 'bg-gray-900 border-white/5 text-gray-600'}`}>
                      <Users size={32} />
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleToggleTeam(team.id)} 
                        className={`p-3 rounded-2xl transition-all duration-300 ${team.active ? 'text-emerald-400 bg-emerald-400/10 hover:bg-emerald-400/20' : 'text-gray-600 bg-gray-900 hover:bg-gray-800'}`}
                      >
                        {team.active ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                      </button>
                      <button className="p-3 text-gray-600 hover:text-white bg-gray-900 rounded-2xl hover:bg-gray-800 transition-all">
                        <MoreVertical size={20} />
                      </button>
                    </div>
                  </div>

                  <div className="mb-8">
                    <h3 className="text-2xl font-black text-white tracking-tight group-hover:text-[#00BCD4] transition-colors uppercase">{team.name}</h3>
                    <div className="flex items-center gap-2 mt-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${team.active ? 'bg-emerald-400 animate-pulse' : 'bg-gray-600'}`} />
                      <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Ketua: {team.leader}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="p-4 bg-white/[0.03] rounded-2xl border border-white/5 group-hover:bg-white/[0.05] transition-all">
                      <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Status</p>
                      <p className={`text-xs font-black uppercase ${team.active ? 'text-emerald-400' : 'text-gray-600'}`}>{team.active ? 'Aktif' : 'Tidak Aktif'}</p>
                    </div>
                    <div className="p-4 bg-white/[0.03] rounded-2xl border border-white/5 group-hover:bg-white/[0.05] transition-all">
                      <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Ahli</p>
                      <p className="text-xs font-black text-white uppercase">{team.members} Orang</p>
                    </div>
                  </div>

                  <div className="space-y-3 mb-8">
                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                      <span className="text-gray-500">Beban Kerja</span>
                      <span className="text-white">{team.maxJobs} Jobs/Day</span>
                    </div>
                    <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden p-0.5">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: team.active ? '75%' : '0%' }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="bg-gradient-to-r from-[#00BCD4] to-[#00BCD4]/60 h-full rounded-full" 
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-6 border-t border-white/5">
                    <div className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-widest">
                      <MapPin size={14} className="text-[#D32F2F]" />
                      {team.location}
                    </div>
                    <button className="text-[10px] font-black text-[#00BCD4] uppercase tracking-widest hover:underline flex items-center gap-1">
                      Detail <ChevronRight size={12} />
                    </button>
                  </div>
                </motion.div>
              ))}
              
              <button className="card-glow border-dashed border-2 border-white/10 flex flex-col items-center justify-center gap-6 p-10 group hover:border-[#00BCD4]/50 hover:bg-[#00BCD4]/5 transition-all duration-500">
                <div className="w-20 h-20 rounded-full bg-[#1A1A1A] border border-white/10 flex items-center justify-center text-gray-500 group-hover:text-[#00BCD4] group-hover:scale-110 group-hover:rotate-12 transition-all duration-500 shadow-xl">
                  <UserPlus size={40} />
                </div>
                <div className="text-center">
                  <p className="text-lg font-black text-white uppercase tracking-widest">Tambah Pasukan</p>
                  <p className="text-xs text-gray-500 mt-2 font-bold max-w-[200px]">Wujudkan unit operasi baharu untuk MNF Engineering</p>
                </div>
              </button>
            </div>
          )}

          {activeTab === 'config' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                {/* Time Slots Section */}
                <div className="card-glow p-8">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-10 gap-4">
                    <div className="space-y-1">
                      <h3 className="text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                        <Clock className="text-[#00BCD4]" size={28} />
                        Slot Masa Operasi
                      </h3>
                      <p className="text-xs text-gray-500 font-medium">Tentukan slot masa yang tersedia untuk tempahan servis.</p>
                    </div>
                    <button className="bg-[#00BCD4] hover:bg-[#00BCD4]/80 text-white py-3 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#00BCD4]/20 active:scale-95">
                      <Plus size={16} /> Tambah Slot
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                    {slots.map((slot) => (
                      <motion.div 
                        layout
                        key={slot.id} 
                        className={`flex items-center gap-5 p-5 bg-white/[0.02] border rounded-[2rem] group transition-all duration-500 ${slot.active ? 'border-white/5 hover:border-[#00BCD4]/30' : 'border-white/5 opacity-50'}`}
                      >
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 ${slot.active ? 'bg-[#00BCD4]/10 text-[#00BCD4]' : 'bg-gray-900 text-gray-600'}`}>
                          <Clock size={20} />
                        </div>
                        <div className="flex-1">
                          <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Label Slot</p>
                          <input 
                            type="text" 
                            value={slot.time} 
                            readOnly
                            className="bg-transparent border-none p-0 text-sm font-black text-white focus:ring-0 outline-none w-full cursor-default"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => handleToggleSlot(slot.id)}
                            className={`p-2.5 rounded-xl transition-all duration-300 ${slot.active ? 'text-emerald-400 bg-emerald-400/10 hover:bg-emerald-400/20' : 'text-gray-600 bg-gray-900 hover:bg-gray-800'}`}
                          >
                            {slot.active ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                          </button>
                          <button className="p-2.5 text-red-400/30 hover:text-red-400 bg-red-400/5 hover:bg-red-400/10 rounded-xl transition-all duration-300">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Team Mapping Section */}
                  <div className="space-y-10">
                    <div className="space-y-1">
                      <h3 className="text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                        <ShieldCheck className="text-emerald-400" size={28} />
                        Pemetaan Pasukan
                      </h3>
                      <p className="text-xs text-gray-500 font-medium">Tetapkan slot masa aktif bagi setiap pasukan operasi.</p>
                    </div>
                    
                    <div className="space-y-8">
                      {teams.map(team => (
                        <div key={team.id} className={`p-8 bg-white/[0.02] border rounded-[2.5rem] transition-all duration-500 ${team.active ? 'border-white/5' : 'border-white/5 opacity-40 grayscale pointer-events-none'}`}>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-[#1A1A1A] border border-white/5 flex items-center justify-center text-[#00BCD4]">
                                <Users size={20} />
                              </div>
                              <h4 className="text-lg font-black text-white uppercase tracking-widest">{team.name}</h4>
                            </div>
                            <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/5">
                              <div className="w-2 h-2 rounded-full bg-[#00BCD4]" />
                              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{team.slots.length} Slot Aktif</span>
                            </div>
                          </div>
                          
                          <div className="flex flex-wrap gap-3">
                            {slots.map(slot => (
                              <button
                                key={slot.id}
                                disabled={!slot.active}
                                onClick={() => handleToggleTeamSlot(team.id, slot.id)}
                                className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all duration-300 relative overflow-hidden group ${
                                  !slot.active 
                                    ? 'bg-gray-900 border-white/5 text-gray-700 cursor-not-allowed'
                                    : team.slots.includes(slot.id)
                                      ? 'bg-[#00BCD4] border-[#00BCD4] text-white shadow-lg shadow-[#00BCD4]/20'
                                      : 'bg-white/5 border-white/10 text-gray-500 hover:border-[#00BCD4]/30 hover:text-white'
                                }`}
                              >
                                {slot.time}
                                {slot.active && team.slots.includes(slot.id) && (
                                  <motion.div 
                                    layoutId={`activeSlot-${team.id}-${slot.id}`}
                                    className="absolute inset-0 bg-white/10"
                                  />
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Config Sidebar */}
              <div className="space-y-8">
                <div className="card-glow p-8 bg-gradient-to-b from-white/[0.02] to-transparent">
                  <h3 className="text-lg font-black text-white mb-8 flex items-center gap-3 uppercase tracking-tighter">
                    <AlertTriangle className="text-yellow-400" size={20} /> Peraturan AI
                  </h3>
                  <div className="space-y-6">
                    <div className="p-6 bg-white/[0.03] border border-white/5 rounded-[2rem] relative group hover:border-yellow-400/20 transition-all">
                      <div className="absolute top-6 right-6 text-yellow-400/20 group-hover:text-yellow-400/40 transition-colors">
                        <ShieldCheck size={24} />
                      </div>
                      <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Had Maksimum</p>
                      <p className="text-xs text-white leading-relaxed font-medium">Sistem tidak akan membenarkan tempahan jika semua pasukan telah mencapai had kerja harian (Daily Job Limit).</p>
                    </div>
                    <div className="p-6 bg-white/[0.03] border border-white/5 rounded-[2rem] relative group hover:border-[#00BCD4]/20 transition-all">
                      <div className="absolute top-6 right-6 text-[#00BCD4]/20 group-hover:text-[#00BCD4]/40 transition-colors">
                        <Zap size={24} />
                      </div>
                      <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Auto-Assign</p>
                      <p className="text-xs text-white leading-relaxed font-medium">AI akan memilih pasukan yang mempunyai beban kerja paling rendah dan lokasi terdekat untuk tugasan baharu.</p>
                    </div>
                  </div>
                </div>

                <div className="p-10 bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border border-emerald-500/20 rounded-[3rem] shadow-2xl shadow-emerald-500/5">
                  <div className="w-14 h-14 bg-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400 mb-6">
                    <Info size={28} />
                  </div>
                  <h4 className="text-lg font-black text-emerald-400 mb-4 uppercase tracking-widest">Tips Konfigurasi</h4>
                  <ul className="space-y-5">
                    {[
                      'Nyahaktifkan slot utama untuk menutup tempahan bagi semua pasukan secara serentak.',
                      'Pasukan yang tidak aktif tidak akan disenaraikan dalam cadangan pengagihan AI.',
                      'Pastikan setiap pasukan mempunyai sekurang-kurangnya 2 slot masa aktif.'
                    ].map((tip, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 shrink-0 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                        <p className="text-xs text-emerald-100/70 leading-relaxed font-bold">{tip}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default TeamModule;
