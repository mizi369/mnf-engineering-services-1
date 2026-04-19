import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, TABLES } from '../lib/db';
import { 
  UserPlus, 
  Search, 
  Edit2, 
  Trash2, 
  Calculator,
  Download,
  FileText,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Employees({ showToast }: { showToast: any }) {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [empType, setEmpType] = useState('Full-time');
  const [formData, setFormData] = useState({
    name: '',
    ic: '',
    address: '',
    position: 'Technician',
    type: 'Full-time',
    salary: '',
    epf: true,
    socso: true
  });

  // Fetch real data on mount
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const data = await db.getAll(TABLES.EMPLOYEES);
        setEmployees(data.map((e: any) => ({
          id: e.id,
          name: e.name,
          ic: e.ic || 'N/A',
          position: e.position,
          salary: e.basic_salary || e.base_salary || 0,
          type: e.type || 'Full-time',
          epf: !!e.epf_enabled,
          socso: !!e.socso_enabled,
          address: e.address || ''
        })));
      } catch (error) {
        console.error('Failed to fetch', error);
      } finally {
        setLoading(false);
      }
    };
    fetchEmployees();
  }, []);

  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const payload = {
      name: formData.name,
      ic: formData.ic,
      address: formData.address,
      position: formData.position,
      type: formData.type,
      basic_salary: parseFloat(formData.salary),
      epf_enabled: formData.type === 'Full-time' ? (formData.epf ? 1 : 0) : 0,
      socso_enabled: formData.type === 'Full-time' ? (formData.socso ? 1 : 0) : 0
    };

    try {
      const { error } = editingId 
        ? await db.update<any>(TABLES.EMPLOYEES, editingId, payload)
        : await db.insert<any>(TABLES.EMPLOYEES, { ...payload, created_at: new Date().toISOString() });

      if (!error) {
        showToast(editingId ? 'Employee updated successfully!' : 'Employee added successfully!', 'success');
        setIsAddModalOpen(false);
        setEditingId(null);
        setFormData({
          name: '',
          ic: '',
          address: '',
          position: 'Technician',
          type: 'Full-time',
          salary: '',
          epf: true,
          socso: true
        });
        // Refresh list
        const data = await db.getAll(TABLES.EMPLOYEES);
        setEmployees(data.map((e: any) => ({
          id: e.id,
          name: e.name,
          ic: e.ic || 'N/A',
          position: e.position,
          salary: e.basic_salary || e.base_salary || 0,
          type: e.type || 'Full-time',
          epf: !!e.epf_enabled,
          socso: !!e.socso_enabled,
          address: e.address || ''
        })));
      } else {
        showToast('Error saving employee: ' + error.message, 'error');
      }
    } catch (error) {
      showToast('Error saving employee', 'error');
    }
  };

  const handleEditEmployee = (emp: any) => {
    setEditingId(emp.id);
    setFormData({
      name: emp.name,
      ic: emp.ic,
      address: emp.address,
      position: emp.position,
      type: emp.type,
      salary: emp.salary.toString(),
      epf: emp.epf,
      socso: emp.socso
    });
    setEmpType(emp.type);
    setIsAddModalOpen(true);
  };

  const handleGeneratePayroll = (emp: any) => {
    navigate('/payroll', { 
      state: { 
        employeeName: emp.name,
        basicSalary: emp.salary,
        isPartTime: emp.type === 'Part-time',
        epf_enabled: emp.epf,
        socso_enabled: emp.socso,
        autoOpen: true
      } 
    });
  };

  const handleDeleteEmployee = async (id: number | string) => {
    setEmployees(prev => prev.filter(emp => emp.id !== id));
    showToast('Pekerja berjaya dipadam', 'error');
    
    try {
      await db.delete(TABLES.EMPLOYEES, id);
    } catch (error) {
      console.error('Failed to delete employee', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Employees</h1>
          <p className="text-gray-500 mt-1">Manage your team and payroll configurations.</p>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-all"
        >
          <UserPlus size={18} />
          Add Employee
        </button>
      </div>

      {/* Add Employee Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-dark border border-white/10 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden my-8"
            >
              <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                <h3 className="font-bold text-lg text-white">{editingId ? 'Edit Employee' : 'Add New Employee'}</h3>
                <button onClick={() => { setIsAddModalOpen(false); setEditingId(null); }} className="text-gray-500 hover:text-white">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleSaveEmployee} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Nama Penuh</label>
                  <input 
                    required 
                    type="text" 
                    className="w-full bg-darker border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:border-secondary outline-none" 
                    placeholder="e.g. Ahmad Technician" 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">No. IC</label>
                  <input 
                    required 
                    type="text" 
                    className="w-full bg-darker border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:border-secondary outline-none" 
                    placeholder="e.g. 900101-14-5567" 
                    value={formData.ic}
                    onChange={(e) => setFormData({...formData, ic: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Alamat Rumah</label>
                  <textarea 
                    required 
                    className="w-full bg-darker border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:border-secondary outline-none h-20" 
                    placeholder="Alamat lengkap..." 
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Jawatan</label>
                    <select 
                      required 
                      className="w-full bg-darker border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:border-secondary outline-none"
                      value={formData.position}
                      onChange={(e) => setFormData({...formData, position: e.target.value})}
                    >
                      <option>Technician</option>
                      <option>Senior Technician</option>
                      <option>Admin</option>
                      <option>Manager</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Jenis Pekerja</label>
                    <select 
                      required 
                      value={formData.type}
                      onChange={(e) => {
                        setFormData({...formData, type: e.target.value});
                        setEmpType(e.target.value);
                      }}
                      className="w-full bg-darker border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:border-secondary outline-none"
                    >
                      <option value="Full-time">Full-time</option>
                      <option value="Part-time">Part-time</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Gaji Pokok (RM)</label>
                  <input 
                    required 
                    type="number" 
                    className="w-full bg-darker border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:border-secondary outline-none" 
                    placeholder="e.g. 2500" 
                    value={formData.salary}
                    onChange={(e) => setFormData({...formData, salary: e.target.value})}
                  />
                </div>
                
                {empType === 'Full-time' && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="flex items-center gap-6 py-2"
                  >
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={formData.epf} 
                        onChange={(e) => setFormData({...formData, epf: e.target.checked})}
                        className="w-4 h-4 rounded border-white/10 bg-darker text-primary focus:ring-primary" 
                      />
                      <span className="text-xs font-bold text-gray-400">EPF</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={formData.socso} 
                        onChange={(e) => setFormData({...formData, socso: e.target.checked})}
                        className="w-4 h-4 rounded border-white/10 bg-darker text-primary focus:ring-primary" 
                      />
                      <span className="text-xs font-bold text-gray-400">SOCSO</span>
                    </label>
                  </motion.div>
                )}

                {empType === 'Part-time' && (
                  <p className="text-[10px] text-yellow-500 font-bold italic">
                    * Nota: Pekerja part-time hanya menerima Gaji Pokok sahaja.
                  </p>
                )}

                <button type="submit" className="w-full py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all mt-4">
                  Simpan Pekerja
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel p-6 rounded-2xl">
          <p className="text-gray-500 text-sm mb-1">Total Employees</p>
          <h3 className="text-2xl font-bold text-white">{employees.length}</h3>
        </div>
        <div className="glass-panel p-6 rounded-2xl">
          <p className="text-gray-500 text-sm mb-1">Monthly Payroll Cost</p>
          <h3 className="text-2xl font-bold text-secondary">RM {employees.reduce((s, e) => s + e.salary, 0).toLocaleString()}</h3>
        </div>
        <div className="glass-panel p-6 rounded-2xl">
          <p className="text-gray-500 text-sm mb-1">Active Teams</p>
          <h3 className="text-2xl font-bold text-primary">4 Teams</h3>
        </div>
      </div>

      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-white/10">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input 
              type="text" 
              placeholder="Search employees..." 
              className="w-full bg-darker border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-secondary transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 text-gray-400 text-[10px] uppercase tracking-widest font-bold">
                <th className="px-6 py-4">Employee Name & IC</th>
                <th className="px-6 py-4">Position & Type</th>
                <th className="px-6 py-4">Base Salary</th>
                <th className="px-6 py-4">EPF/SOCSO</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {loading ? (
                <tr><td colSpan={5} className="p-10 text-center text-gray-500">Loading...</td></tr>
              ) : employees.map((emp) => (
                <tr key={emp.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-6 py-4">
                    <p className="font-medium text-sm text-white">{emp.name}</p>
                    <p className="text-[10px] text-gray-500 font-mono">{emp.ic}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs px-2 py-0.5 bg-white/5 rounded-full text-gray-400 w-fit">{emp.position}</span>
                      <span className="text-[10px] font-bold text-secondary uppercase">{emp.type}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-white">RM {(emp.salary || 0).toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      {emp.epf && <span className="text-[10px] font-bold text-green-500">EPF</span>}
                      {emp.socso && <span className="text-[10px] font-bold text-blue-500">SOCSO</span>}
                      {!emp.epf && !emp.socso && <span className="text-[10px] font-bold text-gray-600">-</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 transition-opacity">
                      <button onClick={() => handleGeneratePayroll(emp)} className="p-2 hover:bg-green-500/10 text-green-500 rounded-lg" title="Generate Payroll">
                        <Calculator size={16} />
                      </button>
                      <button onClick={() => showToast('Downloading payslip...')} className="p-2 hover:bg-blue-500/10 text-blue-500 rounded-lg" title="Download Payslip">
                        <Download size={16} />
                      </button>
                      <button onClick={() => showToast('Viewing salary history...')} className="p-2 hover:bg-indigo-500/10 text-indigo-500 rounded-lg" title="Salary History">
                        <FileText size={16} />
                      </button>
                      <button onClick={() => handleEditEmployee(emp)} className="p-2 hover:bg-white/5 text-gray-400 rounded-lg transition-colors">
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteEmployee(emp.id);
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
    </div>
  );
}
