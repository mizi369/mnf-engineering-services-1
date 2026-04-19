import React, { useState, useEffect } from 'react';
import { Plus, Trash2, DollarSign, Calendar, FileText, CreditCard } from 'lucide-react';
import { db, TABLES } from '../lib/db';
import { Transaction } from '../types';

export default function DebitCredit({ showToast }: { showToast: any }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'debit' | 'credit'>('debit');
  const [paymentMethod, setPaymentMethod] = useState('Tunai');
  const [description, setDescription] = useState('');
  const [source, setSource] = useState('Manual');

  useEffect(() => {
    setTransactions(db.getAll<Transaction>(TABLES.TRANSACTIONS));
  }, []);

  const handleAdd = async () => {
    if (!amount || !description) {
      showToast('Sila isi semua maklumat', 'error');
      return;
    }

    const newTransaction: Transaction = {
      id: Date.now().toString(),
      date,
      amount: parseFloat(amount),
      type,
      payment_method: paymentMethod,
      description,
      source
    };

    const { error } = await db.insert(TABLES.TRANSACTIONS, newTransaction);
    if (!error) {
      setTransactions([...transactions, newTransaction]);
      showToast('Transaksi ditambah', 'success');
      setAmount('');
      setDescription('');
    } else {
      showToast('Gagal menambah transaksi', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await db.delete(TABLES.TRANSACTIONS, id);
    if (!error) {
      setTransactions(transactions.filter(t => t.id !== id));
      showToast('Transaksi dipadam', 'success');
    } else {
      showToast('Gagal memadam transaksi', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Debit / Credit</h1>
      
      <div className="bg-dark-card border border-dark-border p-6 rounded-2xl space-y-4">
        <h2 className="font-bold">Tambah Transaksi Baru</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-dark-bg border border-dark-border rounded-lg p-2" />
          <input type="number" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} className="bg-dark-bg border border-dark-border rounded-lg p-2" />
          <select value={type} onChange={(e) => setType(e.target.value as 'debit' | 'credit')} className="bg-dark-bg border border-dark-border rounded-lg p-2">
            <option value="debit">Debit</option>
            <option value="credit">Credit</option>
          </select>
          <input type="text" placeholder="Kaedah Bayaran" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="bg-dark-bg border border-dark-border rounded-lg p-2" />
          <input type="text" placeholder="Keterangan" value={description} onChange={(e) => setDescription(e.target.value)} className="bg-dark-bg border border-dark-border rounded-lg p-2 col-span-1 md:col-span-2 lg:col-span-1" />
          <select value={source} onChange={(e) => setSource(e.target.value)} className="bg-dark-bg border border-dark-border rounded-lg p-2">
            <option value="Manual">Manual</option>
            <option value="Sales">Sales</option>
            <option value="Inventory">Inventory</option>
            <option value="Payroll">Payroll</option>
            <option value="Fuel">Fuel</option>
            <option value="Maintenance">Maintenance</option>
          </select>
          <button onClick={handleAdd} className="bg-primary text-white rounded-lg p-2 flex items-center justify-center gap-2">
            <Plus size={18} /> Tambah
          </button>
        </div>
      </div>

      <div className="bg-dark-card border border-dark-border p-6 rounded-2xl">
        <h2 className="font-bold mb-4">Senarai Transaksi</h2>
        <div className="space-y-2">
          {transactions.map(t => (
            <div key={t.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-full ${t.type === 'debit' ? 'bg-red-500/20 text-red-500' : 'bg-green-500/20 text-green-500'}`}>
                  {t.type === 'debit' ? <DollarSign size={20} /> : <CreditCard size={20} />}
                </div>
                <div>
                  <p className="font-bold">{t.description}</p>
                  <p className="text-xs text-gray-500">{t.date} • {t.payment_method} {t.source && `• Source: ${t.source}`}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className={`font-bold ${t.type === 'debit' ? 'text-red-500' : 'text-green-500'}`}>
                  {t.type === 'debit' ? '-' : '+'}{t.amount}
                </span>
                <button onClick={() => handleDelete(t.id)} className="text-red-500"><Trash2 size={18} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
