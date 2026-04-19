import React, { useState, useEffect, useMemo } from 'react';
import { db, TABLES } from '../lib/db';
import { 
  FileText, Printer, Eye, Plus, X, 
  Trash2, FileSpreadsheet, Search, Filter, 
  Calendar, Activity, Save, Edit3, ShieldCheck, Send, Download, ChevronDown, UserPlus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { numberToWords } from '../utils/format';

const Invoices: React.FC = () => {
  const [docs, setDocs] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'invoices' | 'quotations'>('invoices');
  const [showForm, setShowForm] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [templateStyle, setTemplateStyle] = useState<'formal' | 'modern'>('formal');
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [docToDelete, setDocToDelete] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('All');
  const [customers, setCustomers] = useState<any[]>([]);
  const [catalog, setCatalog] = useState<any[]>([]);
  const [showCustomerSelect, setShowCustomerSelect] = useState(false);
  const [showCatalogSelect, setShowCatalogSelect] = useState<{idx: number} | null>(null);

  // Blue Corporate Palette
  const primaryColor = '#2563EB'; // Blue 600
  const secondaryColor = '#8B5CF6'; // Violet 500
  
  // Configuration
  const coLogo = localStorage.getItem('mnf_company_logo') || 'https://picsum.photos/seed/mnf/200/200';
  const coName = 'MNF ENGINEERING SERVICES';
  const coReg = '003317006-U';
  const coAddr = '14-A JALAN MURNI 6, TAMAN SURIA, 81100 JOHOR BAHRU, JOHOR';
  const coPhone = '011-15870964';
  const coEmail = 'mnfengineeringservices@gmail.com';
  const coBank = 'CIMB BANK';
  const coAcc = '8605118537';
  
  const taxEnabled = false;
  const taxRate = 6;
  const payTermsDefault = 'ALL PAYMENT SHOULD BE MAKE BY CASH OR TRANSFER TO ACCOUNT NUMBER CIMB BANK "8605118537 - MNF ENGINEERING SERVICES"';
  const warTermsDefault = '1 WEEK FROM INSTALLATION DATE';

  const initialFormState = {
    id: '', date: new Date().toISOString().split('T')[0],
    customerName: '', address: '', phone: '',
    items: [{ description: '', unit: '', qty: 1, unitPrice: 0, amount: 0 }],
    deposit: 0, terms: 'CASH', warranty: warTermsDefault, paymentTerms: payTermsDefault,
    validity: '7 DAYS', status: 'Draft', job: 'SERVICE', type: 'invoices'
  };

  const [formData, setFormData] = useState<any>(initialFormState);
  useEffect(() => {
    refreshData();
    fetchAuxData();
  }, [activeTab]);

  const fetchAuxData = async () => {
    try {
      const custData = await db.getAll(TABLES.CUSTOMERS);
      const catData = await db.getAll(TABLES.SERVICES);
      const invData = await db.getAll(TABLES.INVENTORY);
      setCustomers(custData);
      
      const combinedCatalog = [
        ...catData,
        ...invData.map((item: any) => ({
          id: `inv-${item.id}`,
          name: item.itemName,
          price_min: item.sellPrice,
          category: 'Inventory'
        }))
      ];
      setCatalog(combinedCatalog);
    } catch (e) {
      console.error("Failed to fetch auxiliary data", e);
    }
  };

  const refreshData = async () => {
    setIsLoading(true);
    try {
      const type = activeTab === 'invoices' ? 'invoice' : 'quotation';
      const data = await db.getAll(TABLES.DOCUMENTS);
      const filtered = data.filter((d: any) => d.type === type);
      
      // Map database fields to frontend fields
      const mappedData = filtered.map((d: any) => ({
        ...d,
        customerName: d.customer_name,
        refNo: d.ref_no,
        paymentTerms: d.payment_terms,
        items: typeof d.items === 'string' ? JSON.parse(d.items) : d.items,
        type: d.type === 'invoice' ? 'invoices' : 'quotations'
      }));
      setDocs(mappedData);
    } catch (error) {
      console.error("Failed to fetch documents:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateNextId = (type: string) => {
    const prefix = type === 'invoices' ? 'INV' : 'QTN';
    const year = new Date().getFullYear();
    const typeDocs = docs.filter(d => (d.type || 'invoices') === type);
    
    const nums = typeDocs.map(d => {
      const parts = d.id.split('/');
      const lastPart = parts[parts.length - 1];
      return parseInt(lastPart) || 0;
    });
    
    const maxNum = nums.length > 0 ? Math.max(...nums) : 0;
    const nextNum = maxNum + 1;
    return `${prefix}/${year}/${nextNum.toString().padStart(4, '0')}`;
  };

  const generateNextCustomerId = () => {
    const nums = docs.map(d => {
      const parts = d.customerId?.split('-') || [];
      const lastPart = parts[parts.length - 1];
      return parseInt(lastPart) || 0;
    });
    const maxNum = nums.length > 0 ? Math.max(...nums) : 0;
    const nextNum = maxNum + 1;
    return `CUST-${nextNum.toString().padStart(3, '0')}`;
  };

  const addItem = () => {
    setFormData({ ...formData, items: [...formData.items, { description: '', unit: '', qty: 1, unitPrice: 0, amount: 0 }] });
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    if (field === 'qty' || field === 'unitPrice') {
      newItems[index].amount = newItems[index].qty * newItems[index].unitPrice;
    }
    setFormData({ ...formData, items: newItems });
  };

  const removeItem = (index: number) => {
    if (formData.items.length > 1) {
      setFormData({ ...formData, items: formData.items.filter((_: any, i: number) => i !== index) });
    }
  };

  const totals = useMemo(() => {
    const subtotal = formData.items.reduce((sum: number, item: any) => sum + (item.amount || 0), 0);
    const tax = taxEnabled ? subtotal * (taxRate / 100) : 0;
    const total = subtotal + tax;
    const balance = total - (Number(formData.deposit) || 0);
    return { subtotal, tax, total, total_amount: total, balance };
  }, [formData.items, formData.deposit]);

  const handleSave = async () => {
    if (!formData.id.trim()) {
      alert('Sila masukkan No. Dokumen (Doc No)');
      return;
    }
    
    const doc = { 
      ...formData, 
      type: activeTab === 'invoices' ? 'invoice' : 'quotation',
      customer_name: formData.customerName,
      ref_no: formData.refNo || formData.id,
      payment_terms: formData.paymentTerms,
      validity: formData.validity,
      subtotal: totals.subtotal,
      tax: totals.tax,
      total: totals.total,
      total_amount: totals.total_amount,
      balance: totals.balance,
      items: JSON.stringify(formData.items)
    };

    try {
      const { error } = isEditing 
        ? await db.update(TABLES.DOCUMENTS, formData.id, doc)
        : await db.insert(TABLES.DOCUMENTS, { ...doc, created_at: new Date().toISOString() });
      
      if (!error) {
        setShowForm(false);
        refreshData();
      } else {
        alert("Gagal menyimpan dokumen: " + error.message);
      }
    } catch (error) {
      console.error("Failed to save document:", error);
      alert("Gagal menyimpan dokumen.");
    }
  };

  const handleDelete = (id: string) => {
    if (!id) {
      alert('Ralat: ID dokumen tidak sah');
      return;
    }
    setDocToDelete(id);
  };

  const confirmDelete = async () => {
    if (docToDelete) {
      setIsLoading(true);
      try {
        const { error } = await db.delete(TABLES.DOCUMENTS, docToDelete);
        if (!error) {
          setDocToDelete(null);
          refreshData();
        } else {
          alert("Gagal memadam dokumen: " + error.message);
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Failed to delete document:", error);
        setIsLoading(false);
      }
    }
  };

  const handleEdit = (doc: any) => {
    setFormData(doc);
    setIsEditing(true);
    setShowForm(true);
  };

  const handleCreateNew = () => {
    const nextId = generateNextId(activeTab);
    const nextCustId = generateNextCustomerId();
    setFormData({ 
      ...initialFormState, 
      type: activeTab,
      id: nextId,
      customerId: nextCustId
    });
    setIsEditing(false);
    setShowForm(true);
  };

  const handlePrint = (doc?: any) => {
    const targetDoc = doc || selectedDoc;
    if (!targetDoc) return;
    
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Sila benarkan pop-up untuk mencetak.");
      return;
    }

    if (doc) {
      setSelectedDoc(doc);
      setShowPreview(true);
    }
    
    const checkAndPrint = (attempts = 0) => {
      const content = document.getElementById("printable-content");
      if (content) {
        printWindow.document.write(`
          <html>
            <head>
              <title>${targetDoc.type === 'quotations' ? 'Quotation' : 'Invoice'} - ${targetDoc.id}</title>
              <script src="https://cdn.tailwindcss.com"></script>
              <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
              <style>
                @page { size: A4; margin: 0; }
                body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; font-family: 'Inter', sans-serif; }
                #printable-content { width: 210mm; min-height: 297mm; padding: 15mm; margin: 0 auto; box-sizing: border-box; background: white; color: black; }
                .blue-text { color: ${primaryColor}; }
                .blue-bg { background-color: ${primaryColor}; }
                .blue-border { border-color: ${primaryColor}; }
                
                /* Template Specific Styles */
                .template-formal .items-table { border-collapse: collapse; width: 100%; }
                .template-formal .items-table th, .template-formal .items-table td { border: 1px solid ${primaryColor}; padding: 8px; font-size: 11px; }
                .template-formal .items-table th { background-color: #f8fafc; font-weight: 800; text-transform: uppercase; }
                
                .template-modern .items-table { width: 100%; }
                .template-modern .items-table th { border-bottom: 2px solid ${primaryColor}; padding: 12px 8px; font-size: 11px; font-weight: 800; text-transform: uppercase; text-align: left; }
                .template-modern .items-table td { padding: 12px 8px; font-size: 11px; border-bottom: 1px solid #f1f5f9; }
                
                .total-box { background: ${primaryColor}; color: white; padding: 12px 15px; border-radius: 4px; display: flex; justify-content: space-between; align-items: center; }
                .footer-note-item { display: flex; gap: 12px; margin-bottom: 10px; }
                .blue-bar { width: 4px; background: ${primaryColor}; flex-shrink: 0; }
                .payment-box { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; background-color: #f8fafc; }
                
                @media print { body { background: white; } .no-print { display: none; } }
              </style>
            </head>
            <body class="bg-white">
              <div id="printable-content">${content.innerHTML}</div>
            </body>
          </html>
        `);
        printWindow.document.close();
        setTimeout(() => {
          printWindow.print();
          printWindow.onafterprint = () => printWindow.close();
        }, 1000);
      } else if (attempts < 10) {
        setTimeout(() => checkAndPrint(attempts + 1), 100);
      } else {
        printWindow.close();
        alert("Gagal menyediakan dokumen untuk cetakan.");
      }
    };
    checkAndPrint();
  };

  const filteredDocs = docs.filter(doc => {
    const matchesSearch = (doc.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) || doc.id.toLowerCase().includes(searchTerm.toLowerCase()) || doc.address?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'All' || doc.status === statusFilter;
    const matchesType = (doc.type === 'invoices' || doc.type === 'invoice' || doc.type === 'quotations' || doc.type === 'quotation');
    return matchesSearch && matchesStatus && matchesType;
  });

  const downloadCSV = () => {
    const headers = ['Doc No', 'Date', 'Customer', 'Status', 'Total (RM)'];
    const rows = filteredDocs.map(doc => [
      doc.id,
      doc.date,
      doc.customerName,
      doc.status,
      Number(doc.total || 0).toFixed(2)
    ]);
    
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${activeTab}_report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Paid': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'Sent': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'Overdue': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-white/5 text-white/40 border-white/10';
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER TOOLS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-[#121212] p-6 rounded-2xl border border-white/5 shadow-sm no-print">
        <div className="flex items-center gap-5">
           <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-xl transition-all" style={{ backgroundColor: primaryColor }}>
              <FileText size={28} />
           </div>
           <div>
              <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                  Invois & Quotations
                  <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10 ml-2 shadow-lg">
                    <ShieldCheck size={14} className="text-blue-400" />
                    <span className="text-[9px] font-bold uppercase tracking-widest text-blue-400">Verified</span>
                  </div>
              </h2>
              <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mt-1">Professional Document Management</p>
           </div>
        </div>
        <div className="flex flex-wrap gap-3">
           <button 
             onClick={refreshData} 
             className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-all active:scale-90"
             title="Refresh Data"
           >
              <Activity size={18} className={isLoading ? 'animate-spin' : ''} />
           </button>
           <div className="bg-white/5 p-1.5 rounded-xl flex border border-white/10">
              <button onClick={() => setActiveTab('invoices')} className={cn("px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all", activeTab === 'invoices' ? 'text-white shadow-sm' : 'text-white/40 hover:text-white')} style={activeTab === 'invoices' ? { backgroundColor: primaryColor } : {}}>Invoices</button>
              <button onClick={() => setActiveTab('quotations')} className={cn("px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all", activeTab === 'quotations' ? 'text-white shadow-sm' : 'text-white/40 hover:text-white')} style={activeTab === 'quotations' ? { backgroundColor: primaryColor } : {}}>Quotations</button>
           </div>
           <button onClick={handleCreateNew} className="px-5 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest text-white shadow-md flex items-center gap-2 transition-all active:scale-95 hover:opacity-90" style={{ backgroundColor: primaryColor }}>
              <Plus size={14} /> Create New
           </button>
        </div>
      </div>

      {/* STATS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 no-print">
         <div className="glass-panel p-5 rounded-2xl border border-white/5 shadow-sm hover:border-blue-500/30 transition-all group">
            <div className="flex items-center justify-between mb-2">
               <p className="text-[10px] font-bold uppercase text-white/40 tracking-widest">Total Invoices</p>
               <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500 group-hover:scale-110 transition-transform">
                  <FileText size={16} />
               </div>
            </div>
            <div className="flex items-baseline gap-2">
               <h3 className="text-2xl font-bold text-white">{docs.filter(d => d.type === 'invoice' || d.type === 'invoices').length}</h3>
               <p className="text-[10px] text-white/40 font-medium">Documents</p>
            </div>
            <p className="text-[10px] text-blue-400 font-bold mt-2">RM {docs.filter(d => d.type === 'invoice' || d.type === 'invoices').reduce((sum, d) => sum + d.total, 0).toLocaleString()}</p>
         </div>

         <div className="glass-panel p-5 rounded-2xl border border-white/5 shadow-sm hover:border-violet-500/30 transition-all group">
            <div className="flex items-center justify-between mb-2">
               <p className="text-[10px] font-bold uppercase text-white/40 tracking-widest">Total Quotations</p>
               <div className="p-2 bg-violet-500/10 rounded-lg text-violet-500 group-hover:scale-110 transition-transform">
                  <FileSpreadsheet size={16} />
               </div>
            </div>
            <div className="flex items-baseline gap-2">
               <h3 className="text-2xl font-bold text-white">{docs.filter(d => d.type === 'quotation' || d.type === 'quotations').length}</h3>
               <p className="text-[10px] text-white/40 font-medium">Documents</p>
            </div>
            <p className="text-[10px] text-violet-400 font-bold mt-2">RM {docs.filter(d => d.type === 'quotation' || d.type === 'quotations').reduce((sum, d) => sum + d.total, 0).toLocaleString()}</p>
         </div>

         <div className="glass-panel p-5 rounded-2xl border border-white/5 shadow-sm hover:border-emerald-500/30 transition-all group">
            <div className="flex items-center justify-between mb-2">
               <p className="text-[10px] font-bold uppercase text-white/40 tracking-widest">Paid Amount</p>
               <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500 group-hover:scale-110 transition-transform">
                  <Activity size={16} />
               </div>
            </div>
            <div className="flex items-baseline gap-2">
               <h3 className="text-2xl font-bold text-emerald-500">RM {docs.filter(d => d.status === 'Paid').reduce((sum, d) => sum + d.total, 0).toLocaleString()}</h3>
            </div>
            <p className="text-[10px] text-white/40 font-bold mt-2">{docs.filter(d => d.status === 'Paid').length} Paid Invoices</p>
         </div>

         <div className="glass-panel p-5 rounded-2xl border border-white/5 shadow-sm hover:border-red-500/30 transition-all group">
            <div className="flex items-center justify-between mb-2">
               <p className="text-[10px] font-bold uppercase text-white/40 tracking-widest">Pending / Overdue</p>
               <div className="p-2 bg-red-500/10 rounded-lg text-red-500 group-hover:scale-110 transition-transform">
                  <Calendar size={16} />
               </div>
            </div>
            <div className="flex items-baseline gap-2">
               <h3 className="text-2xl font-bold text-red-500">RM {docs.filter(d => d.status !== 'Paid' && (d.type === 'invoice' || d.type === 'invoices')).reduce((sum, d) => sum + d.total, 0).toLocaleString()}</h3>
            </div>
            <p className="text-[10px] text-white/40 font-bold mt-2">{docs.filter(d => d.status !== 'Paid' && (d.type === 'invoice' || d.type === 'invoices')).length} Pending Invoices</p>
         </div>
      </div>

      {/* SEARCH & FILTER BAR */}
      <div className="bg-[#121212] p-4 rounded-2xl border border-white/5 flex flex-col lg:flex-row items-center gap-4 no-print shadow-sm">
         <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
            <input 
               type="text" 
               placeholder="Search by Document No, Customer Name, or Address..." 
               className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 outline-none focus:border-blue-500/50 text-sm text-white transition-all" 
               value={searchTerm} 
               onChange={e => setSearchTerm(e.target.value)} 
            />
         </div>
         <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl border border-white/10">
               {['All', 'Draft', 'Sent', 'Paid', 'Overdue'].map(status => (
                  <button 
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all",
                      statusFilter === status ? "bg-white text-black" : "text-white/40 hover:text-white"
                    )}
                  >
                    {status}
                  </button>
               ))}
            </div>
            <div className="h-8 w-[1px] bg-white/10 hidden lg:block mx-1"></div>
            <button 
              onClick={downloadCSV}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-all text-[10px] font-bold uppercase tracking-widest"
            >
               <Download size={14} />
               Export
            </button>
            <p className="text-[10px] font-bold uppercase text-white/20 tracking-widest whitespace-nowrap ml-auto">
               Showing {filteredDocs.length} of {docs.filter(d => d.type === (activeTab === 'invoices' ? 'invoice' : 'quotation') || d.type === activeTab).length} {activeTab}
            </p>
         </div>
      </div>

      {/* LIST VIEW */}
      <div className="bg-[#121212] rounded-2xl shadow-sm border border-white/5 overflow-hidden no-print">
         <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/5">
               <thead className="bg-white/5">
                  <tr>
                     <th className="px-6 py-4 text-left text-[10px] font-bold uppercase text-white/40 tracking-widest">Doc No</th>
                     <th className="px-6 py-4 text-left text-[10px] font-bold uppercase text-white/40 tracking-widest">Customer</th>
                     <th className="px-6 py-4 text-center text-[10px] font-bold uppercase text-white/40 tracking-widest">Status</th>
                     <th className="px-6 py-4 text-right text-[10px] font-bold uppercase text-white/40 tracking-widest">Total (RM)</th>
                     <th className="px-6 py-4 text-center text-[10px] font-bold uppercase text-white/40 tracking-widest">Actions</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-white/5">
                  {isLoading ? (
                    <tr><td colSpan={5} className="py-12 text-center opacity-30"><Activity className="mx-auto mb-4 animate-spin" size={32} /></td></tr>
                  ) : filteredDocs.length === 0 ? (
                    <tr><td colSpan={5} className="py-12 text-center opacity-30">
                       <p className="font-bold uppercase tracking-widest text-xs italic">No Documents Found</p>
                    </td></tr>
                  ) : filteredDocs.map((doc, idx) => (
                    <tr key={`${doc.id}-${idx}`} className="hover:bg-white/5 transition-colors group">
                       <td className="px-6 py-4">
                          <p className="font-bold text-sm text-blue-400">{doc.id}</p>
                          <p className="text-[9px] font-medium text-white/40 uppercase mt-1">Date: {doc.date}</p>
                       </td>
                       <td className="px-6 py-4">
                          <p className="font-bold text-white text-sm uppercase tracking-tight">{doc.customerName}</p>
                          <p className="text-[9px] font-medium text-white/40 uppercase mt-1 truncate max-w-[200px]">{doc.address}</p>
                       </td>
                       <td className="px-6 py-4 text-center">
                          <span className={`px-3 py-1 rounded-full text-[8px] font-bold uppercase tracking-widest border ${getStatusColor(doc.status || 'Draft')}`}>
                            {doc.status || 'Draft'}
                          </span>
                       </td>
                       <td className="px-6 py-4 text-right font-bold text-white text-sm">RM {Number(doc.total || 0).toFixed(2)}</td>
                       <td className="px-6 py-4 text-center">
                          <div className="flex justify-center gap-2">
                             <button onClick={() => { setSelectedDoc(doc); setShowPreview(true); }} className="p-2 bg-white/5 border border-white/10 rounded-lg text-white/40 hover:text-blue-400 hover:border-blue-400/20 transition-all shadow-sm active:scale-90" title="Preview"><Eye size={14}/></button>
                             <button onClick={() => handleEdit(doc)} className="p-2 bg-white/5 border border-white/10 rounded-lg text-white/40 hover:text-emerald-500 hover:border-emerald-500/20 transition-all shadow-sm active:scale-90" title="Edit"><Edit3 size={14}/></button>
                             <button onClick={() => {
                                const text = `Salam, ini adalah ${doc.type === 'invoice' ? 'Invois' : 'Sebut Harga'} anda (${doc.id}) berjumlah RM ${Number(doc.total || 0).toFixed(2)}. Sila rujuk dokumen yang dilampirkan. Terima kasih!`;
                                window.open(`https://wa.me/${doc.phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`, '_blank');
                             }} className="p-2 bg-white/5 border border-white/10 rounded-lg text-white/40 hover:text-green-500 hover:border-green-500/20 transition-all shadow-sm active:scale-90" title="Share via WhatsApp"><Send size={14}/></button>
                             <button 
                               onClick={(e) => {
                                 e.stopPropagation();
                                 handleDelete(doc.id);
                               }} 
                               className="p-2 bg-white/5 border border-white/10 rounded-lg text-white/40 hover:text-red-500 hover:border-red-500/20 transition-all shadow-sm active:scale-90 hover:scale-110" 
                               title="Delete"
                             >
                               <Trash2 size={18}/>
                             </button>
                          </div>
                       </td>
                    </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>

      {/* DOCUMENT FORM MODAL */}
      <AnimatePresence>
      {showForm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 no-print">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-[#121212] w-full max-w-5xl rounded-2xl p-6 shadow-2xl overflow-y-auto max-h-[95vh] relative border border-white/5"
          >
             <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg" style={{ backgroundColor: primaryColor }}>
                     {isEditing ? <Edit3 size={20} /> : <Plus size={20}/>}
                   </div>
                   <div>
                      <h3 className="text-lg font-bold text-white uppercase tracking-tight">{isEditing ? 'Edit Document' : 'Create Document'}</h3>
                      <p className="text-[9px] text-white/40 font-bold uppercase tracking-widest mt-1">{activeTab === 'invoices' ? 'Invoice' : 'Quotation'}</p>
                   </div>
                </div>
                <button onClick={() => setShowForm(false)} className="w-8 h-8 bg-white/5 rounded-full flex items-center justify-center text-white/40 hover:text-red-500 transition-all"><X size={18}/></button>
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7 space-y-4">
                   <div className="p-5 bg-white/5 rounded-2xl border border-white/5 space-y-3 relative">
                      <div className="flex justify-between items-center">
                         <p className="text-[9px] font-bold uppercase text-white/40 tracking-widest flex items-center gap-2">Customer Information</p>
                         <button 
                           onClick={() => setShowCustomerSelect(!showCustomerSelect)}
                           className="text-[8px] font-bold uppercase text-blue-400 hover:text-blue-300 flex items-center gap-1"
                         >
                           <Search size={10} /> Select Existing
                         </button>
                      </div>
                      
                      {showCustomerSelect && (
                        <div className="absolute top-12 left-0 right-0 z-50 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl max-h-[200px] overflow-y-auto p-2 space-y-1">
                           {customers.length === 0 ? (
                             <p className="text-[10px] text-white/30 p-4 text-center">No customers found</p>
                           ) : customers.map((c, idx) => (
                             <button 
                               key={`${c.id}-${idx}`}
                               onClick={() => {
                                 setFormData({ ...formData, customerName: c.name, phone: c.phone, address: c.address });
                                 setShowCustomerSelect(false);
                               }}
                               className="w-full text-left p-2 hover:bg-white/5 rounded-lg transition-colors"
                             >
                               <p className="text-xs font-bold text-white">{c.name}</p>
                               <p className="text-[9px] text-white/40">{c.phone}</p>
                             </button>
                           ))}
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3">
                         <div className="space-y-1">
                             <label className="text-[8px] font-bold uppercase text-white/20 ml-1">Customer Name</label>
                             <input className="w-full p-2.5 rounded-lg border border-white/10 font-medium text-xs text-white outline-none focus:border-blue-500/50 bg-white/5" placeholder="Name..." value={formData.customerName} onChange={e => setFormData({...formData, customerName: e.target.value})} />
                         </div>
                         <div className="space-y-1">
                             <label className="text-[8px] font-bold uppercase text-white/20 ml-1">Phone</label>
                             <input className="w-full p-2.5 rounded-lg border border-white/10 font-medium text-xs text-white outline-none focus:border-blue-500/50 bg-white/5" placeholder="Phone..." value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                         </div>
                      </div>
                      <div className="space-y-1">
                          <label className="text-[8px] font-bold uppercase text-white/20 ml-1">Address</label>
                          <textarea className="w-full p-2.5 rounded-lg border border-white/10 font-medium text-xs text-white outline-none focus:border-blue-500/50 bg-white/5 resize-none" placeholder="Address..." rows={2} value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                      </div>
                   </div>
                   
                   <div className="p-5 bg-white/5 rounded-2xl border border-white/5 space-y-3">
                      <p className="text-[9px] font-bold uppercase text-white/40 tracking-widest flex items-center gap-2">Document Details</p>
                      <div className="grid grid-cols-2 gap-3">
                         <div className="space-y-1">
                             <label className="text-[8px] font-bold uppercase text-white/20 ml-1">Doc No</label>
                             <input className="w-full p-2.5 rounded-lg border border-white/10 font-medium text-xs text-white bg-white/5" placeholder="Auto ID" value={formData.id} onChange={e => setFormData({...formData, id: e.target.value})} />
                         </div>
                         <div className="space-y-1">
                             <label className="text-[8px] font-bold uppercase text-white/20 ml-1">Date</label>
                             <input type="date" className="w-full p-2.5 rounded-lg border border-white/10 font-medium text-xs text-white bg-white/5" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                         </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                         <div className="space-y-1">
                             <label className="text-[8px] font-bold uppercase text-white/20 ml-1">Terms</label>
                             <input className="w-full p-2.5 rounded-lg border border-white/10 font-medium text-xs text-white bg-white/5 uppercase" placeholder="CASH" value={formData.terms} onChange={e => setFormData({...formData, terms: e.target.value})} />
                         </div>
                         <div className="space-y-1">
                             <label className="text-[8px] font-bold uppercase text-white/20 ml-1">Status</label>
                             <select className="w-full p-2.5 rounded-lg border border-white/10 font-medium text-xs text-white bg-white/5 outline-none" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                                <option value="Draft" className="bg-[#121212]">Draft</option>
                                <option value="Sent" className="bg-[#121212]">Sent</option>
                                <option value="Paid" className="bg-[#121212]">Paid</option>
                                <option value="Overdue" className="bg-[#121212]">Overdue</option>
                             </select>
                         </div>
                         <div className="space-y-1">
                             <label className="text-[8px] font-bold uppercase text-white/20 ml-1">Job</label>
                             <input className="w-full p-2.5 rounded-lg border border-white/10 font-medium text-xs text-white bg-white/5 uppercase" placeholder="Job Type" value={formData.job} onChange={e => setFormData({...formData, job: e.target.value})} />
                         </div>
                      </div>
                      {activeTab === 'quotations' && (
                        <div className="grid grid-cols-2 gap-3 mt-3">
                           <div className="space-y-1">
                               <label className="text-[8px] font-bold uppercase text-white/20 ml-1">Payment Terms</label>
                               <input className="w-full p-2.5 rounded-lg border border-white/10 font-medium text-xs text-white bg-white/5" placeholder="e.g. 80% Deposit, 20% Completion" value={formData.paymentTerms} onChange={e => setFormData({...formData, paymentTerms: e.target.value})} />
                           </div>
                           <div className="space-y-1">
                               <label className="text-[8px] font-bold uppercase text-white/20 ml-1">Validity</label>
                               <input className="w-full p-2.5 rounded-lg border border-white/10 font-medium text-xs text-white bg-white/5 uppercase" placeholder="7 DAYS" value={formData.validity} onChange={e => setFormData({...formData, validity: e.target.value})} />
                           </div>
                        </div>
                      )}
                   </div>
                </div>

                <div className="lg:col-span-5 flex flex-col h-full">
                   <div className="flex-1 p-5 bg-white/5 border border-white/5 rounded-2xl flex flex-col shadow-sm h-full">
                      <div className="flex justify-between items-center mb-4">
                         <p className="text-[9px] font-bold uppercase text-white/40 tracking-widest">Items & Services</p>
                         <button onClick={addItem} className="text-[9px] font-bold uppercase text-white px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all active:scale-95 shadow-sm" style={{ backgroundColor: primaryColor }}><Plus size={10}/> Add Item</button>
                      </div>
                      
                      <div className="flex-1 overflow-y-auto max-h-[300px] space-y-2 pr-2">
                         {formData.items.map((item: any, idx: number) => (
                           <div key={idx} className="bg-white/5 p-3 rounded-xl border border-white/5 relative group">
                              <button onClick={() => removeItem(idx)} className="absolute -top-1.5 -right-1.5 text-white p-1 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-all z-10" style={{ backgroundColor: '#EF4444' }}><X size={10}/></button>
                              
                              <div className="relative">
                                 <div className="flex items-center gap-2 mb-2">
                                   <input className="flex-1 bg-transparent font-bold text-[10px] uppercase outline-none text-white placeholder:text-white/20" placeholder="Description..." value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)} />
                                   <button 
                                     onClick={() => setShowCatalogSelect(showCatalogSelect?.idx === idx ? null : {idx})}
                                     className="text-white/20 hover:text-blue-400 transition-colors"
                                     title="Select from Catalog"
                                   >
                                     <ChevronDown size={14} />
                                   </button>
                                 </div>

                                 {showCatalogSelect?.idx === idx && (
                                   <div className="absolute top-6 left-0 right-0 z-50 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl max-h-[150px] overflow-y-auto p-2 space-y-1">
                                      {catalog.length === 0 ? (
                                        <p className="text-[10px] text-white/30 p-4 text-center">No catalog items</p>
                                      ) : catalog.map((c, catIdx) => (
                                        <button 
                                          key={`${c.id}-${catIdx}`}
                                          onClick={() => {
                                            updateItem(idx, 'description', c.name);
                                            updateItem(idx, 'unitPrice', c.price_min);
                                            setShowCatalogSelect(null);
                                          }}
                                          className="w-full text-left p-2 hover:bg-white/5 rounded-lg transition-colors"
                                        >
                                          <div className="flex justify-between items-center">
                                             <p className="text-[10px] font-bold text-white">{c.name}</p>
                                             <p className="text-[9px] text-blue-400">RM {c.price_min}</p>
                                          </div>
                                          <p className="text-[8px] text-white/30 uppercase">{c.category}</p>
                                        </button>
                                      ))}
                                   </div>
                                 )}
                              </div>
                              
                              <div className="grid grid-cols-3 gap-2">
                                 <input type="number" className="bg-white/5 border border-white/10 rounded-lg p-1.5 text-center font-bold text-[10px] text-white outline-none" placeholder="Qty" value={item.qty} onChange={e => updateItem(idx, 'qty', Number(e.target.value))} />
                                 <input type="number" className="bg-white/5 border border-white/10 rounded-lg p-1.5 text-right font-bold text-[10px] text-white outline-none" placeholder="Price" value={item.unitPrice} onChange={e => updateItem(idx, 'unitPrice', Number(e.target.value))} />
                                 <div className="flex items-center justify-end bg-white/10 rounded-lg px-2">
                                     <p className="font-bold text-[10px] text-white">RM {Number(item.amount || 0).toFixed(2)}</p>
                                 </div>
                              </div>
                           </div>
                         ))}
                      </div>

                      <div className="mt-4 pt-4 border-t border-white/5 space-y-2">
                         <div className="flex justify-between text-[10px] font-bold uppercase text-white/40"><span>Subtotal</span> <span className="text-white font-bold">RM {Number(totals.subtotal || 0).toFixed(2)}</span></div>
                         <div className="flex justify-between items-center p-4 rounded-xl text-white mt-2 shadow-lg" style={{ backgroundColor: primaryColor }}>
                            <div><p className="text-[8px] font-bold uppercase tracking-widest opacity-70">Total Amount</p><span className="text-xl font-bold tracking-tight">RM {Number(totals.total || 0).toFixed(2)}</span></div>
                         </div>
                      </div>
                   </div>

                   <div className="mt-4 grid grid-cols-2 gap-3">
                      <button onClick={() => setShowForm(false)} className="w-full bg-white/5 text-white/40 p-3 rounded-xl font-bold uppercase tracking-widest text-[9px] hover:bg-white/10 transition-all">Cancel</button>
                      <button onClick={handleSave} className="w-full text-white p-3 rounded-xl font-bold uppercase tracking-widest text-[9px] shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95 hover:opacity-90" style={{ backgroundColor: primaryColor }}>
                         <Save size={14} /> Save Document
                      </button>
                   </div>
                </div>
             </div>
          </motion.div>
        </div>
      )}
      </AnimatePresence>

      {/* DELETE CONFIRMATION MODAL */}
      <AnimatePresence>
        {docToDelete && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[120] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#121212] w-full max-w-sm rounded-2xl border border-white/10 shadow-2xl p-6 text-center"
            >
              <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={32} />
              </div>
              <h3 className="text-lg font-bold mb-2">Padam Dokumen?</h3>
              <p className="text-white/60 text-sm mb-6">Adakah anda pasti mahu memadam dokumen ini? Tindakan ini tidak boleh diundur.</p>
              <div className="flex gap-3">
                <button onClick={() => setDocToDelete(null)} className="flex-1 py-2.5 rounded-lg font-bold text-sm bg-white/5 hover:bg-white/10 transition-colors">Batal</button>
                <button onClick={confirmDelete} className="flex-1 py-2.5 rounded-lg font-bold text-sm bg-red-600 hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20">Padam</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PROFESSIONAL A4 PREVIEW MODAL */}
      <AnimatePresence>
      {showPreview && selectedDoc && (
        <div className="fixed inset-0 bg-black/90 z-[150] flex flex-col items-center p-4 overflow-y-auto backdrop-blur-md">
           {/* Fixed Close Button - Always visible */}
           <button 
             onClick={() => setShowPreview(false)}
             className="fixed top-6 right-6 z-[200] p-3 bg-red-600 text-white rounded-full shadow-2xl hover:bg-red-700 transition-all active:scale-95 no-print"
             title="Close Preview"
           >
             <X size={24} />
           </button>

           <div className="w-full max-w-[800px] flex justify-end items-center mb-4 gap-4 no-print sticky top-0 z-50 bg-black/50 p-4 rounded-b-2xl backdrop-blur-md">
              <div className="flex gap-2">
                 <button onClick={() => handlePrint()} className="bg-white text-black px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 hover:bg-gray-200 transition-all">
                    <Printer size={16} /> Print / PDF
                 </button>
                 <button onClick={() => setShowPreview(false)} className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 hover:bg-red-700 transition-all">
                    <X size={16} /> Close
                 </button>
              </div>
           </div>

           <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            id="printable-content" 
            className="bg-white w-full max-w-[800px] p-[30px] shadow-2xl relative flex flex-col mx-auto text-black font-sans"
           >
              <style>{`
                #printable-content {
                    font-family: Arial, sans-serif;
                    background: white;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }
                #printable-content * {
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }
                .mnf-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding-bottom: 10px;
                }
                .mnf-logo {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                .mnf-logo img {
                    width: 100px;
                    height: auto;
                    object-fit: contain;
                }
                .mnf-title {
                    font-size: 24px;
                    font-weight: bold;
                    color: #1E90FF;
                    text-align: right;
                }
                .mnf-title small {
                    font-size: 14px;
                    color: #333;
                    font-weight: normal;
                    display: block;
                    margin-top: 2px;
                }
                .mnf-info {
                    margin-top: 20px;
                    font-size: 13px;
                    line-height: 1.5;
                }
                .mnf-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 20px;
                }
                .mnf-table th, .mnf-table td {
                    border: 1px solid #000;
                    padding: 6px;
                    font-size: 13px;
                }
                .mnf-table th {
                    background: #e9eef5 !important;
                    text-align: left;
                }
                .mnf-right {
                    text-align: right;
                }
                .mnf-center {
                    text-align: center;
                }
                .mnf-summary {
                    width: 40%;
                    float: right;
                    margin-top: 15px;
                    border-collapse: collapse;
                    border: 1px solid #000;
                }
                .mnf-summary td {
                    border: 1px solid #000;
                    padding: 6px 10px;
                    font-size: 13px;
                }
                .mnf-summary tr:not(.mnf-total) td:first-child {
                    background: #e9eef5 !important;
                    font-weight: bold;
                }
                .mnf-total {
                    background: #1E90FF !important;
                    color: white !important;
                    font-weight: bold;
                }
                .mnf-clear {
                    clear: both;
                }
                .mnf-signature {
                    margin-top: 70px;
                    display: flex;
                    justify-content: space-between;
                    font-size: 13px;
                }
                .mnf-footer {
                    margin-top: 20px;
                    font-size: 12px;
                    line-height: 1.5;
                }
                .bg-blue-header {
                    background-color: #1E90FF !important;
                    color: white !important;
                }
                .job-section {
                    display: flex;
                    gap: 15px;
                    margin-top: 20px;
                }
                .info-box {
                    flex: 1;
                    border: 2px solid #1E90FF;
                    padding: 12px;
                    background: rgba(30,144,255,0.05) !important;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }
                .info-title {
                    font-weight: bold;
                    color: #1E90FF;
                    margin-bottom: 6px;
                    font-size: 13px;
                    border-bottom: 1px solid #1E90FF;
                    padding-bottom: 4px;
                }
                .info-value {
                    font-size: 13px;
                }
                @media print {
                    .info-box {
                        background: white !important;
                    }
                }
              `}</style>

              <div className="mnf-header">
                  <div className="mnf-logo" style={{ alignItems: 'flex-start' }}>
                      <img src={coLogo} alt="MNF Logo" referrerPolicy="no-referrer" />
                      <div className="text-[13px] leading-relaxed">
                          <strong>{coName} ({coReg})</strong><br/>
                          {coAddr.split(',').map((line, i) => <span key={i}>{line.trim()}<br/></span>)}
                      </div>
                  </div>
                  
                  {(selectedDoc.type === 'invoices' || selectedDoc.type === 'invoice') ? (
                      <div style={{ width: '300px' }}>
                          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#1E90FF', textAlign: 'right', marginBottom: '15px' }}>
                              INVOICE
                          </div>
                          <table style={{ width: '100%', textAlign: 'center', borderCollapse: 'collapse' }}>
                              <tbody>
                                  <tr>
                                      <td className="bg-blue-header" style={{ fontWeight: 'bold', padding: '4px', width: '50%', border: '1px solid white' }}>INVOICE</td>
                                      <td className="bg-blue-header" style={{ fontWeight: 'bold', padding: '4px', width: '50%', border: '1px solid white' }}>DATE</td>
                                  </tr>
                                  <tr>
                                      <td style={{ padding: '4px', border: '1px solid #eee', fontSize: '13px' }}>{selectedDoc.id}</td>
                                      <td style={{ padding: '4px', border: '1px solid #eee', fontSize: '13px' }}>{selectedDoc.date}</td>
                                  </tr>
                              </tbody>
                          </table>
                      </div>
                  ) : (
                      <div style={{ width: '300px' }}>
                          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#1E90FF', textAlign: 'right', marginBottom: '15px' }}>
                              QUOTATION
                          </div>
                          <table style={{ width: '100%', textAlign: 'center', borderCollapse: 'collapse' }}>
                              <tbody>
                                  <tr>
                                      <td className="bg-blue-header" style={{ fontWeight: 'bold', padding: '4px', width: '50%', border: '1px solid white' }}>QUOTATION</td>
                                      <td className="bg-blue-header" style={{ fontWeight: 'bold', padding: '4px', width: '50%', border: '1px solid white' }}>DATE</td>
                                  </tr>
                                  <tr>
                                      <td style={{ padding: '4px', border: '1px solid #eee', fontSize: '13px' }}>{selectedDoc.id}</td>
                                      <td style={{ padding: '4px', border: '1px solid #eee', fontSize: '13px' }}>{selectedDoc.date}</td>
                                  </tr>
                              </tbody>
                          </table>
                      </div>
                  )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px', marginBottom: '20px' }}>
                  <div style={{ width: '45%' }}>
                      <div className="bg-blue-header" style={{ fontWeight: 'bold', padding: '4px 8px', fontSize: '13px', display: 'inline-block', minWidth: '200px' }}>
                          BILL TO
                      </div>
                      <div style={{ marginTop: '8px', fontSize: '13px', lineHeight: '1.5' }}>
                          <strong>{selectedDoc.customerName}</strong><br/>
                          <span className="whitespace-pre-wrap">{selectedDoc.address}</span><br/>
                          Tel: {selectedDoc.phone}
                      </div>
                  </div>
                  {(selectedDoc.type === 'invoices' || selectedDoc.type === 'invoice') && (
                      <div style={{ width: '300px' }}>
                          <table style={{ width: '100%', textAlign: 'center', borderCollapse: 'collapse' }}>
                              <tbody>
                                  <tr>
                                      <td className="bg-blue-header" style={{ fontWeight: 'bold', padding: '4px', width: '50%', border: '1px solid white' }}>CUSTOMER ID</td>
                                      <td className="bg-blue-header" style={{ fontWeight: 'bold', padding: '4px', width: '50%', border: '1px solid white' }}>TERMS</td>
                                  </tr>
                                  <tr>
                                      <td style={{ padding: '4px', border: '1px solid #eee', fontSize: '13px' }}>CUST-{selectedDoc.id.split('/').pop() || '001'}</td>
                                      <td style={{ padding: '4px', border: '1px solid #eee', fontSize: '13px', textTransform: 'uppercase' }}>{selectedDoc.terms || 'CASH'}</td>
                                  </tr>
                              </tbody>
                          </table>
                      </div>
                  )}
              </div>

              {(selectedDoc.type === 'quotations' || selectedDoc.type === 'quotation') && (
                  <div className="job-section">
                      <div className="info-box">
                          <div className="info-title">Job</div>
                          <div className="info-value">SERVICE</div>
                      </div>
                      <div className="info-box">
                          <div className="info-title">Payment Terms</div>
                          <div className="info-value uppercase">{selectedDoc.terms || 'CASH 7 DAYS'}</div>
                      </div>
                      <div className="info-box">
                          <div className="info-title">Validity</div>
                          <div className="info-value">7 DAYS</div>
                      </div>
                  </div>
              )}

              <table className="mnf-table">
                <thead>
                  <tr>
                      {(selectedDoc.type === 'quotations' || selectedDoc.type === 'quotation') && <th className="w-10 text-center">No</th>}
                      <th>Description</th>
                      <th className="w-16 text-center">Qty</th>
                      <th className="w-28 text-right">Unit Price</th>
                      <th className="w-32 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedDoc.items.map((item: any, idx: number) => (
                    <tr key={idx}>
                        {(selectedDoc.type === 'quotations' || selectedDoc.type === 'quotation') && <td className="mnf-center">{idx + 1}</td>}
                        <td className="whitespace-pre-wrap">{item.description}</td>
                        <td className="mnf-center">{item.qty}</td>
                        <td className="mnf-right">RM {item.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="mnf-right">RM {item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {(selectedDoc.type === 'invoices' || selectedDoc.type === 'invoice') && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '15px' }}>
                  <div style={{ width: '55%', fontStyle: 'italic', fontSize: '11px', color: '#1E90FF', fontWeight: 'bold', paddingTop: '4px' }}>
                    {numberToWords(selectedDoc.total)}
                  </div>
                  <table className="mnf-summary" style={{ marginTop: 0, width: '40%' }}>
                    <tbody>
                      <tr>
                          <td>Subtotal</td>
                          <td className="mnf-right">RM {selectedDoc.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      </tr>
                      <tr>
                          <td>Deposit</td>
                          <td className="mnf-right">RM {Number(selectedDoc.deposit).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      </tr>
                      <tr className="mnf-total">
                          <td>Total</td>
                          <td className="mnf-right">RM {selectedDoc.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              <div className="mnf-footer">
                  {(selectedDoc.type === 'invoices' || selectedDoc.type === 'invoice') ? (
                    <>
                      1. All payment should be made by cash or transfer to CIMB Bank 8605118537<br/>
                      2. Installation warranty: 1 week from installation date
                    </>
                  ) : (
                    <>
                      <strong>Payment Term:</strong><br/>
                      - 80% upon Purchase Order<br/>
                      - 20% upon Job Completion<br/><br/>
                      All payment can be made by cheque to MNF ENGINEERING SERVICES<br/>
                      CIMB Bank Acc No 8605118537
                    </>
                  )}
              </div>

              <div className="mnf-signature">
                  <div>
                      {(selectedDoc.type === 'invoices' || selectedDoc.type === 'invoice') && (
                        <>
                          ___________________________<br/>
                          Acknowledgement by Customer
                        </>
                      )}
                  </div>
                  <div>
                      ___________________________<br/>
                      Authorised Signature
                  </div>
              </div>

              <div className="mt-8 flex justify-center no-print">
                 <button onClick={() => setShowPreview(false)} className="bg-red-600 text-white px-8 py-3 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-red-700 transition-all shadow-lg">
                    <X size={18} /> Close Preview
                 </button>
              </div>

           </motion.div>
        </div>
      )}
      </AnimatePresence>
    </div>
  );
};

export default Invoices;
