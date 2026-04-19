import React, { useState } from 'react';
import { db, TABLES } from '../lib/db';
import { 
  ShoppingCart, 
  Plus, 
  Search, 
  Filter,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  X,
  Printer,
  Edit2,
  Trash2,
  BarChart2,
  MessageCircle,
  Download,
  FileSpreadsheet
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';

export default function Sales({ showToast }: { showToast: (msg: string, type?: 'success' | 'error' | 'info') => void }) {
  const [sales, setSales] = useState<any[]>([]);
  const [catalog, setCatalog] = useState<any[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedService, setSelectedService] = useState('Normal service');
  const [manualService, setManualService] = useState('');
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<any[]>([]);
  const [slots, setSlots] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    customer_address: '',
    admin_name: 'MNF Admin',
    amount: '',
    discount: '0',
    status: 'Paid',
    payment_type: 'Debit',
    payment_method: 'Transfer',
    teamId: '',
    slotId: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const salesData = db.getAll<any>(TABLES.SALES);
      const catalogData = db.getAll<any>(TABLES.SERVICES);
      const inventoryData = db.getAll<any>(TABLES.INVENTORY);
      const teamsData = db.getAll<any>(TABLES.TEAMS);
      const slotsData = db.getAll<any>(TABLES.TIME_SLOTS);

      // Defensive checks to ensure we have arrays
      const safeSales = Array.isArray(salesData) ? salesData : [];
      const safeCatalog = Array.isArray(catalogData) ? catalogData : [];
      const safeInventory = Array.isArray(inventoryData) ? inventoryData : [];
      const safeTeams = Array.isArray(teamsData) ? teamsData : [];
      const safeSlots = Array.isArray(slotsData) ? slotsData : [];

      setSales(safeSales.sort((a, b) => {
        const dateA = new Date(a.created_at || a.date || 0).getTime();
        const dateB = new Date(b.created_at || b.date || 0).getTime();
        return dateB - dateA;
      }));
      
      // Combine catalog and inventory for selection
      const combinedCatalog = [
        ...safeCatalog.map((item: any) => ({
          ...item,
          price_min: item.price || item.price_min || 0
        })),
        ...safeInventory.map((item: any) => ({
          id: `inv-${item.id}`,
          name: item.itemName,
          price_min: item.sellPrice || 0,
          isInventory: true,
          inventoryId: item.id
        }))
      ];
      setCatalog(combinedCatalog);
      setTeams(safeTeams.filter((t: any) => t.status === 'active' || t.active));
      setSlots(safeSlots.filter((s: any) => s.status === 'active' || s.active));
    } catch (error) {
      console.error('[Sales] Fetch Error:', error);
      showToast('Gagal memuatkan data jualan', 'error');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchData();
    
    const handleUpdate = () => fetchData();
    window.addEventListener('storage', handleUpdate);
    window.addEventListener('booking-update', handleUpdate);
    
    return () => {
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('booking-update', handleUpdate);
    };
  }, []);

  React.useEffect(() => {
    if (catalog.length > 0) {
      if (!catalog.find(c => c.name === selectedService) && selectedService !== 'Lain-lain') {
        setSelectedService(catalog[0].name);
      }
    } else if (selectedService !== 'Lain-lain') {
      setSelectedService('Lain-lain');
    }
  }, [catalog]);

  // Auto-populate amount when service changes
  React.useEffect(() => {
    if (!editingId) {
      const item = catalog.find(i => i.name === selectedService);
      if (item) {
        setFormData(prev => ({ ...prev, amount: (item.price_min || 0).toString() }));
      } else if (selectedService === 'Lain-lain') {
        setFormData(prev => ({ ...prev, amount: '' }));
      }
    }
  }, [selectedService, catalog, editingId]);

  const handleAddSale = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalService = selectedService === 'Lain-lain' ? manualService.trim() : selectedService;
    
    if (selectedService === 'Lain-lain' && !finalService) {
      showToast('Sila nyatakan service / item', 'error');
      return;
    }

    const total = (parseFloat(formData.amount) || 0) - (parseFloat(formData.discount) || 0);
    
    // Find the item in catalog
    const item = catalog.find(i => i.name === finalService);
    
    // Check stock if it's a new sale and it's an inventory item
    if (!editingId && item && item.isInventory) {
      const inventoryData = db.getAll<any>(TABLES.INVENTORY);
      const inventoryItem = inventoryData.find((i: any) => i.id === item.inventoryId);
      if (inventoryItem && inventoryItem.stock <= 0) {
        showToast(`Stok untuk ${finalService} telah habis!`, 'error');
        return;
      }
    }
    
    try {
      const payload = {
        ...formData,
        service: finalService,
        service_description: finalService,
        amount: parseFloat(formData.amount) || 0,
        discount: parseFloat(formData.discount) || 0,
        total: total,
        teamId: formData.teamId,
        slotId: formData.slotId,
        created_at: editingId ? undefined : new Date().toISOString()
      };

      if (editingId) {
        const allSales = db.getAll<any>(TABLES.SALES);
        const prevSale = allSales.find(s => String(s.id) === String(editingId));
        
        const { error } = await db.update<any>(TABLES.SALES, editingId, payload);
        
        if (!error) {
          // If status changed to Paid, record transaction
          if (prevSale && prevSale.status !== 'Paid' && formData.status === 'Paid') {
            await db.insert(TABLES.TRANSACTIONS, {
              id: `sale-upd-${Date.now()}`,
              date: new Date().toISOString().split('T')[0],
              amount: total,
              type: 'credit',
              payment_method: formData.payment_method,
              description: `Jualan (Bayaran Diterima): ${finalService} (${formData.customer_name})`,
              source: 'Sales'
            });
          }
          showToast(`Rekod jualan dikemaskini!`, 'success');
        } else {
          showToast('Gagal mengemaskini jualan: ' + error.message, 'error');
        }
      } else {
        const { error } = await db.insert<any>(TABLES.SALES, payload);

        if (!error) {
          // Sync customer data automatically
          await db.syncCustomer({
            name: formData.customer_name,
            phone: formData.customer_phone,
            address: formData.customer_address
          });

          showToast(`Sale recorded for ${formData.customer_name}!`, 'success');
          
          // Auto-connect to Debit/Credit if Paid
          if (formData.status === 'Paid') {
            await db.insert(TABLES.TRANSACTIONS, {
              id: `sale-${Date.now()}`,
              date: new Date().toISOString().split('T')[0],
              amount: total,
              type: 'credit',
              payment_method: formData.payment_method,
              description: `Jualan: ${finalService} (${formData.customer_name})`,
              source: 'Sales'
            });
          }

          // Simulated WhatsApp Automation
          const msg = formData.status === 'Paid' 
            ? `[AUTO-MSG] Terima kasih ${formData.customer_name}! Pembayaran RM${total.toFixed(2)} telah diterima untuk servis ${finalService}. Kami hargai sokongan anda. - Admin: ${formData.admin_name}`
            : `[AUTO-MSG] Halo ${formData.customer_name}, servis ${finalService} telah selesai oleh Technician kami. Sila buat pembayaran RM${total.toFixed(2)} ke akaun kami. Terima kasih! - Admin: ${formData.admin_name}`;
          
          console.log(`WhatsApp Bot sending to ${formData.customer_phone}: ${msg}`);
          showToast('WhatsApp Bot: Mesej dihantar secara automatik!', 'success');
          
          // Deduct stock if it's an inventory item
          const item = catalog.find(i => i.name === finalService);
          if (item && item.isInventory) {
              const inventoryData = db.getAll<any>(TABLES.INVENTORY);
              const inventoryItem = inventoryData.find((i: any) => String(i.id) === String(item.inventoryId));
              if (inventoryItem) {
                  const newStock = Math.max(0, inventoryItem.stock - 1);
                  await db.update(TABLES.INVENTORY, item.inventoryId, {
                      ...inventoryItem,
                      stock: newStock,
                      status: newStock > 0 ? 'Ada' : 'Habis'
                  });
              }
          }

          setIsAddModalOpen(false);
          setEditingId(null);
          setSelectedService('Normal service');
          setManualService('');
          setFormData({
            customer_name: '',
            customer_phone: '',
            customer_address: '',
            admin_name: 'MNF Admin',
            amount: '',
            discount: '0',
            status: 'Paid',
            payment_type: 'Debit',
            payment_method: 'Transfer',
            teamId: '',
            slotId: ''
          });
          fetchData();
        } else {
          showToast('Gagal menyimpan jualan: ' + error.message, 'error');
        }
      }
    } catch (error) {
      showToast('Gagal menyimpan jualan', 'error');
    }
  };

  const handleEdit = (sale: any) => {
    setFormData({
      customer_name: sale.customer_name || '',
      customer_phone: sale.customer_phone || '',
      customer_address: sale.customer_address || '',
      admin_name: sale.admin_name || 'MNF Admin',
      amount: ((sale.amount || 0) + (sale.discount || 0)).toString(),
      discount: (sale.discount || 0).toString(),
      status: sale.status || 'Paid',
      payment_type: sale.payment_type || 'Debit',
      payment_method: sale.payment_method || 'Transfer',
      teamId: sale.teamId || '',
      slotId: sale.slotId || ''
    });
    
    const isCatalogService = catalog.some(i => i.name === sale.service);
    if (isCatalogService) {
      setSelectedService(sale.service);
      setManualService('');
    } else {
      setSelectedService('Lain-lain');
      setManualService(sale.service);
    }
    
    setEditingId(sale.id);
    setIsAddModalOpen(true);
  };

  const handleDeleteSale = async (id: number | string) => {
    setSales(prev => prev.filter(s => s.id !== id));
    showToast('Rekod jualan berjaya dipadam', 'error');
    try {
      await db.delete(TABLES.SALES, id);
    } catch (error) {
      console.error('Failed to delete from DB', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Sales & Service</h1>
          <p className="text-slate-400 mt-1">Record transactions and track payment status.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm font-bold hover:bg-white/10 transition-all text-slate-300"
          >
            <Download size={18} className="rotate-180" />
            Refresh
          </button>
          <button 
            onClick={() => showToast('Viewing monthly sales chart...', 'info')}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm font-bold hover:bg-white/10 transition-all text-slate-300"
          >
            <BarChart2 size={18} />
            Monthly Chart
          </button>
          <button 
            onClick={() => showToast('Exporting sales to Excel...', 'info')}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm font-bold hover:bg-white/10 transition-all text-slate-300"
          >
            <FileSpreadsheet size={18} />
            Export Excel
          </button>
          <button 
            onClick={() => {
              setEditingId(null);
              const defaultService = catalog.length > 0 ? catalog[0].name : 'Lain-lain';
              const defaultAmount = catalog.length > 0 && catalog[0].price_min ? catalog[0].price_min.toString() : '';
              setSelectedService(defaultService);
              setManualService('');
              setFormData({
                customer_name: '',
                customer_phone: '',
                customer_address: '',
                admin_name: 'MNF Admin',
                amount: defaultAmount,
                discount: '0',
                status: 'Paid',
                payment_type: 'Debit',
                payment_method: 'Transfer',
                teamId: '',
                slotId: ''
              });
              setIsAddModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-all"
          >
            <Plus size={18} />
            Tambah Jualan
          </button>
        </div>
      </div>

      {/* New Sale Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-dark border border-white/10 w-full max-w-4xl rounded-2xl shadow-2xl my-8 overflow-hidden"
            >
              <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                <h3 className="font-bold text-lg text-white">{editingId ? 'Kemaskini Jualan' : 'Record New Sale & Service'}</h3>
                <button onClick={() => setIsAddModalOpen(false)} className="text-slate-500 hover:text-white">
                  <X size={24} />
                </button>
              </div>
              <form onSubmit={handleAddSale} className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Customer Info */}
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Customer Name</label>
                      <input required type="text" className="w-full bg-darker border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-secondary outline-none text-white" placeholder="Full Name" value={formData.customer_name} onChange={e => setFormData({...formData, customer_name: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Phone Number</label>
                      <input required type="text" className="w-full bg-darker border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-secondary outline-none text-white" placeholder="e.g. 0123456789" value={formData.customer_phone} onChange={e => setFormData({...formData, customer_phone: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Address</label>
                      <textarea required className="w-full bg-darker border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-secondary outline-none h-20 text-white" placeholder="Customer Address" value={formData.customer_address} onChange={e => setFormData({...formData, customer_address: e.target.value})} />
                    </div>
                  </div>

                  {/* Service Info */}
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Service / Item</label>
                      <select 
                        required 
                        value={selectedService}
                        onChange={(e) => setSelectedService(e.target.value)}
                        className="w-full bg-darker border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-secondary outline-none text-white"
                      >
                        {catalog.map(item => (
                          <option key={item.id} className="bg-dark" value={item.name}>{item.name}</option>
                        ))}
                        <option className="bg-dark" value="Lain-lain">Lain-lain (Sila nyatakan)</option>
                      </select>
                    </div>
                    {selectedService === 'Lain-lain' && (
                      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nyatakan Service</label>
                        <input required type="text" value={manualService} onChange={(e) => setManualService(e.target.value)} className="w-full bg-darker border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-secondary outline-none text-white" placeholder="e.g. Pasang Lampu" />
                      </motion.div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Amount (RM)</label>
                        <input required type="number" step="0.01" className="w-full bg-darker border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-secondary outline-none text-white" placeholder="0.00" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Discount (RM)</label>
                        <input type="number" step="0.01" className="w-full bg-darker border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-secondary outline-none text-white" placeholder="0.00" value={formData.discount} onChange={e => setFormData({...formData, discount: e.target.value})} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nama Admin</label>
                      <input required type="text" className="w-full bg-darker border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-secondary outline-none text-white" value={formData.admin_name} onChange={e => setFormData({...formData, admin_name: e.target.value})} />
                    </div>
                  </div>
                </div>

                {/* Payment Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4 bg-white/5 rounded-2xl border border-white/10">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status Bayaran</label>
                    <div className="flex gap-2">
                      {['Paid', 'Pending'].map(s => (
                        <button key={s} type="button" onClick={() => setFormData({...formData, status: s})} className={`flex-1 py-2 rounded-xl text-[10px] font-bold border transition-all ${formData.status === s ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-darker border-white/10 text-slate-500'}`}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Jenis Bayaran</label>
                    <div className="flex gap-2">
                      {['Debit', 'Credit'].map(t => (
                        <button key={t} type="button" onClick={() => setFormData({...formData, payment_type: t})} className={`flex-1 py-2 rounded-xl text-[10px] font-bold border transition-all ${formData.payment_type === t ? 'bg-secondary text-white border-secondary' : 'bg-darker border-white/10 text-slate-500'}`}>
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Kaedah Bayaran</label>
                    <div className="flex gap-2">
                      {['Tunai', 'Transfer'].map(m => (
                        <button key={m} type="button" onClick={() => setFormData({...formData, payment_method: m})} className={`flex-1 py-2 rounded-xl text-[10px] font-bold border transition-all ${formData.payment_method === m ? 'bg-primary text-white border-primary' : 'bg-darker border-white/10 text-slate-500'}`}>
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-2">
                  <div className="text-2xl font-bold text-secondary">
                    Total: RM {((parseFloat(formData.amount) || 0) - (parseFloat(formData.discount) || 0)).toFixed(2)}
                  </div>
                  <button type="submit" className="w-full py-4 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all">
                    {editingId ? 'Kemaskini Jualan' : 'Record Sale & Send WhatsApp'}
                  </button>
                  {!editingId && <p className="text-[10px] text-slate-500 italic">* WhatsApp Bot akan hantar mesej automatik selepas simpan.</p>}
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="glass-panel overflow-hidden">
        <div className="p-6 border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
              type="text" 
              placeholder="Search sales..." 
              className="w-full bg-darker border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-secondary transition-all text-white"
            />
          </div>
          <div className="flex items-center gap-3">
            <button className="p-2 hover:bg-white/5 rounded-lg text-slate-400">
              <Filter size={18} />
            </button>
            <select className="bg-darker border border-white/10 rounded-lg px-3 py-1.5 text-xs focus:outline-none text-white">
              <option className="bg-dark">All Status</option>
              <option className="bg-dark">Paid</option>
              <option className="bg-dark">Pending</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 text-slate-400 text-[10px] uppercase tracking-widest font-bold">
                <th className="px-6 py-4">Date & Admin</th>
                <th className="px-6 py-4">Customer & Contact</th>
                <th className="px-6 py-4">Service / Item</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr><td colSpan={5} className="p-10 text-center text-slate-500">Loading...</td></tr>
              ) : sales.map((sale) => (
                <tr key={sale.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-6 py-4">
                    <p className="text-sm text-slate-400 font-mono">{(sale.created_at || sale.date || '').split('T')[0] || '-'}</p>
                    <p className="text-[10px] text-slate-500 uppercase font-bold">{sale.admin_name || '-'}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-medium text-sm text-white">{sale.customer_name || 'Pelanggan'}</p>
                    <p className="text-[10px] text-secondary font-bold">{sale.customer_phone || '-'}</p>
                    <p className="text-[10px] text-slate-500 truncate max-w-[150px]">{sale.customer_address || '-'}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-white">{sale.service || sale.service_description || '-'}</p>
                    {(sale.teamId || sale.slotId) && (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] bg-white/5 text-slate-400 px-1.5 py-0.5 rounded border border-white/5">
                          {teams.find(t => String(t.id) === String(sale.teamId))?.name || 'Team'}
                        </span>
                        <span className="text-[9px] bg-white/5 text-slate-400 px-1.5 py-0.5 rounded border border-white/5">
                          {slots.find(s => String(s.id) === String(sale.slotId))?.label || slots.find(s => String(s.id) === String(sale.slotId))?.time || 'Slot'}
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-white">RM {Number(sale.total || sale.amount || 0).toFixed(2)}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-100 transition-opacity">
                      <button 
                        onClick={() => {
                          const msg = `Halo ${sale.customer_name}, ini adalah resit untuk servis ${sale.service || sale.service_description}. Jumlah: RM${Number(sale.total || sale.amount || 0).toFixed(2)}. Terima kasih!`;
                          window.open(`https://wa.me/${(sale.customer_phone || '').replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
                        }}
                        className="p-2 hover:bg-emerald-500/10 text-emerald-500 rounded-lg" 
                        title="WhatsApp Customer"
                      >
                        <MessageCircle size={16} />
                      </button>
                      <button onClick={() => showToast(`Printing receipt for ${sale.customer_name}...`, 'info')} className="p-2 hover:bg-white/5 text-slate-400 rounded-lg" title="Print Receipt">
                        <Printer size={16} />
                      </button>
                      <button onClick={() => showToast(`Viewing details for ${sale.customer_name}...`, 'info')} className="p-2 hover:bg-white/5 text-slate-400 rounded-lg" title="View Details">
                        <ArrowUpRight size={16} />
                      </button>
                      <button onClick={() => handleEdit(sale)} className="p-2 hover:bg-white/5 text-slate-400 rounded-lg" title="Edit">
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSale(sale.id);
                        }}
                        className="p-2 hover:bg-red-500/10 text-red-500 rounded-lg transition-colors" 
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded uppercase ${
                        sale.status === 'Paid' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                      }`}>
                        {sale.status === 'Paid' ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                        {sale.status}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
