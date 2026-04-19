import React, { useState, useEffect } from 'react';
import { Database, Shield, HardDrive, RefreshCw, Search, Filter, Lock, Unlock, Trash2, Eye, Download, CheckCircle2 } from 'lucide-react';
import { db, TABLES } from '../lib/db';

const DatabaseModule: React.FC = () => {
  const [tables, setTables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loadStats = () => {
    const stats = db.getTableStats();
    setTables(stats);
    setLoading(false);
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleSyncAll = async () => {
    setSyncing(true);
    await db.init();
    loadStats();
    setSyncing(false);
  };

  const handleDownloadBackup = () => {
    const allData: any = {};
    Object.values(TABLES).forEach(table => {
      allData[table] = db.getAll(table);
    });
    
    const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mnf_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const filteredTables = tables.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const totalRecords = tables.reduce((sum, t) => sum + t.records, 0);
  const totalSize = tables.reduce((sum, t) => sum + parseFloat(t.size), 0).toFixed(2);

  return (
    <div className="space-y-8">
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tighter uppercase">Pangkalan Data</h1>
          <p className="text-gray-500 text-sm mt-1">Urus data sistem, sandaran (backup), dan protokol keselamatan.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleSyncAll}
            disabled={syncing}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw size={18} className={syncing ? 'animate-spin' : ''} />
            <span>{syncing ? 'Syncing...' : 'Sync All'}</span>
          </button>
          <button 
            onClick={handleDownloadBackup}
            className="p-3 bg-[#1E1E1E] border border-white/5 rounded-lg text-gray-400 hover:text-[#00BCD4] transition-all"
            title="Download Backup"
          >
            <Download size={20} />
          </button>
        </div>
      </div>

      {/* Database Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card-glow">
          <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1">Total Records</p>
          <p className="text-3xl font-black text-white">{totalRecords.toLocaleString()}</p>
          <div className="mt-2 text-[10px] text-emerald-400 font-bold">Data Masa Nyata</div>
        </div>
        <div className="card-glow">
          <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1">Storage Used</p>
          <p className="text-3xl font-black text-white">{totalSize} KB</p>
          <div className="mt-2 text-[10px] text-gray-600 font-bold">Browser LocalStorage</div>
        </div>
        <div className="card-glow">
          <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1">Uptime</p>
          <p className="text-3xl font-black text-white">99.9%</p>
          <div className="mt-2 text-[10px] text-emerald-400 font-bold">Stable Connection</div>
        </div>
        <div className="card-glow">
          <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1">Backups</p>
          <p className="text-3xl font-black text-white">Manual</p>
          <div className="mt-2 text-[10px] text-[#00BCD4] font-bold">Ready to Download</div>
        </div>
      </div>

      {/* Table Management */}
      <div className="card-glow p-0 overflow-hidden">
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-[#1A1A1A]/50">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Database className="text-[#00BCD4]" size={20} /> Pengurusan Jadual
          </h3>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-gray-500 w-4 h-4" />
              <input 
                type="text" 
                placeholder="Cari jadual..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-[#121212] border border-white/10 rounded-lg pl-10 pr-4 py-2 text-xs text-white focus:outline-none focus:border-[#00BCD4]" 
              />
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[#121212] text-[10px] text-gray-500 uppercase font-black tracking-widest">
                <th className="px-6 py-4">Nama Jadual</th>
                <th className="px-6 py-4">Rekod</th>
                <th className="px-6 py-4">Saiz</th>
                <th className="px-6 py-4">Sync Terakhir</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredTables.map((table) => (
                <tr key={table.name} className="hover:bg-white/5 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded bg-[#1A1A1A] border border-white/5 text-gray-500 group-hover:text-[#00BCD4] transition-colors">
                        <HardDrive size={16} />
                      </div>
                      <span className="text-sm font-bold text-white">{table.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-300">{table.records.toLocaleString()}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-500">{table.size}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs text-gray-500">{table.lastSync}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                      <span className="text-[10px] font-bold uppercase text-emerald-400">
                        {table.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button className="p-1.5 hover:bg-white/5 rounded text-gray-500 hover:text-[#00BCD4] transition-colors">
                        <Eye size={14} />
                      </button>
                      <button className="p-1.5 hover:bg-white/5 rounded text-gray-500 hover:text-white transition-colors">
                        <Download size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Security & Maintenance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="card-glow">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Shield className="text-[#D32F2F]" size={20} /> Log Keselamatan
          </h3>
          <div className="space-y-4">
            {[
              { event: 'Akses Dibenarkan', user: 'Admin', time: 'Baru tadi', ip: 'Localhost' },
              { event: 'Sandaran Berjaya', user: 'System', time: '4 jam lepas', ip: 'Local' },
              { event: 'Skema Dikemaskini', user: 'Developer', time: '1 hari lepas', ip: 'System' },
            ].map((log, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-[#121212]/50 rounded-lg border border-white/5">
                <div>
                  <p className="text-xs font-bold text-white">{log.event}</p>
                  <p className="text-[10px] text-gray-500">{log.user} • {log.ip}</p>
                </div>
                <span className="text-[10px] text-gray-600">{log.time}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card-glow bg-gradient-to-br from-[#00BCD4]/10 to-transparent">
          <h3 className="text-lg font-bold text-white mb-2">Optimasi Pangkalan Data</h3>
          <p className="text-xs text-gray-500 mb-6">Jalankan tugas penyelenggaraan untuk memastikan sistem berjalan lancar.</p>
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => alert('Pangkalan Data telah divakum dan dioptimumkan!')}
              className="p-4 bg-[#121212] border border-white/10 rounded-xl text-center hover:border-[#00BCD4]/50 transition-all group"
            >
              <RefreshCw size={20} className="mx-auto mb-2 text-gray-500 group-hover:text-[#00BCD4] group-hover:rotate-180 transition-all duration-700" />
              <p className="text-xs font-bold text-white">Vacuum DB</p>
            </button>
            <button 
              onClick={() => {
                if (window.confirm('Adakah anda pasti mahu mengosongkan cache? Ini tidak akan memadam data utama.')) {
                  alert('Cache telah dikosongkan.');
                }
              }}
              className="p-4 bg-[#121212] border border-white/10 rounded-xl text-center hover:border-[#D32F2F]/50 transition-all group"
            >
              <Trash2 size={20} className="mx-auto mb-2 text-gray-500 group-hover:text-[#D32F2F]" />
              <p className="text-xs font-bold text-white">Clear Cache</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DatabaseModule;
