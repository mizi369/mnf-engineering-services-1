import React, { useState, useEffect } from 'react';
import { Tag, Plus, Trash2, Edit2, DollarSign, X, ShieldCheck, Zap, RefreshCw, Bot, Cat, Lock, DownloadCloud, Sparkles, Wand2 } from 'lucide-react';
import { ServicePrice } from '../types';
import { db, TABLES } from '../lib/db';
import { socket } from '../service/socket';
import { generateContent } from '../service/geminiService';
import ConfirmModal from './ConfirmModal';

const PriceListManager: React.FC = () => {
  const [services, setServices] = useState<ServicePrice[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<ServicePrice>>({
    name: '', price: 0, price_end: 0, description: '', category: ''
  });
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [globalAiNote, setGlobalAiNote] = useState(() => localStorage.getItem('mnf_catalog_ai_note') || '');

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = () => {
    const data = db.getAll<ServicePrice>(TABLES.SERVICES);
    setServices(data);
    syncToAi(data, globalAiNote); // Auto sync on load
  };

  const syncToAi = (data: ServicePrice[], note: string) => {
    // Generate Context String
    const contextStr = data.map(s => {
        const priceDisplay = s.price_end && s.price_end > s.price 
            ? `RM${s.price} - RM${s.price_end}` 
            : `RM${s.price}`;
        return `${s.name}: ${priceDisplay} (${s.description})`;
    }).join(', ');
    
    const fullContext = `${contextStr}\n\nNota Tambahan AI: ${note}`;
    
    localStorage.setItem('mnf_ai_service_context', fullContext);
    localStorage.setItem('mnf_catalog_ai_note', note);
    
    // Auto sync to backend
    socket.emit('cmd-update-ai-context', { serviceCatalog: fullContext });
  };

  const handleGlobalNoteSave = () => {
    syncToAi(services, globalAiNote);
    setMessage("Nota AI Katalog berjaya dikemaskini!");
  };

  const handleAiGenerate = async () => {
    if (!formData.name) {
      setMessage("Sila masukkan nama servis dahulu.");
      return;
    }
    
    setIsGeneratingAi(true);
    const prompt = `Hasilkan satu keterangan ringkas dan profesional (maksimum 150 patah perkataan) untuk servis berikut:
    Nama Servis: ${formData.name}
    Kategori: ${formData.category || 'Servis Aircond'}
    
    Keterangan ini akan digunakan oleh AI Agent untuk menerangkan servis kepada pelanggan. Pastikan ia menarik dan informatif.`;
    
    try {
      const result = await generateContent(prompt);
      if (result) {
        setFormData(prev => ({ ...prev, description: result.trim() }));
      }
    } catch (error) {
      console.error("AI Generation Error:", error);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      db.update(TABLES.SERVICES, editingId, formData);
    } else {
      const newService = { ...formData, id: Date.now().toString() } as ServicePrice;
      db.insert(TABLES.SERVICES, newService);
    }
    const updatedData = db.getAll<ServicePrice>(TABLES.SERVICES);
    setServices(updatedData);
    syncToAi(updatedData, globalAiNote); // Trigger Sync
    closeModal();
    setMessage("Katalog harga dikemaskini & disegerakkan ke AI.");
  };

  const handleEdit = (service: ServicePrice) => {
    setFormData(service);
    setEditingId(service.id);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData({ name: '', price: 0, price_end: 0, description: '', category: '' });
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
      db.delete(TABLES.SERVICES, id);
      const updatedData = db.getAll<ServicePrice>(TABLES.SERVICES);
      setServices(updatedData);
      syncToAi(updatedData, globalAiNote); // Trigger Sync
      setMessage('Servis berjaya dipadam');
      setConfirmDelete(null);
  };

  const loadSampleData = () => {
    const samples = [
      { name: 'Normal Service (Wall Unit 1.0HP - 1.5HP)', price: 80, price_end: 100, description: 'Cuci filter, blower, drain tray, check gas.', category: 'Aircond Service' },
      { name: 'Chemical Overhaul (1.0HP - 1.5HP)', price: 150, price_end: 180, description: 'Cuci kimia indoor & outdoor, check gas.', category: 'Aircond Service' },
      { name: 'Wiring Aircond Point (Dari DB ke unit)', price: 250, price_end: 350, description: 'Pendawaian baru dari DB ke unit aircond.', category: 'Wiring' },
      { name: 'Wiring DB (Distribution Board)', price: 450, price_end: 850, description: 'Pemasangan atau naik taraf papan agihan elektrik.', category: 'Wiring' },
      { name: 'Pemasangan Lampu', price: 25, price_end: 45, description: 'Upah pasang lampu (exclude wiring point).', category: 'Electrical' },
      { name: 'Pemasangan Kipas (Siling/Dinding)', price: 60, price_end: 85, description: 'Upah pasang kipas siling/dinding (exclude wiring point).', category: 'Electrical' },
      { name: 'Pemasangan Water Heater', price: 120, price_end: 180, description: 'Upah pasang pemanas air (exclude wiring point).', category: 'Electrical' },
      { name: 'Pemasangan Aircond (Unit baru)', price: 280, price_end: 350, description: 'Pemasangan unit baru (back to back 10ft copper).', category: 'Installation' },
      { name: 'Pemindahan Aircond (Relocation)', price: 350, price_end: 450, description: 'Buka unit lama dan pasang di lokasi baru.', category: 'Installation' },
      { name: 'Checking / Troubleshooting', price: 50, price_end: 80, description: 'Caj pemeriksaan kerosakan sistem.', category: 'Checking' },
      { name: 'Caj Tempat Tinggi & Berisiko', price: 50, price_end: 150, description: 'Caj tambahan untuk kerja di tempat tinggi/sukar.', category: 'Others' },
      { name: 'Gas Topup (R32 & R410A)', price: 30, price_end: 80, description: 'Topup gas mengikut bacaan PSI.', category: 'Gas' },
    ];

    samples.forEach((s, i) => {
        db.insert(TABLES.SERVICES, { ...s, id: `SAMPLE-${Date.now()}-${i}` });
    });

    const updatedData = db.getAll<ServicePrice>(TABLES.SERVICES);
    setServices(updatedData);
    syncToAi(updatedData, globalAiNote);
    setMessage("Data contoh berjaya dimuatkan! AI kini mengenali harga-harga ini.");
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center glass-panel p-6 rounded-[2.5rem]">
        <div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
              <Tag className="text-primary" /> Senarai Harga Servis
              <div className="flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-xl border border-white/10 ml-2 shadow-lg hover:scale-105 transition-transform cursor-help" title="Mod Operasi Kucing: Pantas & Sentiasa Bersih">
                <Cat size={14} className="text-secondary" />
                <span className="text-[9px] font-black uppercase tracking-widest text-secondary hidden sm:inline">Kucing</span>
              </div>
          </h2>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest italic">Katalog Harga & Konteks AI Neural</p>
              <div className="flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded border border-white/5">
                  <Lock size={8} className="text-emerald-500"/>
                  <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Memori Kekal & Selamat</span>
              </div>
          </div>
        </div>
        <div className="flex gap-2">
            <button onClick={() => setConfirmDelete('sample')} className="bg-white/5 text-slate-300 border border-white/5 px-4 py-2.5 rounded-xl flex items-center gap-2 hover:bg-white/10 transition-all font-black shadow-sm uppercase text-[10px] tracking-widest active:scale-95">
                <DownloadCloud size={14} /> Muat Contoh
            </button>
            <button onClick={() => setIsModalOpen(true)} className="btn-primary px-5 py-2.5 text-[10px] flex items-center gap-2">
                <Plus size={14} /> Tambah Servis
            </button>
        </div>
      </div>

      {/* AI AUTO-SYNC NOTE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-indigo-50 p-5 rounded-2xl border border-indigo-100 flex items-start gap-4">
          <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl shrink-0">
              <RefreshCw size={20} />
          </div>
          <div>
              <h4 className="text-xs font-black uppercase text-indigo-900 tracking-widest">Integrasi Katalog AI (Auto-Sync)</h4>
              <p className="text-[11px] text-indigo-700 font-medium leading-relaxed mt-1">
                  <strong>NOTA PENTING:</strong> Senarai harga ini adalah <strong>sumber rujukan utama AI Agent</strong>. 
                  Apabila pelanggan bertanya tentang harga, AI akan merujuk data di sini secara masa nyata.
              </p>
          </div>
        </div>

        <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100 flex items-start gap-4">
          <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl shrink-0">
              <Bot size={20} />
          </div>
          <div className="flex-1">
              <h4 className="text-xs font-black uppercase text-emerald-900 tracking-widest">Nota Tambahan AI Agent (Global)</h4>
              <div className="flex gap-2 mt-2">
                <input 
                  type="text" 
                  value={globalAiNote}
                  onChange={(e) => setGlobalAiNote(e.target.value)}
                  className="flex-1 bg-white border border-emerald-200 rounded-lg px-3 py-1.5 text-[11px] text-emerald-900 focus:outline-none focus:border-emerald-500"
                  placeholder="Cth: Semua harga termasuk pengangkutan dalam radius 20km..."
                />
                <button 
                  onClick={handleGlobalNoteSave}
                  className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold hover:bg-emerald-700 transition-all"
                >
                  Simpan
                </button>
              </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map(service => (
          <div key={service.id} className="bg-white/5 rounded-[2.5rem] border border-white/5 p-8 shadow-sm hover:bg-white/[0.08] transition-all group relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5 -mr-4 -mt-4 rotate-12 text-white"><DollarSign size={80} /></div>
            <div className="flex justify-between items-start mb-6">
               <span className="px-3 py-1 bg-white/10 text-slate-400 text-[8px] font-black uppercase tracking-widest rounded-lg border border-white/5">{service.category || 'N/A'}</span>
               <button 
                 onClick={(e) => {
                   e.stopPropagation();
                   setConfirmDelete(service.id);
                 }}
                 className="text-red-400/50 hover:text-red-500 transition-all opacity-100 hover:scale-110 p-1 rounded-lg hover:bg-red-500/10"
                 title="Padam Servis"
               >
                 <Trash2 size={18}/>
               </button>
            </div>
            <h3 className="text-lg font-black text-white uppercase tracking-tight mb-2">{service.name}</h3>
            <p className="text-xs text-slate-400 font-medium mb-6 line-clamp-2">{service.description}</p>
            <div className="flex items-end justify-between border-t border-white/5 pt-6">
               <div className="flex flex-col">
                   <span className="text-[9px] font-black text-slate-500 uppercase mb-1">Anggaran Harga</span>
                   <span className="text-xl font-black text-primary">
                       RM {Number(service.price || 0).toFixed(2)}
                       {service.price_end && service.price_end > service.price && (
                           <span className="text-slate-500 text-lg"> - RM {Number(service.price_end || 0).toFixed(2)}</span>
                       )}
                   </span>
               </div>
               <button onClick={(e) => { e.stopPropagation(); handleEdit(service); }} className="w-8 h-8 bg-white/5 border border-white/5 rounded-lg flex items-center justify-center text-slate-400 hover:bg-primary hover:text-white transition-all shadow-sm active:scale-90"><Edit2 size={14} /></button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl flex items-center justify-center z-[100] p-4">
          <form onSubmit={handleSave} className="bg-white rounded-[3rem] p-10 max-w-lg w-full shadow-2xl border-b-[20px] border-slate-900 animate-in zoom-in duration-300 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-8">
               <div className="flex items-center gap-4"><div className="w-12 h-12 bg-slate-900 text-cyan-400 rounded-2xl flex items-center justify-center shadow-2xl"><Plus size={24}/></div><h3 className="text-xl font-black text-slate-900 uppercase">{editingId ? 'Kemaskini Servis' : 'Tambah Servis'}</h3></div>
               <button type="button" onClick={closeModal} className="text-slate-400 hover:text-red-500"><X size={20}/></button>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-700 tracking-widest ml-1">Nama Perkhidmatan (Servis)</label>
                <input required type="text" className="w-full border-slate-300 border-2 bg-slate-50 rounded-2xl p-4 font-black text-sm text-slate-900 outline-none focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 transition-all placeholder:text-slate-400" placeholder="Cth: Chemical Wash 1.5HP" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              
              {/* PRICE RANGE INPUTS */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-700 tracking-widest ml-1">Harga Dasar (RM)</label>
                    <input required type="number" className="w-full border-slate-300 border-2 bg-slate-50 rounded-2xl p-4 font-black text-lg text-cyan-700 outline-none focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 transition-all placeholder:text-slate-400" placeholder="0.00" value={formData.price} onChange={e => setFormData({...formData, price: Number(e.target.value)})} />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-700 tracking-widest ml-1">Harga Maksimum (Jika ada julat)</label>
                    <input type="number" className="w-full border-slate-300 border-2 bg-slate-50 rounded-2xl p-4 font-black text-lg text-slate-700 outline-none focus:ring-4 focus:ring-slate-500/10 focus:border-slate-500 transition-all placeholder:text-slate-400" placeholder="Optional" value={formData.price_end || ''} onChange={e => setFormData({...formData, price_end: Number(e.target.value)})} />
                </div>
              </div>

              <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-700 tracking-widest ml-1">Kategori Servis</label>
                  <input required type="text" className="w-full border-slate-300 border-2 bg-slate-50 rounded-2xl p-4 font-black text-sm text-slate-900 outline-none focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 transition-all placeholder:text-slate-400" placeholder="Cth: Servis / Baiki / Pemasangan" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} />
              </div>
              
              <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-700 tracking-widest ml-1 flex items-center justify-between">
                    <span className="flex items-center gap-1"><Zap size={12}/> Info Servis (Rujukan AI)</span>
                    <button 
                      type="button"
                      onClick={handleAiGenerate}
                      disabled={isGeneratingAi}
                      className="flex items-center gap-1.5 text-[9px] bg-indigo-100 text-indigo-600 px-2 py-1 rounded-lg hover:bg-indigo-200 transition-all disabled:opacity-50"
                    >
                      {isGeneratingAi ? <RefreshCw size={10} className="animate-spin" /> : <Sparkles size={10} />}
                      {isGeneratingAi ? 'Menjana...' : 'Jana dengan AI'}
                    </button>
                  </label>
                  <textarea className="w-full border-slate-300 border-2 bg-slate-50 rounded-2xl p-4 font-bold text-sm text-slate-900 outline-none focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 transition-all placeholder:text-slate-400" rows={3} placeholder="Jelaskan skop kerja untuk AI faham (Contoh: Termasuk gas R32, cuci outdoor unit, waranti 1 bulan)." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
              </div>
              
              <button type="submit" className="w-full bg-slate-900 text-white py-3.5 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl hover:bg-cyan-600 transition-all flex items-center justify-center gap-2 active:scale-95">
                 {editingId ? 'Simpan Perubahan' : 'Simpan Katalog'} <ShieldCheck size={14}/>
              </button>
            </div>
          </form>
        </div>
      )}
      {message && (
        <div className="fixed bottom-4 right-4 bg-primary text-white px-6 py-3 rounded-xl shadow-lg z-[200] animate-in slide-in-from-bottom-4">
          {message}
          <button onClick={() => setMessage(null)} className="ml-4 hover:text-slate-200"><X size={14}/></button>
        </div>
      )}

      <ConfirmModal 
        isOpen={!!confirmDelete}
        title={confirmDelete === 'sample' ? 'Muat Data Contoh' : 'Padam Servis'}
        message={confirmDelete === 'sample' ? 'Adakah anda pasti mahu memuatkan data contoh? Ini akan menambah 9 servis standard ke dalam senarai.' : 'Adakah anda pasti mahu memadam servis ini? Tindakan ini tidak boleh dikembalikan.'}
        onConfirm={() => confirmDelete === 'sample' ? (loadSampleData(), setConfirmDelete(null)) : handleDelete(confirmDelete!)}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
};

export default PriceListManager;
