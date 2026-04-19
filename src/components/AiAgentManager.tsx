import React, { useState, useEffect } from 'react';
import { 
  Cpu, 
  Brain, 
  MessageSquare, 
  Settings, 
  Save, 
  RefreshCw, 
  ShieldCheck,
  Zap,
  Bot,
  Terminal,
  FileText,
  Users,
  Database,
  GraduationCap,
  Lock,
  Plus,
  Trash2
} from 'lucide-react';
import { socket } from '../service/socket';
import { supabase } from '../service/supabase';

export default function AiAgentManager({ showToast }: { showToast: any }) {
  const [activeTab, setActiveTab] = useState('config');
  const [context, setContext] = useState<any>({
    instructions: '',
    serviceCatalog: '',
    brainContext: '',
    templates: {
      booking: '',
      receipt: '',
      pending: '',
      location: '',
      warranty: ''
    },
    locationInfo: '',
    socialLinks: '',
    targetGroupLink: '',
    isAutoConfirmActive: false
  });

  const [isAiActive, setIsAiActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [qaList, setQaList] = useState<{q: string, a: string}[]>([]);
  const [newQ, setNewQ] = useState('');
  const [newA, setNewA] = useState('');

  useEffect(() => {
    // Fetch initial context
    fetch('/api/context')
      .then(res => res.json())
      .then(data => setContext(data));

    socket.on('ai-status', (status: boolean) => setIsAiActive(status));
    socket.on('neural-log', (log: any) => {
      setLogs(prev => [log, ...prev].slice(0, 50));
    });

    const handleStorage = () => {
      const savedLink = localStorage.getItem('mnf_admin_group_link');
      if (savedLink) {
        setContext((prev: any) => ({ ...prev, targetGroupLink: savedLink }));
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      socket.off('ai-status');
      socket.off('neural-log');
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      // 1. SOCKET EMIT (Immediate Backend Memory Update)
      socket.emit('cmd-update-ai-context', context);
      
      // 2. LOCAL STORAGE (Consistency across tabs)
      localStorage.setItem('mnf_ai_system_instructions', context.instructions);
      localStorage.setItem('mnf_ai_template_booking', context.templates.booking);
      localStorage.setItem('mnf_ai_template_location', context.templates.location);
      localStorage.setItem('mnf_ai_template_warranty', context.templates.warranty);
      localStorage.setItem('mnf_ai_template_paid', context.templates.receipt);
      localStorage.setItem('mnf_ai_template_pending', context.templates.pending);
      localStorage.setItem('mnf_ai_is_auto_confirm', context.isAutoConfirmActive ? 'true' : 'false');
      
      if (context.targetGroupLink) {
        localStorage.setItem('mnf_admin_group_link', context.targetGroupLink);
      }
      
      // 3. SUPABASE SYNC (Permanent Memory)
      if (supabase.isConfigured) {
        const { error: settingsError } = await supabase.from('mnf_settings').upsert([
          { setting_key: 'ai_system_instructions', setting_value: context.instructions },
          { setting_key: 'mnf_admin_group_link', setting_value: context.targetGroupLink },
          { setting_key: 'ai_is_auto_confirm', setting_value: context.isAutoConfirmActive ? 'true' : 'false' }
        ], { onConflict: 'setting_key' });

        if (settingsError) console.error('Supabase AI Settings Error:', settingsError);

        // Sync Templates to Supabase
        const templatesPayload = [
          { code: 'booking', content: context.templates.booking },
          { code: 'location', content: context.templates.location },
          { code: 'warranty', content: context.templates.warranty },
          { code: 'receipt', content: context.templates.receipt },
          { code: 'pending', content: context.templates.pending }
        ];

        const { error: templatesError } = await supabase.from('mnf_templates').upsert(templatesPayload, { onConflict: 'code' });
        if (templatesError) console.error('Supabase AI Templates Error:', templatesError);
      } else {
        console.warn('[SUPABASE] Sync skipped: Supabase not configured.');
        showToast('AI Updated (Local Only - Supabase not connected)');
        setIsSaving(false);
        return;
      }
      
      showToast('AI Neural Context Updated Successfully!');
    } catch (e) {
      console.error('AI Save Error:', e);
      showToast('Gagal mengemaskini AI Context');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleAi = () => {
    socket.emit('cmd-toggle-ai', !isAiActive);
  };

  const handleAddQA = () => {
    if (!newQ || !newA) return;
    setQaList([...qaList, { q: newQ, a: newA }]);
    setNewQ('');
    setNewA('');
    showToast('Soalan & Jawapan ditambah ke Bank Data');
  };

  const handleRemoveQA = (index: number) => {
    if (!confirm('Padam soalan & jawapan ini?')) return;
    setQaList(qaList.filter((_, i) => i !== index));
    showToast('Soalan & Jawapan dipadam');
  };

  const tabs = [
    { id: 'config', label: 'Konfigurasi Utama', icon: Settings },
    { id: 'templates', label: 'Templat Mesej', icon: FileText },
    { id: 'qa', label: 'Bank Data Q&A', icon: Database },
    { id: 'training', label: 'Latihan AI', icon: GraduationCap },
    { id: 'logs', label: 'Log Pembelajaran', icon: Terminal },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/50 p-6 rounded-2xl border border-white/5">
        <div>
          <h3 className="text-lg font-black uppercase tracking-tight text-white flex items-center gap-2">
            <Brain className="text-primary" />
            Neural Control Center
          </h3>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Pengurusan Kecerdasan & Konteks Langsung</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={toggleAi}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold shadow-lg transition-all ${
              isAiActive 
                ? 'bg-green-500 text-white shadow-green-500/20' 
                : 'bg-red-500 text-white shadow-red-500/20'
            }`}
          >
            <Zap size={18} className={isAiActive ? 'animate-pulse' : ''} />
            Auto Reply AI: {isAiActive ? 'ON' : 'OFF'}
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2 bg-secondary text-white rounded-lg text-sm font-bold shadow-lg shadow-secondary/20 hover:scale-105 transition-all disabled:opacity-50"
          >
            {isSaving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
            Simpan & Validasi
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto scrollbar-hide gap-2 border-b border-white/10 pb-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === tab.id 
                ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                : 'text-gray-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-6">
          
          {activeTab === 'config' && (
            <div className="bg-slate-900/50 border border-white/10 p-6 rounded-2xl space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                <div className="p-2 rounded-lg bg-secondary/10 text-secondary">
                  <Brain size={20} />
                </div>
                <h3 className="font-bold text-white">Arahan Sistem (The Brain)</h3>
              </div>
              <textarea 
                value={context.instructions}
                onChange={(e) => setContext({ ...context, instructions: e.target.value })}
                className="w-full h-40 bg-slate-950 border border-white/10 rounded-xl p-4 text-sm text-white focus:outline-none focus:border-secondary transition-all font-mono"
                placeholder="Masukkan arahan teras AI di sini..."
              />

            </div>
          )}

          {activeTab === 'templates' && (
            <div className="bg-slate-900/50 border border-white/10 p-6 rounded-2xl space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <FileText size={20} />
                </div>
                <h3 className="font-bold text-white">Templat Mesej</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                      Templat Booking Service
                    </label>
                    <button 
                      onClick={() => setContext({
                        ...context,
                        templates: {
                          ...context.templates,
                          booking: `[BOOKING SERVICE JOB][CONFIRM JOB]\nNama: [Nama Pelanggan]\nTarikh: [YYYY-MM-DD]\nMasa: [9AM-11AM / 11AM-1PM / 1PM-3PM / 3PM-5PM]\nServis: [Jenis Servis]\nUnit: [Jumlah Unit]\nAlamat: [Alamat Penuh]\nNo. Tel: [Nombor Telefon]\nTeam: [Team A/B]`
                        }
                      })}
                      className="text-[9px] bg-primary/10 text-primary px-2 py-0.5 rounded hover:bg-primary/20 transition-all font-bold"
                    >
                      Guna Format Standard
                    </button>
                  </div>
                  <textarea 
                    value={context.templates.booking}
                    onChange={(e) => setContext({ 
                      ...context, 
                      templates: { ...context.templates, booking: e.target.value } 
                    })}
                    className="w-full h-40 bg-slate-950 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-secondary transition-all font-mono"
                    placeholder="Contoh: [BOOKING SERVICE JOB][CONFIRM JOB]..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                    Templat Resit (Bayaran Diterima)
                  </label>
                  <textarea 
                    value={context.templates.receipt}
                    onChange={(e) => setContext({ 
                      ...context, 
                      templates: { ...context.templates, receipt: e.target.value } 
                    })}
                    className="w-full h-24 bg-slate-950 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-secondary transition-all"
                    placeholder="Contoh: Terima kasih. Bayaran RM [TOTAL] diterima."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                    Templat Peringatan Bayaran
                  </label>
                  <textarea 
                    value={context.templates.pending}
                    onChange={(e) => setContext({ 
                      ...context, 
                      templates: { ...context.templates, pending: e.target.value } 
                    })}
                    className="w-full h-24 bg-slate-950 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-secondary transition-all"
                    placeholder="Contoh: Mohon jelaskan baki RM [TOTAL]."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                    Templat Lokasi Pelanggan
                  </label>
                  <textarea 
                    value={context.templates.location}
                    onChange={(e) => setContext({ 
                      ...context, 
                      templates: { ...context.templates, location: e.target.value } 
                    })}
                    className="w-full h-24 bg-slate-950 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-secondary transition-all"
                    placeholder="Contoh: Berikut adalah lokasi kami: [MAP_URL]"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                    Templat Waranti Service & Alat Ganti
                  </label>
                  <textarea 
                    value={context.templates.warranty}
                    onChange={(e) => setContext({ 
                      ...context, 
                      templates: { ...context.templates, warranty: e.target.value } 
                    })}
                    className="w-full h-24 bg-slate-950 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-secondary transition-all"
                    placeholder="Contoh: Waranti servis dan alat ganti kami adalah [TEMPOH]."
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'qa' && (
            <div className="bg-slate-900/50 border border-white/10 p-6 rounded-2xl space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                  <Database size={20} />
                </div>
                <h3 className="font-bold text-white">Bank Data Soalan & Jawapan</h3>
              </div>
              
              <div className="space-y-4">
                {qaList.map((qa, i) => (
                  <div key={i} className="p-4 bg-slate-950 border border-white/10 rounded-xl relative group">
                    <button 
                      onClick={() => handleRemoveQA(i)}
                      className="absolute top-2 right-2 p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <span className="text-secondary font-bold">Q:</span>
                        <p className="text-sm text-white">{qa.q}</p>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-primary font-bold">A:</span>
                        <p className="text-sm text-gray-400">{qa.a}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'training' && (
            <div className="bg-slate-900/50 border border-white/10 p-6 rounded-2xl space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500">
                  <GraduationCap size={20} />
                </div>
                <h3 className="font-bold text-white">Tambah Latihan AI</h3>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400">Soalan Pelanggan (Q)</label>
                  <input 
                    type="text"
                    value={newQ}
                    onChange={(e) => setNewQ(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-secondary transition-all"
                    placeholder="Contoh: Kedai buka pukul berapa?"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400">Jawapan AI (A)</label>
                  <textarea 
                    value={newA}
                    onChange={(e) => setNewA(e.target.value)}
                    className="w-full h-24 bg-slate-950 border border-white/10 rounded-lg p-4 text-sm text-white focus:outline-none focus:border-secondary transition-all"
                    placeholder="Contoh: Kami beroperasi dari 9 pagi hingga 6 petang setiap hari."
                  />
                </div>
                <button 
                  onClick={handleAddQA}
                  className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg text-sm font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all w-full justify-center"
                >
                  <Plus size={18} />
                  Simpan ke Bank Data
                </button>
              </div>
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="bg-slate-900/50 border border-white/10 rounded-2xl overflow-hidden flex flex-col h-[600px] animate-in fade-in slide-in-from-bottom-4">
              <div className="p-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
                <h3 className="font-bold text-sm flex items-center gap-2 text-white">
                  <Terminal size={16} />
                  Log Pembelajaran & Aktiviti
                </h3>
                <div className="flex gap-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-4 font-mono text-xs scrollbar-hide">
                {logs.length === 0 ? (
                  <div className="text-gray-600 italic text-center mt-10">Menunggu aktiviti neural...</div>
                ) : (
                  logs.map((log, i) => (
                    <div key={i} className="border-l-2 border-secondary pl-4 py-2 bg-white/5 rounded-r-xl">
                      <div className="flex justify-between text-gray-500 mb-2">
                        <span>[{log.timestamp}]</span>
                        <span className="text-secondary font-bold bg-secondary/10 px-2 py-0.5 rounded">{log.step}</span>
                      </div>
                      <div className="text-gray-300 break-words leading-relaxed">{log.detail}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

        </div>

        {/* Sidebar Info & Validation */}
        <div className="space-y-6">
          <div className="bg-slate-900/50 border border-white/10 p-6 rounded-2xl space-y-4">
            <h3 className="font-bold flex items-center gap-2 text-white">
              <ShieldCheck size={18} className="text-green-500" />
              Status Enjin
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl">
                <span className="text-xs text-gray-400">Model AI</span>
                <span className="text-xs font-bold text-secondary">Gemini 3 Flash</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl">
                <span className="text-xs text-gray-400">Auto-Confirm</span>
                <button 
                  onClick={() => setContext({ ...context, isAutoConfirmActive: !context.isAutoConfirmActive })}
                  className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${context.isAutoConfirmActive ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-400'}`}
                >
                  {context.isAutoConfirmActive ? 'AKTIF' : 'MATI'}
                </button>
              </div>
              <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl">
                <span className="text-xs text-gray-400">Auto-Heal</span>
                <span className="text-xs font-bold text-green-500">AKTIF</span>
              </div>
            </div>
            <div className="pt-4 space-y-3">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                <Users size={12} /> ID Kumpulan Admin
              </label>
              <input 
                type="text"
                value={context.targetGroupLink}
                onChange={(e) => setContext({ ...context, targetGroupLink: e.target.value })}
                className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-secondary transition-all"
                placeholder="ID Kumpulan (cth. 123456789@g.us)"
              />
            </div>
          </div>

          <div className="bg-slate-900/50 border border-white/10 p-6 rounded-2xl space-y-4">
            <h3 className="font-bold flex items-center gap-2 text-white">
              <Lock size={18} className="text-primary" />
              Kunci & Validasi
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Pastikan semua konfigurasi disemak sebelum dikunci untuk mengelakkan ralat pada balasan AI.
            </p>
            <button 
              onClick={handleSave}
              className="w-full flex items-center justify-center gap-2 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold text-white transition-all border border-white/10"
            >
              <ShieldCheck size={14} />
              Sahkan Konfigurasi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
