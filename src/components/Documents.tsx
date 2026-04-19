
import React from 'react';
import { FileText, Plus, Search, Download, Trash2, Eye, FileType, Filter } from 'lucide-react';
import { motion } from 'framer-motion';

const Documents: React.FC = () => {
  const docs = [
    { name: 'Manual_Teknikal_Aircond_v2.pdf', size: '4.5 MB', date: '10 Mar 2026', type: 'PDF' },
    { name: 'Sebut_Harga_MNF_2026.pdf', size: '1.2 MB', date: '09 Mar 2026', type: 'PDF' },
    { name: 'Senarai_Pekerja_Mac.xlsx', size: '850 KB', date: '08 Mar 2026', type: 'Excel' },
    { name: 'Polisi_Syarikat_MNF.docx', size: '2.1 MB', date: '05 Mar 2026', type: 'Word' },
    { name: 'Laporan_Bulanan_Feb.pdf', size: '3.8 MB', date: '01 Mar 2026', type: 'PDF' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tighter text-white">Dokumen & Fail</h2>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Pengurusan Arkib Digital Syarikat</p>
        </div>
        <button className="px-4 py-2 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary/80 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20">
          <Plus size={14} /> Muat Naik Fail
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800 flex items-center gap-4">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
            <FileText size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Fail</p>
            <p className="text-xl font-black text-white">128</p>
          </div>
        </div>
        <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800 flex items-center gap-4">
          <div className="w-10 h-10 bg-cyan-500/10 rounded-xl flex items-center justify-center text-cyan-400">
            <Download size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Muat Turun</p>
            <p className="text-xl font-black text-white">1,024</p>
          </div>
        </div>
        <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800 flex items-center gap-4">
          <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-400">
            <FileType size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Kategori</p>
            <p className="text-xl font-black text-white">12</p>
          </div>
        </div>
      </div>

      <div className="bg-slate-900/50 rounded-3xl border border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-2.5 text-slate-500" size={14} />
            <input className="w-full bg-slate-800 border-none rounded-xl pl-10 pr-4 py-2 text-xs text-white focus:ring-1 focus:ring-primary transition-all" placeholder="Cari dokumen..." />
          </div>
          <button className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors">
            <Filter size={14} /> Filter Fail
          </button>
        </div>
        
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800/30 text-slate-500 uppercase font-black tracking-widest">
              <tr>
                <th className="px-6 py-4">Nama Fail</th>
                <th className="px-6 py-4">Saiz</th>
                <th className="px-6 py-4">Tarikh</th>
                <th className="px-6 py-4">Jenis</th>
                <th className="px-6 py-4 text-right">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {docs.map((doc, i) => (
                <motion.tr 
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="hover:bg-white/5 transition-colors group"
                >
                  <td className="px-6 py-4 font-bold text-slate-200 flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                      <FileText size={14} />
                    </div>
                    {doc.name}
                  </td>
                  <td className="px-6 py-4 text-slate-500 font-medium">{doc.size}</td>
                  <td className="px-6 py-4 text-slate-500 font-medium">{doc.date}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-0.5 bg-slate-800 rounded text-[9px] font-black text-slate-400 uppercase tracking-tighter">{doc.type}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button className="p-2 bg-slate-800 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-all"><Eye size={14}/></button>
                      <button className="p-2 bg-slate-800 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-all"><Download size={14}/></button>
                      <button className="p-2 bg-red-500/10 rounded-lg text-red-500 hover:bg-red-500/20 transition-all"><Trash2 size={14}/></button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Documents;
