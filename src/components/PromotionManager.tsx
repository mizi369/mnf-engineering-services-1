import React, { useState } from 'react';
import { db, TABLES } from '../lib/db';
import { Promotion } from '../types';
import { 
  Megaphone, 
  Plus, 
  Search, 
  Send, 
  Clock, 
  CheckCircle2, 
  BarChart2,
  X,
  Image as ImageIcon,
  Video,
  Users,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Facebook,
  Music2,
  Settings2,
  ExternalLink,
  Gift,
  Edit2,
  Zap,
  XCircle,
  MessageSquare,
  Save,
  Bot
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';

export default function PromotionManager({ showToast }: { showToast: any }) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [autoSend, setAutoSend] = useState(true);
  const [campaigns, setCampaigns] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);

  const [discountRules, setDiscountRules] = useState<Promotion[]>([]);

  const fetchData = async () => {
    try {
      const campaignData = await db.getAll<Promotion>(TABLES.PROMOTIONS);
      setCampaigns(campaignData.filter((c: Promotion) => c.type === 'campaign'));
      setDiscountRules(campaignData.filter((c: Promotion) => c.type === 'discount'));
    } catch (error) {
      console.error('Failed to fetch campaign data', error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchData();
  }, []);

  const [editingRule, setEditingRule] = useState<Promotion | null>(null);
  const [uploadedMedia, setUploadedMedia] = useState<{type: 'image' | 'video', url: string} | null>(null);

  const [newCampaign, setNewCampaign] = useState({
    name: '',
    message: '',
  });

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedMedia({ type, url: reader.result as string });
        showToast(`${type === 'image' ? 'Gambar' : 'Video'} berjaya dimuat naik`, 'success');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: newCampaign.name,
      message: newCampaign.message,
      type: 'campaign',
      status: 'Active',
      date: new Date().toISOString().split('T')[0],
      sent: 0,
      delivered: 0,
      media_url: uploadedMedia?.url,
      media_type: uploadedMedia?.type,
      auto_send: autoSend
    };

    const { error } = await db.insert(TABLES.PROMOTIONS, { ...payload, id: Date.now().toString(), created_at: new Date().toISOString() });
    if (!error) {
      showToast('Iklan & Promosi berjaya dilancarkan!', 'success');
      setIsAddModalOpen(false);
      setNewCampaign({ name: '', message: '' });
      setUploadedMedia(null);
      fetchData();
    } else {
      showToast('Gagal melancarkan kempen', 'error');
    }
  };

  const handleSaveDiscount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRule) return;

    // Check if it's a new rule (doesn't exist in current list) or update
    const isNew = !discountRules.some(r => r.id === editingRule.id);

    if (isNew) {
      const { error } = await db.insert<Promotion>(TABLES.PROMOTIONS, editingRule);
      if (!error) {
        showToast('Syarat diskaun ditambah!', 'success');
        setIsDiscountModalOpen(false);
        fetchData();
      } else {
        showToast('Gagal menambah diskaun', 'error');
      }
    } else {
      const { error } = await db.update<Promotion>(TABLES.PROMOTIONS, editingRule.id, editingRule);
      if (!error) {
        showToast('Syarat diskaun dikemaskini!', 'success');
        setIsDiscountModalOpen(false);
        fetchData();
      } else {
        showToast('Gagal mengemaskini diskaun', 'error');
      }
    }
  };

  const toggleDiscountActive = async (rule: Promotion) => {
    const { error } = await db.update<Promotion>(TABLES.PROMOTIONS, rule.id, { active: !rule.active });
    if (!error) {
      fetchData();
    }
  };

  const handleDeleteCampaign = async (id: string | number) => {
    setCampaigns(prev => prev.filter(c => c.id !== id));
    showToast('Kempen berjaya dipadam', 'error');
    try {
      await db.delete(TABLES.PROMOTIONS, id);
    } catch (error) {
      console.error('Failed to delete campaign', error);
    }
  };

  const handleDeleteDiscount = async (id: string | number) => {
    setDiscountRules(prev => prev.filter(r => r.id !== id));
    showToast('Syarat diskaun berjaya dipadam', 'error');
    try {
      await db.delete(TABLES.PROMOTIONS, id);
    } catch (error) {
      console.error('Failed to delete discount', error);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tight">Iklan & Promosi</h1>
          <p className="text-slate-400 mt-1 font-medium italic">Cipta kempen promosi dan hantar secara automatik kepada pelanggan.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="btn-primary flex items-center gap-2 px-6 py-2.5 text-sm shadow-lg shadow-primary/20"
          >
            <Plus size={18} />
            Cipta Kempen Baru
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel p-6">
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Jumlah Mesej Dihantar</p>
          <h3 className="text-2xl font-black text-white">1,240</h3>
        </div>
        <div className="glass-panel p-6">
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Kadar Penghantaran</p>
          <h3 className="text-2xl font-black text-emerald-500">98.2%</h3>
        </div>
        <div className="glass-panel p-6">
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Kempen Aktif</p>
          <h3 className="text-2xl font-black text-primary">{campaigns.filter(c => c.status === 'Active').length}</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Campaigns */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-panel rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
              <h3 className="font-black text-xs uppercase tracking-widest text-white">Kempen Terkini</h3>
              <button className="text-[10px] font-bold text-primary hover:underline uppercase">Lihat Laporan Penuh</button>
            </div>
            <div className="divide-y divide-white/5">
              {campaigns.map((c, i) => (
                <div key={i} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shadow-inner">
                      <Megaphone size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white">{c.name}</h4>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">{c.date} • {c.sent} Penerima</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-8">
                    <div className="text-center">
                      <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest">Diterima</p>
                      <p className="text-sm font-black text-emerald-500">{c.delivered}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest">Status</p>
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${
                        c.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                      }`}>
                        {c.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => showToast(`Launching campaign: ${c.name}`, 'success')} className="p-2 hover:bg-emerald-500/10 text-emerald-500 rounded-lg transition-all" title="Launch Campaign">
                        <Zap size={16} />
                      </button>
                      <button onClick={() => showToast(`Stopping campaign: ${c.name}`, 'error')} className="p-2 hover:bg-red-500/10 text-red-500 rounded-lg transition-all" title="Stop Campaign">
                        <XCircle size={16} />
                      </button>
                      <button onClick={() => showToast(`Viewing analytics for: ${c.name}`)} className="p-2 hover:bg-white/5 rounded-lg text-slate-400 transition-all" title="View Analytics">
                        <BarChart2 size={16} />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCampaign(c.id);
                        }}
                        className="p-2 hover:bg-red-500/10 text-red-500 rounded-lg transition-colors"
                        title="Delete Campaign"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {campaigns.length === 0 && (
                <div className="p-12 text-center">
                  <Megaphone size={40} className="mx-auto text-slate-800 mb-4" />
                  <p className="text-slate-500 text-sm font-bold uppercase tracking-widest">Tiada kempen aktif</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Automatic Discounts */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-panel p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-black text-xs uppercase tracking-widest text-white flex items-center gap-2">
                <Gift size={18} className="text-primary" />
                Diskaun Automatik
              </h3>
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    setEditingRule({
                      id: Date.now(),
                      title: '',
                      amount: 0,
                      link: '',
                      message: '',
                      active: true,
                      type: 'discount'
                    } as Promotion);
                    setIsDiscountModalOpen(true);
                  }}
                  className="p-1.5 hover:bg-white/10 rounded-lg text-primary transition-colors"
                  title="Tambah Menu"
                >
                  <Plus size={16} />
                </button>
                <button className="p-1.5 hover:bg-white/5 rounded-lg text-slate-500">
                  <Settings2 size={16} />
                </button>
              </div>
            </div>
            
            <div className="space-y-4">
              {discountRules.map((rule) => (
                <div key={rule.id} className="p-4 bg-white/5 border border-white/10 rounded-xl group relative hover:border-primary/30 transition-all">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shadow-inner">
                        {rule.icon || <Gift size={16} />}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white uppercase tracking-tight">{rule.title}</p>
                        <p className="text-[10px] text-primary font-black uppercase tracking-widest">Diskaun RM{rule.amount}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button 
                        onClick={() => { setEditingRule(rule); setIsDiscountModalOpen(true); }}
                        className="p-1.5 hover:bg-white/10 rounded-lg text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Edit"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteDiscount(rule.id);
                        }}
                        className="p-1.5 hover:bg-red-500/10 rounded-lg text-red-500 opacity-0 group-hover:opacity-100 transition-colors"
                        title="Padam"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                  {rule.link && (
                    <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-400 bg-black/20 p-2 rounded-lg font-mono">
                      <ExternalLink size={10} />
                      <span className="truncate flex-1">{rule.link}</span>
                    </div>
                  )}
                  <div className="mt-3 flex items-center justify-between">
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${rule.active ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-slate-800 text-slate-500 border border-slate-700'}`}>
                      {rule.active ? 'Aktif' : 'Tidak Aktif'}
                    </span>
                    <div className={`w-8 h-4 rounded-full relative cursor-pointer transition-colors ${rule.active ? 'bg-primary' : 'bg-slate-700'}`} onClick={() => toggleDiscountActive(rule)}>
                      <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all shadow-sm ${rule.active ? 'right-0.5' : 'left-0.5'}`} />
                    </div>
                  </div>
                </div>
              ))}
              {discountRules.length === 0 && (
                <div className="p-6 text-center border border-dashed border-slate-800 rounded-xl">
                   <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Tiada syarat diskaun</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Campaign Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl glass-panel p-8 relative bg-slate-900 border-slate-800 shadow-2xl rounded-3xl"
            >
              <button onClick={() => setIsAddModalOpen(false)} className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors">
                <X size={24} />
              </button>
              
              <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-6">Cipta Kempen Baharu</h2>
              
              <form onSubmit={handleAddCampaign} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Nama Kempen</label>
                      <input 
                        type="text" 
                        required 
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 transition-all" 
                        placeholder="Contoh: Promosi Raya 2026" 
                        value={newCampaign.name}
                        onChange={(e) => setNewCampaign({...newCampaign, name: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Mesej Promosi</label>
                      <textarea 
                        required 
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 transition-all h-32 resize-none" 
                        placeholder="Tulis mesej anda di sini..."
                        value={newCampaign.message}
                        onChange={(e) => setNewCampaign({...newCampaign, message: e.target.value})}
                      ></textarea>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Media (Gambar/Video)</label>
                      {uploadedMedia ? (
                        <div className="relative w-full h-32 rounded-xl overflow-hidden border border-white/10 group shadow-inner">
                          {uploadedMedia.type === 'image' ? (
                            <img src={uploadedMedia.url} alt="Uploaded Media" className="w-full h-full object-cover" />
                          ) : (
                            <video src={uploadedMedia.url} className="w-full h-full object-cover" controls />
                          )}
                          <button 
                            type="button"
                            onClick={() => setUploadedMedia(null)}
                            className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-red-500/80 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-3">
                          <label className="flex flex-col items-center justify-center gap-2 p-4 border-2 border-dashed border-slate-800 rounded-xl hover:bg-slate-800/50 hover:border-cyan-500/30 transition-all cursor-pointer group">
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleMediaUpload(e, 'image')} />
                            <ImageIcon size={20} className="text-slate-600 group-hover:text-cyan-400 transition-colors" />
                            <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest group-hover:text-cyan-400">Tambah Gambar</span>
                          </label>
                          <label className="flex flex-col items-center justify-center gap-2 p-4 border-2 border-dashed border-slate-800 rounded-xl hover:bg-slate-800/50 hover:border-cyan-500/30 transition-all cursor-pointer group">
                            <input type="file" accept="video/*" className="hidden" onChange={(e) => handleMediaUpload(e, 'video')} />
                            <Video size={20} className="text-slate-600 group-hover:text-cyan-400 transition-colors" />
                            <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest group-hover:text-cyan-400">Tambah Video</span>
                          </label>
                        </div>
                      )}
                    </div>
                    
                    <div className="p-4 bg-cyan-950/20 border border-cyan-900/30 rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-cyan-400">
                          <Bot size={16} />
                          <span className="text-[10px] font-black uppercase tracking-widest">Auto-Send Automation</span>
                        </div>
                        <div className={`w-8 h-4 rounded-full relative cursor-pointer transition-colors ${autoSend ? 'bg-cyan-500' : 'bg-slate-700'}`} onClick={() => setAutoSend(!autoSend)}>
                          <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all shadow-sm ${autoSend ? 'right-0.5' : 'left-0.5'}`} />
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
                        Jika diaktifkan, sistem akan menghantar mesej secara berperingkat untuk mengelakkan akaun WhatsApp disekat.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                  <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest text-slate-400 hover:bg-white/5 transition-all">Batal</button>
                  <button type="submit" className="bg-cyan-600 hover:bg-cyan-500 text-white px-8 py-2.5 rounded-xl font-black uppercase tracking-widest text-xs shadow-lg shadow-cyan-900/50 transition-all">Lancarkan Kempen</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Discount Modal */}
      <AnimatePresence>
        {isDiscountModalOpen && editingRule && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md glass-panel p-8 relative bg-slate-900 border-slate-800 shadow-2xl rounded-3xl"
            >
              <button onClick={() => setIsDiscountModalOpen(false)} className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors">
                <X size={24} />
              </button>
              
              <h2 className="text-xl font-black text-white uppercase tracking-tight mb-6">
                {discountRules.some(r => r.id === editingRule.id) ? 'Edit Syarat Diskaun' : 'Tambah Syarat Diskaun'}
              </h2>
              
              <form onSubmit={handleSaveDiscount} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Tajuk Syarat</label>
                  <input 
                    type="text" 
                    required
                    value={editingRule.title} 
                    onChange={(e) => setEditingRule({...editingRule, title: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 transition-all" 
                    placeholder="Contoh: Diskaun Ahli Baru"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Jumlah Diskaun (RM)</label>
                  <input 
                    type="number" 
                    required
                    value={editingRule.amount} 
                    onChange={(e) => setEditingRule({...editingRule, amount: parseFloat(e.target.value)})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 transition-all" 
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Link Media Sosial (Jika ada)</label>
                  <input 
                    type="text" 
                    value={editingRule.link || ''} 
                    onChange={(e) => setEditingRule({...editingRule, link: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 transition-all" 
                    placeholder="https://facebook.com/..."
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Mesej Automatik (WhatsApp)</label>
                  <textarea 
                    required
                    value={editingRule.message} 
                    onChange={(e) => setEditingRule({...editingRule, message: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 transition-all h-24 resize-none"
                    placeholder="Mesej yang akan dihantar kepada pelanggan..."
                  ></textarea>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-xl">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Status Aktif</span>
                  <div 
                    className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors ${editingRule.active ? 'bg-emerald-500' : 'bg-slate-700'}`} 
                    onClick={() => setEditingRule({...editingRule, active: !editingRule.active})}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${editingRule.active ? 'right-0.5' : 'left-0.5'}`} />
                  </div>
                </div>
                
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-800 mt-6">
                  <button type="button" onClick={() => setIsDiscountModalOpen(false)} className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest text-slate-400 hover:bg-white/5 transition-all">Batal</button>
                  <button type="submit" className="bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-2 rounded-xl font-black uppercase tracking-widest text-xs shadow-lg shadow-cyan-900/50 transition-all flex items-center gap-2">
                    <Save size={16} /> Simpan
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
