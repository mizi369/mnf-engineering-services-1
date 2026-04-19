import React, { useState } from 'react';
import { db, TABLES } from '../lib/db';
import { 
  Fuel, 
  Plus, 
  Search, 
  Calendar, 
  CreditCard, 
  Banknote,
  X,
  Trash2,
  TrendingUp,
  MapPin,
  BarChart2,
  FileSpreadsheet,
  Image as ImageIcon,
  Edit2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function FuelExpenses({ showToast }: { showToast: any }) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    description: '',
    type: 'Debit',
    method: 'Transfer'
  });

  const fetchExpenses = async () => {
    try {
      const data = await db.getAll(TABLES.EXPENSES);
      // Filter only fuel expenses
      setExpenses(data.filter((e: any) => e.type === 'fuel'));
    } catch (error) {
      console.error('Failed to fetch expenses', error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchExpenses();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const payload = {
        date: formData.date,
        amount: parseFloat(formData.amount),
        description: formData.description,
        type: 'fuel',
        payment_type: formData.type,
        payment_method: formData.method,
        item_name: 'Fuel'
      };

      const { error } = editingId 
        ? await db.update<any>(TABLES.EXPENSES, editingId, payload)
        : await db.insert<any>(TABLES.EXPENSES, { ...payload, created_at: new Date().toISOString() });

      if (!error) {
        showToast(editingId ? 'Rekod minyak berjaya dikemaskini!' : 'Rekod minyak berjaya disimpan!', 'success');
        
        // Auto-connect to Debit/Credit
        await db.insert(TABLES.TRANSACTIONS, {
          id: `fuel-${editingId ? 'upd-' : ''}${Date.now()}`,
          date: formData.date,
          amount: parseFloat(formData.amount),
          type: 'debit',
          payment_method: formData.method,
          description: `${editingId ? 'Kemaskini ' : '' }Minyak Van: ${formData.description || 'Isi Minyak'}`,
          source: 'Fuel'
        });

        setIsAddModalOpen(false);
        setEditingId(null);
        setFormData({
          date: new Date().toISOString().split('T')[0],
          amount: '',
          description: '',
          type: 'Debit',
          method: 'Transfer'
        });
        fetchExpenses();
      } else {
        showToast('Gagal menyimpan rekod minyak: ' + error.message, 'error');
      }
    } catch (error) {
      showToast('Gagal menyimpan rekod minyak', 'error');
    }
  };

  const handleEdit = (exp: any) => {
    setEditingId(exp.id);
    setFormData({
      date: exp.date,
      amount: exp.amount.toString(),
      description: exp.description,
      type: exp.payment_type || 'Debit',
      method: exp.payment_method || 'Transfer'
    });
    setIsAddModalOpen(true);
  };

  const handleDelete = async (id: number | string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
    showToast('Rekod minyak berjaya dipadam', 'error');
    
    try {
      await db.delete(TABLES.EXPENSES, id);
    } catch (error) {
      console.error('Failed to delete expense', error);
    }
  };

  const totalFuel = expenses.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Perbelanjaan Minyak Van</h1>
          <p className="text-slate-400 mt-1">Pantau kos bahan api dan penggunaan kenderaan syarikat.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => showToast('Generating monthly fuel report...')}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm font-bold text-white hover:bg-white/10 transition-all"
          >
            <BarChart2 size={18} />
            Monthly Report
          </button>
          <button 
            onClick={() => showToast('Exporting fuel records to Excel...')}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm font-bold text-white hover:bg-white/10 transition-all"
          >
            <FileSpreadsheet size={18} />
            Export Excel
          </button>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-all"
          >
            <Plus size={18} />
            Tambah Rekod
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel p-6 rounded-2xl">
          <p className="text-slate-400 text-sm mb-1">Jumlah Belanja Bulan Ini</p>
          <h3 className="text-2xl font-bold text-white">RM {(totalFuel || 0).toFixed(2)}</h3>
        </div>
        <div className="glass-panel p-6 rounded-2xl">
          <p className="text-slate-400 text-sm mb-1">Kekerapan Isi Minyak</p>
          <h3 className="text-2xl font-bold text-secondary">{expenses.length} Kali</h3>
        </div>
        <div className="glass-panel p-6 rounded-2xl">
          <p className="text-slate-400 text-sm mb-1">Purata Sekali Isi</p>
          <h3 className="text-2xl font-bold text-primary">RM {(totalFuel / (expenses.length || 1) || 0).toFixed(2)}</h3>
        </div>
      </div>

      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-white/10">
          <h3 className="font-bold text-sm text-white">Rekod Terkini</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 text-slate-400 text-[10px] uppercase tracking-widest font-bold">
                <th className="px-6 py-4">Tarikh</th>
                <th className="px-6 py-4">Keterangan</th>
                <th className="px-6 py-4">Jumlah</th>
                <th className="px-6 py-4">Bayaran</th>
                <th className="px-6 py-4 text-right">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {loading ? (
                <tr><td colSpan={5} className="p-10 text-center text-slate-500">Loading...</td></tr>
              ) : expenses.map((exp, index) => (
                <tr key={exp.id || index} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-6 py-4 text-sm text-slate-400 font-mono">{exp.date}</td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-white">{exp.description}</p>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-secondary">RM {(exp.amount || 0).toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-primary uppercase">{exp.payment_type}</span>
                      <span className="text-[10px] text-slate-500 uppercase">{exp.payment_method}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 transition-opacity">
                      <button onClick={() => showToast('Viewing receipt image...')} className="p-2 hover:bg-white/5 text-slate-400 rounded-lg" title="View Receipt">
                        <ImageIcon size={16} />
                      </button>
                      <button onClick={() => handleEdit(exp)} className="p-2 hover:bg-white/5 text-slate-400 rounded-lg" title="Edit">
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(exp.id);
                        }}
                        className="p-2 hover:bg-red-500/10 text-red-500 rounded-lg transition-colors"
                        title="Delete"
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
              className="bg-slate-900 border border-white/10 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/20 text-primary rounded-lg">
                    <Fuel size={20} />
                  </div>
                  <h3 className="font-bold text-lg text-white">{editingId ? 'Kemaskini Rekod Minyak' : 'Tambah Rekod Minyak'}</h3>
                </div>
                <button onClick={() => { setIsAddModalOpen(false); setEditingId(null); }} className="text-slate-500 hover:text-white">
                  <X size={24} />
                </button>
              </div>
              <form onSubmit={handleSave} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-white">Tarikh</label>
                  <input 
                    required 
                    type="date" 
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-secondary outline-none"
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-white">Jumlah (RM)</label>
                  <input 
                    required 
                    type="number" 
                    step="0.01"
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-secondary outline-none"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-white">Keterangan / Lokasi</label>
                  <textarea 
                    required 
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-secondary outline-none h-20"
                    placeholder="e.g. Petronas Seksyen 7 - Kerja Site A"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-white">Jenis Bayaran</label>
                    <div className="flex gap-2">
                      {['Debit', 'Kredit'].map(t => (
                        <button 
                          key={t}
                          type="button"
                          onClick={() => setFormData({...formData, type: t})}
                          className={`flex-1 py-2 rounded-xl text-[10px] font-bold border transition-all ${formData.type === t ? 'bg-secondary text-white border-secondary' : 'bg-slate-950 border-white/10 text-slate-500'}`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-white">Kaedah Bayaran</label>
                    <div className="flex gap-2">
                      {['Tunai', 'Transfer'].map(m => (
                        <button 
                          key={m}
                          type="button"
                          onClick={() => setFormData({...formData, method: m})}
                          className={`flex-1 py-2 rounded-xl text-[10px] font-bold border transition-all ${formData.method === m ? 'bg-primary text-white border-primary' : 'bg-slate-950 border-white/10 text-slate-500'}`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <button type="submit" className="w-full py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all">
                    Simpan Rekod
                  </button>
                  <p className="text-[10px] text-slate-500 text-center mt-3 italic">
                    * Rekod akan diselaraskan secara automatik ke Perbelanjaan Harian.
                  </p>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
