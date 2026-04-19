import React from 'react';
import { FileText, Download, Filter, Plus, Search, DollarSign, PieChart, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const FinanceModule: React.FC = () => {
  const transactions = [
    { id: 'INV-001', customer: 'Ahmad Zaki', amount: 450.00, status: 'Paid', date: '2024-03-10' },
    { id: 'INV-002', customer: 'Siti Aminah', amount: 1200.50, status: 'Pending', date: '2024-03-09' },
    { id: 'INV-003', customer: 'Tan Boon Hock', amount: 350.00, status: 'Paid', date: '2024-03-08' },
    { id: 'INV-004', customer: 'Muthu Samy', amount: 890.00, status: 'Overdue', date: '2024-03-05' },
  ];

  return (
    <div className="space-y-8">
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tighter uppercase">Kewangan & Dokumen</h1>
          <p className="text-gray-500 text-sm mt-1">Manage invoices, quotations, and financial records.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn-primary flex items-center gap-2">
            <Plus size={18} />
            <span>New Invoice</span>
          </button>
          <button className="p-3 bg-[#1E1E1E] border border-white/5 rounded-lg text-gray-400 hover:text-[#00BCD4] transition-all">
            <Download size={20} />
          </button>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card-glow">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-400">
              <ArrowUpRight size={20} />
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Total Income</p>
              <p className="text-2xl font-black text-white">RM 124,500.00</p>
            </div>
          </div>
          <div className="w-full bg-gray-800 h-1 rounded-full overflow-hidden">
            <div className="bg-emerald-500 h-full w-[75%]"></div>
          </div>
        </div>

        <div className="card-glow">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 rounded-lg bg-red-500/10 text-red-400">
              <ArrowDownRight size={20} />
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Total Expenses</p>
              <p className="text-2xl font-black text-white">RM 45,230.00</p>
            </div>
          </div>
          <div className="w-full bg-gray-800 h-1 rounded-full overflow-hidden">
            <div className="bg-red-500 h-full w-[40%]"></div>
          </div>
        </div>

        <div className="card-glow">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 rounded-lg bg-[#00BCD4]/10 text-[#00BCD4]">
              <PieChart size={20} />
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Net Profit</p>
              <p className="text-2xl font-black text-white">RM 79,270.00</p>
            </div>
          </div>
          <div className="w-full bg-gray-800 h-1 rounded-full overflow-hidden">
            <div className="bg-[#00BCD4] h-full w-[65%]"></div>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="card-glow p-0 overflow-hidden">
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-[#1A1A1A]/50">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <FileText className="text-[#00BCD4]" size={20} /> Recent Transactions
          </h3>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-gray-500 w-4 h-4" />
              <input type="text" placeholder="Search..." className="bg-[#121212] border border-white/10 rounded-lg pl-10 pr-4 py-2 text-xs text-white focus:outline-none focus:border-[#00BCD4]" />
            </div>
            <button className="p-2 hover:bg-white/5 rounded-lg text-gray-400">
              <Filter size={18} />
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[#121212] text-[10px] text-gray-500 uppercase font-black tracking-widest">
                <th className="px-6 py-4">Invoice ID</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {transactions.map((t) => (
                <tr key={t.id} className="hover:bg-white/5 transition-colors group">
                  <td className="px-6 py-4">
                    <span className="text-sm font-bold text-white group-hover:text-[#00BCD4] transition-colors">{t.id}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#1A1A1A] border border-white/10 flex items-center justify-center text-[10px] font-bold text-gray-400">
                        {t.customer.charAt(0)}
                      </div>
                      <span className="text-sm text-gray-300">{t.customer}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-bold text-white">RM {(t.amount || 0).toFixed(2)}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs text-gray-500">{t.date}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                      t.status === 'Paid' ? 'bg-emerald-500/10 text-emerald-400' : 
                      t.status === 'Pending' ? 'bg-yellow-500/10 text-yellow-400' : 'bg-red-500/10 text-red-400'
                    }`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-gray-500 hover:text-white transition-colors">
                      <Download size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default FinanceModule;
