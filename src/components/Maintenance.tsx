import React, { useState, useEffect } from 'react';
import { db, TABLES } from '../lib/db';
import { Settings, Plus, Search, Edit2, Trash2, X, Calendar, Wrench, DollarSign } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface MaintenanceRecord {
  id: number;
  item_name: string;
  description: string;
  cost: number;
  date: string;
  status: string;
  payment_type?: 'Debit' | 'Credit';
  payment_method?: string;
}

export default function Maintenance({ showToast }: { showToast: (msg: string, type?: 'success' | 'error' | 'info') => void }) {
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [formData, setFormData] = useState({
    item_name: '',
    description: '',
    cost: '',
    date: new Date().toISOString().split('T')[0],
    status: 'completed',
    payment_type: 'Debit' as 'Debit' | 'Credit',
    payment_method: 'Tunai'
  });

  const fetchRecords = async () => {
    try {
      const data = await db.getAll(TABLES.EXPENSES) as any[];
      // Filter only maintenance records
      const maintenanceData = data.filter(r => r.type === 'maintenance');
      setRecords(maintenanceData);
    } catch (error) {
      showToast('Gagal memuatkan rekod penyelenggaraan', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        item_name: formData.item_name,
        description: formData.description,
        cost: parseFloat(formData.cost) || 0,
        date: formData.date,
        status: formData.status,
        payment_type: formData.payment_type,
        payment_method: formData.payment_method,
        type: 'maintenance'
      };

      const { error } = editingId 
        ? await db.update<any>(TABLES.EXPENSES, editingId, payload)
        : await db.insert<any>(TABLES.EXPENSES, { ...payload, created_at: new Date().toISOString() });

      if (!error) {
        showToast(editingId ? 'Rekod dikemaskini!' : 'Rekod baru ditambah!', 'success');
        
        // Auto-connect to Debit/Credit
        await db.insert(TABLES.TRANSACTIONS, {
          id: `maint-${editingId ? 'upd-' : ''}${Date.now()}`,
          date: formData.date,
          amount: parseFloat(formData.cost) || 0,
          type: formData.payment_type.toLowerCase() as 'debit' | 'credit',
          payment_method: formData.payment_method,
          description: `${editingId ? 'Kemaskini ' : ''}Penyelenggaraan: ${formData.item_name}`,
          source: 'Maintenance'
        });

        setIsModalOpen(false);
        setEditingId(null);
        setFormData({ 
          item_name: '', 
          description: '', 
          cost: '', 
          date: new Date().toISOString().split('T')[0],
          status: 'completed',
          payment_type: 'Debit',
          payment_method: 'Tunai'
        });
        fetchRecords();
      } else {
        showToast('Gagal menyimpan rekod: ' + error.message, 'error');
      }
    } catch (error) {
      showToast('Ralat sistem', 'error');
    }
  };

  const handleEdit = (record: MaintenanceRecord) => {
    setFormData({
      item_name: record.item_name,
      description: record.description || '',
      cost: (record.cost || 0).toString(),
      date: record.date,
      status: record.status || 'completed',
      payment_type: record.payment_type || 'Debit',
      payment_method: record.payment_method || 'Tunai'
    });
    setEditingId(record.id);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number | string) => {
    setRecords(prev => prev.filter(r => r.id !== id));
    showToast('Rekod berjaya dipadam', 'error');
    
    try {
      await db.delete(TABLES.EXPENSES, id);
    } catch (error) {
      console.error('Failed to delete maintenance record', error);
    }
  };

  const filteredRecords = records.filter(r => 
    (r.item_name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
    (r.description && r.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Rekod Penyelenggaraan</h1>
          <p className="text-slate-400 mt-1">Urus rekod penyelenggaraan kenderaan dan peralatan.</p>
        </div>
        <button 
          onClick={() => {
            setEditingId(null);
            setFormData({ 
              item_name: '', 
              description: '', 
              cost: '', 
              date: new Date().toISOString().split('T')[0],
              status: 'completed',
              payment_type: 'Debit',
              payment_method: 'Tunai'
            });
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-all"
        >
          <Plus size={18} />
          Tambah Rekod
        </button>
      </div>

      <div className="glass-panel overflow-hidden">
        <div className="p-6 border-b border-white/10">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
              type="text" 
              placeholder="Cari item atau deskripsi..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-darker border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-secondary transition-all text-white"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 text-slate-400 text-[10px] uppercase tracking-widest font-bold">
                <th className="px-6 py-4">Tarikh</th>
                <th className="px-6 py-4">Item / Kenderaan</th>
                <th className="px-6 py-4">Deskripsi</th>
                <th className="px-6 py-4">Kos (RM)</th>
                <th className="px-6 py-4">Bayaran</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr><td colSpan={7} className="p-10 text-center text-slate-500">Memuatkan data...</td></tr>
              ) : filteredRecords.length === 0 ? (
                <tr><td colSpan={7} className="p-10 text-center text-slate-500">Tiada rekod dijumpai.</td></tr>
              ) : filteredRecords.map((record) => (
                <tr key={record.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-slate-300">
                      <Calendar size={14} className="text-slate-500" />
                      {new Date(record.date).toLocaleDateString('ms-MY')}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Wrench size={14} className="text-secondary" />
                      <p className="font-medium text-sm text-white">{record.item_name}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-slate-400 max-w-[250px] truncate">{record.description || '-'}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1 text-sm font-bold text-white">
                      <DollarSign size={14} className="text-slate-500" />
                      {(record.cost || 0).toFixed(2)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-tighter w-fit ${
                        record.payment_type === 'Credit' ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'
                      }`}>
                        {record.payment_type || 'Debit'}
                      </span>
                      <span className="text-[10px] text-slate-500 font-bold">{record.payment_method || 'Tunai'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider ${
                      record.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                    }`}>
                      {record.status === 'completed' ? 'Selesai' : 'Dalam Proses'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-100 transition-opacity">
                      <button onClick={() => handleEdit(record)} className="p-2 hover:bg-white/5 text-slate-400 rounded-lg" title="Kemaskini">
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(record.id);
                        }}
                        className="p-2 hover:bg-red-500/10 text-red-500 rounded-lg transition-colors"
                        title="Padam"
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

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-dark border border-white/10 w-full max-w-md rounded-2xl shadow-2xl my-8 overflow-hidden"
            >
              <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                <h3 className="font-bold text-lg text-white">{editingId ? 'Kemaskini Rekod' : 'Tambah Rekod Penyelenggaraan'}</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-white">
                  <X size={24} />
                </button>
              </div>
              <form onSubmit={handleSave} className="p-6 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tarikh</label>
                    <input required type="date" className="w-full bg-darker border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-secondary outline-none text-white" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</label>
                    <select className="w-full bg-darker border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-secondary outline-none text-white" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                      <option className="bg-dark" value="completed">Selesai</option>
                      <option className="bg-dark" value="pending">Dalam Proses</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Item / Kenderaan</label>
                  <input required type="text" className="w-full bg-darker border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-secondary outline-none text-white" placeholder="Contoh: Van JWC 1234" value={formData.item_name} onChange={e => setFormData({...formData, item_name: e.target.value})} />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Deskripsi Kerja</label>
                  <textarea required className="w-full bg-darker border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-secondary outline-none h-20 text-white" placeholder="Butiran penyelenggaraan" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                </div>

                <div className="p-4 bg-white/5 rounded-2xl space-y-4 border border-white/5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Maklumat Bayaran</label>
                    <div className="flex bg-darker p-1 rounded-lg border border-white/10">
                      <button 
                        type="button"
                        onClick={() => setFormData({...formData, payment_type: 'Debit'})}
                        className={`px-3 py-1 text-[9px] font-black uppercase rounded-md transition-all ${formData.payment_type === 'Debit' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}
                      >
                        Debit
                      </button>
                      <button 
                        type="button"
                        onClick={() => setFormData({...formData, payment_type: 'Credit'})}
                        className={`px-3 py-1 text-[9px] font-black uppercase rounded-md transition-all ${formData.payment_type === 'Credit' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-500'}`}
                      >
                        Kredit
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Kos (RM)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">RM</span>
                        <input required type="number" step="0.01" className="w-full bg-darker border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:border-secondary outline-none text-white font-bold" placeholder="0.00" value={formData.cost} onChange={e => setFormData({...formData, cost: e.target.value})} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Kaedah</label>
                      <select className="w-full bg-darker border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-secondary outline-none text-white" value={formData.payment_method} onChange={e => setFormData({...formData, payment_method: e.target.value})}>
                        <option className="bg-dark" value="Tunai">Tunai</option>
                        <option className="bg-dark" value="Transfer">Transfer</option>
                        <option className="bg-dark" value="Card">Card</option>
                        <option className="bg-dark" value="Cheque">Cheque</option>
                      </select>
                    </div>
                  </div>
                </div>

                <button type="submit" className="w-full py-4 bg-primary text-white rounded-xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:bg-primary/90 hover:-translate-y-0.5 transition-all mt-2">
                  {editingId ? 'Simpan Perubahan' : 'Tambah Rekod'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
