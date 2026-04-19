
export type UserRole = 'Manager' | 'Technician' | 'Senior Technician' | 'Admin';
export type EmploymentType = 'Full-time' | 'Part-time';
export type PaymentMethod = 'Tunai' | 'Transfer';
export type PaymentType = 'Debit' | 'Credit';

export interface DocItem {
  description: string;
  qty: number;
  unitPrice: number;
  amount: number;
  inventoryId?: string;
}

export interface KnowledgeEntry {
  id: string;
  question: string;
  answer: string;
  dateAdded: string;
  category?: string;
}

export interface DocumentBase {
  id: string;
  refNo: string;
  date: string;
  customerName: string;
  address: string;
  phone: string;
  items: DocItem[];
  subtotal: number;
  tax: number;
  total: number;
  terms: string;
  notes?: string;
  bankDetails?: string;
}

export interface Invoice extends DocumentBase {
  deposit: number;
  balance: number;
  warranty: string;
  status: 'Paid' | 'Pending';
}

export interface Quotation extends DocumentBase {
  validity: string;
  paymentTerms: string;
}

export interface UnknownQuestion {
  id: string;
  phone: string;
  customerName: string;
  question: string;
  date: string;
  status: 'New' | 'Answered';
}

export interface ServicePrice {
  id: string;
  name: string;
  price: number;
  price_end?: number; // Optional ending price for ranges
  description: string;
  category: string;
}

export interface TimeSlotConfig {
  id: string;
  label: string;
  active: boolean;
}

export interface TeamConfig {
  id: string;
  name: string;
  active: boolean;
  maxJobsPerDay: number; // Total Daily Limit (e.g. 4)
  maxServiceCapacity: number; // Specific limit for Service (e.g. 3)
  maxInstallCapacity: number; // Specific limit for Installation (e.g. 2)
  allowedSlots?: string[]; // Specific time slots this team operates in
}

export interface Employee {
  id: string;
  name: string;
  icNumber: string;
  address: string;
  position: UserRole;
  basic_salary: number;
  type: EmploymentType;
  epf_enabled?: number;
  socso_enabled?: number;
}

export interface Payroll {
  id: string;
  employeeId: string;
  month: string;
  year: string;
  basic_salary: number;
  epf_employee: number;
  epf_employer: number;
  socso_employee: number;
  socso_employer: number;
  advance: number;
  gross: number;
  net: number;
  paymentMethod: PaymentMethod;
  status: 'Paid' | 'Pending';
}

export interface InventoryItem {
  id: string;
  shopName: string;
  itemName: string;
  unit: 'pcs' | 'unit' | 'set' | 'kg' | 'batang';
  stock: number;
  status: 'Ada' | 'Habis';
  buyPrice: number;
  sellPrice: number;
  paymentType: PaymentType;
  paymentMethod: PaymentMethod;
  date?: string;
}

export interface SaleRecord {
  id: string;
  date: string;
  customerName: string;
  address: string;
  phone: string;
  serviceDescription: string;
  adminName: string;
  shopName?: string;
  amount: number;
  discount: number;
  total: number;
  paymentType: PaymentType;
  paymentMethod: PaymentMethod;
  status: 'Pembayaran Diterima' | 'Peringatan Bayaran';
  itemsUsed?: {
    itemId: string;
    itemName: string;
    quantity: number;
    unit: string;
    buyPrice: number;
    sellPrice: number;
  }[];
}

export interface Expense {
  id: string;
  date: string;
  amount: number;
  description: string;
  category: 'Maintenance' | 'Fuel' | 'Others';
  paymentType: PaymentType;
  paymentMethod: PaymentMethod;
}

export interface Booking {
  id: string;
  date: string;
  customerName: string;
  address: string;
  phone: string;
  serviceType: string;
  unitType: string;
  quantity: string;
  timeSlot: string;
  team: string;
  teamId?: string;
  status: 'Pending' | 'Confirmed' | 'Completed';
  location?: {
    lat: number;
    lng: number;
  };
  // New specific location fields as requested
  location_lat?: number;
  location_lng?: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address?: string;
  lastService?: string;
  totalSpent: number;
  // New CRM Fields
  adMessage?: string;
  interests?: string[];
}

export interface Promotion {
  id: string | number;
  type: 'campaign' | 'discount';
  name?: string;
  title?: string;
  customerName?: string;
  phone?: string;
  message: string;
  status: string;
  discount?: string;
  platform?: string;
  sent?: number;
  delivered?: number;
  date?: string;
  dateCreated?: string;
  media_url?: string;
  media_type?: 'image' | 'video';
  auto_send?: boolean;
  active?: boolean;
  amount?: number;
  link?: string;
  icon?: any;
  // Settings Iklan
  postDate?: string;
  postTime?: string;
  interests?: string[];
}

export interface ChatMessage {
  id: string;
  senderRole: 'user' | 'ai';
  body: string;
  time: string;
  phone: string;
  name: string;
  rawTime?: number; // Timestamp for sorting
}

export interface AiLog {
  id: string;
  timestamp: string;
  step: 'INPUT' | 'THINKING' | 'OUTPUT' | 'ERROR' | 'POLICY_CHECK';
  detail: string;
}

// --- AI BRAIN SYSTEM INTERFACES ---

export interface AiQuestion {
  id: string;
  category: string;
  question: string;
  source: string;
  status: 'Aktif' | 'Nyahaktif';
}

export interface AiAnswer {
  id: string;
  style: 'Profesional' | 'Ringkas' | 'Teknikal' | 'Santai';
  answer: string;
  language: 'BM' | 'EN';
  status: 'Aktif' | 'Nyahaktif';
}

export interface AiMapping {
  id: string;
  questionId: string;
  answerId: string;
  priority: 'Tinggi' | 'Sederhana' | 'Rendah';
  triggers: string; // Comma separated keywords
  status: 'Aktif' | 'Nyahaktif';
}

export interface AiTraining {
  id: string;
  type: 'Soalan Baru' | 'Jawapan Baru';
  input: string;
  verifiedBy: string;
  date: string;
  status: 'Aktif' | 'Menunggu' | 'Ditolak';
}

export interface AiLock {
  id: string;
  keyName: string;
  function: string;
  level: 'Tinggi' | 'Sederhana' | 'Rendah' | 'Automatik';
  active: boolean;
}

export interface AiLearningLog {
  id: string;
  time: string;
  activity: string;
  change: string;
  status: 'Sah' | 'Batal';
}

export interface Transaction {
  id: string;
  date: string;
  amount: number;
  type: 'debit' | 'credit';
  payment_method: string;
  description: string;
  source?: string;
}

export interface BlockedSlot {
  id: string;
  date: string;
  timeSlot: string; // Label like '9:00 AM – 11:00 AM'
}
