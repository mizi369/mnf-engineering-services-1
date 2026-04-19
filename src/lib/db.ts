
import { 
  Booking, Employee, Payroll, InventoryItem, SaleRecord, Expense, 
  Customer, Promotion, Invoice, Quotation,
  AiQuestion, AiAnswer, AiMapping, AiTraining, AiLock, AiLearningLog, ServicePrice, BlockedSlot
} from '../types';
import { supabase } from '../service/supabase';

export const TABLES = {
  BOOKINGS: 'mnf_bookings',
  EMPLOYEES: 'mnf_employees',
  PAYROLL: 'mnf_payroll',
  INVENTORY: 'mnf_inventory',
  SALES: 'mnf_sales',
  EXPENSES: 'mnf_expenses',
  CUSTOMERS: 'mnf_customers',
  PROMOTIONS: 'mnf_promotions',
  AI_QUESTIONS: 'mnf_ai_questions',
  AI_ANSWERS: 'mnf_ai_answers',
  AI_MAPPINGS: 'mnf_ai_mappings',
  AI_TRAINING: 'mnf_ai_training',
  AI_LOCKS: 'mnf_ai_locks',
  AI_LEARNING_LOGS: 'mnf_ai_learning_logs',
  SERVICES: 'mnf_services',
  BLOCKED_SLOTS: 'mnf_blocked_slots',
  TIME_SLOTS: 'mnf_time_slots',
  TEAMS: 'mnf_teams',
  CHAT_LOGS: 'mnf_chat_logs',
  SETTINGS: 'mnf_settings',
  TEMPLATES: 'mnf_templates',
  DOCUMENTS: 'mnf_documents',
  TRANSACTIONS: 'mnf_transactions'
};

// Map local keys to Supabase table names if different (mostly same based on SQL)
// We rely on TABLE constants matching Supabase table names directly.

export const db = {
  // Initialize: Fetch all data from Supabase and cache in LocalStorage for sync reads
  init: async () => {
    if (!(supabase as any).isConfigured) {
        console.log('[DB] Supabase not configured, using local storage mode.');
        return;
    }
    console.log('[DB] Starting Full Sync from Supabase...');
    try {
        const tableKeys = Object.values(TABLES);
        
        await Promise.all(tableKeys.map(async (table) => {
            const { data, error } = await supabase.from(table).select('*');
            if (!error && data) {
                localStorage.setItem(table, JSON.stringify(data));
            } else if (error) {
                // Suppress excessive logging for unconfigured supabase
                const msg = (error.message || '').toLowerCase();
                if (!msg.includes('supabase not configured')) {
                    console.warn(`[DB] Sync error for ${table}:`, error.message);
                }
                // Fallback: If table empty/error, keep existing localStorage or init empty
                if (!localStorage.getItem(table)) localStorage.setItem(table, '[]');
            }
        }));
        
        console.log('[DB] Sync Complete.');
        return true;
    } catch (e) {
        console.error('[DB] Critical Sync Error:', e);
        return false;
    }
  },

  // Synchronous Read (from Cache) - Fast for UI rendering
  getAll: <T>(table: string): T[] => {
    try {
      const data = localStorage.getItem(table);
      let items = data ? JSON.parse(data) : [];
      
      // Self-healing: Ensure all items have an ID
      let changed = false;
      items = items.map((i: any) => {
        if (i.id === undefined || i.id === null) {
            i.id = Date.now() + Math.floor(Math.random() * 1000); // Generate unique temp ID
            changed = true;
        }
        return i;
      });

      if (changed) {
          localStorage.setItem(table, JSON.stringify(items));
      }

      return items;
    } catch (e) {
      console.error(`Error reading table ${table}`, e);
      return [];
    }
  },

  getById: <T extends { id: string | number }>(table: string, id: string | number): T | undefined => {
    const items = db.getAll<T>(table);
    return items.find(i => i.id === id || i.id?.toString() === id.toString());
  },

  // Async Write (Supabase + Cache Update)
  insert: async <T>(table: string, item: T) => {
    // 1. Ensure Item has ID
    const newItem = { ...item } as any;
    if (!newItem.id) {
        newItem.id = Date.now() + Math.floor(Math.random() * 1000000);
    }

    // 2. Optimistic Update (Cache)
    const items = db.getAll<T>(table);
    items.push(newItem);
    localStorage.setItem(table, JSON.stringify(items));

    // 3. Database Write
    if (!(supabase as any).isConfigured) {
        return { error: null };
    }

    try {
        // We attempt to insert. If Supabase returns data with a DIFFERENT ID (e.g. serial),
        // we should update our local cache to match.
        const { data, error } = await supabase.from(table).insert(item).select();
        
        if (error) throw error;
        
        // Update local cache with real DB data if available
        if (data && data[0]) {
            const realItem = data[0];
            const currentItems = db.getAll<T>(table);
            // Find the item we just added (by temp ID or matching fields)
            // Since we can't easily match by ID if it changed, we might rely on the fact 
            // that we just pushed it to the end. But race conditions exist.
            // Safer strategy: If we sent an ID, it matches. If we didn't, we have a problem mapping back.
            // For now, let's assume if we generated an ID, we sent it, or we just keep the local one until next sync.
            
            // If the DB generated a new ID, we have a duplicate in concept (one with temp ID, one in DB with real ID).
            // Next sync will bring the Real ID. The Temp ID one will remain until cleared.
            // To fix this: We should try to swap it if possible.
            
            const index = currentItems.findIndex(i => (i as any).id === newItem.id);
            if (index !== -1) {
                currentItems[index] = realItem;
                localStorage.setItem(table, JSON.stringify(currentItems));
            }
        }

        console.log(`[DB] Inserted into ${table}`);
        return { error: null };
    } catch (e: any) {
        const msg = (e?.message || e?.error?.message || JSON.stringify(e) || '').toLowerCase();
        if (msg.includes('supabase not configured')) {
             return { error: null }; // Treat as success for offline mode
        }
        console.error(`[DB] Insert Failed ${table}:`, e?.message || e);
        return { error: e };
    }
  },

  // Sync Customer from Booking/Sale
  syncCustomer: async (data: { name: string; phone: string; address?: string }) => {
    if (!data.phone) return;
    
    try {
      const customers = db.getAll<Customer>(TABLES.CUSTOMERS);
      const existing = customers.find(c => c.phone === data.phone);
      
      if (existing) {
        // Update if name or address changed
        if (existing.name !== data.name || (data.address && existing.address !== data.address)) {
          await db.update<any>(TABLES.CUSTOMERS, existing.id, {
            name: data.name,
            address: data.address || existing.address,
            lastService: new Date().toISOString().split('T')[0]
          });
        }
      } else {
        // Create new customer
        await db.insert<any>(TABLES.CUSTOMERS, {
          name: data.name,
          phone: data.phone,
          address: data.address || '',
          totalSpent: 0,
          lastService: new Date().toISOString().split('T')[0]
        });
      }
    } catch (e) {
      console.error('[DB] Customer Sync Error:', e);
    }
  },

  update: async <T extends { id: string | number }>(table: string, id: string | number, updates: Partial<T>) => {
    // 1. Optimistic Update
    const items = db.getAll<T>(table);
    const index = items.findIndex(i => i.id === id || i.id?.toString() === id.toString());
    if (index !== -1) {
      items[index] = { ...items[index], ...updates };
      localStorage.setItem(table, JSON.stringify(items));
    }

    // 2. Database Write
    if (!(supabase as any).isConfigured) {
        return { error: null };
    }

    try {
        const { error } = await supabase.from(table).update(updates).eq('id', id);
        if (error) throw error;
        console.log(`[DB] Updated ${table} : ${id}`);
        return { error: null };
    } catch (e: any) {
        const msg = (e?.message || e?.error?.message || JSON.stringify(e) || '').toLowerCase();
        if (msg.includes('supabase not configured')) {
             return { error: null };
        }
        console.error(`[DB] Update Failed ${table}:`, e?.message || e);
        return { error: e };
    }
  },

  delete: async <T extends { id: string | number }>(table: string, id: string | number) => {
    console.log(`[DB] Deleting from ${table} ID: ${id}`);
    
    // 1. Optimistic Update
    const items = db.getAll<T>(table);
    const filtered = items.filter(i => String(i.id) !== String(id));
    const deletedLocally = items.length !== filtered.length;

    if (deletedLocally) {
        localStorage.setItem(table, JSON.stringify(filtered));
        console.log(`[DB] Removed ${items.length - filtered.length} item(s) locally`);
    } else {
        console.warn(`[DB] Warning: Item with ID ${id} not found in ${table} (Local)`);
    }

    // 2. Database Write
    if (!(supabase as any).isConfigured) {
        return { error: null };
    }

    let remoteError = null;
    try {
        const { error } = await supabase.from(table).delete().eq('id', id);
        if (error) throw error;
        console.log(`[DB] Supabase deleted from ${table} : ${id}`);
    } catch (e: any) {
        const msg = (e?.message || e?.error?.message || JSON.stringify(e) || '').toLowerCase();
        if (!msg.includes('supabase not configured')) {
            console.error(`[DB] Delete Failed ${table}:`, e?.message || e);
            remoteError = e;
        }
    }

    // PRIORITY: If deleted locally, return success so UI updates.
    // If not found locally, but no remote error, return success (maybe stale UI).
    // Only return error if NOT deleted locally AND remote failed.
    if (deletedLocally) {
        return { error: null };
    }

    return { error: remoteError ? remoteError : null };
  },

  getStats: () => {
    const documents = db.getAll<any>(TABLES.DOCUMENTS);
    const invoices = documents.filter(d => d.type === 'invoice');
    const sales = db.getAll<any>(TABLES.SALES);
    const quotations = documents.filter(d => d.type === 'quotation');
    const bookings = db.getAll<Booking>(TABLES.BOOKINGS);
    const knowledgeCount = db.getAll(TABLES.AI_MAPPINGS).length;
    const customersCount = db.getAll(TABLES.CUSTOMERS).length;
    const employeesCount = db.getAll(TABLES.EMPLOYEES).length;
    const payroll = db.getAll<any>(TABLES.PAYROLL);
    const expenses = db.getAll<any>(TABLES.EXPENSES);
    const teams = db.getAll<any>(TABLES.TEAMS);

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const currentMonthName = monthNames[currentMonth];

    // Invoices Stats
    const totalInvoices = invoices.length;
    const totalQuotations = quotations.length;
    
    const paidInvoicesAmount = invoices
      .filter(d => d.status === 'Paid')
      .reduce((sum, d) => sum + (d.total || 0), 0);
    
    const paidSalesAmount = sales
      .filter(s => s.status === 'Paid')
      .reduce((sum, s) => sum + (s.amount || s.total || 0), 0);

    const paidAmount = paidInvoicesAmount + paidSalesAmount;

    const pendingInvoicesAmount = invoices
      .filter(d => d.status !== 'Paid')
      .reduce((sum, d) => sum + (d.total || 0), 0);
    
    const pendingSalesAmount = sales
      .filter(s => s.status !== 'Paid')
      .reduce((sum, s) => sum + (s.amount || s.total || 0), 0);

    const pendingAmount = pendingInvoicesAmount + pendingSalesAmount;

    // Payroll Stats (Current Month)
    const monthlyPayroll = payroll.filter(p => p.month === currentMonthName && p.year.toString() === currentYear.toString());
    const grossSalary = monthlyPayroll.reduce((sum, p) => sum + (p.basic_salary || p.basic || 0), 0);
    const totalEpf = monthlyPayroll.reduce((sum, p) => sum + (p.epf_employee || p.epfEmp || p.epf || 0), 0);
    const totalSocso = monthlyPayroll.reduce((sum, p) => sum + (p.socso_employee || p.socsoEmp || p.socso || 0), 0);
    const netPayable = monthlyPayroll.reduce((sum, p) => sum + (p.net || p.net_salary || 0), 0);
    const monthlyPayrollCost = netPayable; 

    // Teams
    const activeTeams = teams.filter((t: any) => t.active || t.status === 'active').length;

    // Expenses (Current Month)
    const monthlyExpenses = expenses.filter(e => {
      const d = new Date(e.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
    const totalBelanjaBulanIni = monthlyExpenses.reduce((sum, e) => sum + (e.cost || e.amount || 0), 0);
    
    // Fuel Stats (Current Month)
    const fuelExpenses = monthlyExpenses.filter(e => e.type === 'fuel');
    const kekerapanIsiMinyak = fuelExpenses.length;
    const totalFuelCost = fuelExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const purataSekaliIsi = kekerapanIsiMinyak > 0 ? totalFuelCost / kekerapanIsiMinyak : 0;

    // Today's stats
    const today = now.toISOString().split('T')[0];
    const todayBookings = bookings.filter(b => b.date === today).length;
    
    // Inventory Stats
    const inventory = db.getAll<any>(TABLES.INVENTORY);
    const inventoryCount = inventory.length;
    const lowStockCount = inventory.filter(i => i.stock <= 5).length;
    const totalInventoryValue = inventory.reduce((sum, i) => sum + (i.buyPrice * i.stock), 0);

    // Monthly Sales (from paid invoices and sales this month)
    const monthlyInvoiceSales = invoices
      .filter(s => {
        const d = new Date(s.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear && s.status === 'Paid';
      })
      .reduce((sum, s) => sum + (s.total || 0), 0);

    const monthlyDirectSales = sales
      .filter(s => {
        const d = new Date(s.created_at || s.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear && s.status === 'Paid';
      })
      .reduce((sum, s) => sum + (s.amount || s.total || 0), 0);

    const monthlySales = monthlyInvoiceSales + monthlyDirectSales;

    return {
      monthlySales,
      todayBookings,
      knowledgeCount,
      customersCount,
      employeesCount,
      totalInvoices,
      totalQuotations,
      paidAmount,
      pendingAmount,
      monthlyPayrollCost,
      activeTeams,
      grossSalary,
      totalEpf,
      totalSocso,
      netPayable,
      totalBelanjaBulanIni,
      kekerapanIsiMinyak,
      purataSekaliIsi,
      inventoryCount,
      lowStockCount,
      totalInventoryValue
    };
  },

  getTableStats: () => {
    return Object.entries(TABLES).map(([key, tableName]) => {
      const data = db.getAll(tableName);
      return {
        name: tableName,
        records: data.length,
        size: (JSON.stringify(data).length / 1024).toFixed(2) + ' KB',
        status: 'Healthy',
        lastSync: 'Masa Nyata'
      };
    });
  },

  saveSetting: async (key: string, value: any) => {
    const settings = db.getAll<any>(TABLES.SETTINGS);
    const index = settings.findIndex(s => s.key === key);
    if (index !== -1) {
      settings[index].value = value;
      await db.update<any>(TABLES.SETTINGS, settings[index].id, { value });
    } else {
      await db.insert<any>(TABLES.SETTINGS, { key, value });
    }
  },

  getSetting: (key: string, defaultValue: any = null) => {
    const settings = db.getAll<any>(TABLES.SETTINGS);
    const setting = settings.find(s => s.key === key);
    return setting ? setting.value : defaultValue;
  }
};
