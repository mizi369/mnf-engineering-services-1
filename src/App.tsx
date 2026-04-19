
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  FileText, 
  Settings as SettingsIcon, 
  MessageSquare,
  LogOut,
  Menu,
  X,
  Fuel,
  Package,
  BrainCircuit,
  Tag,
  Megaphone,
  Bot,
  Wifi,
  WifiOff,
  ChevronLeft,
  ChevronRight,
  Clock,
  Activity,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Info,
  Wrench,
  Wallet,
  ShoppingCart,
  Image as ImageIcon,
  MapPin,
  Briefcase,
  DollarSign,
  Store
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Dashboard from './components/Dashboard';
import BookingManager from './components/BookingManager';
import WhatsAppMonitor from './components/WhatsAppMonitor';
import AiAgentManager from './components/AiAgentManager'; 
import PromotionManager from './components/PromotionManager';
import InvoiceQuotationManager from './components/InvoiceQuotationManager';
import Settings from './components/Settings';
import TeamModule from './components/TeamModule';
import Login from './components/Login';
import Catalog from './components/Catalog';
import CustomerManager from './components/CustomerManager';
import Employees from './components/Employees';
import FuelExpenses from './components/FuelExpenses';
import Inventory from './components/Inventory';
import Maintenance from './components/Maintenance';
import TimeSlotManagement from './components/TimeSlotManagement';
import DebitCredit from './components/DebitCredit';
import Payroll from './components/Payroll';
import Sales from './components/Sales';
import { db, TABLES } from './lib/db';
import { socket } from './service/socket';
import { Booking } from './types';

interface SidebarLinkProps {
  icon: React.ReactNode;
  label: string;
  to: string;
  collapsed: boolean;
  badge?: string;
  onClick?: () => void;
}

const SidebarLink: React.FC<SidebarLinkProps> = ({ icon, label, to, collapsed, badge, onClick }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  const activeClass = isActive 
    ? 'bg-primary/10 text-primary border-r-4 border-primary shadow-[inset_0_0_20px_rgba(211,47,47,0.15)]' 
    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-100 hover:border-r-4 hover:border-slate-700';

  return (
    <Link to={to} onClick={onClick} className={`relative flex items-center gap-3 px-6 py-3 transition-all duration-300 ${activeClass}`}>
      <div className={`shrink-0 ${isActive ? 'scale-110 text-primary' : 'text-slate-500'}`}>{icon}</div>
      {!collapsed && (
        <div className="flex-1 flex items-center justify-between overflow-hidden">
          <span className={`text-xs tracking-tight truncate ${isActive ? 'font-black uppercase' : 'font-semibold'}`}>{label}</span>
          {badge && <span className="bg-primary text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full animate-pulse">{badge}</span>}
        </div>
      )}
    </Link>
  );
};

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => localStorage.getItem('mnf_auth') === 'true');
  const [role, setRole] = useState<string>(() => localStorage.getItem('mnf_role') || 'admin');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); 
  const [isBotActive, setIsBotActive] = useState(false);
  const [waStatus, setWaStatus] = useState<string>('OFFLINE');
  const [isSocketConnected, setIsSocketConnected] = useState(socket.connected);
  const [isAiAutoReply, setIsAiAutoReply] = useState(true);
  const [adminName, setAdminName] = useState(() => localStorage.getItem('mnf_admin_name') || 'Admin MNF');
  const [adminImage, setAdminImage] = useState(() => localStorage.getItem('mnf_admin_image') || '');
  const [coLogo, setCoLogo] = useState(() => localStorage.getItem('mnf_co_logo') || '');
  const [coName, setCoName] = useState(() => localStorage.getItem('mnf_co_name') || 'MNF HUB');
  const [sysTime, setSysTime] = useState(new Date().toLocaleTimeString());
  const [isLoading, setIsLoading] = useState(true);
  const [toasts, setToasts] = useState<{ id: number; msg: string; type: 'success' | 'error' | 'info' }[]>([]);

  const handleLogin = () => {
      setIsAuthenticated(true);
      setRole(localStorage.getItem('mnf_role') || 'admin');
      localStorage.setItem('mnf_auth', 'true');
  };

  const handleLogout = () => {
      setIsAuthenticated(false);
      localStorage.removeItem('mnf_auth');
      localStorage.removeItem('mnf_role');
  };

  const handleNavClick = () => {
      if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  // --- NEW: FUNCTION TO CALCULATE LIVE SLOTS (UPDATED LOGIC) ---
  const syncLiveSlotsToAi = async () => {
      try {
          const getAvailabilityForDate = async (dateStr: string) => {
              const bookings = await db.getAll<Booking>(TABLES.BOOKINGS);
              const dateBookings = bookings.filter(b => b.date === dateStr);
              
              const teamsRaw = localStorage.getItem('mnf_teams');
              const teams = teamsRaw ? JSON.parse(teamsRaw) : [];
              const activeTeams = teams.filter((t: any) => t.active);
              
              const slotsRaw = localStorage.getItem('mnf_time_slots');
              const slots = slotsRaw ? JSON.parse(slotsRaw) : [];
              const blockedSlots = await db.getAll<any>(TABLES.BLOCKED_SLOTS);
              const dateBlockedSlots = blockedSlots.filter((b: any) => b.date === dateStr);

              return slots.filter((s: any) => s.active).map((s: any) => {
                  const isBlocked = dateBlockedSlots.some((b: any) => b.timeSlot === s.time);
                  if (isBlocked) return { time: s.time, id: s.id, status: 'BLOCKED', label: '⛔ BLOCKED (ADMIN TUTUP)' };

                  const slotBookings = dateBookings.filter(b => b.timeSlot === s.time);
                  let availableTeamsList: any[] = [];
                  let availableAircondTeamsCount = 0;
                  
                  activeTeams.forEach((team: any) => {
                      const teamIdStr = team.id.toString();
                      const teamBookings = bookings.filter(b => (b.date === dateStr) && (b.team === teamIdStr || b.team === team.name || b.teamId?.toString() === teamIdStr));
                      const teamDailyCount = teamBookings.length;
                      const teamAircondCount = teamBookings.filter(b => b.serviceType && b.serviceType.toLowerCase().includes('pasang')).length;
                      const teamHasSlotBooking = slotBookings.some(b => b.team === teamIdStr || b.team === team.name || b.teamId?.toString() === teamIdStr);
                      
                      const isSlotAllowed = !team.slots || team.slots.length === 0 || team.slots.includes(s.id);

                      if (isSlotAllowed && teamDailyCount < (team.maxJobs || team.maxJobsPerDay || 4) && !teamHasSlotBooking) {
                          availableTeamsList.push({ name: team.name, id: team.id });
                          if (teamAircondCount < (team.maxAircondJobs || 2)) {
                              availableAircondTeamsCount++;
                          }
                      }
                  });

                  const availableTeamsCount = availableTeamsList.length;
                  if (availableTeamsCount === 0) return { time: s.time, id: s.id, status: 'FULL', label: '⛔ PENUH' };
                  
                  const teamsStr = availableTeamsList.map(t => `${t.name} [ID:${t.id}]`).join(', ');
                  const aircondStatus = availableAircondTeamsCount > 0 ? 'BOLEH' : 'PENUH';
                  
                  if (availableTeamsCount === 1) {
                      return { time: s.time, id: s.id, status: 'LIMITED', label: `⚠️ TERHAD (1 KEKOSONGAN: ${teamsStr}) | Pasang Aircond: ${aircondStatus}` };
                  }
                  return { time: s.time, id: s.id, status: 'AVAILABLE', label: `✅ KOSONG (${availableTeamsCount} TEAM: ${teamsStr}) | Pasang Aircond: ${aircondStatus}` };
              });
          };

          const today = new Date().toISOString().split('T')[0];
          const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
          
          const todayStatus = await getAvailabilityForDate(today);
          const tomorrowStatus = await getAvailabilityForDate(tomorrow);

          const todayStr = `TARIKH HARI INI (${today}):\n${todayStatus.map((s: any) => `${s.time} [SlotID:${s.id}]: ${s.label}`).join('\n')}`;
          const tomorrowStr = `TARIKH ESOK (${tomorrow}):\n${tomorrowStatus.map((s: any) => `${s.time} [SlotID:${s.id}]: ${s.label}`).join('\n')}`;
          
          const currentTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
          
          socket.emit('cmd-update-ai-context', {
              slotAvailability: `${todayStr}\n\n${tomorrowStr}`,
              systemTime: currentTime
          });

      } catch (e) {
          console.error("Error syncing slots:", e);
      }
  };

  useEffect(() => {
    // STARTUP SYNC
    const initSystem = async () => {
        setIsLoading(true);
        await db.init(); // Fetch data from Supabase
        setIsLoading(false);
        checkStatus();
        await syncLiveSlotsToAi();

        // Fetch Admin Info from Backend
        fetch('/api/admin')
          .then(res => res.json())
          .then(info => {
            if (info && info.name) {
              localStorage.setItem('mnf_admin_name', info.name);
              setAdminName(info.name);
              if (info.image) {
                localStorage.setItem('mnf_admin_image', info.image);
                setAdminImage(info.image);
              }
              if (info.phone) {
                localStorage.setItem('mnf_admin_phone', info.phone);
              }
              window.dispatchEvent(new Event('storage'));
              window.dispatchEvent(new Event('admin-info-updated'));
            }
          })
          .catch(err => console.error('Failed to fetch admin info:', err));
    };
    initSystem();
    
    // Auto collapse on small screens
    const handleResize = () => {
        if (window.innerWidth < 768) setIsSidebarOpen(false);
        else setIsSidebarOpen(true);
    };
    window.addEventListener('resize', handleResize);
    handleResize(); 

    const checkStatus = () => {
      setIsBotActive(localStorage.getItem('wa_connected') === 'true');
      setAdminName(localStorage.getItem('mnf_admin_name') || 'Admin MNF');
      setAdminImage(localStorage.getItem('mnf_admin_image') || '');
      setCoLogo(localStorage.getItem('mnf_co_logo') || '');
      setCoName(localStorage.getItem('mnf_co_name') || 'MNF HUB');
    };

    const interval = setInterval(() => {
        checkStatus();
        setSysTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 1000);

    const aiSyncInterval = setInterval(() => {
        void syncLiveSlotsToAi();
    }, 60000); // Sync every minute to keep server time fresh

    const handleStorageChange = () => {
        checkStatus();
        void syncLiveSlotsToAi();
    };
    
    const handleBookingUpdate = () => {
        void syncLiveSlotsToAi();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('booking-update', handleBookingUpdate);

    const handleStageUpdate = (stage: string) => {
        setWaStatus(stage);
        const isReady = stage === 'READY';
        localStorage.setItem('wa_connected', isReady ? 'true' : 'false');
        setIsBotActive(isReady);
        window.dispatchEvent(new Event('storage'));
    };
    
    const handleAiConfig = (status: boolean) => {
        setIsAiAutoReply(status);
    };

    const handleAdminInfo = (info: any) => {
        if (info.name !== undefined) {
            localStorage.setItem('mnf_admin_name', info.name);
            setAdminName(info.name);
        }
        if (info.image !== undefined) {
            localStorage.setItem('mnf_admin_image', info.image);
            setAdminImage(info.image);
        }
        if (info.phone !== undefined) {
            localStorage.setItem('mnf_admin_phone', info.phone);
        }
        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(new Event('admin-info-updated'));
    };

    const handleAutoBooking = async (data: any) => {
        console.log("🔔 AI Booking Event Received:", data);
        
        // Prepare a proper Booking object
        const newId = data.id || `BK-${Date.now()}`;
        
        // Ensure date is in YYYY-MM-DD
        let bookingDate = data.date || data.booking_date || new Date().toISOString().split('T')[0];
        if (bookingDate.includes('T')) {
            bookingDate = bookingDate.split('T')[0];
        } else if (bookingDate.includes('/')) {
            const parts = bookingDate.split('/');
            if (parts.length === 3) {
                // Assume DD/MM/YYYY or MM/DD/YYYY - let's try to be safe
                if (parseInt(parts[0]) > 12) bookingDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
                else bookingDate = `${parts[2]}-${parts[0]}-${parts[1]}`;
            }
        }

        // Determine Team Name and ID
        let teamName = data.team || 'Team A';
        let teamId = data.team_id || '';

        // If we have team_id but no name, or vice versa, try to sync them
        const teamsRaw = localStorage.getItem('mnf_teams');
        if (teamsRaw) {
            const teams = JSON.parse(teamsRaw);
            if (teamId) {
                const found = teams.find((t: any) => t.id.toString() === teamId.toString());
                if (found) teamName = found.name;
            } else if (teamName) {
                const found = teams.find((t: any) => t.name.toLowerCase() === teamName.toLowerCase() || t.id.toString() === teamName.toUpperCase());
                if (found) {
                    teamName = found.name;
                    teamId = found.id;
                }
            }
        }

        // Fallback for teamName if still generic
        if (!teamId && teamName) {
            const raw = teamName.toString().toUpperCase();
            if (raw.includes('TEAM B') || raw.includes(' B ') || raw === 'B') teamName = 'Team B';
            else if (raw.includes('TEAM C') || raw.includes(' C ') || raw === 'C') teamName = 'Team C';
            else if (raw.includes('TEAM A') || raw.includes(' A ') || raw === 'A') teamName = 'Team A';
        }

        const newBooking: Booking = {
            id: newId,
            date: bookingDate,
            customerName: data.name || data.customer_name || data.customerName || 'Pelanggan WhatsApp',
            address: data.address || 'Alamat tidak dinyatakan',
            phone: data.phone || '0123456789',
            serviceType: data.service || data.service_type || data.serviceType || 'Servis Aircond',
            unitType: data.unit || data.unit_type || data.unitType || '1.0 HP',
            quantity: data.quantity || data.unit || '1',
            timeSlot: data.time || data.time_slot || data.timeSlot || '9:00 AM – 11:00 AM',
            team: teamName,
            teamId: teamId || undefined,
            status: 'Confirmed'
        };

        console.log("📦 Prepared New Booking Object:", newBooking);

        // Add to local storage for immediate UI update
        try {
            const bookingsRaw = localStorage.getItem(TABLES.BOOKINGS);
            const currentBookings: Booking[] = bookingsRaw ? JSON.parse(bookingsRaw) : [];
            
            // Simple duplicate check: same phone, same date, same time
            const isDuplicate = currentBookings.some(b => 
                (b.id === newBooking.id) || 
                (b.phone === newBooking.phone && b.date === newBooking.date && b.timeSlot === newBooking.timeSlot)
            );
            
            if (!isDuplicate) {
                currentBookings.push(newBooking);
                localStorage.setItem(TABLES.BOOKINGS, JSON.stringify(currentBookings));
                console.log("✅ Booking added to Local Storage");
                
                // Show notification to user
                showToast(`Tempahan Baru: ${newBooking.customerName} pada ${newBooking.date} (${newBooking.timeSlot})`, 'success');
                
                // Trigger UI refresh
                window.dispatchEvent(new CustomEvent('booking-update'));
                window.dispatchEvent(new Event('storage'));
                
                // Update AI context with new availability
                void syncLiveSlotsToAi();

                // Sync customer data automatically
                await db.syncCustomer({
                    name: newBooking.customerName,
                    phone: newBooking.phone,
                    address: newBooking.address
                });
            } else {
                console.warn("⚠️ Tempahan berganda dikesan, melangkau penambahan setempat.");
                // Optionally show a silent info toast if it's a real duplicate
                // showToast(`Tempahan untuk ${newBooking.customerName} sudah wujud.`, 'info');
            }
        } catch (err) {
            console.error("❌ Error adding auto-booking to local storage:", err);
        }
    };

    const onConnect = () => {
        setIsSocketConnected(true);
        socket.emit('cmd-status-check');
        // ... (existing socket context sync) ...
        const instructions = localStorage.getItem('mnf_ai_system_instructions');
        const socialFb = localStorage.getItem('mnf_social_fb');
        const socialTt = localStorage.getItem('mnf_social_tt');
        // ...
        void syncLiveSlotsToAi();
    };

    const onDisconnect = () => {
        setIsSocketConnected(false);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('stage-update', handleStageUpdate);
    socket.on('ai-config-update', handleAiConfig);
    socket.on('admin-info', handleAdminInfo); 
    socket.on('ai-booking-confirmed', handleAutoBooking);

    return () => {
        clearInterval(interval);
        clearInterval(aiSyncInterval);
        window.removeEventListener('storage', handleStorageChange);
        window.removeEventListener('booking-update', handleBookingUpdate);
        window.removeEventListener('resize', handleResize);
        socket.off('connect', onConnect);
        socket.off('disconnect', onDisconnect);
        socket.off('stage-update', handleStageUpdate);
        socket.off('ai-config-update', handleAiConfig);
        socket.off('admin-info', handleAdminInfo);
        socket.off('ai-booking-confirmed', handleAutoBooking);
    };
  }, []);

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  // Loading Screen
  if (isLoading) {
      return (
          <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
              <RefreshCw size={48} className="animate-spin text-cyan-500 mb-6"/>
              <h2 className="text-2xl font-black uppercase tracking-widest">Connecting Neural Core...</h2>
              <p className="text-sm text-slate-400 mt-2 font-mono">Syncing Database & AI Context</p>
          </div>
      );
  }

  return (
    <HashRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <div className="flex h-screen bg-darker text-slate-100 font-sans overflow-hidden">
        
        {/* --- SIDEBAR --- */}
        <div className={`transition-all duration-300 ease-in-out border-r border-slate-800 bg-slate-900 flex flex-col z-50 ${isSidebarOpen ? 'w-64' : 'w-20'} absolute md:relative h-full shadow-2xl`}>
          
          {/* Logo Section */}
          <div className={`h-20 flex items-center justify-between border-b border-slate-800 relative ${isSidebarOpen ? 'px-6' : 'px-2'}`}>
             <div className="flex items-center gap-3 w-full justify-center md:justify-start">
                <div className={`w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-primary/20 shrink-0 overflow-hidden border border-white/10`}>
                   {coLogo ? (
                       <img src={coLogo} className="w-full h-full object-cover" alt="Logo" />
                   ) : (
                       <LayoutDashboard size={20} />
                   )}
                </div>
                {isSidebarOpen && (
                  <div className="overflow-hidden">
                    <h1 className="font-black text-base tracking-tighter text-white leading-none whitespace-nowrap uppercase">{coName}</h1>
                    <p className="text-[9px] font-bold text-secondary tracking-[0.2em] uppercase whitespace-nowrap mt-0.5">Neural Engine</p>
                  </div>
                )}
             </div>
             {/* Sidebar Toggle Button (Desktop & Mobile) */}
             <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
                className="absolute -right-3 top-7 bg-slate-800 text-slate-400 p-1.5 rounded-full border border-slate-700 shadow-md hover:text-white transition-all z-50"
             >
                {isSidebarOpen ? <ChevronLeft size={14}/> : <ChevronRight size={14}/>}
             </button>
          </div>

          {/* Navigation */}
          <div className="flex-1 overflow-y-auto py-4 custom-scrollbar space-y-1">
             <p className={`px-6 text-[9px] font-black uppercase text-slate-600 tracking-widest mb-2 mt-2 ${!isSidebarOpen && 'hidden'}`}>Utama</p>
             <SidebarLink to="/" onClick={handleNavClick} icon={<LayoutDashboard size={18} />} label="Dashboard" collapsed={!isSidebarOpen} />
             <SidebarLink to="/inventory" onClick={handleNavClick} icon={<Store size={18} />} label="Inventori" collapsed={!isSidebarOpen} />
             <SidebarLink to="/sales" onClick={handleNavClick} icon={<ShoppingCart size={18} />} label="Sales & Service" collapsed={!isSidebarOpen} />
             <SidebarLink to="/bookings" onClick={handleNavClick} icon={<Calendar size={18} />} label="Booking & Job" collapsed={!isSidebarOpen} />
             <SidebarLink to="/invoices" onClick={handleNavClick} icon={<FileText size={18} />} label="Invois & Sebut Harga" collapsed={!isSidebarOpen} />
             
             <p className={`px-6 text-[9px] font-black uppercase text-slate-600 tracking-widest mb-2 mt-4 ${!isSidebarOpen && 'hidden'}`}>Database</p>
             <SidebarLink to="/customers" onClick={handleNavClick} icon={<Users size={18} />} label="Pelanggan" collapsed={!isSidebarOpen} />
             <SidebarLink to="/employees" onClick={handleNavClick} icon={<Users size={18} />} label="Pekerja" collapsed={!isSidebarOpen} />
             <SidebarLink to="/payroll" onClick={handleNavClick} icon={<Wallet size={18} />} label="Payroll" collapsed={!isSidebarOpen} />
             <SidebarLink to="/prices" onClick={handleNavClick} icon={<Tag size={18} />} label="Katalog Harga" collapsed={!isSidebarOpen} />
             <SidebarLink to="/fuel" onClick={handleNavClick} icon={<Fuel size={18} />} label="Perbelanjaan Minyak" collapsed={!isSidebarOpen} />
             <SidebarLink to="/maintenance" onClick={handleNavClick} icon={<Wrench size={18} />} label="Penyelenggaraan" collapsed={!isSidebarOpen} />
             <SidebarLink to="/debit-credit" onClick={handleNavClick} icon={<DollarSign size={18} />} label="Debit / Credit" collapsed={!isSidebarOpen} />

             <p className={`px-6 text-[9px] font-black uppercase text-slate-600 tracking-widest mb-2 mt-4 ${!isSidebarOpen && 'hidden'}`}>Komunikasi AI</p>
             <SidebarLink to="/whatsapp" onClick={handleNavClick} icon={<MessageSquare size={18} />} label="WhatsApp AI Hub" collapsed={!isSidebarOpen} />
             <SidebarLink to="/promotions" onClick={handleNavClick} icon={<Megaphone size={18} />} label="Iklan & Promosi" collapsed={!isSidebarOpen} />
             <SidebarLink to="/ai-agent" onClick={handleNavClick} icon={<Bot size={18} />} label="AI Auto Reply Agent" badge={isBotActive ? "ON" : "OFF"} collapsed={!isSidebarOpen} />
             
             <p className={`px-6 text-[9px] font-black uppercase text-slate-600 tracking-widest mb-2 mt-4 ${!isSidebarOpen && 'hidden'}`}>Sistem</p>
             <SidebarLink to="/settings" onClick={handleNavClick} icon={<SettingsIcon size={18} />} label="Tetapan Master" collapsed={!isSidebarOpen} />
          </div>

          {/* User Profile / Logout */}
          <div className="p-4 border-t border-slate-800 bg-slate-900/50">
             <div className={`flex items-center gap-3 ${!isSidebarOpen && 'justify-center'}`}>
                <div className="w-8 h-8 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-xs font-bold text-slate-300 relative overflow-hidden shrink-0">
                   {adminImage ? (
                       <img src={adminImage} className="w-full h-full object-cover" alt="Admin" />
                   ) : (
                       <span>{adminName.charAt(0)}</span>
                   )}
                   <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-slate-700 ${isSocketConnected ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                </div>
                
                {isSidebarOpen && (
                  <div className="flex-1 overflow-hidden">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-bold text-white truncate">{adminName}</p>
                        {role === 'super_admin' && (
                            <span className="bg-cyan-500 text-white text-[7px] font-black px-1 rounded uppercase tracking-tighter">Super</span>
                        )}
                      </div>
                     <p className="text-[9px] text-slate-400 font-bold flex items-center gap-1 uppercase tracking-wide">
                        {isSocketConnected ? <Wifi size={8} className="text-emerald-500"/> : <WifiOff size={8} className="text-red-500"/>} 
                        {isSocketConnected ? 'ONLINE' : 'OFFLINE'}
                     </p>
                  </div>
                )}
                
                {isSidebarOpen && (
                  <button onClick={handleLogout} className="text-slate-400 hover:text-white transition-colors p-1" title="Log Keluar">
                     <LogOut size={16} />
                  </button>
                )}
             </div>
             
             {/* AI Status Indicator (Compact) */}
             {isSidebarOpen && (
                  <div className={`mt-3 py-1.5 px-3 rounded-lg border flex items-center justify-between ${isAiAutoReply ? 'bg-cyan-900/20 border-cyan-800/50' : 'bg-slate-800 border-slate-700'}`}>
                    <div className="flex items-center gap-2">
                        <BrainCircuit size={12} className={isAiAutoReply ? "text-cyan-400 animate-pulse" : "text-slate-500"} />
                        <span className={`text-[9px] font-black uppercase tracking-wider ${isAiAutoReply ? 'text-cyan-400' : 'text-slate-500'}`}>
                            AI {isAiAutoReply ? 'ACTIVE' : 'PAUSED'}
                        </span>
                    </div>
                 </div>
             )}
          </div>
        </div>

        {/* --- MAIN CONTENT AREA --- */}
        <div className={`flex-1 bg-darker relative overflow-hidden flex flex-col h-full w-full transition-all duration-300 ${isSidebarOpen ? 'md:ml-0' : 'md:ml-0'}`}>
           
           {/* GLOBAL WHATSAPP AI STATUS HEADER */}
           <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex justify-between items-center z-40 sticky top-0 shadow-md h-12 shrink-0">
               <div className="flex items-center gap-3">
                   <div className="flex items-center gap-2">
                       <div className={`w-2.5 h-2.5 rounded-full ${waStatus === 'READY' || waStatus === 'ONLINE' ? 'bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]' : (waStatus === 'SCAN_QR' ? 'bg-yellow-500 animate-bounce' : 'bg-red-500')}`}></div>
                       <p className="text-[10px] font-black uppercase text-white tracking-widest flex items-center gap-2">
                           WhatsApp Hub 
                           <span className={`px-2 py-0.5 rounded text-[8px] ${waStatus === 'READY' || waStatus === 'ONLINE' ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-800' : (waStatus === 'SCAN_QR' ? 'bg-yellow-900/50 text-yellow-400 border border-yellow-800' : 'bg-red-900/50 text-red-400 border border-red-800')}`}>
                               {waStatus === 'READY' ? 'ONLINE' : waStatus}
                           </span>
                       </p>
                   </div>
                   {waStatus !== 'READY' && waStatus !== 'ONLINE' && waStatus !== 'SCAN_QR' && (
                       <Link to="/whatsapp" className="text-[9px] font-bold text-cyan-400 hover:underline uppercase animate-pulse flex items-center gap-1 hidden sm:flex">
                           <Activity size={10} /> Reconnect
                       </Link>
                   )}
               </div>
               <div className="flex items-center gap-3">
                   {!isSocketConnected && (
                       <div className="flex items-center gap-2 px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-lg animate-pulse">
                           <WifiOff size={12} className="text-red-500"/>
                           <span className="text-[9px] font-black text-red-500 uppercase tracking-widest">System Offline</span>
                       </div>
                   )}
                   <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                       <Clock size={12}/> {sysTime}
                   </p>
               </div>
           </div>

           <div className={`flex-1 overflow-auto custom-scrollbar p-3 md:p-5 lg:p-6 ${isSidebarOpen ? 'pl-3 md:pl-6' : ''} relative`}>
              <AnimatePresence>
                {!isSocketConnected && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-50 bg-slate-950/40 backdrop-blur-[2px] pointer-events-none flex items-start justify-center pt-20"
                  >
                     <motion.div 
                       initial={{ opacity: 0, y: -20 }}
                       animate={{ opacity: 1, y: 0 }}
                       className="bg-red-500 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-red-400/50 pointer-events-auto"
                     >
                       <WifiOff size={20} className="animate-pulse" />
                       <div>
                         <p className="text-xs font-black uppercase tracking-widest">Sistem Luar Talian</p>
                         <p className="text-[10px] font-bold opacity-80 uppercase tracking-tighter">Percubaan menyambung semula...</p>
                       </div>
                     </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/sales" element={<Sales showToast={showToast} />} />
                <Route path="/bookings" element={<BookingManager showToast={showToast} />} />
                <Route path="/whatsapp" element={<WhatsAppMonitor />} />
                <Route path="/promotions" element={<PromotionManager showToast={showToast} />} />
                <Route path="/ai-agent" element={<AiAgentManager showToast={showToast} />} />
                <Route path="/invoices" element={<InvoiceQuotationManager showToast={showToast} />} />
                <Route path="/customers" element={<CustomerManager showToast={showToast} />} />
                <Route path="/employees" element={<Employees showToast={showToast} />} />
                <Route path="/payroll" element={<Payroll showToast={showToast} />} />
                <Route path="/prices" element={<Catalog showToast={showToast} />} />
                <Route path="/inventory" element={<Inventory showToast={showToast} />} />
                <Route path="/maintenance" element={<Maintenance showToast={showToast} />} />
                <Route path="/fuel" element={<FuelExpenses showToast={showToast} />} />
                <Route path="/team" element={<TeamModule />} />
                <Route path="/debit-credit" element={<DebitCredit showToast={showToast} />} />
                <Route path="/settings" element={<Settings showToast={showToast} />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
           </div>

            {/* Toast Notifications */}
            <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-3 pointer-events-none">
                <AnimatePresence>
                    {toasts.map(toast => (
                        <motion.div
                            key={toast.id}
                            initial={{ opacity: 0, x: 50, scale: 0.9 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: 20, scale: 0.9 }}
                            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border backdrop-blur-md min-w-[280px] ${
                                toast.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                                toast.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                                'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'
                            }`}
                        >
                            {toast.type === 'success' && <CheckCircle2 size={18} />}
                            {toast.type === 'error' && <AlertCircle size={18} />}
                            {toast.type === 'info' && <Info size={18} />}
                            <p className="text-xs font-bold">{toast.msg}</p>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </div>

      </div>
    </HashRouter>
  );
};

export default App;
