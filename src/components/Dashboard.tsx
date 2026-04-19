
import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2,
  Activity,
  Cpu,
  ListChecks,
  BarChart3,
  Network,
  Clock,
  Calendar,
  Users,
  ArrowRight,
  Zap,
  FileText,
  Receipt,
  DollarSign,
  AlertTriangle,
  Wallet,
  Users2,
  TrendingUp,
  Percent,
  Fuel,
  Repeat,
  Calculator,
  ShieldCheck,
  Store
} from 'lucide-react';
import { db, TABLES } from '../lib/db';
import { Booking } from '../types';
import { socket } from '../service/socket';
import { useNavigate } from 'react-router-dom';
import ProfitDashboard from './ProfitDashboard';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    monthlySales: 0,
    todayBookings: 0,
    knowledgeCount: 0,
    customersCount: 0,
    employeesCount: 0,
    totalInvoices: 0,
    totalQuotations: 0,
    paidAmount: 0,
    pendingAmount: 0,
    monthlyPayrollCost: 0,
    activeTeams: 0,
    grossSalary: 0,
    totalEpf: 0,
    totalSocso: 0,
    netPayable: 0,
    totalBelanjaBulanIni: 0,
    kekerapanIsiMinyak: 0,
    purataSekaliIsi: 0,
    inventoryCount: 0,
    lowStockCount: 0,
    totalInventoryValue: 0
  });
  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);
  const [adminName, setAdminName] = useState('Admin');
  const [adminImage, setAdminImage] = useState('');
  
  const [waStatus, setWaStatus] = useState<'online' | 'offline'>('offline');
  const [isSocketConnected, setIsSocketConnected] = useState(socket.connected);

  useEffect(() => {
    const loadData = () => {
      const dbStats = db.getStats();
      setStats({
        monthlySales: dbStats.monthlySales,
        todayBookings: dbStats.todayBookings,
        knowledgeCount: dbStats.knowledgeCount,
        customersCount: dbStats.customersCount,
        employeesCount: dbStats.employeesCount,
        totalInvoices: dbStats.totalInvoices,
        totalQuotations: dbStats.totalQuotations,
        paidAmount: dbStats.paidAmount,
        pendingAmount: dbStats.pendingAmount,
        monthlyPayrollCost: dbStats.monthlyPayrollCost,
        activeTeams: dbStats.activeTeams,
        grossSalary: dbStats.grossSalary,
        totalEpf: dbStats.totalEpf,
        totalSocso: dbStats.totalSocso,
        netPayable: dbStats.netPayable,
        totalBelanjaBulanIni: dbStats.totalBelanjaBulanIni,
        kekerapanIsiMinyak: dbStats.kekerapanIsiMinyak,
        purataSekaliIsi: dbStats.purataSekaliIsi,
        inventoryCount: dbStats.inventoryCount,
        lowStockCount: dbStats.lowStockCount,
        totalInventoryValue: dbStats.totalInventoryValue
      });
      const allBookings = db.getAll<Booking>(TABLES.BOOKINGS);
      setRecentBookings(allBookings.slice(-5).reverse());
      setAdminName(localStorage.getItem('mnf_admin_name') || 'Admin');
      setAdminImage(localStorage.getItem('mnf_admin_image') || '');
      setWaStatus(localStorage.getItem('wa_connected') === 'true' ? 'online' : 'offline');
    };
    
    loadData();

    window.addEventListener('booking-update', loadData);
    window.addEventListener('storage', loadData); 

    const interval = setInterval(loadData, 2000); 

    const onConnect = () => {
        setIsSocketConnected(true);
        socket.emit('cmd-status-check');
    };

    const onDisconnect = () => {
        setIsSocketConnected(false);
        setWaStatus('offline');
    };

    const handleWaStage = (stage: string) => {
        setWaStatus(stage === 'READY' ? 'online' : 'offline');
        localStorage.setItem('wa_connected', stage === 'READY' ? 'true' : 'false');
    };

    const handleAdminInfo = (info: any) => {
        if (info.name) setAdminName(info.name);
        if (info.image) setAdminImage(info.image);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('stage-update', handleWaStage);
    socket.on('admin-info', handleAdminInfo);

    setIsSocketConnected(socket.connected);

    return () => {
        clearInterval(interval);
        window.removeEventListener('booking-update', loadData);
        window.removeEventListener('storage', loadData);
        socket.off('connect', onConnect);
        socket.off('disconnect', onDisconnect);
        socket.off('stage-update', handleWaStage);
        socket.off('admin-info', handleAdminInfo);
    };
  }, []);

  const isSystemOnline = isSocketConnected && waStatus === 'online';

  return (
    <div className="space-y-4 animate-in fade-in duration-500 max-w-7xl mx-auto pb-8 p-2">
      
      {/* DASHBOARD UNTUNG */}
      <div className="mt-2 mb-8">
        <ProfitDashboard />
      </div>

      {/* 2. OPERATIONAL HIGHLIGHTS */}
      <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1 mt-4">Status Operasi Semasa</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <MiniStat 
            icon={<AlertTriangle size={16} />} 
            label="Pending / Overdue" 
            value={`RM ${stats.pendingAmount.toLocaleString()}`} 
            color="orange"
        />
        <MiniStat 
            icon={<Calendar size={16} />} 
            label="Booking Hari Ini" 
            value={`${stats.todayBookings} Slot`} 
            color="indigo"
        />
        <MiniStat 
            icon={<Users2 size={16} />} 
            label="Pekerja Aktif" 
            value={`${stats.employeesCount} Orang`} 
            color="cyan"
        />
        <MiniStat 
            icon={<Store size={16} />} 
            label="Stok Rendah" 
            value={`${stats.lowStockCount} Item`} 
            color="orange"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        
        {/* 5. QUICK ACTIONS & ACTIVITY (LEFT COLUMN) */}
        <div className="lg:col-span-2 space-y-4">
            {/* Live Telemetry (Compact Table) */}
            <div className="glass-panel rounded-2xl overflow-hidden flex flex-col">
                <div className="px-4 py-3 border-b border-white/5 flex justify-between items-center bg-white/5">
                    <h3 className="text-xs font-black text-white uppercase tracking-tight flex items-center gap-2">
                        <Activity size={14} className="text-primary"/> Aktiviti Terkini
                    </h3>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest bg-slate-950 border border-white/5 px-2 py-0.5 rounded">Live Feed</span>
                </div>
                <div className="divide-y divide-white/5 flex-1">
                    {recentBookings.length === 0 ? (
                        <div className="p-8 text-center text-slate-500 text-xs font-bold uppercase tracking-widest">Tiada rekod baru</div>
                    ) : (
                        recentBookings.map((job) => (
                            <div key={job.id} className="px-4 py-2.5 flex items-center justify-between hover:bg-white/[0.02] transition-colors cursor-default group">
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-sm shrink-0 ${job.status === 'Completed' ? 'bg-emerald-500' : 'bg-slate-800'}`}>
                                        {job.status === 'Completed' ? <CheckCircle2 size={14} /> : <Clock size={14} />}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-black text-white uppercase truncate max-w-[120px] md:max-w-[200px]">{job.customerName}</p>
                                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide truncate">{job.serviceType} • {job.quantity}</p>
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase bg-primary/10 text-primary border border-primary/20">
                                        Team {job.team}
                                    </span>
                                    <p className="text-[9px] text-slate-500 font-bold mt-0.5">{job.timeSlot}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
                <div className="px-4 py-2 bg-white/5 border-t border-white/5 text-center">
                    <button onClick={() => navigate('/bookings')} className="text-[9px] font-black uppercase text-slate-400 hover:text-primary flex items-center justify-center gap-1 transition-colors py-1">
                        Lihat Semua <ArrowRight size={10}/>
                    </button>
                </div>
            </div>
        </div>

        {/* 4. SYSTEM STATUS (RIGHT COLUMN) */}
        <div className="space-y-3">
            {/* System Connections */}
            <div className="flex items-center gap-2 z-10 w-full">
                <button 
                    onClick={() => navigate('/whatsapp')}
                    className={`flex-1 px-3 py-2 rounded-xl border flex items-center gap-2 transition-all hover:scale-105 active:scale-95 ${waStatus === 'online' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}
                >
                    <div className={`w-2 h-2 rounded-full shrink-0 ${waStatus === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
                    <div className="text-left min-w-0">
                        <p className="text-[8px] font-black uppercase tracking-widest opacity-60 leading-none mb-0.5 truncate">WhatsApp AI</p>
                        <p className="text-[10px] font-black leading-none uppercase truncate">
                            {waStatus === 'online' ? 'ONLINE' : 'OFFLINE'}
                        </p>
                    </div>
                </button>
                <div className={`flex-1 px-3 py-2 rounded-xl border flex items-center gap-2 ${isSystemOnline ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>
                    <Activity size={12} className="shrink-0" />
                    <div className="min-w-0">
                        <p className="text-[8px] font-black uppercase tracking-widest opacity-60 leading-none mb-0.5 truncate">System</p>
                        <p className="text-[10px] font-black leading-none uppercase truncate">{isSystemOnline ? 'CONNECTED' : 'OFFLINE'}</p>
                    </div>
                </div>
            </div>

            {/* Neural Core Card */}
            <div className="bg-slate-900 rounded-2xl p-4 text-white shadow-lg relative overflow-hidden h-36 flex flex-col justify-between group">
                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform"><Cpu size={60}/></div>
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 relative z-10">
                    <Cpu size={12} className="text-cyan-400"/> Neural Core Status
                </h3>
                
                <div className="grid grid-cols-2 gap-2 relative z-10">
                    <div className="bg-white/10 rounded-xl p-2 backdrop-blur-sm border border-white/5">
                        <p className="text-[9px] text-slate-300 font-bold uppercase">AI Health</p>
                        <p className="text-lg font-black text-emerald-400">{isSystemOnline ? '99%' : '0%'}</p>
                    </div>
                    <div className="bg-white/10 rounded-xl p-2 backdrop-blur-sm border border-white/5">
                        <p className="text-[9px] text-slate-300 font-bold uppercase">Sync Rate</p>
                        <p className="text-lg font-black text-cyan-400">{isSystemOnline ? '24ms' : '-'}</p>
                    </div>
                </div>
            </div>

            {/* Quick Checks */}
            <div className="glass-panel rounded-2xl p-4">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                    <ListChecks size={12} /> Semakan Pantas
                </h3>
                <div className="space-y-2">
                    <CompactCheck label="Database Kernel" ok={isSocketConnected} />
                    <CompactCheck label="WhatsApp Bridge" ok={waStatus === 'online'} />
                    <CompactCheck label="Auto-Reply AI" ok={isSystemOnline} />
                </div>
            </div>
            
            {/* Promo / Info */}
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-4 text-white shadow-md flex items-center justify-between">
                <div>
                    <p className="text-[9px] font-black uppercase opacity-70 mb-1">Status Langganan</p>
                    <p className="text-xs font-black uppercase tracking-wide">Enterprise v2.4</p>
                </div>
                <div className="bg-white/20 p-2 rounded-lg"><Zap size={16}/></div>
            </div>
        </div>

      </div>
    </div>
  );
};

// --- COMPACT COMPONENTS ---

const MiniStat: React.FC<{icon: any, label: string, value: string, color: 'cyan'|'indigo'|'emerald'|'orange'}> = ({icon, label, value, color}) => {
    const colors = {
        cyan: 'bg-secondary/10 text-secondary border-secondary/20',
        indigo: 'bg-primary/10 text-primary border-primary/20',
        emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        orange: 'bg-orange-500/10 text-orange-400 border-orange-500/20'
    };

    return (
        <div className={`p-3 rounded-xl border ${colors[color]} flex flex-col justify-between h-24 relative overflow-hidden group hover:shadow-[0_0_15px_rgba(0,188,212,0.6)] transition-all glass-panel cursor-default`}>
            <div className="absolute right-1 top-1 opacity-10 scale-150 group-hover:rotate-12 transition-transform text-white">{icon}</div>
            <div className="flex items-center gap-1.5 mb-1 relative z-10">
                <div className="p-1.5 bg-white/10 rounded-lg shadow-sm backdrop-blur-md border border-white/5">{icon}</div>
                <span className="text-[9px] font-black uppercase tracking-widest opacity-80 truncate">{label}</span>
            </div>
            <div className="relative z-10">
                <p className="text-lg font-black tracking-tight leading-none text-white">{value}</p>
            </div>
        </div>
    );
};

const CompactCheck: React.FC<{label: string, ok: boolean}> = ({label, ok}) => (
  <div className="flex items-center justify-between bg-white/5 p-2 rounded-lg border border-white/5">
    <span className="text-[9px] font-bold text-slate-400 uppercase">{label}</span>
    {ok ? <div className="text-[8px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded uppercase">OK</div> : <div className="text-[8px] font-black text-red-400 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded uppercase">FAIL</div>}
  </div>
);

export default Dashboard;
