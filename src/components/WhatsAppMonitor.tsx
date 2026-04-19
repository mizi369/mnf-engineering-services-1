
import React, { useState, useEffect, useRef } from 'react';
import { 
  QrCode, Smartphone, RefreshCw, Power, MessageSquare, CheckCircle, Activity, 
  ShieldCheck, Zap, Cat, Loader2, Trash2, XCircle, BrainCircuit, User, Bot, 
  Terminal, Play, Lock, Globe, Image, Check, Search, MoreVertical, Paperclip, 
  Smile, Mic, Phone, Video, MapPin, FileText, CheckCheck, Menu, ArrowLeft, Info,
  Bell, Image as ImageIcon, Volume2, UserPlus, Users, Plus, List, Send, Link2,
  Cpu, Server, ScanLine, SmartphoneCharging, ChevronDown, Sparkles, Calendar,
  AlertTriangle, ChevronRight, ChevronLeft
} from 'lucide-react';
import { socket } from '../service/socket';
import { BACKEND_URL } from '../constants';
import { useNavigate } from 'react-router-dom';
import { db, TABLES } from '../lib/db';
import { ChatMessage } from '../types';

// --- INTERFACES ---
interface ChatContact {
    id: string;
    name: string;
    phone: string;
    lastMsg: string;
    time: string;
    unread: number;
    type: 'user' | 'group' | 'broadcast';
    avatar: string;
}

const WhatsAppMonitor: React.FC = () => {
  const navigate = useNavigate();
  const [qrCode, setQrCode] = useState<string>('');
  const [status, setStatus] = useState<string>('CHECKING...'); // Changed default status
  const [logs, setLogs] = useState<string[]>([]);
  const [neuralLogs, setNeuralLogs] = useState<any[]>([]); 
  const [activeTab, setActiveTab] = useState<'dashboard' | 'connection' | 'terminal'>('dashboard');
  const [adminInfo, setAdminInfo] = useState({ name: 'Admin', phone: '...', image: '' });
  const [aiContext, setAiContext] = useState<any>(null);
  
  // Dashboard UI States
  const [selectedChat, setSelectedChat] = useState<string>('live-stream');
  const [showInfoPanel, setShowInfoPanel] = useState(true);
  
  // Data States
  const [realContacts, setRealContacts] = useState<Map<string, ChatContact>>(new Map());
  const [chats, setChats] = useState<ChatContact[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [inputMessage, setInputMessage] = useState('');
  const [isAiActive, setIsAiActive] = useState(true); // AI Agent Switch
  const [isAutoConfirmActive, setIsAutoConfirmActive] = useState(false); // Auto Confirm Switch
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachmentType, setAttachmentType] = useState<'image' | 'document' | null>(null);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [showComplaints, setShowComplaints] = useState(false);

  const logEndRef = useRef<HTMLDivElement>(null);
  const neuralEndRef = useRef<HTMLDivElement>(null);

  // Robust Fetch Helper
  const safeFetch = async (endpoint: string, onSuccess: (data: any) => void) => {
      try {
          const res = await fetch(`${BACKEND_URL}${endpoint}`);
          if (!res.ok) return;
          const data = await res.json();
          onSuccess(data);
      } catch (err) {
          // Silent catch
      }
  };

  // Use refs for states needed in socket listeners to avoid stale closures
  const isAiActiveRef = useRef(isAiActive);
    const toggleAutoConfirm = () => {
        const newState = !isAutoConfirmActive;
        setIsAutoConfirmActive(newState);
        if (aiContext) {
            const updatedContext = { ...aiContext, isAutoConfirmActive: newState };
            setAiContext(updatedContext);
            socket.emit('cmd-update-ai-context', updatedContext);
        }
    };

  useEffect(() => {
    safeFetch('/api/admin', setAdminInfo);
    safeFetch('/api/status', (data) => {
        if(data.status) {
            setStatus(data.status);
            // Auto switch to connection tab if scan needed
            if(data.status === 'SCAN_QR') setActiveTab('connection');
        } else {
            // Default to OFFLINE if no status returned
            setStatus('OFFLINE');
        }
    });
    safeFetch('/api/context', (data) => {
        setAiContext(data);
        if (data && data.isAutoConfirmActive !== undefined) {
            setIsAutoConfirmActive(data.isAutoConfirmActive);
        }
    });

    // Load Chat History from DB
    const history = db.getAll<any>(TABLES.CHAT_LOGS);
    if (history && history.length > 0) {
        // Sort by time if possible, or just use as is (already sorted by insert order usually)
        setNeuralLogs(history.reverse()); // Reverse because UI uses flex-col-reverse or similar
        
        // Rebuild contacts from history
        const contactsMap = new Map<string, ChatContact>();
        history.forEach(log => {
            if (log.phone && log.phone !== 'SYSTEM') {
                let textContent = log.detail;
                if (log.step === 'INPUT') {
                    const parts = log.detail.split(': "');
                    if (parts.length > 1) textContent = parts.slice(1).join(': "').slice(0, -1);
                }
                
                contactsMap.set(log.phone, {
                    id: `user-${log.phone}`,
                    name: log.name || log.phone,
                    phone: log.phone,
                    lastMsg: textContent,
                    time: log.timestamp || log.time || 'Past',
                    unread: 0,
                    type: 'user',
                    avatar: 'user'
                });
            }
        });
        setRealContacts(contactsMap);
    }

    socket.on('connect', () => {
        addLog('Socket Connected.');
        socket.emit('cmd-status-check');
    });

    socket.on('disconnect', () => {
        setStatus('OFFLINE');
        addLog('Socket Disconnected.');
    });

    socket.on('stage-update', (newStatus: string) => {
        setStatus(newStatus);
        localStorage.setItem('wa_connected', newStatus === 'READY' ? 'true' : 'false');
        if(newStatus === 'SCAN_QR') setActiveTab('connection');
    });

    socket.on('qr-code', (qr: string) => {
        setQrCode(qr);
        setStatus('SCAN_QR');
        setActiveTab('connection');
    });

    socket.on('bot-log', (msg: string) => {
        // Keep logs for terminal
        setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 99)]);
    });

    socket.on('sys-log', (data: any) => {
        setLogs(prev => [`[${data.time}] [${data.type.toUpperCase()}] ${data.msg}`, ...prev.slice(0, 99)]);
    });

    socket.on('neural-log', async (data: any) => {
        setNeuralLogs(prev => [data, ...prev].slice(0, 1000)); // Increased limit for history
        // Save to DB for persistence
        await db.insert(TABLES.CHAT_LOGS, {
            ...data,
            id: `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        });
    });

    socket.on('new-msg', (msg: any) => {
        if (msg.senderRole === 'user') {
            setRealContacts(prev => {
                const newMap = new Map(prev);
                newMap.set(msg.phone, {
                    id: `user-${msg.phone}`,
                    name: msg.name || msg.phone,
                    phone: msg.phone,
                    lastMsg: msg.body,
                    time: msg.time,
                    unread: (prev.get(msg.phone)?.unread || 0) + 1,
                    type: 'user',
                    avatar: 'user'
                });
                return newMap;
            });
        }
    });

    socket.on('admin-info', (info: any) => {
        setAdminInfo(info);
    });

    socket.on('ai-status', (isActive: boolean) => {
        setIsAiActive(isActive);
    });

    socket.on('new-complaint', (complaint: any) => {
        setComplaints(prev => [complaint, ...prev].slice(0, 10));
        // Optional: Play a sound or show a toast
        console.log('🚨 New Complaint received:', complaint);
    });

    // Fallback: If status remains CHECKING for > 5s, set to OFFLINE
    const timer = setTimeout(() => {
        setStatus(prev => prev === 'CHECKING...' ? 'OFFLINE' : prev);
    }, 5000);

    return () => {
        clearTimeout(timer);
        socket.off('stage-update');
        socket.off('qr-code'); 
        socket.off('bot-log');
        socket.off('sys-log');
        socket.off('neural-log');
        socket.off('new-msg');
        socket.off('admin-info');
        socket.off('ai-status');
    };
  }, []);

  useEffect(() => {
      const isOnline = status === 'READY';
      const baseChats: ChatContact[] = [
        { 
            id: 'live-stream', 
            name: 'Live Neural Monitor', 
            phone: 'SYSTEM', 
            lastMsg: isOnline ? '🟢 System Online & Monitoring...' : '🔴 System Offline', 
            time: 'Now', 
            unread: 0, 
            type: 'broadcast', 
            avatar: 'brain' 
        },
        { id: 'group-1', name: 'MNF Official Team', phone: 'Group', lastMsg: 'Admin: Schedule updated.', time: '10:05 AM', unread: 3, type: 'group', avatar: 'group' },
      ];
      const contactList = Array.from(realContacts.values());
      setChats([...baseChats, ...contactList]);
  }, [realContacts, status]);

  const addLog = (msg: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 49)]);
  };

  const handleConnect = () => { socket.emit('cmd-connect'); setStatus('LAUNCHING'); };
  const handleDisconnect = () => { if(confirm("Putuskan sambungan WhatsApp?")) socket.emit('cmd-disconnect'); };
  const handleForceSync = () => { socket.emit('cmd-status-check'); addLog('Status Sync Requested...'); };
  
  const handleToggleAi = () => {
      const newState = !isAiActive;
      setIsAiActive(newState); // Optimistic update
      socket.emit('cmd-toggle-ai', newState);
  };

  const handleSimulate = () => {
      socket.emit('cmd-simulate-msg', {
          text: 'Hi, nak tanya berapa harga servis aircond normal untuk 1.0HP?',
          senderName: 'Pelanggan (Simulasi)',
          senderPhone: '60123456789'
      });
      alert('Simulasi dimulakan! Sila lihat log aktiviti.');
  };

  const handleSimulateBooking = () => {
      socket.emit('cmd-simulate-msg', {
          text: 'Hi, saya nak buat booking servis aircond untuk esok, alamat di Taman Melawati.',
          senderName: 'Pelanggan Booking (Simulasi)',
          senderPhone: '60123456789'
      });
      alert('Simulasi booking dimulakan! Sila lihat log aktiviti.');
  };

  const handleSimulateComplaint = () => {
      socket.emit('cmd-simulate-msg', {
          text: 'Hi, aircond saya masih tak sejuk lepas servis semalam. Tolong hantar orang check balik.',
          senderName: 'Pelanggan Aduan (Simulasi)',
          senderPhone: '60123456789'
      });
      alert('Simulasi aduan dimulakan! Sila lihat log aktiviti.');
  };

    const handleSendMessage = () => {
        if (!inputMessage.trim()) return;
        if (!isConnected) { alert("Sistem OFFLINE."); return; }

        let targetPhone = '';
        if (selectedChat === 'live-stream') { alert("Pilih chat individu."); return; }
        else if (selectedChat === 'group-1') { alert("Reply to Group belum disokong."); return; }
        else {
            const chat = chats.find(c => c.id === selectedChat);
            if (chat && chat.phone) targetPhone = chat.phone;
        }

        if (targetPhone) {
            const logData = { 
                timestamp: new Date().toLocaleTimeString(), 
                step: 'INPUT', 
                detail: `Admin: "${inputMessage}"`,
                phone: targetPhone,
                name: 'Admin'
            };
            socket.emit('cmd-send-msg', { type: 'chat', to: targetPhone, body: inputMessage });
            setNeuralLogs(prev => [logData, ...prev]);
            db.insert(TABLES.CHAT_LOGS, { ...logData, id: `chat-admin-${Date.now()}` });
            setInputMessage('');
        }
    };

    const handleManualConfirm = () => {
        const chat = chats.find(c => c.id === selectedChat);
        if (!chat || chat.id === 'live-stream') {
            alert("Sila pilih chat pelanggan untuk pengesahan manual.");
            return;
        }

        // Find the last AI message for THIS chat
        const chatLogs = neuralLogs.filter(log => log.phone === chat.phone);
        const lastAiMsg = chatLogs.find(log => log.step === 'OUTPUT' && log.detail.includes('[CONFIRM JOB]'));
        
        if (confirm(`Sahkan tempahan untuk ${chat.name} secara manual?`)) {
            socket.emit('cmd-manual-confirm', {
                phone: chat.phone,
                name: chat.name,
                aiReply: lastAiMsg?.detail || '[CONFIRM JOB]'
            });
            alert('Permintaan pengesahan manual dihantar.');
        }
    };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
          const base64 = event.target?.result as string;
          if (!base64) return;

          let targetPhone = '';
          const chat = chats.find(c => c.id === selectedChat);
          if (chat && chat.phone) targetPhone = chat.phone;

        if (targetPhone) {
            const logData = { 
                timestamp: new Date().toLocaleTimeString(), 
                step: 'MEDIA', 
                detail: `Admin sent ${attachmentType}: ${file.name}`,
                phone: targetPhone,
                name: 'Admin'
            };
            socket.emit('cmd-send-msg', { 
                type: 'media', 
                to: targetPhone, 
                body: attachmentType === 'image' ? 'Image Attachment' : file.name,
                media: {
                    mimetype: file.type,
                    data: base64.split(',')[1],
                    filename: file.name
                }
            });
            setNeuralLogs(prev => [logData, ...prev]);
            db.insert(TABLES.CHAT_LOGS, { ...logData, id: `chat-media-${Date.now()}` });
        }
      };
      reader.readAsDataURL(file);
      setShowAttachmentMenu(false);
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const triggerFileSelect = (type: 'image' | 'document') => {
      setAttachmentType(type);
      if (fileInputRef.current) {
          fileInputRef.current.accept = type === 'image' ? 'image/*' : '*/*';
          fileInputRef.current.click();
      }
  };

  const handleSendLocation = () => {
      let targetPhone = '';
      const chat = chats.find(c => c.id === selectedChat);
      if (chat && chat.phone) targetPhone = chat.phone;

      if (targetPhone) {
          // For now, send a demo location or ask for coordinates
          const lat = 3.1390; // KL coordinates
          const lng = 101.6869;
          socket.emit('cmd-send-msg', { 
              type: 'location', 
              to: targetPhone, 
              location: { lat, lng, description: 'Kuala Lumpur' }
          });
          setNeuralLogs(prev => [{ 
              timestamp: new Date().toLocaleTimeString(), 
              step: 'LOCATION', 
              detail: `Admin sent location: KL` 
          }, ...prev]);
      }
      setShowAttachmentMenu(false);
  };

  const clearLogs = () => {
      if(confirm("Adakah anda pasti mahu memadam semua log sistem?")) {
          setLogs([]);
      }
  };

  const parseContent = (text: string) => {
      let type = 'text';
      let content = text;
      if (text.includes('[+GAMBAR]') || text.includes('[🖼 IMAGE]')) { type = 'image'; content = text.replace(/\[\+GAMBAR\]|\[🖼 IMAGE\]/g, '').trim(); }
      else if (text.includes('LOCATION')) { type = 'location'; content = 'Location Shared'; }
      return { type, content };
  };

  const getStatusText = (s: string) => {
      if (s === 'SCAN_QR') return "Sila imbas QR untuk sambung WhatsApp Super Admin. Sistem menunggu pengesahan.";
      if (s === 'READY') return "WhatsApp Super Admin berjaya dihubungkan. Sistem kini aktif dan sedia digunakan.";
      if (s === 'LAUNCHING' || s === 'RECONNECTING' || s === 'AUTHENTICATED') return "Sistem sedang memulakan sambungan Super Admin...";
      if (s === 'CHECKING...') return "Menyemak status Super Admin...";
      return "Sambungan Super Admin terputus. Sila tekan butang 'Connect Super Admin'.";
  };

  const isConnected = status === 'READY';
  const isScan = status === 'SCAN_QR';
  const isReconnecting = status === 'RECONNECTING' || status === 'LAUNCHING' || status === 'AUTHENTICATED';
  const isOfflineOrChecking = status === 'OFFLINE' || status === 'CHECKING...' || status === 'DISCONNECTED';

  return (
    <div className="flex flex-col h-[calc(100vh-40px)] bg-darker -m-4 md:-m-6 lg:-m-8 overflow-hidden font-sans">
      
      {/* 1. TOP HEADER (STATUS & CONTROLS) */}
      <div className="bg-slate-900 text-white px-3 py-2 flex justify-between items-center shadow-md z-20 h-14 shrink-0 border-b border-white/5">
         <div className="flex items-center gap-2 md:gap-3">
            <div className="w-9 h-9 rounded-full bg-slate-800 overflow-hidden border border-white/10 shadow-sm shrink-0">
               {adminInfo.image ? <img src={adminInfo.image} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-500"><User size={16}/></div>}
            </div>
            <div className="flex flex-col md:flex-row md:items-center md:gap-2 leading-tight">
                <h1 className="font-bold text-xs md:text-sm tracking-wide uppercase">WhatsApp Hub</h1>
                <span className="opacity-70 text-[9px] hidden md:inline">v2.4 Ent</span>
            </div>
         </div>
         
         <div className="flex items-center gap-2 md:gap-4">
            
            {/* COMPLAINTS NOTIFICATION */}
            <div className="relative">
                <button 
                    onClick={() => setShowComplaints(!showComplaints)}
                    className={`p-2 rounded-full transition-all relative ${complaints.length > 0 ? 'bg-red-500/10 text-red-400 animate-pulse' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                    title="Aduan Pelanggan"
                >
                    <Bell size={18} />
                    {complaints.length > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-black w-4 h-4 flex items-center justify-center rounded-full border-2 border-slate-900">
                            {complaints.length}
                        </span>
                    )}
                </button>

                {showComplaints && (
                    <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-white/10 rounded-xl shadow-2xl z-[100] overflow-hidden">
                        <div className="bg-slate-800 px-4 py-2 border-b border-white/5 flex justify-between items-center">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-white">Aduan Terbaru</h3>
                            <button onClick={() => setComplaints([])} className="text-[9px] text-slate-400 hover:text-white uppercase font-bold">Clear All</button>
                        </div>
                        <div className="max-h-80 overflow-y-auto custom-scrollbar">
                            {complaints.length === 0 ? (
                                <div className="p-8 text-center text-slate-500 italic text-xs">Tiada aduan baru.</div>
                            ) : (
                                complaints.map((c, i) => (
                                    <div key={i} className="p-3 border-b border-white/5 hover:bg-white/5 transition-colors">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="text-[10px] font-bold text-emerald-400">{c.customer_name}</span>
                                            <span className="text-[8px] text-slate-500">{c.time}</span>
                                        </div>
                                        <p className="text-[11px] text-white/80 leading-relaxed italic">"{c.issue}"</p>
                                        <div className="mt-2 flex gap-2">
                                            <button 
                                                onClick={() => {
                                                    const chat = Array.from(realContacts.values()).find(chat => chat.phone === c.phone);
                                                    if (chat) setSelectedChat(`user-${chat.phone}`);
                                                    setShowComplaints(false);
                                                }}
                                                className="text-[9px] bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded font-bold hover:bg-emerald-500/30"
                                            >
                                                Buka Chat
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* SIMULATION BUTTONS (DEBUG) */}
            <div className="flex gap-2">
              <button onClick={handleSimulate} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border bg-slate-900 text-white border-slate-700 hover:bg-slate-700 active:scale-95 transition-all shadow-sm" title="Simulasi Mesej Pelanggan">
                  <Play size={10} /> <span className="text-[9px] font-black uppercase tracking-widest hidden sm:inline">Test AI</span>
              </button>
              <button onClick={handleSimulateBooking} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border bg-slate-900 text-white border-slate-700 hover:bg-slate-700 active:scale-95 transition-all shadow-sm" title="Simulasi Booking">
                  <Calendar size={10} /> <span className="text-[9px] font-black uppercase tracking-widest hidden sm:inline">Test Booking</span>
              </button>
              <button onClick={handleSimulateComplaint} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border bg-slate-900 text-white border-slate-700 hover:bg-slate-700 active:scale-95 transition-all shadow-sm" title="Simulasi Aduan">
                  <AlertTriangle size={10} /> <span className="text-[9px] font-black uppercase tracking-widest hidden sm:inline">Test Aduan</span>
              </button>
            </div>

            {/* AI TOGGLE SWITCH (ALWAYS VISIBLE NOW) */}
            {isConnected && (
                <button 
                    onClick={handleToggleAi}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all shadow-sm ${isAiActive ? 'bg-white text-[#00a884] font-black' : 'bg-red-500 text-white border-red-400'}`}
                    title="Toggle AI Auto Reply"
                >
                    <Bot size={14} className={isAiActive ? "animate-bounce" : ""} />
                    <span className="text-[9px] font-black uppercase tracking-widest">
                        {isAiActive ? 'AI ON' : 'AI OFF'}
                    </span>
                </button>
            )}

            <div className="hidden md:flex items-center gap-2 bg-black/10 px-3 py-1 rounded-full">
               <Activity size={12} className={isConnected ? "text-emerald-300" : (isReconnecting ? "text-yellow-300 animate-pulse" : "text-red-300")}/>
               <span className="text-[10px] font-bold uppercase tracking-wider">
                   {isConnected ? 'ONLINE' : isReconnecting ? 'STARTING...' : status}
               </span>
            </div>
            
            <div className="flex gap-1 bg-black/10 p-1 rounded-xl">
               <button onClick={() => setActiveTab('dashboard')} className={`p-1.5 md:p-2 rounded-lg transition-all ${activeTab === 'dashboard' ? 'bg-white text-[#00a884]' : 'text-white/70 hover:bg-white/10'}`} title="Dashboard Chat"><BrainCircuit size={16}/></button>
               <button onClick={() => setActiveTab('connection')} className={`p-1.5 md:p-2 rounded-lg transition-all ${activeTab === 'connection' ? 'bg-white text-[#00a884]' : 'text-white/70 hover:bg-white/10'}`} title="Connection & QR"><Link2 size={16}/></button>
               <button onClick={() => setActiveTab('terminal')} className={`p-1.5 md:p-2 rounded-lg transition-all ${activeTab === 'terminal' ? 'bg-white text-[#00a884]' : 'text-white/70 hover:bg-white/10'}`} title="System Logs"><Terminal size={16}/></button>
            </div>
         </div>
      </div>

      {/* 2. MAIN CONTENT AREA */}
      {activeTab === 'dashboard' && (
          <div className="flex flex-1 overflow-hidden relative">
             {/* LEFT SIDEBAR (CHAT LIST) */}
             <div className="w-[85px] md:w-[320px] bg-slate-900 border-r border-white/5 flex flex-col z-10 transition-all">
                <div className="bg-slate-950 px-3 py-3 flex justify-center md:justify-between items-center border-b border-white/5 h-[60px]">
                   <div className="w-10 h-10 rounded-full bg-slate-800 overflow-hidden border border-white/10 shadow-sm cursor-pointer">
                      {adminInfo.image ? <img src={adminInfo.image} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-500"><User size={20}/></div>}
                   </div>
                   <div className="hidden md:flex gap-2 text-slate-500">
                      <button className="hover:bg-white/5 p-2 rounded-full"><Users size={18}/></button>
                      <button className="hover:bg-white/5 p-2 rounded-full"><MessageSquare size={18}/></button>
                   </div>
                </div>
                <div className="p-2 border-b border-white/5 hidden md:block">
                   <div className="bg-white/5 rounded-lg px-3 py-2 flex items-center gap-2 border border-white/5">
                      <Search size={14} className="text-slate-500"/>
                      <input className="bg-transparent outline-none text-xs w-full font-medium text-white" placeholder="Search chats..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                   </div>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                   {chats.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase())).map(chat => (
                      <div key={chat.id} onClick={() => setSelectedChat(chat.id)} className={`px-2 md:px-4 py-3 cursor-pointer flex flex-col md:flex-row items-center md:items-start gap-2 md:gap-3 border-b border-white/5 transition-colors ${selectedChat === chat.id ? 'bg-white/10' : 'hover:bg-white/5'}`}>
                         <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-white shrink-0 shadow-sm ${chat.avatar === 'brain' ? (isConnected ? 'bg-emerald-500' : 'bg-slate-700') : chat.avatar === 'group' ? 'bg-slate-700' : 'bg-slate-800'}`}>
                            {chat.avatar === 'brain' ? <BrainCircuit size={20} className={isConnected ? "animate-pulse" : ""}/> : chat.avatar === 'group' ? <Users size={20}/> : <User size={20}/>}
                         </div>
                         <div className="hidden md:block flex-1 min-w-0">
                            <div className="flex justify-between items-center mb-0.5">
                                <h4 className="font-bold text-white text-sm truncate">{chat.name}</h4>
                                <span className={`text-[10px] font-medium ${chat.unread > 0 ? 'text-primary' : 'text-slate-500'}`}>{chat.time}</span>
                            </div>
                            <p className={`text-[11px] truncate max-w-[180px] ${chat.id === 'live-stream' && isConnected ? 'text-emerald-400 font-bold' : 'text-slate-500'}`}>{chat.lastMsg}</p>
                         </div>
                      </div>
                    ))}
                 </div>
              </div>

             {/* CHAT PANEL */}
             <div className="flex-1 flex flex-col bg-slate-950 relative min-w-0">
                <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: "url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')", backgroundSize: '400px' }}></div>
                <div className="bg-slate-900 px-4 py-2 flex justify-between items-center border-b border-white/5 z-10 h-[60px] shadow-sm">
                   <div className="flex items-center gap-3 cursor-pointer">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white ${selectedChat === 'live-stream' ? 'bg-primary' : 'bg-slate-800 border border-white/10'}`}>
                         {selectedChat === 'live-stream' ? <BrainCircuit size={18}/> : <Users size={18}/>}
                      </div>
                      <div>
                         <h4 className="font-bold text-white text-sm leading-tight">{chats.find(c=>c.id===selectedChat)?.name || 'Chat'}</h4>
                         <p className={`text-[10px] font-medium ${selectedChat === 'live-stream' && isConnected ? 'text-emerald-400 font-bold animate-pulse' : 'text-slate-500'}`}>
                            {selectedChat === 'live-stream' 
                                ? (isConnected ? '• Online (Neural Active)' : '• System Offline') 
                                : (isConnected ? '• Online' : '• Offline')}
                         </p>
                      </div>
                   </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 space-y-2 z-10 flex flex-col-reverse">
                   <div ref={neuralEndRef} />
                   {neuralLogs
                    .filter(log => selectedChat === 'live-stream' || log.phone === chats.find(c => c.id === selectedChat)?.phone)
                    .map((log, idx) => {
                       const isAI = log.step === 'OUTPUT';
                       const isSystem = log.step === 'POLICY_CHECK' || log.step === 'THINKING' || log.step === 'ERROR';
                       let senderName = 'User'; let textContent = log.detail;
                       if (log.step === 'INPUT') {
                           const parts = log.detail.split(': "');
                           if (parts.length > 1) { senderName = parts[0].replace('Mesej dari ', ''); textContent = parts.slice(1).join(': "').slice(0, -1); }
                       }
                       const { type, content } = parseContent(textContent);
                       if (isSystem) return (<div key={idx} className="flex justify-center my-2"><div className="px-3 py-1 rounded-lg text-[9px] font-bold uppercase bg-[#fff5c4] text-yellow-800 shadow-sm flex items-center gap-2 border border-yellow-200"><ShieldCheck size={10}/>{log.detail}</div></div>);
                       return (
                           <div key={idx} className={`flex ${isAI ? 'justify-end' : 'justify-start'} mb-1`}>
                               <div className={`relative max-w-[85%] md:max-w-[70%] px-3 py-2 rounded-lg shadow-sm text-sm ${isAI ? 'bg-[#d9fdd3] rounded-tr-none' : 'bg-white rounded-tl-none'}`}>
                                   {!isAI && <p className="text-[10px] font-bold text-[#d65d31] mb-0.5">{senderName}</p>}
                                   <p className="text-[#111b21] leading-snug whitespace-pre-wrap text-[13px]">{content}</p>
                                   <div className="flex justify-end items-center gap-1 mt-1 opacity-60"><span className="text-[9px]">{log.timestamp}</span>{isAI && <CheckCheck size={12} className="text-[#53bdeb]"/>}</div>
                               </div>
                           </div>
                       );
                   })}
                </div>

                <div className="bg-[#f0f2f5] px-3 py-2 flex items-center gap-2 z-10 min-h-[60px] border-t border-slate-200 relative">
                   <input 
                       type="file" 
                       ref={fileInputRef} 
                       className="hidden" 
                       onChange={handleFileSelect}
                   />
                   <div className="relative">
                       <button 
                           onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                           className="p-2 text-slate-500 hover:bg-slate-200 rounded-full transition-colors"
                           disabled={!isConnected}
                       >
                           <Plus size={24} className={`transition-transform duration-200 ${showAttachmentMenu ? 'rotate-45' : ''}`} />
                       </button>
                       
                       {/* Attachment Menu Popup */}
                       {showAttachmentMenu && (
                           <div className="absolute bottom-12 left-0 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 flex flex-col gap-2 min-w-[160px] z-50 animate-in fade-in slide-in-from-bottom-4">
                               <button className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 rounded-xl transition-colors text-sm font-medium text-slate-700 w-full text-left" onClick={() => triggerFileSelect('image')}>
                                   <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600"><ImageIcon size={16} /></div>
                                   Gallery
                               </button>
                               <button className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 rounded-xl transition-colors text-sm font-medium text-slate-700 w-full text-left" onClick={handleSendLocation}>
                                   <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600"><MapPin size={16} /></div>
                                   Location
                               </button>
                               <button className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 rounded-xl transition-colors text-sm font-medium text-slate-700 w-full text-left" onClick={() => triggerFileSelect('document')}>
                                   <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600"><FileText size={16} /></div>
                                   Document
                               </button>
                           </div>
                       )}
                   </div>
                   <div className="flex-1 bg-white rounded-xl px-4 py-2 flex items-center border border-slate-200 shadow-sm">
                      <input className="w-full bg-transparent outline-none text-sm" placeholder={isConnected ? "Type a message..." : "System Offline..."} value={inputMessage} onChange={(e) => setInputMessage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} disabled={!isConnected} />
                   </div>
                   <button onClick={handleSendMessage} className={`p-3 rounded-full shadow-sm transition-all active:scale-90 ${inputMessage.trim() ? 'bg-[#00a884] text-white hover:bg-[#008f6f]' : 'bg-slate-200 text-slate-400'}`}><Send size={18} /></button>
                </div>
             </div>

              {/* RIGHT SIDEBAR (INFO & ACTIONS) */}
              <div className={`bg-slate-900 border-l border-white/5 transition-all duration-300 flex flex-col ${showInfoPanel ? 'w-[320px]' : 'w-0 overflow-hidden'}`}>
                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                    <h3 className="font-bold text-white text-sm uppercase tracking-widest flex items-center gap-2">
                        <Info size={16} className="text-primary" /> Info & Actions
                    </h3>
                    <button onClick={() => setShowInfoPanel(false)} className="text-slate-500 hover:text-white"><XCircle size={18}/></button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
                    {/* Customer Details */}
                    {selectedChat !== 'live-stream' && (
                        <div className="bg-white/5 rounded-2xl p-4 border border-white/5 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-white font-bold text-xl">
                                    {chats.find(c => c.id === selectedChat)?.name.charAt(0)}
                                </div>
                                <div>
                                    <h4 className="font-bold text-white text-sm">{chats.find(c => c.id === selectedChat)?.name}</h4>
                                    <p className="text-[10px] text-slate-500 font-mono">{chats.find(c => c.id === selectedChat)?.phone}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
                                <div className="bg-black/20 p-2 rounded-lg">
                                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Status</p>
                                    <p className="text-[10px] font-bold text-emerald-400">Active</p>
                                </div>
                                <div className="bg-black/20 p-2 rounded-lg">
                                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Type</p>
                                    <p className="text-[10px] font-bold text-primary uppercase">Customer</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* AI Control */}
                    <div className="space-y-3">
                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">AI Control</h4>
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/5 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold text-white">Auto Reply</span>
                                    <span className="text-[8px] text-slate-500">AI membalas mesej</span>
                                </div>
                                <button 
                                    onClick={handleToggleAi}
                                    className={`w-10 h-5 rounded-full relative transition-colors ${isAiActive ? 'bg-primary' : 'bg-slate-700'}`}
                                >
                                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${isAiActive ? 'left-6' : 'left-1'}`}></div>
                                </button>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold text-white">Auto Confirm</span>
                                    <span className="text-[8px] text-slate-500">Sahkan booking automatik</span>
                                </div>
                                <button 
                                    onClick={toggleAutoConfirm}
                                    className={`w-10 h-5 rounded-full relative transition-colors ${isAutoConfirmActive ? 'bg-emerald-500' : 'bg-slate-700'}`}
                                >
                                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${isAutoConfirmActive ? 'left-6' : 'left-1'}`}></div>
                                </button>
                            </div>

                            <p className="text-[9px] text-slate-500 leading-relaxed pt-2 border-t border-white/5">
                                {isAiActive 
                                    ? (isAutoConfirmActive 
                                        ? 'AI aktif & Booking akan disahkan secara AUTOMATIK.' 
                                        : 'AI aktif membalas mesej, tetapi Booking perlu disahkan secara MANUAL.') 
                                    : 'AI dimatikan. Semua tindakan perlu dilakukan secara manual.'}
                            </p>
                        </div>
                    </div>

                    {/* Booking Actions */}
                    <div className="space-y-3">
                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Booking Actions</h4>
                        
                        {/* Extracted Info Preview */}
                        {selectedChat !== 'live-stream' && (() => {
                            const chat = chats.find(c => c.id === selectedChat);
                            const chatLogs = neuralLogs.filter(log => log.phone === chat?.phone);
                            const lastAiMsg = [...chatLogs].reverse().find(log => log.step === 'OUTPUT' && log.detail.includes('[CONFIRM JOB]'));
                            
                            if (!lastAiMsg) return null;
                            
                            const text = lastAiMsg.detail;
                            const extract = (key: string) => {
                                const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                                const regex = new RegExp(`${escapedKey}\\s*[:\\-]\\s*(.*?)(?:\\n|$)`, 'i');
                                const match = text.match(regex);
                                return match ? match[1].trim() : '-';
                            };

                            return (
                                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3 space-y-2">
                                    <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Extracted Info</p>
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-[10px]"><span className="text-slate-500">Tarikh:</span> <span className="text-white font-bold">{extract('Tarikh')}</span></div>
                                        <div className="flex justify-between text-[10px]"><span className="text-slate-500">Masa:</span> <span className="text-white font-bold">{extract('Masa')}</span></div>
                                        <div className="flex justify-between text-[10px]"><span className="text-slate-500">Servis:</span> <span className="text-white font-bold">{extract('Servis')}</span></div>
                                        <div className="flex justify-between text-[10px]"><span className="text-slate-500">Team:</span> <span className="text-white font-bold">{extract('Team')}</span></div>
                                    </div>
                                </div>
                            );
                        })()}

                        <button 
                            onClick={handleManualConfirm}
                            className="w-full flex items-center gap-3 p-3 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-xl text-left transition-all group"
                        >
                            <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400">
                                <CheckCircle size={18} />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-white">Confirm Booking</p>
                                <p className="text-[9px] text-slate-500">Sahkan tempahan manual</p>
                            </div>
                        </button>

                        <button 
                            onClick={() => navigate('/bookings')}
                            className="w-full flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-left transition-all group"
                        >
                            <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                <Calendar size={18} />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-white">Open Booking List</p>
                                <p className="text-[9px] text-slate-500">Lihat semua tempahan</p>
                            </div>
                        </button>
                    </div>

                    {/* Support Actions */}
                    <div className="space-y-3">
                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Support</h4>
                        <button className="w-full flex items-center gap-3 p-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl text-left transition-all group">
                            <div className="p-2 bg-red-500/20 rounded-lg text-red-400">
                                <AlertTriangle size={18} />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-white">Report Issue</p>
                                <p className="text-[9px] text-slate-500">Aduan teknikal</p>
                            </div>
                        </button>
                    </div>

                    {/* Danger Zone */}
                    <div className="space-y-3">
                        <h4 className="text-[10px] font-black text-red-500 uppercase tracking-widest">Danger Zone</h4>
                        <button 
                            onClick={async () => {
                                if (confirm("Adakah anda pasti mahu memadam SEMUA sejarah chat? Tindakan ini tidak boleh diundur.")) {
                                    localStorage.removeItem(TABLES.CHAT_LOGS);
                                    setNeuralLogs([]);
                                    setRealContacts(new Map());
                                    alert("Sejarah chat telah dipadam.");
                                }
                            }}
                            className="w-full flex items-center gap-3 p-3 bg-red-600/10 hover:bg-red-600/20 border border-red-600/20 rounded-xl text-left transition-all group"
                        >
                            <div className="p-2 bg-red-600/20 rounded-lg text-red-400">
                                <Trash2 size={18} />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-white">Padam Sejarah Chat</p>
                                <p className="text-[9px] text-slate-500">Kekal kecuali admin delete</p>
                            </div>
                        </button>
                    </div>
                </div>
              </div>

              {!showInfoPanel && (
                  <button 
                    onClick={() => setShowInfoPanel(true)}
                    className="absolute right-4 top-20 z-20 p-2 bg-slate-900 border border-white/10 rounded-full text-slate-400 hover:text-white shadow-xl"
                  >
                      <Info size={20} />
                  </button>
              )}
          </div>
      )}

      {/* 3. CONNECTION & QR TAB (REDESIGNED) */}
      {activeTab === 'connection' && (
          <div className="flex flex-1 overflow-hidden bg-slate-100 items-center justify-center p-4 lg:p-8">
              <div className="bg-white w-full max-w-5xl h-[550px] rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden flex flex-col md:flex-row relative">
                  
                  {/* LEFT SIDE: QR / STATUS VISUAL */}
                  <div className="md:w-1/2 bg-slate-900 p-8 flex flex-col justify-center items-center relative overflow-hidden text-white">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500 rounded-full mix-blend-overlay filter blur-[80px] opacity-20"></div>
                      <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-500 rounded-full mix-blend-overlay filter blur-[80px] opacity-20"></div>
                      
                      <div className="relative z-10 flex flex-col items-center">
                          {isConnected ? (
                              <div className="w-48 h-48 bg-emerald-500/20 rounded-[2rem] flex items-center justify-center border-4 border-emerald-500 animate-pulse">
                                  <CheckCircle size={80} className="text-emerald-400 drop-shadow-lg" />
                              </div>
                          ) : isScan && qrCode ? (
                              <div className="bg-white p-4 rounded-3xl shadow-2xl border-4 border-cyan-500/30">
                                  {/* Increased QR code visibility with white background and object-contain */}
                                  <img src={qrCode} className="w-64 h-64 object-contain bg-white rounded-xl" />
                              </div>
                          ) : (
                              <div className="w-48 h-48 bg-slate-800 rounded-[2rem] flex items-center justify-center border-4 border-slate-700">
                                  {isReconnecting ? <Loader2 size={60} className="text-slate-600 animate-spin" /> : <ScanLine size={60} className="text-slate-600" />}
                              </div>
                          )}
                          
                          <div className={`mt-8 px-6 py-2 rounded-full font-black text-xs uppercase tracking-[0.2em] flex items-center gap-2 ${isConnected ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'}`}>
                              <Activity size={14} className={isConnected ? "animate-bounce" : ""} />
                              {status}
                          </div>
                      </div>
                  </div>

                  {/* RIGHT SIDE: CONTROLS */}
                  <div className="md:w-1/2 p-10 flex flex-col justify-between">
                      <div>
                          <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter leading-tight mb-2">AI WhatsApp Dashboard<br/><span className="text-cyan-600">Connect & Disconnect</span></h2>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                              {getStatusText(status)}
                          </p>
                      </div>

                      <div className="space-y-4 my-6">
                          {/* SHOW CONNECT BUTTON IF OFFLINE OR CHECKING OR SCANNING (REFRESH) */}
                          {(isOfflineOrChecking || isScan) && (
                              <button onClick={handleConnect} className="w-full bg-slate-900 text-white py-4 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-cyan-600 transition-all shadow-lg flex items-center justify-center gap-3 active:scale-95">
                                  <Power size={16} /> {isScan ? "Refresh QR / Restart" : "Connect Super Admin (Force Start)"}
                              </button>
                          )}
                          
                          {/* SHOW DISCONNECT BUTTON IF CONNECTED OR RECONNECTING OR SCANNING (CANCEL) */}
                          {(isConnected || isReconnecting || isScan) && (
                              <button onClick={handleDisconnect} className="w-full bg-red-50 text-red-500 py-4 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-red-100 transition-all border border-red-100 flex items-center justify-center gap-3 active:scale-95">
                                  <Power size={16} /> {isScan ? "Cancel Setup" : "Disconnect System"}
                              </button>
                          )}

                          {/* FORCE SYNC BUTTON (HIDDEN HELPER) */}
                          <div className="flex gap-2">
                              <button onClick={handleForceSync} className="flex-1 bg-slate-50 text-slate-400 py-2 rounded-xl font-bold uppercase tracking-widest text-[8px] hover:bg-slate-100 transition-all flex items-center justify-center gap-2">
                                  <RefreshCw size={10} /> Force Status Sync
                              </button>
                              <button onClick={() => { socket.emit('cmd-refresh-profile'); alert('Permintaan sinkronasi dihantar. Sila tunggu sebentar...'); }} className="flex-1 bg-emerald-50 text-emerald-600 py-2 rounded-xl font-bold uppercase tracking-widest text-[8px] hover:bg-emerald-100 transition-all flex items-center justify-center gap-2">
                                  <User size={10} /> Sync Profil WhatsApp
                              </button>
                          </div>
                      </div>

                      {/* MINI TERMINAL */}
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col h-32 relative">
                          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-200">
                              <Terminal size={12} className="text-slate-400"/>
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">System Logs</span>
                          </div>
                          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1">
                              {logs.map((log, i) => (
                                  <p key={i} className="text-[9px] font-mono text-slate-500 truncate">
                                      <span className="text-cyan-600 mr-2">{'>'}</span>{log.replace(/\[.*?\] /, '')}
                                  </p>
                              ))}
                              <div ref={logEndRef} />
                          </div>
                      </div>

                      <div className="mt-4 text-[8px] text-slate-300 font-black uppercase tracking-widest text-center">
                          © 2026 MNF Engineering Services – Sistem AI pintar untuk WhatsApp
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* 4. FULL TERMINAL TAB */}
      {activeTab === 'terminal' && (
          <div className="flex-1 bg-slate-950 p-6 overflow-hidden flex flex-col">
             <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <Terminal className="text-emerald-500"/>
                    <h2 className="text-white font-bold uppercase tracking-widest">Full System Logs</h2>
                </div>
                <button onClick={clearLogs} className="flex items-center gap-2 bg-red-900/30 text-red-400 border border-red-900/50 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-red-900/50 transition-all active:scale-95">
                    <Trash2 size={14} /> Clear Logs
                </button>
             </div>
             <div className="flex-1 overflow-y-auto font-mono text-xs text-slate-300 border border-slate-800 rounded-xl p-4 bg-black/20">
                 {logs.length === 0 && <p className="text-slate-600 italic">No logs available.</p>}
                 {logs.map((log, idx) => (
                    <div key={idx} className="mb-1 border-b border-slate-800/50 pb-1">
                       <span className="text-emerald-500 mr-2 opacity-50">{log.split(']')[0] ? log.split(']')[0] + ']' : ''}</span>
                       <span>{log.split(']')[1] || log}</span>
                    </div>
                 ))}
                 <div ref={logEndRef} />
             </div>
          </div>
      )}
    </div>
  );
};

export default WhatsAppMonitor;
