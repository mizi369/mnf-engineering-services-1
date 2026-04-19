import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  MessageSquare, 
  Briefcase, 
  DollarSign, 
  ShoppingCart, 
  Package, 
  FileText, 
  Send, 
  Settings, 
  Shield, 
  LogOut, 
  Menu, 
  Bell, 
  Search, 
  ChevronDown 
} from 'lucide-react';
import { socket } from '../service/socket';

interface AdminLayoutProps {
  children: React.ReactNode;
  activeMenu: string;
  onMenuClick: (menu: string) => void;
  onLogout: () => void;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children, activeMenu, onMenuClick, onLogout }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [adminInfo, setAdminInfo] = useState({ name: 'Admin', image: '', isOnline: false });

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'whatsapp', label: 'WhatsApp Web', icon: MessageSquare },
    { id: 'finance', label: 'Kewangan & Dokumen', icon: FileText },
    { id: 'database', label: 'Pangkalan Data', icon: Shield },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'payroll', label: 'Payroll', icon: DollarSign },
    { id: 'sales', label: 'Sales & Service', icon: ShoppingCart },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'settings', label: 'Company Settings', icon: Settings },
  ];

  useEffect(() => {
    const loadAdminInfo = () => {
      const name = localStorage.getItem('mnf_admin_name') || 'Admin';
      const image = localStorage.getItem('mnf_admin_image') || '';
      const isOnline = localStorage.getItem('wa_connected') === 'true';
      setAdminInfo({ name, image, isOnline });
    };

    const handleAdminSync = (info: any) => {
      if (info.name) localStorage.setItem('mnf_admin_name', info.name);
      if (info.image) localStorage.setItem('mnf_admin_image', info.image);
      loadAdminInfo();
    };

    loadAdminInfo();
    window.addEventListener('storage', loadAdminInfo);
    
    // Custom event for when settings are updated within the same window
    window.addEventListener('admin-info-updated', loadAdminInfo);

    socket.on('admin-info', handleAdminSync);

    return () => {
      window.removeEventListener('storage', loadAdminInfo);
      window.removeEventListener('admin-info-updated', loadAdminInfo);
      socket.off('admin-info', handleAdminSync);
    };
  }, []);

  return (
    <div className="flex h-screen bg-[#121212] overflow-hidden font-sans text-gray-300">
      
      {/* Sidebar */}
      <aside 
        className={`bg-[#1E1E1E] border-r border-white/5 flex flex-col transition-all duration-300 ease-in-out ${isSidebarOpen ? 'w-72' : 'w-20'} relative z-20`}
      >
        <div className="h-20 flex items-center px-6 border-b border-white/5 relative">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#D32F2F] rounded-lg flex items-center justify-center shadow-lg shadow-red-900/20 group hover:shadow-[0_0_15px_rgba(0,188,212,0.4)] transition-all duration-300">
              <span className="text-white font-black text-xl tracking-tighter">MNF</span>
            </div>
            {isSidebarOpen && (
              <div className="overflow-hidden">
                <h1 className="text-white font-black text-lg tracking-tighter leading-none uppercase">Neural Engine</h1>
                <p className="text-[10px] text-[#00BCD4] font-bold uppercase tracking-[0.2em] mt-1">Enterprise Hub</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-3 space-y-1 custom-scrollbar">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onMenuClick(item.id)}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg transition-all duration-200 group relative overflow-hidden ${activeMenu === item.id ? 'bg-[#D32F2F] text-white shadow-lg shadow-red-900/40' : 'hover:bg-white/5 text-gray-400 hover:text-white'}`}
            >
              <item.icon size={20} className={`${activeMenu === item.id ? 'text-white' : 'text-gray-500 group-hover:text-[#00BCD4]'} transition-colors`} />
              {isSidebarOpen && (
                <span className={`font-semibold text-sm tracking-wide ${activeMenu === item.id ? 'translate-x-1' : 'group-hover:translate-x-1'} transition-transform`}>{item.label}</span>
              )}
              {activeMenu === item.id && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-white/40"></div>
              )}
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-white/5">
          <button 
            onClick={onLogout}
            className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all duration-200"
          >
            <LogOut size={20} />
            {isSidebarOpen && <span className="font-medium text-sm">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#121212] relative">
        {/* Header */}
        <header className="glass-header h-20 flex items-center justify-between px-8">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors"
            >
              <Menu size={24} />
            </button>
            <div className="flex flex-col">
              <h2 className="text-xl font-bold text-white capitalize tracking-wide leading-none">{activeMenu.replace('-', ' ')}</h2>
              <p className="text-[10px] text-gray-500 font-medium uppercase tracking-widest mt-1">MNF Engineering / {activeMenu}</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="relative hidden lg:block">
              <Search className="absolute left-3 top-2.5 text-gray-500 w-4 h-4" />
              <input 
                type="text" 
                placeholder="Search resources, documents, or data..." 
                className="input-field pl-10 pr-4 py-2 w-80"
              />
            </div>

            <div className="flex items-center gap-3">
              <button className="relative p-2 hover:bg-[#00BCD4]/10 rounded-lg text-gray-400 hover:text-[#00BCD4] transition-all group">
                <Bell size={20} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#D32F2F] rounded-full shadow-[0_0_10px_rgba(211,47,47,0.5)]"></span>
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-[#00BCD4] transition-all group-hover:w-full"></div>
              </button>
              
              <button className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors">
                <Settings size={20} />
              </button>
            </div>

            <div className="flex items-center gap-3 pl-6 border-l border-white/10">
              <div className="text-right hidden md:block">
                <p className="text-sm font-bold text-white leading-none">{adminInfo.name}</p>
                <p className="text-[10px] text-[#00BCD4] font-bold uppercase tracking-tighter mt-1">System Architect</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-[#1A1A1A] border border-white/10 p-1 cursor-pointer hover:border-[#00BCD4]/50 transition-colors group relative">
                <img 
                  src={adminInfo.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(adminInfo.name)}&background=D32F2F&color=fff&bold=true`}
                  alt="Profile" 
                  className="w-full h-full rounded-md object-cover"
                />
                {adminInfo.isOnline && (
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 border-2 border-[#121212] rounded-full"></div>
                )}
              </div>
            </div>
          </div>
        </header>


        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-8 custom-scrollbar relative">
          <div className="absolute inset-0 pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
          <div className="relative z-0 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
