
import React, { useState, useEffect } from 'react';
import { 
  BrainCircuit, Database, MessageCircle, GitMerge, FilePlus2, Lock, History, 
  Plus, Check, X, ShieldAlert, Zap, Edit2, Search, Trash2, Power, RefreshCw, Save, Layers, UploadCloud, Cat
} from 'lucide-react';
import { db, TABLES } from '../lib/db';
import { AiQuestion, AiAnswer, AiMapping, AiTraining, AiLock, AiLearningLog } from '../types';
import { socket } from '../service/socket';

const AiBrainSystem: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'bank_qa' | 'training' | 'kunci' | 'log'>('bank_qa');
  
  const [questions, setQuestions] = useState<AiQuestion[]>([]);
  const [answers, setAnswers] = useState<AiAnswer[]>([]);
  const [mappings, setMappings] = useState<AiMapping[]>([]);
  const [trainings, setTrainings] = useState<AiTraining[]>([]);
  const [locks, setLocks] = useState<AiLock[]>([]);
  const [logs, setLogs] = useState<AiLearningLog[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  // State Borang Manual
  const [newQaData, setNewQaData] = useState({
    category: 'Umum',
    trigger: '',
    question: '',
    answer: '',
    style: 'Profesional',
    status: 'Aktif'
  });

  const [newTrainingType, setNewTrainingType] = useState<'Soalan Baru' | 'Jawapan Baru'>('Soalan Baru');
  const [newTrainingInput, setNewTrainingInput] = useState('');

  useEffect(() => {
    loadData();
    
    // Fetch AI instructions if not in localStorage
    if (!localStorage.getItem('mnf_ai_system_instructions')) {
      fetch('/api/context')
        .then(res => res.json())
        .then(data => {
          if (data.instructions) {
            localStorage.setItem('mnf_ai_system_instructions', data.instructions);
          }
        })
        .catch(err => console.error('Failed to fetch AI context:', err));
    }
  }, []);

  const loadData = () => {
    setQuestions(db.getAll<AiQuestion>(TABLES.AI_QUESTIONS));
    setAnswers(db.getAll<AiAnswer>(TABLES.AI_ANSWERS));
    setMappings(db.getAll<AiMapping>(TABLES.AI_MAPPINGS));
    setTrainings(db.getAll<AiTraining>(TABLES.AI_TRAINING));
    setLocks(db.getAll<AiLock>(TABLES.AI_LOCKS));
    setLogs(db.getAll<AiLearningLog>(TABLES.AI_LEARNING_LOGS));
  };

  const logActivity = (activity: string, change: string) => {
    const newLog: AiLearningLog = {
      id: `LG${Date.now()}`,
      time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
      activity,
      change,
      status: 'Sah'
    };
    db.insert(TABLES.AI_LEARNING_LOGS, newLog);
    setLogs(prev => [newLog, ...prev]);
  };

  const syncToNeuralCore = () => {
    setIsSyncing(true);
    const basePersona = localStorage.getItem('mnf_ai_system_instructions') || "PERANAN: Anda AI MNF Engineering.";
    const activeMappings = db.getAll<AiMapping>(TABLES.AI_MAPPINGS).filter(m => m.status === 'Aktif');
    const allQ = db.getAll<AiQuestion>(TABLES.AI_QUESTIONS);
    const allA = db.getAll<AiAnswer>(TABLES.AI_ANSWERS);

    const brainContext = activeMappings.map(m => {
        const q = allQ.find(q => q.id === m.questionId);
        const a = allA.find(a => a.id === m.answerId);
        if(q && a) {
            return `KONTEKS: ${m.triggers}\nQ: "${q.question}"\nA: "${a.answer}"`;
        }
        return '';
    }).filter(s => s !== '').join('\n\n');

    socket.emit('cmd-update-ai-context', {
        instructions: basePersona,
        brainContext: brainContext
    });

    logActivity('Sync Neural', 'Data Q&A disuntik ke AI Engine');
    setTimeout(() => { setIsSyncing(false); }, 1500);
  };

  const handleSaveManualQA = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 1. Validasi Input
    if (!newQaData.question.trim() || !newQaData.answer.trim()) {
      alert("RALAT: Sila isi ruangan 'Soalan' dan 'Jawapan' dengan lengkap.");
      return;
    }

    // 2. Generate IDs
    const timestamp = Date.now();
    const qId = `Q${timestamp}`;
    const aId = `A${timestamp}`;
    const mId = `M${timestamp}`;

    // 3. Create Objects
    const newQ: AiQuestion = { 
        id: qId, 
        category: newQaData.category, 
        question: newQaData.question, 
        source: 'Admin Manual', 
        status: newQaData.status as any 
    };
    const newA: AiAnswer = { 
        id: aId, 
        style: newQaData.style as any, 
        answer: newQaData.answer, 
        language: 'BM', 
        status: newQaData.status as any 
    };
    const newM: AiMapping = { 
        id: mId, 
        questionId: qId, 
        answerId: aId, 
        priority: 'Tinggi', 
        triggers: newQaData.trigger || newQaData.category.toLowerCase(), 
        status: newQaData.status as any 
    };

    // 4. Insert to DB
    db.insert(TABLES.AI_QUESTIONS, newQ);
    db.insert(TABLES.AI_ANSWERS, newA);
    db.insert(TABLES.AI_MAPPINGS, newM);

    logActivity('Tambah Manual', `Set Q&A Baru ID: ${mId}`);
    loadData();
    
    // 5. Reset Form & Close Modal
    setNewQaData({ 
        category: 'Umum', 
        trigger: '', 
        question: '', 
        answer: '', 
        style: 'Profesional', 
        status: 'Aktif' 
    });
    setIsAddModalOpen(false);
    
    // 6. Auto Sync
    syncToNeuralCore();
    alert("✅ Berjaya! Pengetahuan AI telah dikemaskini.");
  };

  const toggleMappingStatus = (mapId: string, currentStatus: string) => {
     const newStatus = currentStatus === 'Aktif' ? 'Nyahaktif' : 'Aktif';
     db.update<AiMapping>(TABLES.AI_MAPPINGS, mapId, { status: newStatus });
     logActivity('Toggle Status', `Mapping ${mapId} -> ${newStatus}`);
     loadData();
     syncToNeuralCore();
  };

  const deleteMappingSet = (mapId: string, qId: string, aId: string) => {
      if(confirm("Padam set Soalan & Jawapan ini?")) {
          db.delete(TABLES.AI_MAPPINGS, mapId);
          db.delete(TABLES.AI_QUESTIONS, qId);
          db.delete(TABLES.AI_ANSWERS, aId);
          logActivity('Padam Data', `Set ${mapId} dipadam`);
          loadData();
          syncToNeuralCore();
      }
  };

  const submitTraining = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTrainingInput.trim()) return;
    const newTrain: AiTraining = { id: `T${Date.now()}`, type: newTrainingType, input: newTrainingInput, verifiedBy: 'Admin', date: new Date().toLocaleDateString(), status: 'Menunggu' };
    db.insert(TABLES.AI_TRAINING, newTrain);
    setNewTrainingInput('');
    logActivity('Tambah Training', `${newTrainingType} - Menunggu`);
    loadData();
    alert("Data latihan dihantar untuk pengesahan.");
  };

  const verifyTraining = (id: string, action: 'Aktif' | 'Ditolak') => {
    db.update<AiTraining>(TABLES.AI_TRAINING, id, { status: action });
    logActivity('Verifikasi Training', `ID ${id} -> ${action}`);
    loadData();
  };

  const toggleLock = (id: string, currentActive: boolean) => {
    db.update<AiLock>(TABLES.AI_LOCKS, id, { active: !currentActive });
    logActivity('Security Lock', `ID ${id} -> ${!currentActive}`);
    loadData();
  };

  const TabButton = ({ id, label, icon: Icon }: any) => (
    <button onClick={() => setActiveTab(id)} className={`px-4 py-2.5 rounded-xl flex items-center gap-2 font-black text-xs uppercase tracking-widest transition-all ${activeTab === id ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-105' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700'}`}>
      <Icon size={14} /> {label}
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="glass-panel text-white p-6 rounded-2xl shadow-xl relative overflow-hidden border-b-2 border-primary/20">
        <div className="absolute top-0 right-0 w-48 h-48 bg-primary rounded-full mix-blend-overlay filter blur-[60px] opacity-10"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black uppercase tracking-tighter flex items-center gap-3">
                <BrainCircuit size={24} className="text-primary" /> Sistem Otak AI Agent
                <div className="flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-xl border border-white/10 ml-2 shadow-lg hover:scale-105 transition-transform cursor-help" title="Mod Operasi Kucing: Pantas & Sentiasa Bersih">
                   <Cat size={16} className="text-secondary" />
                   <span className="text-[10px] font-black uppercase tracking-widest text-secondary">Kucing</span>
                </div>
            </h2>
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
               <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Pusat Kawalan Kognitif & Logik</p>
               <div className="bg-slate-950/50 px-3 py-1 rounded-lg border border-white/5 flex items-center gap-1.5">
                  <Lock size={10} className="text-emerald-400" />
                  <span className="text-[8px] font-bold text-emerald-100 uppercase tracking-widest">Memori Kekal & Selamat</span>
               </div>
            </div>
          </div>
          <div className="flex gap-3">
             <button onClick={syncToNeuralCore} disabled={isSyncing} className="btn-primary px-6 py-2.5 text-[10px] flex items-center gap-2 active:scale-95 disabled:opacity-50 shadow-lg shadow-primary/20">
                {isSyncing ? <RefreshCw size={14} className="animate-spin"/> : <UploadCloud size={14}/>} {isSyncing ? 'Syncing...' : 'Force Sync'}
             </button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <TabButton id="bank_qa" label="Bank Q&A (Master)" icon={Layers} />
        <TabButton id="training" label="Training Queue" icon={FilePlus2} />
        <TabButton id="kunci" label="Kunci & Validasi" icon={Lock} />
        <TabButton id="log" label="Log Pembelajaran" icon={History} />
      </div>

      <div className="glass-panel rounded-2xl min-h-[400px] overflow-hidden">
        {activeTab === 'bank_qa' && (
          <div className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-base font-black text-white uppercase tracking-tight">Bank Data Soalan & Jawapan</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Data ini akan membentuk respon AI</p>
              </div>
              <button onClick={() => setIsAddModalOpen(true)} className="btn-primary px-6 py-2.5 text-[10px] flex items-center gap-2 shadow-lg shadow-primary/20">
                <Plus size={14} /> Tambah Q&A Manual
              </button>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {mappings.length === 0 && (
                  <div className="text-center py-10 opacity-40">
                      <Database size={40} className="mx-auto mb-2 text-slate-500"/>
                      <p className="text-xs font-bold text-slate-500">Tiada data Q&A. Sila tambah manual.</p>
                  </div>
              )}
              {mappings.map(map => {
                const q = questions.find(q => q.id === map.questionId);
                const a = answers.find(a => a.id === map.answerId);
                return (
                  <div key={map.id} className="bg-slate-950/50 border border-white/5 rounded-2xl p-5 hover:bg-slate-900 transition-all relative group">
                    <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                        <div className="flex-1 border-b lg:border-b-0 lg:border-r border-white/5 pb-4 lg:pb-0 lg:pr-6">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="bg-white/10 text-slate-400 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider">{q?.category || 'Umum'}</span>
                                <span className="text-[9px] font-bold text-secondary uppercase flex items-center gap-1"><Zap size={10}/> Trigger: {map.triggers}</span>
                            </div>
                            <p className="text-sm font-black text-white leading-relaxed">"{q?.question || 'Soalan dipadam'}"</p>
                        </div>
                        <div className="hidden lg:flex text-slate-700"><GitMerge size={20} className="rotate-90 lg:rotate-0" /></div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-[9px] font-bold text-slate-500 uppercase">Gaya: {a?.style || 'Standard'}</span>
                            </div>
                            <p className="text-sm font-medium text-emerald-400 italic leading-relaxed border-l-2 border-emerald-500/20 pl-3">"{a?.answer || 'Jawapan dipadam'}"</p>
                        </div>
                        <div className="flex lg:flex-col gap-2 justify-end lg:border-l lg:pl-6 border-white/5 pt-4 lg:pt-0">
                            <button onClick={() => toggleMappingStatus(map.id, map.status)} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all w-full text-center ${map.status === 'Aktif' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-white/5 text-slate-500 border border-white/5'}`}>{map.status}</button>
                            <button onClick={() => deleteMappingSet(map.id, map.questionId, map.answerId)} className="p-2 bg-white/5 border border-white/5 rounded-lg text-slate-500 hover:text-red-500 hover:bg-red-500/10 transition-all flex items-center justify-center" title="Padam Set"><Trash2 size={16}/></button>
                        </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {activeTab === 'training' && (
          <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-slate-950/50 p-5 rounded-2xl border border-white/5 h-full">
                <h4 className="text-xs font-black uppercase text-slate-500 tracking-widest mb-4 flex items-center gap-2"><Plus size={14}/> Tambah Latihan AI</h4>
                <form onSubmit={submitTraining} className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 mb-1 block">Jenis Data</label>
                    <div className="flex bg-slate-900 p-1 rounded-xl border border-white/5">
                      <button type="button" onClick={() => setNewTrainingType('Soalan Baru')} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${newTrainingType === 'Soalan Baru' ? 'bg-primary text-white shadow-md shadow-primary/20' : 'text-slate-500'}`}>Soalan</button>
                      <button type="button" onClick={() => setNewTrainingType('Jawapan Baru')} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${newTrainingType === 'Jawapan Baru' ? 'bg-primary text-white shadow-md shadow-primary/20' : 'text-slate-500'}`}>Jawapan</button>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 mb-1 block">Input Teks</label>
                    <textarea className="w-full p-3 rounded-xl border border-slate-800 text-sm font-bold bg-slate-950 focus:bg-slate-900 focus:outline-none focus:border-primary text-white transition-all" rows={4} placeholder={`Masukkan ${newTrainingType === 'Soalan Baru' ? 'soalan...' : 'jawapan rasmi...'}`} value={newTrainingInput} onChange={e => setNewTrainingInput(e.target.value)} />
                  </div>
                  <button type="submit" className="btn-primary w-full py-3 text-[10px] shadow-lg shadow-primary/20">Hantar Latihan</button>
                </form>
              </div>
            </div>
            <div className="lg:col-span-2">
              <h4 className="text-xs font-black uppercase text-slate-500 tracking-widest mb-3">Menunggu Pengesahan</h4>
              <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                {trainings.map(t => (
                  <div key={t.id} className="p-4 rounded-xl border border-white/5 flex items-center justify-between bg-slate-950/50 shadow-sm">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${t.type === 'Soalan Baru' ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'}`}>{t.type}</span>
                        <span className="text-[8px] font-bold text-slate-500 uppercase">{t.date} • {t.verifiedBy}</span>
                      </div>
                      <p className="text-sm font-bold text-white line-clamp-1">"{t.input}"</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {t.status === 'Menunggu' ? (
                        <>
                          <button onClick={() => verifyTraining(t.id, 'Aktif')} className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all border border-emerald-500/20" title="Sahkan"><Check size={16} /></button>
                          <button onClick={() => verifyTraining(t.id, 'Ditolak')} className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all border border-red-500/20" title="Tolak"><X size={16} /></button>
                        </>
                      ) : (
                        <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg ${t.status === 'Aktif' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>{t.status}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'kunci' && (
          <div className="p-6">
            <h3 className="text-base font-black text-white uppercase tracking-tight mb-4 flex items-center gap-2"><Lock size={16} className="text-secondary"/> Protokol Keselamatan</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {locks.map(lock => (
                <div key={lock.id} className={`p-5 rounded-2xl border transition-all ${lock.active ? 'bg-slate-900 text-white shadow-lg border-primary/30' : 'bg-slate-950/30 border-white/5 opacity-60'}`}>
                  <div className="flex justify-between items-start mb-3">
                    <div className={`p-2 rounded-lg ${lock.active ? 'bg-primary/10 text-primary' : 'bg-slate-800 text-slate-500'}`}><ShieldAlert size={20} /></div>
                    <button onClick={() => toggleLock(lock.id, lock.active)} className="focus:outline-none transition-transform active:scale-90"><Power size={20} className={lock.active ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]' : 'text-slate-600'} /></button>
                  </div>
                  <h4 className="text-base font-black uppercase tracking-tighter mb-1">{lock.keyName}</h4>
                  <p className={`text-[10px] font-bold uppercase tracking-widest mb-3 ${lock.active ? 'text-secondary' : 'text-slate-500'}`}>{lock.function}</p>
                  <div className="flex justify-between items-center border-t border-white/5 pt-3">
                    <span className="text-[9px] font-black uppercase tracking-widest opacity-50">Level</span>
                    <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase ${lock.active ? 'bg-primary text-white' : 'bg-slate-800 text-slate-500'}`}>{lock.level}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'log' && (
          <div className="p-6">
            <h3 className="text-base font-black text-white uppercase tracking-tight mb-6">Audit Trail</h3>
            <div className="border-l-2 border-slate-800 ml-2 space-y-8">
              {logs.map((log) => (
                <div key={log.id} className="relative pl-8">
                  <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-primary border-4 border-slate-950 shadow-[0_0_10px_rgba(211,47,47,0.5)]"></div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{log.time}</p>
                      <h4 className="text-sm font-black text-white uppercase">{log.activity}</h4>
                      <p className="text-xs font-medium text-slate-400 mt-1 leading-relaxed">{log.change}</p>
                    </div>
                    <span className="bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-lg text-[9px] font-black uppercase self-start sm:self-center border border-emerald-500/20">{log.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-[150] flex items-center justify-center p-4">
           <div className="glass-panel w-full max-w-lg rounded-2xl p-8 shadow-2xl animate-in zoom-in duration-300 border-b-8 border-primary">
              <div className="flex justify-between items-center mb-6">
                 <div><h3 className="text-xl font-black text-white uppercase tracking-tight">Tambah Q&A Manual</h3><p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Input Terus ke Otak AI</p></div>
                 <button onClick={() => setIsAddModalOpen(false)} className="bg-slate-800 text-slate-400 p-2 rounded-full hover:bg-red-500/20 hover:text-red-500 transition-all border border-white/5"><X size={20}/></button>
              </div>
              <form onSubmit={handleSaveManualQA} className="space-y-5">
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 block">Kategori</label>
                        <select className="w-full p-3 rounded-xl border border-slate-800 font-bold text-sm outline-none bg-slate-950 text-white focus:border-primary transition-all" value={newQaData.category} onChange={e => setNewQaData({...newQaData, category: e.target.value})}>
                            <option value="Umum">Umum</option><option value="Servis">Servis</option><option value="Harga">Harga</option><option value="Jadual">Jadual</option><option value="Teknikal">Teknikal</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 block">Trigger (Keyword)</label>
                        <input className="w-full p-3 rounded-xl border border-slate-800 font-bold text-sm outline-none bg-slate-950 text-white focus:border-primary transition-all placeholder:text-slate-700" placeholder="Cth: murah, diskaun" value={newQaData.trigger} onChange={e => setNewQaData({...newQaData, trigger: e.target.value})} />
                    </div>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 block">Status</label>
                        <select className="w-full p-3 rounded-xl border border-slate-800 font-bold text-sm outline-none bg-slate-950 text-white focus:border-primary transition-all" value={newQaData.status} onChange={e => setNewQaData({...newQaData, status: e.target.value})}>
                            <option value="Aktif">Aktif</option><option value="Nyahaktif">Nyahaktif</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 block">Gaya Jawapan</label>
                        <select className="w-full p-3 rounded-xl border border-slate-800 font-bold text-sm outline-none bg-slate-950 text-white focus:border-primary transition-all" value={newQaData.style} onChange={e => setNewQaData({...newQaData, style: e.target.value})}>
                            <option value="Profesional">Profesional</option><option value="Ringkas">Ringkas</option><option value="Teknikal">Teknikal</option><option value="Santai">Santai</option>
                        </select>
                    </div>
                 </div>
                 <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 block">Soalan (Input Pelanggan)</label>
                    <textarea className="w-full p-4 rounded-xl border border-slate-800 font-bold text-sm outline-none bg-slate-950 text-white focus:border-primary transition-all placeholder:text-slate-700 resize-none" rows={3} placeholder="Contoh: Berapa harga cuci aircond?" value={newQaData.question} onChange={e => setNewQaData({...newQaData, question: e.target.value})} />
                 </div>
                 <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 block">Jawapan Rasmi (Output AI)</label>
                    <textarea className="w-full p-4 rounded-xl border border-slate-800 font-bold text-sm outline-none bg-slate-950 text-white focus:border-primary transition-all placeholder:text-slate-700 resize-none" rows={4} placeholder="Contoh: Harga bermula RM80 untuk 1.0HP." value={newQaData.answer} onChange={e => setNewQaData({...newQaData, answer: e.target.value})} />
                 </div>
                 <button type="submit" className="btn-primary w-full py-4 text-[10px] shadow-lg shadow-primary/20 mt-2">
                    <Save size={16}/> Simpan ke Bank Q&A
                 </button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default AiBrainSystem;
