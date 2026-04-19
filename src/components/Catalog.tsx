import React, { useState, useEffect } from 'react';
import { db, TABLES } from '../lib/db';
import { 
  Tag, 
  Search, 
  Plus, 
  Filter, 
  ChevronRight, 
  Info,
  X,
  Edit2,
  Trash2,
  Globe,
  Printer,
  FileSpreadsheet,
  TrendingUp,
  Sparkles,
  RefreshCw,
  Save,
  Bot
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateContent } from '../service/geminiService';
import { socket } from '../service/socket';

export default function Catalog({ showToast }: { showToast: (msg: string, type?: 'success' | 'error' | 'info') => void }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [globalAiNote, setGlobalAiNote] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    category: 'Aircond Service',
    otherCategory: '',
    unit: '',
    price: '',
    priceEnd: '',
    description: ''
  });

  const fetchCatalog = async () => {
    try {
      const data = await db.getAll(TABLES.SERVICES);
      setItems(data);
      const savedNote = db.getSetting('catalog_ai_note', '');
      setGlobalAiNote(savedNote);
      syncToAi(data, savedNote);
    } catch (error) {
      showToast('Gagal memuatkan katalog', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadSampleData = async () => {
    const samples = [
      { name: 'Normal Service (Wall Unit 1.0HP - 1.5HP)', price: 80, price_end: 100, description: 'Cuci filter, blower, drain tray, check gas.', category: 'Aircond Service', unit: 'Unit' },
      { name: 'Chemical Overhaul (1.0HP - 1.5HP)', price: 150, price_end: 180, description: 'Cuci kimia indoor & outdoor, check gas.', category: 'Aircond Service', unit: 'Unit' },
      { name: 'Wiring Aircond Point (Dari DB ke unit)', price: 250, price_end: 350, description: 'Pendawaian baru dari DB ke unit aircond.', category: 'Wiring', unit: 'Point' },
      { name: 'Wiring DB (Distribution Board)', price: 450, price_end: 850, description: 'Pemasangan atau naik taraf papan agihan elektrik.', category: 'Wiring', unit: 'Set' },
      { name: 'Pemasangan Lampu', price: 25, price_end: 45, description: 'Upah pasang lampu (exclude wiring point).', category: 'Electrical', unit: 'Point' },
      { name: 'Pemasangan Kipas (Siling/Dinding)', price: 60, price_end: 85, description: 'Upah pasang kipas siling/dinding (exclude wiring point).', category: 'Electrical', unit: 'Unit' },
      { name: 'Pemasangan Water Heater', price: 120, price_end: 180, description: 'Upah pasang pemanas air (exclude wiring point).', category: 'Electrical', unit: 'Unit' },
      { name: 'Pemasangan Aircond (Unit baru)', price: 280, price_end: 350, description: 'Pemasangan unit baru (back to back 10ft copper).', category: 'Installation', unit: 'Unit' },
      { name: 'Pemindahan Aircond (Relocation)', price: 350, price_end: 450, description: 'Buka unit lama dan pasang di lokasi baru.', category: 'Installation', unit: 'Unit' },
      { name: 'Checking / Troubleshooting', price: 50, price_end: 80, description: 'Caj pemeriksaan kerosakan sistem.', category: 'Checking', unit: 'Trip' },
      { name: 'Caj Tempat Tinggi & Berisiko', price: 50, price_end: 150, description: 'Caj tambahan untuk kerja di tempat tinggi/sukar.', category: 'Others', unit: 'Trip' },
      { name: 'Gas Topup (R32 & R410A)', price: 30, price_end: 80, description: 'Topup gas mengikut bacaan PSI.', category: 'Gas', unit: 'PSI' },
    ];

    try {
      showToast('Memuatkan data contoh...', 'info');
      for (const s of samples) {
        await db.insert(TABLES.SERVICES, { ...s, is_active: true });
      }
      showToast('Data contoh berjaya dimuatkan!', 'success');
      fetchCatalog();
    } catch (error) {
      showToast('Gagal memuatkan data contoh', 'error');
    }
  };

  const syncToAi = async (data: any[], note: string) => {
    const contextStr = data.map(s => {
        const hasRange = s.price_end && parseFloat(s.price_end) > parseFloat(s.price);
        const isPlus = !s.price_end || parseFloat(s.price_end) === 0;
        
        const priceDisplay = hasRange 
            ? `RM${s.price} - RM${s.price_end}` 
            : (isPlus ? `RM${s.price}+` : `RM${s.price}`);
            
        return `${s.name}: ${priceDisplay} (${s.description || 'Tiada keterangan'})`;
    }).join(', ');
    
    const fullContext = `${contextStr}\n\nNota Tambahan AI: ${note}`;
    localStorage.setItem('mnf_ai_service_context', fullContext);
    await db.saveSetting('catalog_ai_note', note);
    socket.emit('cmd-update-ai-context', { serviceCatalog: fullContext });
  };

  const handleGlobalNoteSave = () => {
    syncToAi(items, globalAiNote);
    showToast('Nota AI Katalog berjaya dikemaskini!', 'success');
  };

  const handleAiGenerate = async () => {
    if (!formData.name) {
      showToast('Sila masukkan nama servis dahulu.', 'error');
      return;
    }
    
    setIsGeneratingAi(true);
    const prompt = `Hasilkan satu keterangan ringkas dan profesional (maksimum 150 patah perkataan) untuk servis berikut:
    Nama Servis: ${formData.name}
    Kategori: ${formData.category === 'Lain-lain' ? formData.otherCategory : formData.category}
    
    Keterangan ini akan digunakan oleh AI Agent untuk menerangkan servis kepada pelanggan. Pastikan ia menarik dan informatif.`;
    
    try {
      const result = await generateContent(prompt);
      if (result) {
        setFormData(prev => ({ ...prev, description: result.trim() }));
      }
    } catch (error) {
      console.error("AI Generation Error:", error);
      showToast('Gagal menjana keterangan AI', 'error');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
  }, []);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const finalCategory = formData.category === 'Lain-lain' ? formData.otherCategory : formData.category;
      
      if (formData.category === 'Lain-lain' && !formData.otherCategory.trim()) {
        showToast('Sila nyatakan kategori lain', 'error');
        return;
      }

      const payload = {
        name: formData.name,
        category: finalCategory,
        unit: formData.unit,
        price: parseFloat(formData.price),
        price_end: parseFloat(formData.priceEnd),
        description: formData.description,
        is_active: true
      };

      const { error } = editingId 
        ? await db.update<any>(TABLES.SERVICES, editingId, payload)
        : await db.insert<any>(TABLES.SERVICES, payload);

      if (!error) {
        showToast(editingId ? 'Katalog dikemaskini!' : 'Katalog ditambah!', 'success');
        setIsAddModalOpen(false);
        setEditingId(null);
        setFormData({
          name: '',
          category: 'Aircond Service',
          otherCategory: '',
          unit: '',
          price: '',
          priceEnd: '',
          description: ''
        });
        fetchCatalog();
      } else {
        showToast('Gagal menyimpan katalog: ' + error.message, 'error');
      }
    } catch (error) {
      showToast('Gagal menyimpan katalog', 'error');
    }
  };

  const handleEditItem = (item: any) => {
    setEditingId(item.id);
    const standardCategories = ['Aircond Service', 'Installation', 'Electrical', 'Repair'];
    const isOther = !standardCategories.includes(item.category);
    
    setFormData({
      name: item.name,
      category: isOther ? 'Lain-lain' : item.category,
      otherCategory: isOther ? item.category : '',
      unit: item.unit || '',
      price: item.price?.toString() || '',
      priceEnd: item.price_end?.toString() || '',
      description: item.description || ''
    });
    setIsAddModalOpen(true);
  };

  const handleDeleteItem = async (id: number | string) => {
    try {
      await db.delete(TABLES.SERVICES, id);
      showToast('Item berjaya dipadam', 'error');
      fetchCatalog();
    } catch (error) {
      console.error('Failed to delete item', error);
      showToast('Gagal memadam item', 'error');
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const coName = localStorage.getItem('mnf_co_name') || 'MNF HUB';
    const coPhone = localStorage.getItem('mnf_co_phone') || '';
    const coAddress = localStorage.getItem('mnf_co_address') || '';

    const html = `
      <html>
        <head>
          <title>Katalog Harga - ${coName}</title>
          <style>
            body { font-family: 'Inter', sans-serif; padding: 40px; color: #333; }
            .header { text-align: center; border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 30px; }
            .co-name { font-size: 24px; font-weight: 800; text-transform: uppercase; color: #d32f2f; }
            .co-info { font-size: 12px; color: #666; margin-top: 5px; }
            .title { font-size: 18px; font-weight: 700; margin-bottom: 20px; text-align: center; text-transform: uppercase; }
            table { width: 100%; border-collapse: collapse; }
            th { background: #f8f9fa; text-align: left; padding: 12px; font-size: 10px; text-transform: uppercase; border-bottom: 2px solid #eee; }
            td { padding: 12px; font-size: 12px; border-bottom: 1px solid #eee; vertical-align: top; }
            .price { font-weight: 700; color: #d32f2f; white-space: nowrap; }
            .category { font-size: 10px; font-weight: 700; color: #666; text-transform: uppercase; }
            .footer { margin-top: 50px; font-size: 10px; color: #999; text-align: center; }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="co-name">${coName}</div>
            <div class="co-info">${coAddress}</div>
            <div class="co-info">Tel: ${coPhone}</div>
          </div>
          <div class="title">Katalog Harga Servis & Produk</div>
          <table>
            <thead>
              <tr>
                <th>Kategori</th>
                <th>Nama Servis / Produk</th>
                <th>Unit</th>
                <th>Harga (RM)</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(item => `
                <tr>
                  <td class="category">${item.category}</td>
                  <td>
                    <div style="font-weight: 600;">${item.name}</div>
                    <div style="font-size: 10px; color: #666; margin-top: 2px;">${item.description || ''}</div>
                  </td>
                  <td>${item.unit || '-'}</td>
                  <td class="price">
                    ${item.price_end && parseFloat(item.price_end) > parseFloat(item.price)
                      ? `${item.price.toFixed(2)} - ${item.price_end.toFixed(2)}` 
                      : (!item.price_end || parseFloat(item.price_end) === 0 ? `${item.price.toFixed(2)}+` : item.price.toFixed(2))}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="footer">
            Dicetak pada: ${new Date().toLocaleString()} | MNF Engineering AI System
          </div>
          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => window.close(), 500);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const filteredItems = items.filter(item => {
    const nameMatch = item.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const catMatch = item.category?.toLowerCase().includes(searchQuery.toLowerCase());
    const unitMatch = item.unit?.toLowerCase().includes(searchQuery.toLowerCase());
    return nameMatch || catMatch || unitMatch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Katalog Harga</h1>
          <p className="text-slate-400 mt-1">Senarai lengkap harga servis dan produk MNF Aircond & Electrical.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={loadSampleData}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-sm font-bold hover:bg-indigo-500/20 transition-all text-indigo-400"
          >
            <RefreshCw size={18} />
            Muat Contoh
          </button>
          <button 
            onClick={() => {
              syncToAi(items, globalAiNote);
              showToast('Katalog Harga berjaya disimpan & disegerakkan ke AI!', 'success');
            }}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-sm font-bold hover:bg-emerald-500/20 transition-all text-emerald-400"
          >
            <Save size={18} />
            Simpan Katalog
          </button>
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm font-bold hover:bg-white/10 transition-all text-slate-300"
          >
            <Printer size={18} />
            Cetak PDF
          </button>
          <button 
            onClick={() => showToast('Exporting catalog to Excel...', 'info')}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm font-bold hover:bg-white/10 transition-all text-slate-300"
          >
            <FileSpreadsheet size={18} />
            Export Excel
          </button>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-all"
          >
            <Plus size={18} />
            Tambah Produk
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-indigo-900/20 p-5 rounded-2xl border border-indigo-500/20 flex items-start gap-4">
          <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl shrink-0">
              <RefreshCw size={20} />
          </div>
          <div>
              <h4 className="text-xs font-black uppercase text-indigo-300 tracking-widest">Integrasi Katalog AI (Auto-Sync)</h4>
              <p className="text-[11px] text-indigo-400/80 font-medium leading-relaxed mt-1">
                  <strong>NOTA PENTING:</strong> Senarai harga ini adalah <strong>sumber rujukan utama AI Agent</strong>. 
                  Apabila pelanggan bertanya tentang harga, AI akan merujuk data di sini secara masa nyata.
              </p>
          </div>
        </div>

        <div className="bg-emerald-900/20 p-5 rounded-2xl border border-emerald-500/20 flex items-start gap-4">
          <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl shrink-0">
              <Bot size={20} />
          </div>
          <div className="flex-1">
              <h4 className="text-xs font-black uppercase text-emerald-300 tracking-widest">Nota Tambahan AI Agent (Global)</h4>
              <div className="flex gap-2 mt-2">
                <input 
                  type="text" 
                  value={globalAiNote}
                  onChange={(e) => setGlobalAiNote(e.target.value)}
                  className="flex-1 bg-darker border border-emerald-500/20 rounded-lg px-3 py-1.5 text-[11px] text-emerald-100 focus:outline-none focus:border-emerald-500"
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

      <div className="glass-panel overflow-hidden">
        <div className="p-6 border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
              type="text" 
              placeholder="Cari servis, kategori atau unit..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-darker border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-secondary transition-all text-white"
            />
          </div>
          <div className="flex items-center gap-3">
            <button className="p-2 hover:bg-white/5 rounded-lg text-slate-400">
              <Filter size={18} />
            </button>
            <select 
              className="bg-darker border border-white/10 rounded-lg px-3 py-1.5 text-xs focus:outline-none text-white"
              onChange={(e) => {
                const val = e.target.value;
                if (val === 'Semua Kategori') {
                  setSearchQuery('');
                } else {
                  setSearchQuery(val);
                }
              }}
            >
              <option className="bg-dark">Semua Kategori</option>
              {Array.from(new Set(items.map(item => item.category))).map(cat => (
                <option key={cat} className="bg-dark" value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 text-slate-400 text-[10px] uppercase tracking-widest font-bold">
                <th className="px-6 py-4">No.</th>
                <th className="px-6 py-4">Kategori & Nama Servis</th>
                <th className="px-6 py-4">Unit</th>
                <th className="px-6 py-4">Harga Mula</th>
                <th className="px-6 py-4">Harga Akhir</th>
                <th className="px-6 py-4">Keterangan</th>
                <th className="px-6 py-4 text-right">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredItems.map((item, index) => (
                <tr key={`${item.id || 'new'}-${index}`} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-6 py-4 text-sm font-bold text-slate-500">{index + 1}</td>
                  <td className="px-6 py-4">
                    <p className="text-[10px] font-bold text-secondary uppercase tracking-wider mb-0.5">{item.category}</p>
                    <p className="font-medium text-sm text-white">{item.name}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-400">{item.unit}</td>
                  <td className="px-6 py-4 text-sm font-bold text-emerald-500">
                    RM {Number(item.price || 0).toFixed(2)}
                    {(!item.price_end || parseFloat(item.price_end) === 0) && <span className="text-emerald-400"> +</span>}
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-primary">
                    {Number(item.price_end || 0) > 0 ? `RM ${Number(item.price_end).toFixed(2)}` : <span className="text-slate-600 italic text-[10px]">Open Price</span>}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-start gap-2 max-w-xs">
                      <Info size={14} className="text-slate-600 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{item.description}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => showToast(`Updating price for ${item.name}...`, 'info')} className="p-2 hover:bg-white/5 text-slate-400 rounded-lg" title="Update Price">
                        <TrendingUp size={16} />
                      </button>
                      <button onClick={() => showToast(`Viewing details for ${item.name}...`, 'info')} className="p-2 hover:bg-white/5 text-slate-400 rounded-lg" title="View Details">
                        <Info size={16} />
                      </button>
                      <button 
                        onClick={() => handleEditItem(item)}
                        className="p-2 hover:bg-white/5 text-slate-400 rounded-lg transition-colors"
                        title="Edit Produk"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteItem(item.id);
                        }}
                        className="p-2 hover:bg-red-500/10 text-red-500 rounded-lg transition-colors"
                        title="Delete Produk"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-dark border border-white/10 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                <h3 className="font-bold text-lg text-white">{editingId ? 'Kemaskini Katalog' : 'Tambah Katalog Baru'}</h3>
                <button onClick={() => { setIsAddModalOpen(false); setEditingId(null); }} className="text-slate-500 hover:text-white">
                  <X size={24} />
                </button>
              </div>
              <form onSubmit={handleAddItem} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nama Servis / Item</label>
                  <input 
                    required 
                    type="text" 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-darker border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-secondary outline-none text-white" 
                    placeholder="e.g. Servis Chemical" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Kategori</label>
                  <select 
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="w-full bg-darker border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-secondary outline-none text-white"
                  >
                    <option className="bg-dark">Aircond Service</option>
                    <option className="bg-dark">Installation</option>
                    <option className="bg-dark">Electrical</option>
                    <option className="bg-dark">Repair</option>
                    <option className="bg-dark">Lain-lain</option>
                  </select>
                </div>
                {formData.category === 'Lain-lain' && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-1"
                  >
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Sila Nyatakan Kategori</label>
                    <input 
                      required 
                      type="text" 
                      value={formData.otherCategory}
                      onChange={(e) => setFormData({...formData, otherCategory: e.target.value})}
                      className="w-full bg-darker border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-secondary outline-none text-white" 
                      placeholder="e.g. Plumbing, Cleaning" 
                    />
                  </motion.div>
                )}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Unit</label>
                  <input 
                    required 
                    type="text" 
                    value={formData.unit}
                    onChange={(e) => setFormData({...formData, unit: e.target.value})}
                    className="w-full bg-darker border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-secondary outline-none text-white" 
                    placeholder="e.g. 1.0HP, Per Unit, Per Point" 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Harga Mula (RM)</label>
                    <input 
                      required 
                      type="number" 
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({...formData, price: e.target.value})}
                      className="w-full bg-darker border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-secondary outline-none text-white" 
                      placeholder="0.00" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Harga Akhir (RM) - Opsional</label>
                    <input 
                      type="number" 
                      step="0.01"
                      value={formData.priceEnd}
                      onChange={(e) => setFormData({...formData, priceEnd: e.target.value})}
                      className="w-full bg-darker border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-secondary outline-none text-white" 
                      placeholder="Kosongkan untuk +" 
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                    <span className="flex items-center gap-1">Keterangan (Rujukan AI)</span>
                    <button 
                      type="button"
                      onClick={handleAiGenerate}
                      disabled={isGeneratingAi}
                      className="flex items-center gap-1.5 text-[9px] bg-indigo-500/10 text-indigo-400 px-2 py-1 rounded-lg hover:bg-indigo-500/20 transition-all disabled:opacity-50"
                    >
                      {isGeneratingAi ? <RefreshCw size={10} className="animate-spin" /> : <Sparkles size={10} />}
                      {isGeneratingAi ? 'Menjana...' : 'Jana dengan AI'}
                    </button>
                  </label>
                  <textarea 
                    required 
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full bg-darker border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-secondary outline-none h-24 text-white" 
                    placeholder="Maklumat lanjut tentang servis ini..." 
                  />
                </div>
                <button type="submit" className="w-full py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all mt-4">
                  Simpan Katalog
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
