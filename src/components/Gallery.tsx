
import React from 'react';
import { Image as ImageIcon, Plus, Search, Filter, MoreVertical, Download, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';

const Gallery: React.FC = () => {
  const categories = ['Semua', 'Pemasangan', 'Servis', 'Teknikal', 'Lain-lain'];
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tighter text-white">Galeri Media</h2>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Simpanan Visual Projek & Servis</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex-1 md:flex-none px-4 py-2 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary/80 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20">
            <Plus size={14} /> Muat Naik Media
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-900/50 p-4 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto custom-scrollbar">
          {categories.map((cat, i) => (
            <button key={i} className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${i === 0 ? 'bg-primary text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
              {cat}
            </button>
          ))}
        </div>
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-2.5 text-slate-500" size={14} />
          <input className="w-full bg-slate-800 border-none rounded-xl pl-10 pr-4 py-2 text-xs text-white focus:ring-1 focus:ring-primary transition-all" placeholder="Cari media..." />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="group relative aspect-square bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden cursor-pointer hover:border-primary/50 transition-all"
          >
            <div className="absolute inset-0 flex items-center justify-center text-slate-800 group-hover:scale-110 transition-transform duration-500">
              <ImageIcon size={48} />
            </div>
            
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-white mb-1">Project_Alpha_0{i}.jpg</p>
              <div className="flex items-center justify-between">
                <span className="text-[8px] font-bold text-slate-400 uppercase">1.2 MB • 11 Mar 2026</span>
                <div className="flex gap-2">
                  <button className="p-1.5 bg-white/10 rounded-lg hover:bg-white/20 text-white"><Download size={12}/></button>
                  <button className="p-1.5 bg-red-500/20 rounded-lg hover:bg-red-500/40 text-red-400"><Trash2 size={12}/></button>
                </div>
              </div>
            </div>
            
            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
               <button className="p-1.5 bg-black/40 backdrop-blur-md rounded-lg text-white"><MoreVertical size={14}/></button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default Gallery;
