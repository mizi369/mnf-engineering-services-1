import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Wallet, 
  Download, 
  FileText, 
  Calculator,
  Search,
  CheckCircle2,
  X,
  AlertCircle,
  Plus,
  Trash2,
  Printer,
  Save,
  CreditCard,
  Banknote,
  BarChart2,
  FileSpreadsheet
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db, TABLES } from '../lib/db';
import { Payroll as PayrollType, Employee } from '../types';

export default function Payroll({ showToast }: { showToast: any }) {
  const location = useLocation();
  const [month, setMonth] = useState('March 2026');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [payrollData, setPayrollData] = useState<any[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  useEffect(() => {
    fetchData();
  }, [month]);

  useEffect(() => {
    if (location.state?.autoOpen && employees.length > 0) {
      const { employeeName, basicSalary, isPartTime, epf_enabled, socso_enabled } = location.state;
      setIsAddModalOpen(true);
      const calcs = calculatePayroll(basicSalary, 0, isPartTime, epf_enabled, socso_enabled);
      setFormData({
        ...formData,
        employeeName,
        basicSalary,
        isPartTime,
        epfEmployee: calcs.epfEmp,
        epfEmployer: calcs.epfMjr,
        socsoEmployee: calcs.socsoEmp,
        socsoEmployer: calcs.socsoMjr,
        advance: 0
      });
      // Clear state to prevent re-opening
      window.history.replaceState({}, document.title);
    }
  }, [location.state, employees]);

  const fetchData = () => {
    const allPayroll = db.getAll<any>(TABLES.PAYROLL);
    const [m, y] = month.split(' ');
    const filtered = allPayroll.filter(p => p.month === m && p.year === y);
    setPayrollData(filtered);
    
    const allEmployees = db.getAll<Employee>(TABLES.EMPLOYEES);
    setEmployees(allEmployees);
  };

  // Form State
  const [formData, setFormData] = useState({
    employeeName: '',
    basicSalary: 0,
    epfEmployee: 0,
    epfEmployer: 0,
    socsoEmployee: 0,
    socsoEmployer: 0,
    advance: 0,
    monthYear: 'March 2026',
    isPartTime: false,
    paymentType: 'Debit',
    paymentMethod: 'Transfer'
  });

  const calculatePayroll = (basic: number, advance: number, isPartTime: boolean, epfEnabled: boolean = true, socsoEnabled: boolean = true) => {
    if (isPartTime) {
      return {
        epfEmp: 0,
        epfMjr: 0,
        socsoEmp: 0,
        socsoMjr: 0,
        net: basic - advance
      };
    }
    const epfEmp = epfEnabled ? basic * 0.11 : 0;
    const epfMjr = epfEnabled ? basic * 0.14 : 0;
    const socsoEmp = socsoEnabled ? basic * 0.005 : 0; // Simplified SOCSO
    const socsoMjr = socsoEnabled ? basic * 0.0175 : 0; // Simplified SOCSO
    const net = basic - epfEmp - socsoEmp - advance;
    return { epfEmp, epfMjr, socsoEmp, socsoMjr, net };
  };

  const handleEmployeeChange = (name: string) => {
    const emp = employees.find(e => e.name === name);
    if (emp) {
      const isPT = emp.type === 'Part-time';
      const empBasicSalary = (emp as any).basic_salary || (emp as any).base_salary || 0;
      const calcs = calculatePayroll(empBasicSalary, 0, isPT, !!emp.epf_enabled, !!emp.socso_enabled);
      setFormData({
        ...formData,
        employeeName: name,
        basicSalary: empBasicSalary,
        isPartTime: isPT,
        epfEmployee: calcs.epfEmp,
        epfEmployer: calcs.epfMjr,
        socsoEmployee: calcs.socsoEmp,
        socsoEmployer: calcs.socsoMjr,
        advance: 0
      });
    }
  };

  const handleManualEdit = (field: string, value: any) => {
    const newFormData = { ...formData, [field]: value };
    // Recalculate Net if Basic or Advance or isPartTime changes
    if (field === 'basicSalary' || field === 'advance' || field === 'isPartTime') {
      const emp = employees.find(e => e.name === newFormData.employeeName);
      const calcs = calculatePayroll(
        newFormData.basicSalary, 
        newFormData.advance, 
        newFormData.isPartTime,
        emp ? !!emp.epf_enabled : true,
        emp ? !!emp.socso_enabled : true
      );
      setFormData({
        ...newFormData,
        epfEmployee: calcs.epfEmp,
        epfEmployer: calcs.epfMjr,
        socsoEmployee: calcs.socsoEmp,
        socsoEmployer: calcs.socsoMjr
      });
    } else {
      setFormData(newFormData);
    }
  };

  const netSalary = formData.basicSalary - formData.epfEmployee - formData.socsoEmployee - formData.advance;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const [m, y] = formData.monthYear.split(' ');
    const newEntry = {
      id: Date.now().toString(),
      name: formData.employeeName,
      month: m,
      year: y,
      basic_salary: formData.basicSalary,
      epf_employee: formData.epfEmployee,
      epf_employer: formData.epfEmployer,
      socso_employee: formData.socsoEmployee,
      socso_employer: formData.socsoEmployer,
      advance: formData.advance,
      net: netSalary,
      type: formData.isPartTime ? 'Part-time' : 'Full-time',
      method: formData.paymentMethod
    };

    const { error } = await db.insert(TABLES.PAYROLL, newEntry);
    if (!error) {
      // Auto-connect to Debit/Credit
      await db.insert(TABLES.TRANSACTIONS, {
        id: `payroll-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        amount: netSalary,
        type: 'debit',
        payment_method: formData.paymentMethod,
        description: `Gaji: ${formData.employeeName} (${formData.monthYear})`,
        source: 'Payroll'
      });

      showToast('Payroll entry saved & recorded to Debit!', 'success');
      setIsAddModalOpen(false);
      fetchData();
    } else {
      showToast('Failed to save payroll', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payroll</h1>
          <p className="text-gray-500 mt-1">Calculate EPF/SOCSO and generate payslips.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => showToast('Generating monthly payroll report...')}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-dark-border rounded-lg text-sm font-bold hover:bg-white/10 transition-all"
          >
            <BarChart2 size={18} />
            Monthly Report
          </button>
          <button 
            onClick={() => showToast('Exporting payroll to Excel...')}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-dark-border rounded-lg text-sm font-bold hover:bg-white/10 transition-all"
          >
            <FileSpreadsheet size={18} />
            Export Excel
          </button>
          <select 
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="bg-dark-card border border-dark-border rounded-lg px-4 py-2 text-sm focus:outline-none"
          >
            <option>February 2026</option>
            <option>January 2026</option>
          </select>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-all"
          >
            <Plus size={18} />
            New Entry
          </button>
        </div>
      </div>

      {/* New Payroll Entry Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-gray-200 w-full max-w-2xl rounded-2xl shadow-2xl my-8 text-gray-900"
            >
              <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-2xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-secondary/10 text-secondary rounded-lg">
                    <Calculator size={20} />
                  </div>
                  <h3 className="font-bold text-lg text-gray-900">Payroll Entry Form</h3>
                </div>
                <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <X size={24} />
                </button>
              </div>
              
              <form onSubmit={handleSave} className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column */}
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-700 uppercase tracking-wider">Employee Name</label>
                      <select 
                        required
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:border-secondary focus:ring-1 focus:ring-secondary outline-none"
                        onChange={(e) => handleEmployeeChange(e.target.value)}
                        value={formData.employeeName}
                      >
                        <option value="">Select Employee</option>
                        {employees.map(emp => (
                          <option key={emp.id} value={emp.name}>{emp.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-700 uppercase tracking-wider">Basic Salary (RM)</label>
                      <input 
                        type="number" 
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:border-secondary focus:ring-1 focus:ring-secondary outline-none"
                        value={formData.basicSalary}
                        onChange={(e) => handleManualEdit('basicSalary', parseFloat(e.target.value))}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-700 uppercase tracking-wider">Month/Year</label>
                        <input 
                          type="text" 
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:border-secondary focus:ring-1 focus:ring-secondary outline-none"
                          value={formData.monthYear}
                          onChange={(e) => handleManualEdit('monthYear', e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-700 uppercase tracking-wider">Advance (RM)</label>
                        <input 
                          type="number" 
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:border-secondary focus:ring-1 focus:ring-secondary outline-none"
                          value={formData.advance}
                          onChange={(e) => handleManualEdit('advance', parseFloat(e.target.value))}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                      <input 
                        type="checkbox" 
                        id="isPT" 
                        checked={formData.isPartTime}
                        onChange={(e) => handleManualEdit('isPartTime', e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-secondary focus:ring-secondary"
                      />
                      <label htmlFor="isPT" className="text-xs font-bold text-gray-700 cursor-pointer">Part-time Employee (No EPF/SOCSO)</label>
                    </div>
                  </div>

                  {/* Right Column - Deductions */}
                  <div className="space-y-4 bg-gray-50 p-4 rounded-2xl border border-gray-200">
                    <h4 className="text-[10px] font-bold text-secondary uppercase tracking-widest border-b border-gray-200 pb-2">Statutory Deductions</h4>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-600 uppercase">EPF Employee (11%)</label>
                        <input 
                          type="number" 
                          disabled={formData.isPartTime}
                          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm text-gray-900 focus:border-secondary focus:ring-1 focus:ring-secondary outline-none disabled:opacity-50 disabled:bg-gray-100"
                          value={formData.epfEmployee}
                          onChange={(e) => handleManualEdit('epfEmployee', parseFloat(e.target.value))}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-600 uppercase">EPF Employer (14%)</label>
                        <input 
                          type="number" 
                          disabled={formData.isPartTime}
                          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm text-gray-900 focus:border-secondary focus:ring-1 focus:ring-secondary outline-none disabled:opacity-50 disabled:bg-gray-100"
                          value={formData.epfEmployer}
                          onChange={(e) => handleManualEdit('epfEmployer', parseFloat(e.target.value))}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-600 uppercase">SOCSO Employee</label>
                        <input 
                          type="number" 
                          disabled={formData.isPartTime}
                          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm text-gray-900 focus:border-secondary focus:ring-1 focus:ring-secondary outline-none disabled:opacity-50 disabled:bg-gray-100"
                          value={formData.socsoEmployee}
                          onChange={(e) => handleManualEdit('socsoEmployee', parseFloat(e.target.value))}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-600 uppercase">SOCSO Employer</label>
                        <input 
                          type="number" 
                          disabled={formData.isPartTime}
                          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm text-gray-900 focus:border-secondary focus:ring-1 focus:ring-secondary outline-none disabled:opacity-50 disabled:bg-gray-100"
                          value={formData.socsoEmployer}
                          onChange={(e) => handleManualEdit('socsoEmployer', parseFloat(e.target.value))}
                        />
                      </div>
                    </div>

                      <div className="pt-4 border-t border-gray-200 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500 font-bold uppercase">Gross Salary</span>
                        <span className="text-sm font-bold text-gray-900">RM {(formData.basicSalary || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-secondary/10 rounded-xl border border-secondary/20">
                        <span className="text-xs text-secondary font-bold uppercase">Gaji Bersih</span>
                        <span className="text-xl font-bold text-secondary">RM {(netSalary || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment Details */}
                <div className="grid grid-cols-2 gap-6 p-4 bg-gray-50 rounded-2xl border border-gray-200">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-700 uppercase tracking-wider">Jenis Bayaran</label>
                    <div className="flex gap-2">
                      <button 
                        type="button"
                        onClick={() => handleManualEdit('paymentType', 'Debit')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all border ${formData.paymentType === 'Debit' ? 'bg-secondary text-white border-secondary shadow-md' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                      >
                        <CreditCard size={14} /> Debit
                      </button>
                      <button 
                        type="button"
                        onClick={() => handleManualEdit('paymentType', 'Credit')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all border ${formData.paymentType === 'Credit' ? 'bg-secondary text-white border-secondary shadow-md' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                      >
                        <CreditCard size={14} /> Credit
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-700 uppercase tracking-wider">Kaedah Bayaran</label>
                    <div className="flex gap-2">
                      <button 
                        type="button"
                        onClick={() => handleManualEdit('paymentMethod', 'Tunai')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all border ${formData.paymentMethod === 'Tunai' ? 'bg-primary text-white border-primary shadow-md' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                      >
                        <Banknote size={14} /> Tunai
                      </button>
                      <button 
                        type="button"
                        onClick={() => handleManualEdit('paymentMethod', 'Transfer')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all border ${formData.paymentMethod === 'Transfer' ? 'bg-primary text-white border-primary shadow-md' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                      >
                        <Banknote size={14} /> Transfer
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="submit"
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-secondary text-white rounded-xl font-bold shadow-lg shadow-secondary/20 hover:bg-secondary/90 transition-all"
                  >
                    <Save size={18} /> Simpan
                  </button>
                  <button 
                    type="button"
                    onClick={() => showToast('Generating PDF...')}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-white border border-gray-200 rounded-xl font-bold text-gray-700 hover:bg-gray-50 transition-all"
                  >
                    <Printer size={18} /> Cetak PDF
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-dark-card border border-dark-border p-6 rounded-2xl">
          <p className="text-gray-500 text-sm mb-1">Gross Salary</p>
          <h3 className="text-xl font-bold">RM {payrollData.reduce((acc, curr) => acc + (curr.basic_salary || curr.basic || 0), 0).toLocaleString()}</h3>
        </div>
        <div className="bg-dark-card border border-dark-border p-6 rounded-2xl">
          <p className="text-gray-500 text-sm mb-1">Total EPF (11%)</p>
          <h3 className="text-xl font-bold text-primary">RM {payrollData.reduce((acc, curr) => acc + (curr.epf_employee || curr.epfEmp || 0), 0).toLocaleString()}</h3>
        </div>
        <div className="bg-dark-card border border-dark-border p-6 rounded-2xl">
          <p className="text-gray-500 text-sm mb-1">Total SOCSO</p>
          <h3 className="text-xl font-bold text-blue-500">RM {payrollData.reduce((acc, curr) => acc + (curr.socso_employee || curr.socsoEmp || 0), 0).toLocaleString()}</h3>
        </div>
        <div className="bg-dark-card border border-dark-border p-6 rounded-2xl">
          <p className="text-gray-500 text-sm mb-1">Net Payable</p>
          <h3 className="text-xl font-bold text-secondary">RM {payrollData.reduce((acc, curr) => acc + curr.net, 0).toLocaleString()}</h3>
        </div>
      </div>

      <div className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 text-gray-400 text-[10px] uppercase tracking-widest font-bold">
                <th className="px-6 py-4">Employee</th>
                <th className="px-6 py-4">Basic</th>
                <th className="px-6 py-4">EPF (Emp)</th>
                <th className="px-6 py-4">SOCSO</th>
                <th className="px-6 py-4">Advance</th>
                <th className="px-6 py-4">Net Salary</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border">
              {payrollData.map((row) => (
                <tr key={row.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-6 py-4">
                    <p className="font-medium text-sm">{row.name}</p>
                    <p className="text-[10px] text-gray-500 uppercase font-bold">{row.type} • {row.method}</p>
                  </td>
                  <td className="px-6 py-4 text-sm">RM {(row.basic_salary || row.basic || 0).toFixed(2)}</td>
                  <td className="px-6 py-4 text-sm text-primary">RM {(row.epf_employee || row.epfEmp || 0).toFixed(2)}</td>
                  <td className="px-6 py-4 text-sm text-blue-500">RM {(row.socso_employee || row.socsoEmp || 0).toFixed(2)}</td>
                  <td className="px-6 py-4 text-sm text-red-500">RM {(row.advance || 0).toFixed(2)}</td>
                  <td className="px-6 py-4 text-sm font-bold text-secondary">RM {(row.net || 0).toFixed(2)}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => showToast(`Payroll for ${row.name} marked as PAID`, 'success')}
                        className="p-2 hover:bg-green-500/10 text-green-500 rounded-lg transition-colors" 
                        title="Mark as Paid"
                      >
                        <CheckCircle2 size={16} />
                      </button>
                      <button 
                        onClick={() => showToast(`Generating payslip for ${row.name}...`)}
                        className="p-2 hover:bg-blue-500/10 text-blue-500 rounded-lg transition-colors" 
                        title="Generate Payslip"
                      >
                        <FileText size={16} />
                      </button>
                      <button 
                        onClick={() => showToast(`Printing payslip for ${row.name}...`)}
                        className="p-2 hover:bg-white/5 text-gray-400 rounded-lg transition-colors" 
                        title="Print PDF"
                      >
                        <Printer size={16} />
                      </button>
                      <button 
                        onClick={async () => {
                          await db.delete(TABLES.PAYROLL, row.id);
                          showToast('Payroll entry deleted', 'error');
                          fetchData();
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
