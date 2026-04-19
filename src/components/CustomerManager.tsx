import React, { useState, useEffect } from 'react';
import { db, TABLES } from '../lib/db';
import { Users, Plus, Search, Edit2, Trash2, X, Phone, MapPin, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Customer {
  id: number;
  name: string;
  phone: string;
  address: string;
  created_at: string;
}

export default function Customers({ showToast }: { showToast: (msg: string, type?: 'success' | 'error' | 'info') => void }) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: ''
  });

  const fetchCustomers = async () => {
    try {
      const data = await db.getAll(TABLES.CUSTOMERS) as Customer[];
      setCustomers(data);
    } catch (error) {
      showToast('Gagal memuatkan senarai pelanggan', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = editingId 
        ? await db.update<any>(TABLES.CUSTOMERS, editingId, formData)
        : await db.insert<any>(TABLES.CUSTOMERS, { ...formData, created_at: new Date().toISOString() });

      if (!error) {
        showToast(editingId ? 'Maklumat pelanggan dikemaskini!' : 'Pelanggan baru ditambah!', 'success');
        setIsModalOpen(false);
        setEditingId(null);
        setFormData({ name: '', phone: '', address: '' });
        fetchCustomers();
      } else {
        showToast('Gagal menyimpan maklumat: ' + error.message, 'error');
      }
    } catch (error) {
      showToast('Ralat sistem', 'error');
    }
  };

  const handleEdit = (customer: Customer) => {
    setFormData({
      name: customer.name,
      phone: customer.phone,
      address: customer.address || ''
    });
    setEditingId(customer.id);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number | string) => {
    setCustomers(prev => prev.filter(c => c.id !== id));
    showToast('Pelanggan berjaya dipadam', 'error');
    
    try {
      await db.delete(TABLES.CUSTOMERS, id);
    } catch (error) {
      console.error('Failed to delete customer', error);
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.phone.includes(searchQuery)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Senarai Pelanggan</h1>
          <p className="text-slate-400 mt-1">Urus maklumat dan rekod pelanggan anda.</p>
        </div>
        <button 
          onClick={() => {
            setEditingId(null);
            setFormData({ name: '', phone: '', address: '' });
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-all"
        >
          <Plus size={18} />
          Tambah Pelanggan
        </button>
      </div>

      <div className="glass-panel overflow-hidden">
        <div className="p-6 border-b border-white/10">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
              type="text" 
              placeholder="Cari nama atau no telefon..." 
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
                <th className="px-6 py-4">Nama Pelanggan</th>
                <th className="px-6 py-4">No. Telefon</th>
                <th className="px-6 py-4">Alamat</th>
                <th className="px-6 py-4">Tarikh Daftar</th>
                <th className="px-6 py-4 text-right">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr><td colSpan={5} className="p-10 text-center text-slate-500">Memuatkan data...</td></tr>
              ) : filteredCustomers.length === 0 ? (
                <tr><td colSpan={5} className="p-10 text-center text-slate-500">Tiada pelanggan dijumpai.</td></tr>
              ) : filteredCustomers.map((customer, index) => (
                <tr key={`cust-${customer.id}-${index}`} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center text-secondary font-bold">
                        {customer.name.charAt(0).toUpperCase()}
                      </div>
                      <p className="font-medium text-sm text-white">{customer.name}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-slate-300">
                      <Phone size={14} className="text-slate-500" />
                      {customer.phone}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-start gap-2 text-sm text-slate-400 max-w-[250px]">
                      <MapPin size={14} className="text-slate-500 mt-0.5 shrink-0" />
                      <span className="truncate">{customer.address || '-'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <Calendar size={14} className="text-slate-500" />
                      {new Date(customer.created_at).toLocaleDateString('ms-MY')}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-100 transition-opacity">
                      <button onClick={() => handleEdit(customer)} className="p-2 hover:bg-white/5 text-slate-400 rounded-lg" title="Kemaskini">
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(customer.id);
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
                <h3 className="font-bold text-lg text-white">{editingId ? 'Kemaskini Pelanggan' : 'Tambah Pelanggan Baru'}</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-white">
                  <X size={24} />
                </button>
              </div>
              <form onSubmit={handleSave} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nama Pelanggan</label>
                  <input required type="text" className="w-full bg-darker border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-secondary outline-none text-white" placeholder="Nama penuh" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">No. Telefon</label>
                  <input required type="text" className="w-full bg-darker border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-secondary outline-none text-white" placeholder="Contoh: 0123456789" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Alamat</label>
                  <textarea className="w-full bg-darker border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-secondary outline-none h-24 text-white" placeholder="Alamat penuh" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                </div>
                <button type="submit" className="w-full py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all mt-4">
                  {editingId ? 'Simpan Perubahan' : 'Tambah Pelanggan'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
