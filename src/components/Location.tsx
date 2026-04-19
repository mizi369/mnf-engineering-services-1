
import React from 'react';
import { MapPin, Navigation, Phone, Mail, Clock, ExternalLink, Copy, Check, Info } from 'lucide-react';
import { motion } from 'framer-motion';

const Location: React.FC = () => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText('No. 123, Jalan Engineering 1/1, Taman Perindustrian MNF, 81100 Johor Bahru, Johor.');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tighter text-white">Lokasi Kedai</h2>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Pusat Operasi MNF Engineering</p>
        </div>
        <button className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20">
          <Navigation size={14} /> Buka Google Maps
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="aspect-video bg-slate-900 rounded-[2.5rem] border border-slate-800 relative overflow-hidden flex items-center justify-center shadow-2xl">
            <div className="absolute inset-0 opacity-10 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat"></div>
            <div className="relative z-10 text-center p-8">
              <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-primary/30 animate-pulse">
                <MapPin size={40} className="text-primary" />
              </div>
              <h3 className="text-xl font-black text-white uppercase tracking-widest mb-2">Peta Interaktif</h3>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest max-w-xs mx-auto leading-relaxed">
                Modul peta sedang diselaraskan dengan satelit. Sila gunakan koordinat di sebelah untuk navigasi manual.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-6 bg-slate-900/50 rounded-3xl border border-slate-800 hover:border-primary/30 transition-all group">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-4 group-hover:scale-110 transition-transform">
                <Phone size={18} />
              </div>
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Hubungi Kami</h4>
              <p className="text-sm font-black text-white">+60 12-345 6789</p>
            </div>
            <div className="p-6 bg-slate-900/50 rounded-3xl border border-slate-800 hover:border-cyan-500/30 transition-all group">
              <div className="w-10 h-10 bg-cyan-500/10 rounded-xl flex items-center justify-center text-cyan-400 mb-4 group-hover:scale-110 transition-transform">
                <Mail size={18} />
              </div>
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">E-mel Rasmi</h4>
              <p className="text-sm font-black text-white">admin@mnf-eng.com.my</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="p-8 bg-slate-900 rounded-[2rem] border border-slate-800 shadow-xl relative overflow-hidden">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary mb-6 flex items-center gap-2">
              <Info size={14}/> Butiran Alamat
            </h3>
            <div className="space-y-6">
              <div>
                <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2">Alamat Premis</p>
                <p className="text-sm leading-relaxed text-slate-200 font-bold">
                  No. 123, Jalan Engineering 1/1,<br/>
                  Taman Perindustrian MNF,<br/>
                  81100 Johor Bahru, Johor.
                </p>
                <button 
                  onClick={handleCopy}
                  className="mt-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors"
                >
                  {copied ? <Check size={12} className="text-emerald-500"/> : <Copy size={12}/>}
                  {copied ? 'Berjaya Disalin' : 'Salin Alamat'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Location;
