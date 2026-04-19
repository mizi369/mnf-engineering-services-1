import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Settings as SettingsIcon, Save, Upload, Banknote, Clock, Users, 
  Building2, FileText, CheckCircle2, AlertCircle, X, Plus, Trash2, 
  MessageSquare, Bot, User, MapPin, Info, RefreshCw, Database, Edit2, Cat, Lock,
  Sparkles, Smartphone, Copy, Share2, Bell, ShieldAlert, CloudUpload, Server, Wifi, WifiOff,
  List, Terminal, DownloadCloud, Wrench, Percent, FileCheck, Map,
  LayoutGrid, BrainCircuit
} from 'lucide-react';
import { socket } from '../service/socket';
import { TimeSlotConfig, TeamConfig } from '../types';
import { supabase } from '../service/supabase';
import TimeSlotManagement from './TimeSlotManagement';

const SUPABASE_SCHEMA = `/*
MNF ENGINEERING SERVICES - MASTER DATABASE SCHEMA v24.0 (NEURAL AI READY)
Run this script in Supabase SQL Editor.
*/

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 1. JADUAL INDUK (MASTER TABLES)
-- =============================================

-- PELANGGAN (Customers)
CREATE TABLE IF NOT EXISTS mnf_customers (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    name TEXT NOT NULL,
    phone TEXT UNIQUE NOT NULL,
    address TEXT,
    last_service DATE,
    total_spent NUMERIC DEFAULT 0,
    ad_message TEXT, -- Mesej Iklan Khusus (CRM)
    interests JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- KAKITANGAN (Employees)
CREATE TABLE IF NOT EXISTS mnf_employees (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    name TEXT NOT NULL,
    ic TEXT,
    address TEXT,
    position TEXT, 
    basic_salary NUMERIC DEFAULT 0,
    type TEXT DEFAULT 'Full-time',
    epf_enabled INTEGER DEFAULT 1,
    socso_enabled INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- PASUKAN (Teams)
CREATE TABLE IF NOT EXISTS mnf_teams (
    id TEXT PRIMARY KEY, 
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    max_jobs_per_day INTEGER DEFAULT 4,
    max_service_jobs INTEGER DEFAULT 3,
    max_install_jobs INTEGER DEFAULT 2,
    allowed_slots JSONB DEFAULT '[]'::jsonb, -- Slot Masa Khusus
    created_at TIMESTAMPTZ DEFAULT now()
);

-- SLOT MASA (Time Slots)
CREATE TABLE IF NOT EXISTS mnf_time_slots (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    label TEXT NOT NULL, -- e.g. '9:00 AM – 12:00 PM'
    is_active BOOLEAN DEFAULT true,
    display_order SERIAL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- KATALOG HARGA (Services)
CREATE TABLE IF NOT EXISTS mnf_services (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    name TEXT NOT NULL,
    price_min DECIMAL(10, 2) NOT NULL,
    price_max DECIMAL(10, 2),
    unit TEXT,
    description TEXT,
    category TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- 2. JADUAL TRANSAKSI (TRANSACTION TABLES)
-- =============================================

-- BOOKINGS (Dengan Hubungan ke Customer, Team, Slot)
CREATE TABLE IF NOT EXISTS mnf_bookings (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    booking_date DATE NOT NULL DEFAULT CURRENT_DATE,
    customer_name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    service_type TEXT,
    unit_type TEXT DEFAULT '1.0HP',
    quantity TEXT DEFAULT '1 Unit',
    time_slot TEXT,
    team TEXT,
    status TEXT DEFAULT 'Confirmed',
    lat DECIMAL(10, 8),
    lng DECIMAL(11, 8),
    location_lat DECIMAL(10, 8),
    location_lng DECIMAL(11, 8),
    created_at TIMESTAMPTZ DEFAULT now(),
    
    -- Relationships (Foreign Keys)
    customer_id TEXT REFERENCES mnf_customers(id),
    team_id TEXT REFERENCES mnf_teams(id),
    time_slot_id TEXT REFERENCES mnf_time_slots(id)
);

-- JUALAN (Sales)
CREATE TABLE IF NOT EXISTS mnf_sales (
    id TEXT PRIMARY KEY,
    customer_name TEXT,
    phone TEXT,
    address TEXT,
    service_description TEXT,
    shop_name TEXT,
    amount NUMERIC DEFAULT 0,
    discount NUMERIC DEFAULT 0,
    total NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'Pembayaran Diterima',
    payment_method TEXT DEFAULT 'Tunai',
    payment_type TEXT DEFAULT 'Debit',
    date DATE DEFAULT CURRENT_DATE,
    items_used JSONB, 
    admin_name TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),

    -- Relationships
    customer_id TEXT REFERENCES mnf_customers(id),
    employee_id TEXT REFERENCES mnf_employees(id)
);

-- IKLAN & PROMOSI (AI Auto-Broadcast)
CREATE TABLE IF NOT EXISTS mnf_promotions (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    title TEXT,
    message TEXT,
    media_data TEXT, -- Base64 String
    media_type TEXT DEFAULT 'none', -- image, video, none
    post_date TEXT, -- YYYY-MM-DD
    post_time TEXT, -- HH:MM
    ai_active BOOLEAN DEFAULT true,
    target_phone TEXT, -- 'ALL' or specific phone
    target_name TEXT,
    status TEXT DEFAULT 'Pending', -- Pending, Sent, Failed
    discount TEXT,
    platform TEXT DEFAULT 'WhatsApp',
    created_at TIMESTAMPTZ DEFAULT now(),

    -- Relationship
    target_customer_id TEXT REFERENCES mnf_customers(id)
);

-- =============================================
-- 3. JADUAL SISTEM & SOKONGAN
-- =============================================

-- TETAPAN (Settings - AI Brain Config)
CREATE TABLE IF NOT EXISTS mnf_settings (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    setting_key TEXT UNIQUE NOT NULL,
    setting_value TEXT,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- TEMPLAT MESEJ (Message Templates)
CREATE TABLE IF NOT EXISTS mnf_templates (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    code TEXT UNIQUE NOT NULL, 
    name TEXT NOT NULL,
    content TEXT,
    variables TEXT, 
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- SEED DATA: Default Templates
INSERT INTO mnf_templates (code, name, content, variables) VALUES
('booking', 'Booking Confirmation', 'Salam [NAMA]. Booking anda pada [DATE] disahkan. Terima kasih.', '[NAMA], [DATE]'),
('receipt', 'Resit Bayaran', 'Terima kasih. Bayaran RM [TOTAL] diterima untuk servis [SERVIS].', '[NAMA], [TOTAL], [SERVIS], [DATE]'),
('pending', 'Peringatan Bayaran', 'Salam [NAMA], mohon jelaskan baki RM [TOTAL] untuk servis [SERVIS].', '[NAMA], [TOTAL], [SERVIS]'),
('location', 'Lokasi Pelanggan', 'Berikut adalah lokasi kami: [MAP_URL]', '[MAP_URL]'),
('warranty', 'Waranti Servis & Alat Ganti', 'Waranti servis dan alat ganti kami adalah [TEMPOH].', '[TEMPOH]')
ON CONFLICT (code) DO UPDATE SET 
    content = EXCLUDED.content,
    name = EXCLUDED.name;

-- INVENTORI
CREATE TABLE IF NOT EXISTS mnf_inventory (
    id TEXT PRIMARY KEY,
    shop_name TEXT,
    item_name TEXT,
    unit TEXT,
    stock INTEGER DEFAULT 0,
    buy_price NUMERIC DEFAULT 0,
    sell_price NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'Ada',
    payment_type TEXT,
    payment_method TEXT,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- PAYROLL
CREATE TABLE IF NOT EXISTS mnf_payroll (
    id TEXT PRIMARY KEY,
    employee_id TEXT REFERENCES mnf_employees(id),
    month TEXT,
    year TEXT,
    basic_salary NUMERIC,
    epf_employee NUMERIC,
    epf_employer NUMERIC,
    socso_employee NUMERIC,
    socso_employer NUMERIC,
    advance NUMERIC DEFAULT 0,
    gross NUMERIC,
    net NUMERIC,
    payment_method TEXT,
    status TEXT DEFAULT 'Paid',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- EXPENSES
CREATE TABLE IF NOT EXISTS mnf_expenses (
    id TEXT PRIMARY KEY,
    date DATE DEFAULT CURRENT_DATE,
    description TEXT,
    amount NUMERIC,
    category TEXT,
    payment_type TEXT,
    payment_method TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- BLOCKED SLOTS
CREATE TABLE IF NOT EXISTS mnf_blocked_slots (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    date TEXT NOT NULL, -- Stored as YYYY-MM-DD string
    time_slot TEXT NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- AI BRAIN SYSTEM TABLES
CREATE TABLE IF NOT EXISTS mnf_ai_questions (id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text, category TEXT, question TEXT, source TEXT, status TEXT, created_at TIMESTAMPTZ DEFAULT now());
CREATE TABLE IF NOT EXISTS mnf_ai_answers (id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text, style TEXT, answer TEXT, language TEXT, status TEXT, created_at TIMESTAMPTZ DEFAULT now());
CREATE TABLE IF NOT EXISTS mnf_ai_mappings (id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text, question_id TEXT, answer_id TEXT, triggers TEXT, status TEXT);
CREATE TABLE IF NOT EXISTS mnf_ai_training (id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text, type TEXT, input TEXT, verified_by TEXT, date TEXT, status TEXT);
CREATE TABLE IF NOT EXISTS mnf_ai_locks (id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text, key_name TEXT, function TEXT, level TEXT, active BOOLEAN);
CREATE TABLE IF NOT EXISTS mnf_ai_learning_logs (id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text, time TEXT, activity TEXT, change TEXT, status TEXT, created_at TIMESTAMPTZ DEFAULT now());

-- =============================================
-- 4. SECURITY & PERMISSIONS
-- =============================================
DO $$ 
DECLARE 
    t text;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name LIKE 'mnf_%'
          AND table_type = 'BASE TABLE'
    LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
        EXECUTE format('DROP POLICY IF EXISTS "Public Access" ON %I;', t);
        EXECUTE format('CREATE POLICY "Public Access" ON %I FOR ALL USING (true);', t);
    END LOOP;
END $$;
`;


const Settings: React.FC<{ showToast?: any }> = ({ showToast }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as any) || 'company';
  const [activeTab, setActiveTab] = useState<'company' | 'finance' | 'database' | 'operations' | 'ai'>(initialTab);
  
  const [geminiKey, setGeminiKey] = useState(localStorage.getItem('mnf_gemini_api_key') || '');
  
  useEffect(() => {
    if (searchParams.get('tab') && searchParams.get('tab') !== 'ai') {
      setActiveTab(searchParams.get('tab') as any);
    }
  }, [searchParams]);

  const [dbStatus, setDbStatus] = useState<'Checking' | 'Connected' | 'Offline'>('Checking');
  const [waStatus, setWaStatus] = useState<string>('OFFLINE');
  const [isPushing, setIsPushing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [availableGroups, setAvailableGroups] = useState<{id: string, name: string}[]>([]);
  const [showGroupPicker, setShowGroupPicker] = useState(false);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  
  // Company Data
  const [coData, setCoData] = useState({
    name: '', reg: '', address: '', phone: '', logo: '', bank: '', acc: '',
    lat: '', lng: '', mapUrl: '', locationDesc: ''
  });

  // Admin Data
  const [adminData, setAdminData] = useState({
    name: localStorage.getItem('mnf_admin_name') || '', 
    image: localStorage.getItem('mnf_admin_image') || '', 
    groupLink: '', 
    phone: '', 
    groupName: '' 
  });

  // Notification Config
  const [notifyConfig, setNotifyConfig] = useState({
      booking: true, complaint: true
  });

  // Finance Data
  const [financeData, setFinanceData] = useState({
    taxEnabled: false, taxRate: 6, taxName: 'SST', invPrefix: 'MNF', quoPrefix: 'QUO',
    payTerms: '', warTerms: '', epfEmp: 11, epfMaj: 13, socsoEmp: 0.5, socsoMaj: 1.75
  });

  // Operations Data
  // (Managed by TimeSlotManagement component)

  const fileInputRef = useRef<HTMLInputElement>(null);
  const adminImageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadSettings();
    checkDbConnection();

    // Listen for Auto-Update from WhatsApp Backend
    const handleAdminSync = (info: any) => {
        setAdminData(prev => ({
            ...prev,
            name: info.name !== undefined ? info.name : prev.name,
            image: info.image !== undefined ? info.image : prev.image,
            phone: info.phone !== undefined ? info.phone : prev.phone,
            groupName: info.groupName !== undefined ? info.groupName : prev.groupName
        }));
        if (info.image !== undefined) localStorage.setItem('mnf_admin_image', info.image);
        if (info.name !== undefined) localStorage.setItem('mnf_admin_name', info.name);
        if (info.phone !== undefined) localStorage.setItem('mnf_admin_phone', info.phone);
        if (info.groupName !== undefined) localStorage.setItem('mnf_admin_group_name', info.groupName);
        window.dispatchEvent(new Event('admin-info-updated'));
    };

    const handleWaStatus = (status: string) => {
        setWaStatus(status);
    };

    socket.on('admin-info', handleAdminSync);
    socket.on('stage-update', handleWaStatus);
    socket.on('groups-list', (groups: any) => {
        setAvailableGroups(groups);
        setIsLoadingGroups(false);
        setShowGroupPicker(true);
    });
    socket.emit('cmd-status-check');

    return () => {
        socket.off('admin-info', handleAdminSync);
        socket.off('stage-update', handleWaStatus);
        socket.off('groups-list');
    };
  }, []);

  const checkDbConnection = async () => {
      const { count, error } = await supabase.from('mnf_settings').select('*', { count: 'exact', head: true });
      if (!error) setDbStatus('Connected');
      else setDbStatus('Offline');
  };

  const loadSettings = () => {
    // Load Company
    setCoData({
      name: localStorage.getItem('mnf_co_name') || 'MNF HUB',
      reg: localStorage.getItem('mnf_co_reg') || '',
      address: localStorage.getItem('mnf_co_addr') || '',
      phone: localStorage.getItem('mnf_co_phone') || '',
      logo: localStorage.getItem('mnf_co_logo') || '',
      bank: localStorage.getItem('mnf_co_bank') || 'CIMB BANK',
      acc: localStorage.getItem('mnf_co_acc') || '',
      lat: localStorage.getItem('mnf_co_lat') || '',
      lng: localStorage.getItem('mnf_co_lng') || '',
      mapUrl: localStorage.getItem('mnf_co_map_url') || '',
      locationDesc: localStorage.getItem('mnf_co_location_desc') || ''
    });

    // Load Admin & Notifications
    const savedGroupLink = localStorage.getItem('mnf_admin_group_link') || '';
    setAdminData({
        name: localStorage.getItem('mnf_admin_name') || 'Admin MNF',
        image: localStorage.getItem('mnf_admin_image') || '',
        groupLink: savedGroupLink,
        phone: localStorage.getItem('mnf_admin_phone') || '',
        groupName: localStorage.getItem('mnf_admin_group_name') || ''
    });

    // SYNC: Pull latest group ID from AI Context if available
    fetch('/api/context')
      .then(res => res.json())
      .then(data => {
        if (data.targetGroupLink && data.targetGroupLink !== savedGroupLink) {
          setAdminData(prev => ({ ...prev, groupLink: data.targetGroupLink }));
          localStorage.setItem('mnf_admin_group_link', data.targetGroupLink);
        }
      })
      .catch(e => console.log("AI Context Sync Skip"));

    setNotifyConfig({
        booking: localStorage.getItem('mnf_notify_booking') !== 'false', // Default true
        complaint: localStorage.getItem('mnf_notify_complaint') !== 'false'
    });

    // Load Finance
    setFinanceData({
      taxEnabled: localStorage.getItem('mnf_tax_enabled') === 'true',
      taxRate: Number(localStorage.getItem('mnf_tax_rate') || 6),
      taxName: localStorage.getItem('mnf_tax_name') || 'SST',
      invPrefix: localStorage.getItem('mnf_inv_prefix') || 'MNF',
      quoPrefix: localStorage.getItem('mnf_quo_prefix') || 'QUO',
      payTerms: localStorage.getItem('mnf_pay_terms') || 'Pembayaran penuh perlu dibuat selepas servis selesai.',
      warTerms: localStorage.getItem('mnf_war_terms') || 'WARANTI: 1 MINGGU DARI TARIKH SERVIS UNTUK MASALAH YANG SAMA SAHAJA.',
      epfEmp: Number(localStorage.getItem('mnf_epf_rate_emp') || 11),
      epfMaj: Number(localStorage.getItem('mnf_epf_rate_employer') || 13),
      socsoEmp: Number(localStorage.getItem('mnf_socso_rate_emp') || 0.5),
      socsoMaj: Number(localStorage.getItem('mnf_socso_rate_employer') || 1.75)
    });

    // Load Operations
    // (Managed by TimeSlotManagement via localStorage)
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setCoData(prev => ({ ...prev, logo: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };
  const handleAdminImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setAdminData(prev => ({ ...prev, image: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const saveSettings = async () => {
    // 1. SAVE LOCAL STORAGE (Immediate Frontend Use)
    localStorage.setItem('mnf_co_name', coData.name);
    localStorage.setItem('mnf_co_reg', coData.reg);
    localStorage.setItem('mnf_co_addr', coData.address); // Address saved
    localStorage.setItem('mnf_co_phone', coData.phone);
    localStorage.setItem('mnf_co_logo', coData.logo);
    localStorage.setItem('mnf_co_bank', coData.bank);
    localStorage.setItem('mnf_co_acc', coData.acc);
    localStorage.setItem('mnf_co_lat', coData.lat);
    localStorage.setItem('mnf_co_lng', coData.lng);
    localStorage.setItem('mnf_co_location_desc', coData.locationDesc);

    // AUTO-CONNECT: Generate Map Link from Address if empty
    let finalMapUrl = coData.mapUrl;
    if (!finalMapUrl && coData.address) {
        finalMapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(coData.address)}`;
        setCoData(prev => ({ ...prev, mapUrl: finalMapUrl })); // Update State
        console.log("[SYSTEM] Auto-generated Map URL from Address");
    }
    localStorage.setItem('mnf_co_map_url', finalMapUrl);

    localStorage.setItem('mnf_admin_name', adminData.name);
    localStorage.setItem('mnf_admin_image', adminData.image);
    localStorage.setItem('mnf_admin_phone', adminData.phone);
    localStorage.setItem('mnf_admin_group_name', adminData.groupName);
    localStorage.setItem('mnf_admin_group_link', adminData.groupLink);

    localStorage.setItem('mnf_notify_booking', notifyConfig.booking.toString());
    localStorage.setItem('mnf_notify_complaint', notifyConfig.complaint.toString());

    // Finance Saves
    localStorage.setItem('mnf_tax_enabled', financeData.taxEnabled.toString());
    localStorage.setItem('mnf_tax_rate', financeData.taxRate.toString());
    localStorage.setItem('mnf_tax_name', financeData.taxName);
    localStorage.setItem('mnf_inv_prefix', financeData.invPrefix);
    localStorage.setItem('mnf_quo_prefix', financeData.quoPrefix);
    localStorage.setItem('mnf_pay_terms', financeData.payTerms);
    localStorage.setItem('mnf_war_terms', financeData.warTerms);
    localStorage.setItem('mnf_epf_rate_emp', financeData.epfEmp.toString());
    localStorage.setItem('mnf_epf_rate_employer', financeData.epfMaj.toString());
    localStorage.setItem('mnf_socso_rate_emp', financeData.socsoEmp.toString());
    localStorage.setItem('mnf_socso_rate_employer', financeData.socsoMaj.toString());

    // 2. SOCKET EMIT (Immediate Backend Memory Update)
    // CRITICAL: Send the full address context to AI
    const localTeams = JSON.parse(localStorage.getItem('mnf_teams') || '[]');
    const contextPayload = {
        locationInfo: `Alamat Kedai: ${coData.address}\nKoordinat: ${coData.lat}, ${coData.lng}\nMap: ${finalMapUrl}\nPanduan: ${coData.locationDesc}`,
        teamStatus: localTeams.filter((t: any) => t.active).map((t: any) => `${t.name}`).join(', '),
        targetGroupLink: adminData.groupLink
    };
    socket.emit('cmd-update-ai-context', contextPayload);

    // 3. STORAGE EVENT (Trigger Slot Recalculation in App.tsx)
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new Event('admin-info-updated'));

    // 4. SUPABASE SYNC (Permanent Memory)
    if (dbStatus === 'Connected') {
        try {
            // Save Teams from localStorage
            const teamsPayload = localTeams.map((t: any) => ({
                id: t.id,
                name: t.name,
                is_active: t.active,
                max_jobs_per_day: t.maxJobs,
                allowed_slots: t.slots
            }));
            if (teamsPayload.length > 0) {
                await supabase.from('mnf_teams').upsert(teamsPayload);
            }

            // Save Slots from localStorage
            const localSlots = JSON.parse(localStorage.getItem('mnf_time_slots') || '[]');
            const slotsPayload = localSlots.map((s: any, index: number) => ({
                id: s.id,
                label: s.time,
                is_active: s.active,
                display_order: index
            }));
            if (slotsPayload.length > 0) {
                await supabase.from('mnf_time_slots').upsert(slotsPayload);
            }

            // Save Location Settings
            await supabase.from('mnf_settings').upsert([
                { setting_key: 'mnf_co_addr', setting_value: coData.address }, // SYNC ADDRESS
                { setting_key: 'mnf_co_lat', setting_value: coData.lat },
                { setting_key: 'mnf_co_lng', setting_value: coData.lng },
                { setting_key: 'mnf_co_map_url', setting_value: finalMapUrl },
                { setting_key: 'mnf_co_location_desc', setting_value: coData.locationDesc }, // SYNC DESC
                { setting_key: 'mnf_tax_enabled', setting_value: financeData.taxEnabled.toString() },
                { setting_key: 'mnf_tax_rate', setting_value: financeData.taxRate.toString() },
                { setting_key: 'mnf_tax_name', setting_value: financeData.taxName },
                { setting_key: 'mnf_inv_prefix', setting_value: financeData.invPrefix },
                { setting_key: 'mnf_quo_prefix', setting_value: financeData.quoPrefix },
                { setting_key: 'mnf_pay_terms', setting_value: financeData.payTerms },
                { setting_key: 'mnf_war_terms', setting_value: financeData.warTerms },
                { setting_key: 'mnf_epf_rate_emp', setting_value: financeData.epfEmp.toString() },
                { setting_key: 'mnf_epf_rate_employer', setting_value: financeData.epfMaj.toString() },
                { setting_key: 'mnf_socso_rate_emp', setting_value: financeData.socsoEmp.toString() },
                { setting_key: 'mnf_socso_rate_employer', setting_value: financeData.socsoMaj.toString() }
            ], { onConflict: 'setting_key' });

        } catch (e) { console.error("Supabase Sync Error", e); }
    }

    alert("Tetapan berjaya disimpan! (Alamat -> Lokasi AI Connected)");
  };

  const copyAdminPhoneToOfficial = () => {
      setCoData(prev => ({ ...prev, phone: adminData.phone }));
  };

  const syncWhatsAppProfile = () => {
      socket.emit('cmd-refresh-profile'); // UPDATED: Use specific refresh command
      alert("Permintaan sinkronasi dihantar. Sila tunggu sebentar...");
  };

  const handlePullOperations = async () => { 
      setIsPulling(true); 
      try { 
          const { data: slots, error: slotErr } = await supabase.from('mnf_time_slots').select('*').order('display_order'); 
          const { data: teamsData, error: teamErr } = await supabase.from('mnf_teams').select('*'); 
          
          if (slotErr || teamErr) throw new Error("Gagal"); 
          
          if (slots && slots.length > 0) { 
              const formattedSlots = slots.map((s: any) => ({ id: s.id, time: s.label, active: s.is_active })); 
              localStorage.setItem('mnf_time_slots', JSON.stringify(formattedSlots)); 
          } 
          
          if (teamsData && teamsData.length > 0) { 
              const formattedTeams = teamsData.map((t: any) => ({ 
                  id: t.id, 
                  name: t.name, 
                  active: t.is_active, 
                  maxJobs: t.max_jobs_per_day, 
                  slots: t.allowed_slots || []
              })); 
              localStorage.setItem('mnf_teams', JSON.stringify(formattedTeams)); 
          } 
          
          // Trigger update in TimeSlotManagement if it's mounted
          window.dispatchEvent(new Event('storage'));
          
          alert("Data operasi berjaya dimuat turun dari Cloud!"); 
      } catch (e) { 
          alert("Ralat memuat turun data."); 
      } finally { 
          setIsPulling(false); 
      } 
  };

  const handleSaveGeminiKey = async () => {
      if (!geminiKey || geminiKey.length < 20) {
          alert("Kunci API Gemini tidak sah. Ia mesti mempunyai sekurang-kurangnya 20 aksara.");
          return;
      }
      localStorage.setItem('mnf_gemini_api_key', geminiKey);
      
      // Sync to Supabase
      if (dbStatus === 'Connected') {
          await supabase.from('mnf_settings').upsert({ 
              setting_key: 'mnf_gemini_api_key', 
              setting_value: geminiKey 
          }, { onConflict: 'setting_key' });
      }
      alert("GEMINI_API_KEY berjaya disimpan!");
  };

  const handleUpdateLiveEngine = () => {
      if (!geminiKey || geminiKey.length < 20) {
          alert("Sila masukkan kunci API yang sah (min 20 aksara) sebelum update enjin.");
          return;
      }
      socket.emit('cmd-update-api-key', geminiKey);
      alert("Arahan kemas kini enjin dihantar! Sila tunggu 5-10 saat untuk enjin AI memulakan sesi baru.");
  };

  const handlePushToCloud = async () => {
      // Manual Push Logic (Same as before but ensures full sync)
      if (!confirm("Ini akan menimpa data di Cloud dengan data tempatan. Teruskan?")) return;
      setIsPushing(true);
      try {
          // Get data from localStorage (Source of truth for TimeSlotManagement)
          const localSlots = JSON.parse(localStorage.getItem('mnf_time_slots') || '[]');
          const localTeams = JSON.parse(localStorage.getItem('mnf_teams') || '[]');

          // Push Slots
          if (localSlots.length > 0) {
              const slotsPayload = localSlots.map((s: any, index: number) => ({
                  id: s.id,
                  label: s.time,
                  is_active: s.active,
                  display_order: index
              }));
              await supabase.from('mnf_time_slots').upsert(slotsPayload);
          }

          // Push Teams
          if (localTeams.length > 0) {
              const teamsPayload = localTeams.map((t: any) => ({ 
                  id: t.id, 
                  name: t.name, 
                  is_active: t.active, 
                  max_jobs_per_day: t.maxJobs, 
                  max_install_jobs: t.maxAircondJobs,
                  allowed_slots: t.slots
              }));
              await supabase.from('mnf_teams').upsert(teamsPayload);
          }

          const settingsPayload = [
              { setting_key: 'ai_system_instructions', setting_value: localStorage.getItem('mnf_ai_system_instructions') || '' }, 
              { setting_key: 'mnf_co_addr', setting_value: coData.address },
              { setting_key: 'mnf_co_lat', setting_value: coData.lat }, 
              { setting_key: 'mnf_co_lng', setting_value: coData.lng }, 
              { setting_key: 'mnf_co_map_url', setting_value: coData.mapUrl },
              { setting_key: 'mnf_co_location_desc', setting_value: coData.locationDesc },
              { setting_key: 'mnf_tax_enabled', setting_value: financeData.taxEnabled.toString() },
              { setting_key: 'mnf_tax_rate', setting_value: financeData.taxRate.toString() },
              { setting_key: 'mnf_tax_name', setting_value: financeData.taxName },
              { setting_key: 'mnf_inv_prefix', setting_value: financeData.invPrefix },
              { setting_key: 'mnf_quo_prefix', setting_value: financeData.quoPrefix },
              { setting_key: 'mnf_pay_terms', setting_value: financeData.payTerms },
              { setting_key: 'mnf_war_terms', setting_value: financeData.warTerms },
              { setting_key: 'mnf_epf_rate_emp', setting_value: financeData.epfEmp.toString() },
              { setting_key: 'mnf_epf_rate_employer', setting_value: financeData.epfMaj.toString() },
              { setting_key: 'mnf_socso_rate_emp', setting_value: financeData.socsoEmp.toString() },
              { setting_key: 'mnf_socso_rate_employer', setting_value: financeData.socsoMaj.toString() }
          ];
          await supabase.from('mnf_settings').upsert(settingsPayload, { onConflict: 'setting_key' });
          alert("Data berjaya dimuat naik ke Cloud.");
      } catch (e) { 
          console.error("Push Error:", e);
          alert("Gagal memuat naik data."); 
      } finally { 
          setIsPushing(false); 
      }
  };

  const TabButton = ({ id, label, icon: Icon }: any) => (
      <button 
        onClick={() => {
          setActiveTab(id);
          setSearchParams({ tab: id });
        }} 
        className={`px-5 py-3 rounded-xl flex items-center gap-2 font-black text-xs uppercase tracking-widest transition-all ${activeTab === id ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-105' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700'}`}
      >
        <Icon size={14} /> {label}
      </button>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 max-w-7xl mx-auto">
       {/* Header */}
       <div className="glass-panel p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 border-b-2 border-primary/20">
          <div className="flex items-center gap-4">
             <div className="p-3 bg-primary/10 text-primary rounded-xl border border-primary/20">
                <SettingsIcon size={24}/>
             </div>
             <div>
                <h2 className="text-2xl font-black text-white uppercase tracking-tighter">
                   Tetapan Master
                </h2>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Konfigurasi Sistem & Neural Core</p>
             </div>
          </div>
          <button onClick={saveSettings} className="btn-primary px-8 py-3 flex items-center gap-2 uppercase text-[10px] tracking-widest active:scale-95 shadow-lg shadow-primary/20">
             <Save size={14} /> Simpan Tetapan
          </button>
       </div>

       {/* Group Picker Modal */}
       {showGroupPicker && (
           <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
               <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl">
                   <div className="p-6 border-b border-white/5 flex items-center justify-between bg-slate-950/50">
                       <div>
                           <h3 className="text-lg font-black text-white uppercase tracking-tight">Pilih Grup WhatsApp</h3>
                           <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Senarai grup yang anda sertai</p>
                       </div>
                       <button onClick={() => setShowGroupPicker(false)} className="p-2 hover:bg-white/5 rounded-full text-slate-400"><X size={20}/></button>
                   </div>
                   <div className="p-4 max-h-[400px] overflow-y-auto custom-scrollbar space-y-2">
                       {availableGroups.length === 0 ? (
                           <div className="text-center py-10 text-slate-500 font-bold text-xs uppercase">Tiada grup dijumpai</div>
                       ) : (
                           availableGroups.map(group => (
                               <button 
                                    key={group.id}
                                    onClick={() => {
                                        setAdminData(prev => ({ ...prev, groupLink: group.id, groupName: group.name }));
                                        setShowGroupPicker(false);
                                    }}
                                    className="w-full p-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl text-left transition-all group flex items-center justify-between"
                               >
                                   <div>
                                       <p className="text-sm font-bold text-white group-hover:text-cyan-400 transition-colors">{group.name}</p>
                                       <p className="text-[9px] font-mono text-slate-500 mt-1">{group.id}</p>
                                   </div>
                                   <div className="p-2 bg-white/5 rounded-lg text-slate-500 group-hover:text-cyan-400 transition-colors">
                                       <Plus size={16} />
                                   </div>
                               </button>
                           ))
                       )}
                   </div>
                   <div className="p-4 bg-slate-950/50 border-t border-white/5">
                       <p className="text-[9px] text-center text-slate-500 font-bold uppercase tracking-widest">Sila pilih grup untuk menerima notifikasi tempahan</p>
                   </div>
               </div>
           </div>
       )}

       <div className="flex flex-wrap gap-3">
          <TabButton id="company" label="Profil Syarikat" icon={Building2} />
          <TabButton id="operations" label="Operasi & Pasukan" icon={LayoutGrid} />
          <TabButton id="finance" label="Kewangan & Dokumen" icon={Banknote} />
          <TabButton id="ai" label="AI Configuration" icon={BrainCircuit} />
          <TabButton id="database" label="Pangkalan Data" icon={Database} />
       </div>

       {/* ... (CONTENT FOR TABS IS SAME AS EXISTING, ONLY saveSettings LOGIC CHANGED) ... */}
       
       {activeTab === 'company' && (
           <div className="glass-panel p-8 rounded-2xl space-y-8">
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                   {/* Logo & Basic Info */}
                   <div className="lg:col-span-1 flex flex-col items-center gap-4 p-6 bg-slate-950/50 rounded-2xl border border-white/5">
                      <div className="w-40 h-40 bg-slate-900 rounded-2xl flex items-center justify-center shadow-inner overflow-hidden border-2 border-white/5 relative group">
                         {coData.logo ? <img src={coData.logo} className="w-full h-full object-contain" alt="Logo" /> : <Building2 size={48} className="text-slate-700" />}
                         <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm">
                             <button onClick={() => fileInputRef.current?.click()} className="text-white text-[10px] font-black uppercase tracking-widest flex flex-col items-center gap-1"><Upload size={20} /> Tukar Logo</button>
                         </div>
                      </div>
                      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
                   </div>
                   <div className="lg:col-span-2 space-y-5">
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                           <div className="space-y-1">
                               <label className="text-[9px] font-black uppercase text-slate-500 ml-1">Nama Syarikat</label>
                               <input className="w-full p-4 rounded-xl border border-slate-800 bg-slate-950 font-bold text-sm text-white outline-none focus:border-primary transition-all" value={coData.name} onChange={e => setCoData({...coData, name: e.target.value})} />
                           </div>
                           <div className="space-y-1">
                               <label className="text-[9px] font-black uppercase text-slate-500 ml-1">No. Pendaftaran (SSM)</label>
                               <input className="w-full p-4 rounded-xl border border-slate-800 bg-slate-950 font-bold text-sm text-white outline-none focus:border-primary transition-all" value={coData.reg} onChange={e => setCoData({...coData, reg: e.target.value})} />
                           </div>
                       </div>
                       <div className="space-y-1">
                           <label className="text-[9px] font-black uppercase text-slate-500 ml-1 flex items-center gap-1">Alamat Perniagaan (Auto-Link ke AI)</label>
                           <textarea className="w-full p-4 rounded-xl border border-slate-800 bg-slate-950 font-bold text-sm text-white outline-none focus:border-primary transition-all resize-none" rows={3} value={coData.address} onChange={e => setCoData({...coData, address: e.target.value})} />
                           <p className="text-[8px] text-emerald-400 font-bold ml-1 mt-1">* Alamat ini akan digunakan secara automatik oleh AI untuk memberitahu lokasi kedai.</p>
                       </div>
                       <div className="space-y-1">
                           <label className="text-[9px] font-black uppercase text-slate-500 ml-1">No. Telefon Rasmi</label>
                           <input className="w-full p-4 rounded-xl border border-slate-800 bg-slate-950 font-bold text-sm text-white outline-none focus:border-primary transition-all" value={coData.phone} onChange={e => setCoData({...coData, phone: e.target.value})} />
                       </div>
                   </div>
               </div>



               <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                   {/* Admin Settings */}
                   <div className="space-y-5">
                       <h4 className="text-xs font-black uppercase text-slate-800 flex items-center gap-2"><User size={14} className="text-cyan-600"/> Super Admin</h4>
                       <div className="flex gap-4 items-start">
                           <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center overflow-hidden border-2 border-white shadow-sm shrink-0 relative group">
                               {adminData.image ? <img src={adminData.image} className="w-full h-full object-cover" /> : <User size={24} className="text-slate-300" />}
                               <button onClick={() => adminImageInputRef.current?.click()} className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all text-white"><Upload size={16}/></button>
                               <input type="file" ref={adminImageInputRef} className="hidden" accept="image/*" onChange={handleAdminImageUpload} />
                               {waStatus === 'READY' && (
                                   <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"></div>
                               )}






                           </div>
                           <div className="flex-1 space-y-3">
                               <div className="space-y-1">
                                   <label className="text-[9px] font-black uppercase text-slate-500 ml-1">Name</label>
                                   <input className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 font-bold text-xs text-slate-900 outline-none focus:border-cyan-500" value={adminData.name} onChange={e => setAdminData({...adminData, name: e.target.value})} placeholder="MNF Admin" />
                               </div>
                               <div className="space-y-1">
                                   <label className="text-[9px] font-black uppercase text-slate-500 ml-1">Phone</label>
                                   <div className="flex gap-2">
                                       <input className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 font-bold text-xs text-slate-900 outline-none focus:border-cyan-500" value={adminData.phone} onChange={e => setAdminData({...adminData, phone: e.target.value})} placeholder="+60123456789" />
                                       <button onClick={copyAdminPhoneToOfficial} className="px-3 bg-slate-900 text-white rounded-xl hover:bg-cyan-600 transition-all shadow-sm flex items-center justify-center"><Copy size={14} /></button>
                                   </div>
                               </div>
                               <div className="grid grid-cols-2 gap-3">
                                   <div className="space-y-1">
                                       <label className="text-[9px] font-black uppercase text-slate-500 ml-1">Connection</label>
                                       <div className={`w-full p-3 rounded-xl border font-bold text-xs flex items-center gap-2 ${waStatus === 'READY' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : (waStatus === 'SCAN_QR' ? 'bg-yellow-50 border-yellow-100 text-yellow-600' : 'bg-red-50 border-red-100 text-red-600')}`}>
                                            <div className={`w-2 h-2 rounded-full ${waStatus === 'READY' ? 'bg-emerald-500 animate-pulse' : (waStatus === 'SCAN_QR' ? 'bg-yellow-500 animate-bounce' : 'bg-red-500')}`}></div> 
                                            {waStatus === 'READY' ? 'Connected' : (waStatus === 'SCAN_QR' ? 'Scan Needed' : waStatus)}
                                       </div>
                                   </div>
                                   <div className="space-y-1">
                                       <label className="text-[9px] font-black uppercase text-slate-500 ml-1">Status</label>
                                       <div className={`w-full p-3 rounded-xl border font-bold text-xs ${waStatus === 'READY' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                                            {waStatus === 'READY' ? 'Online' : 'Offline'}
                                       </div>
                                   </div>
                               </div>
                               <div className="space-y-1">
                                   <label className="text-[9px] font-black uppercase text-slate-500 ml-1">ID Kumpulan Admin</label>
                                   <div className="relative">
                                       <div className="flex gap-2">
                                           <input className="w-full p-3 rounded-xl border border-slate-200 bg-white font-bold text-xs text-slate-900 outline-none focus:border-cyan-500" value={adminData.groupLink} onChange={e => setAdminData({...adminData, groupLink: e.target.value})} placeholder="Group ID..." />
                                           <button 
                                                onClick={() => {
                                                    setIsLoadingGroups(true);
                                                    socket.emit('cmd-get-groups');
                                                }}
                                                disabled={isLoadingGroups || waStatus !== 'READY'}
                                                className="px-4 bg-slate-900 text-white rounded-xl hover:bg-cyan-600 transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
                                            >
                                                {isLoadingGroups ? <RefreshCw size={14} className="animate-spin" /> : <List size={14} />}
                                                <span className="text-[10px] font-black uppercase">Cari Grup</span>
                                           </button>
                                       </div>
                                       {adminData.groupName && <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[9px] font-bold text-emerald-600"><CheckCircle2 size={10}/> {adminData.groupName}</div>}
                                   </div>
                               </div>
                               <button onClick={syncWhatsAppProfile} className="flex items-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-[9px] font-black uppercase tracking-widest border border-emerald-100 hover:bg-emerald-100 transition-all shadow-sm mt-2 w-full justify-center">
                                   <Smartphone size={12}/> Sync Profil WhatsApp
                               </button>
                           </div>
                       </div>
                   </div>

                   <div className="space-y-5">


                       <div className="space-y-3 pt-2">
                           <h4 className="text-xs font-black uppercase text-slate-800 flex items-center gap-2"><Banknote size={14} className="text-cyan-600"/> Maklumat Bank</h4>
                           <div className="space-y-1">
                               <label className="text-[9px] font-black uppercase text-slate-500 ml-1">Nama Bank</label>
                               <select className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 font-bold text-sm text-slate-900 outline-none focus:border-cyan-500 transition-all cursor-pointer" value={coData.bank} onChange={e => setCoData({...coData, bank: e.target.value})}>
                                   <option value="CIMB BANK">CIMB BANK</option>
                                   <option value="MAYBANK">MAYBANK</option>
                                   <option value="RHB BANK">RHB BANK</option>
                                   <option value="PUBLIC BANK">PUBLIC BANK</option>
                                   <option value="HONG LEONG BANK">HONG LEONG BANK</option>
                                   <option value="AMBANK">AMBANK</option>
                                   <option value="BANK ISLAM">BANK ISLAM</option>
                               </select>
                           </div>
                           <div className="space-y-1">
                               <label className="text-[9px] font-black uppercase text-slate-500 ml-1">No. Akaun</label>
                               <input className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 font-bold text-sm text-slate-900 outline-none focus:border-cyan-500 transition-all" value={coData.acc} onChange={e => setCoData({...coData, acc: e.target.value})} />
                           </div>
                       </div>
                   </div>
               </div>
           </div>
       )}

       {/* Operations Tab */}

       {activeTab === 'operations' && (
           <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
               <TimeSlotManagement showToast={showToast} />
           </div>
       )}
       {activeTab === 'finance' && (
           <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm space-y-8">
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                   <div className="space-y-6">
                       <h4 className="text-xs font-black uppercase text-slate-800 flex items-center gap-2"><FileText size={14} className="text-cyan-600"/> Tetapan Dokumen</h4>
                       <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-1">
                               <label className="text-[9px] font-black uppercase text-slate-500 ml-1">Prefix Invois</label>
                               <input className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 font-bold text-sm text-slate-900 outline-none focus:border-cyan-500 transition-all uppercase" value={financeData.invPrefix} onChange={e => setFinanceData({...financeData, invPrefix: e.target.value})} />
                           </div>
                           <div className="space-y-1">
                               <label className="text-[9px] font-black uppercase text-slate-500 ml-1">Prefix Sebut Harga</label>
                               <input className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 font-bold text-sm text-slate-900 outline-none focus:border-cyan-500 transition-all uppercase" value={financeData.quoPrefix} onChange={e => setFinanceData({...financeData, quoPrefix: e.target.value})} />
                           </div>
                       </div>
                       
                       <h4 className="text-xs font-black uppercase text-slate-800 flex items-center gap-2 pt-4"><Percent size={14} className="text-cyan-600"/> Tetapan Cukai (SST/GST)</h4>
                       <div className="bg-slate-50 p-5 rounded-[2rem] border border-slate-200 space-y-4">
                           <div className="flex items-center justify-between">
                               <span className="text-[10px] font-black uppercase text-slate-600">Aktifkan Cukai</span>
                               <button onClick={() => setFinanceData({...financeData, taxEnabled: !financeData.taxEnabled})} className={`w-12 h-6 rounded-full p-1 transition-colors ${financeData.taxEnabled ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                                   <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ${financeData.taxEnabled ? 'translate-x-6' : ''}`}></div>
                               </button>
                           </div>
                           <div className="grid grid-cols-2 gap-4">
                               <div className="space-y-1">
                                   <label className="text-[9px] font-black uppercase text-slate-500 ml-1">Nama Cukai</label>
                                   <input className="w-full p-3 rounded-xl border border-slate-200 bg-white font-bold text-sm text-slate-900 outline-none" value={financeData.taxName} onChange={e => setFinanceData({...financeData, taxName: e.target.value})} disabled={!financeData.taxEnabled} />
                               </div>
                               <div className="space-y-1">
                                   <label className="text-[9px] font-black uppercase text-slate-500 ml-1">Kadar (%)</label>
                                   <input type="number" className="w-full p-3 rounded-xl border border-slate-200 bg-white font-bold text-sm text-slate-900 outline-none" value={financeData.taxRate} onChange={e => setFinanceData({...financeData, taxRate: Number(e.target.value)})} disabled={!financeData.taxEnabled} />
                               </div>
                           </div>
                       </div>
                   </div>

                   <div className="space-y-6">
                       <h4 className="text-xs font-black uppercase text-slate-800 flex items-center gap-2"><FileCheck size={14} className="text-cyan-600"/> Terma & Syarat Dokumen</h4>
                       <div className="space-y-4">
                           <div className="space-y-1">
                               <label className="text-[9px] font-black uppercase text-slate-500 ml-1">Terma Pembayaran (Default)</label>
                               <textarea className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 font-bold text-xs text-slate-800 outline-none focus:border-cyan-500 resize-none h-20" value={financeData.payTerms} onChange={e => setFinanceData({...financeData, payTerms: e.target.value})} />
                           </div>
                           <div className="space-y-1">
                               <label className="text-[9px] font-black uppercase text-slate-500 ml-1">Terma Waranti (Default)</label>
                               <textarea className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 font-bold text-xs text-slate-800 outline-none focus:border-cyan-500 resize-none h-20" value={financeData.warTerms} onChange={e => setFinanceData({...financeData, warTerms: e.target.value})} />
                           </div>
                       </div>

                       <h4 className="text-xs font-black uppercase text-slate-800 flex items-center gap-2 pt-2"><Banknote size={14} className="text-cyan-600"/> Tetapan Gaji (Payroll)</h4>
                       <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-1">
                               <label className="text-[9px] font-black uppercase text-slate-500 ml-1">EPF Pekerja (%)</label>
                               <input type="number" className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 font-bold text-sm text-slate-900 outline-none" value={financeData.epfEmp} onChange={e => setFinanceData({...financeData,epfEmp: Number(e.target.value)})} />
                           </div>
                           <div className="space-y-1">
                               <label className="text-[9px] font-black uppercase text-slate-500 ml-1">EPF Majikan (%)</label>
                               <input type="number" className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 font-bold text-sm text-slate-900 outline-none" value={financeData.epfMaj} onChange={e => setFinanceData({...financeData,epfMaj: Number(e.target.value)})} />
                           </div>
                           <div className="space-y-1">
                               <label className="text-[9px] font-black uppercase text-slate-500 ml-1">SOCSO Pekerja (%)</label>
                               <input type="number" className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 font-bold text-sm text-slate-900 outline-none" value={financeData.socsoEmp} onChange={e => setFinanceData({...financeData,socsoEmp: Number(e.target.value)})} />
                           </div>
                           <div className="space-y-1">
                               <label className="text-[9px] font-black uppercase text-slate-500 ml-1">SOCSO Majikan (%)</label>
                               <input type="number" className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 font-bold text-sm text-slate-900 outline-none" value={financeData.socsoMaj} onChange={e => setFinanceData({...financeData,socsoMaj: Number(e.target.value)})} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'ai' && (
            <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm space-y-8 animate-in fade-in duration-500">
                <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
                    <div className="p-3 bg-primary/10 text-primary rounded-2xl">
                        <BrainCircuit size={24} />
                    </div>
                    <div>
                        <h3 className="text-xl font-black uppercase tracking-tight text-slate-900">AI Configuration</h3>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Manage Gemini API & Neural Engine</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-500 ml-1">GEMINI_API_KEY</label>
                            <div className="relative">
                                <input 
                                    type="password" 
                                    className="w-full p-4 rounded-2xl border border-slate-200 bg-slate-50 font-bold text-sm text-slate-900 outline-none focus:border-primary transition-all pr-12" 
                                    value={geminiKey} 
                                    onChange={e => setGeminiKey(e.target.value)}
                                    placeholder="Masukkan Kunci API Gemini..."
                                />
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300">
                                    <Bot size={20} />
                                </div>
                            </div>
                            <p className="text-[9px] text-slate-400 font-medium ml-1">Kunci ini digunakan untuk memproses AI WhatsApp & Vision Engine.</p>
                        </div>

                        <div className="flex gap-4">
                            <button 
                                onClick={handleSaveGeminiKey}
                                className="flex-1 px-6 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-800 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
                            >
                                <Save size={16} /> Save GEMINI_API_KEY
                            </button>
                            <button 
                                onClick={handleUpdateLiveEngine}
                                className="flex-1 px-6 py-4 bg-primary text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 active:scale-95 flex items-center justify-center gap-2"
                            >
                                <RefreshCw size={16} /> Update Live Engine
                            </button>
                        </div>
                    </div>

                    <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-200 space-y-4">
                        <h4 className="text-xs font-black uppercase text-slate-800 flex items-center gap-2">
                            <Info size={14} className="text-primary"/> Status Enjin AI
                        </h4>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100">
                                <span className="text-[10px] font-bold text-slate-500 uppercase">Neural Core</span>
                                <span className="text-[10px] font-black text-emerald-600 uppercase">Gemini 3 Flash</span>
                            </div>
                             <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100">
                                <span className="text-[10px] font-bold text-slate-500 uppercase">API Status</span>
                                <span className={`text-[10px] font-black uppercase ${geminiKey.length >= 20 ? 'text-emerald-600' : 'text-red-500'}`}>
                                    {geminiKey.length >= 20 ? 'Format Sah' : 'Tidak Sah / Pendek'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100">
                                <span className="text-[10px] font-bold text-slate-500 uppercase">Live Sync</span>
                                <span className="text-[10px] font-black text-emerald-600 uppercase">Active</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}

       {/* ... (Database Tab same as existing) ... */}
       {activeTab === 'database' && (
           <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm space-y-8 animate-in fade-in duration-500">
                <div className={`p-6 rounded-[2rem] border flex items-center justify-between ${dbStatus === 'Connected' ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-2xl ${dbStatus === 'Connected' ? 'bg-emerald-200 text-emerald-700' : 'bg-red-200 text-red-700'}`}><Server size={24} /></div>
                        <div>
                            <h3 className={`text-lg font-black uppercase tracking-tight ${dbStatus === 'Connected' ? 'text-emerald-800' : 'text-red-800'}`}>
                                {dbStatus === 'Connected' ? 'Supabase Connected' : 'Database Offline'}
                            </h3>
                            <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest">Status Sambungan Pangkalan Data</p>
                        </div>
                    </div>
                    {dbStatus === 'Connected' ? <Wifi size={24} className="text-emerald-500"/> : <WifiOff size={24} className="text-red-500"/>}
                </div>
                <div className="p-6 bg-slate-900 rounded-[2rem] text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500 rounded-full mix-blend-overlay filter blur-[80px] opacity-20 pointer-events-none"></div>
                    <div className="relative z-10">
                        <h4 className="text-sm font-black uppercase tracking-widest text-cyan-400 flex items-center gap-2"><CloudUpload size={16}/> Migrasi Data (Setup Awal)</h4>
                        <p className="text-xs font-medium text-slate-400 mt-2 max-w-lg leading-relaxed">Gunakan fungsi ini jika anda baru memasukkan API Key Supabase. Ia akan memuat naik semua data tempatan (Pelanggan, Servis, Q&A) ke cloud supaya AI boleh menggunakannya.</p>
                    </div>
                    <button onClick={handlePushToCloud} disabled={dbStatus !== 'Connected' || isPushing} className={`px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg transition-all flex items-center gap-2 active:scale-95 ${dbStatus === 'Connected' ? 'bg-cyan-600 hover:bg-cyan-500 text-white' : 'bg-slate-700 text-slate-500 cursor-not-allowed'}`}>
                        {isPushing ? <RefreshCw size={14} className="animate-spin"/> : <Upload size={14}/>} {isPushing ? 'Sedang Memuat Naik...' : 'Push Local Data to Cloud'}
                    </button>
                </div>
                <div className="space-y-4">
                    <h3 className="text-base font-black uppercase tracking-tight text-slate-800 flex items-center gap-2"><Database size={18} className="text-cyan-600"/> Skema Pangkalan Data (Supabase SQL)</h3>
                    <div className="relative group">
                        <textarea readOnly className="w-full h-64 bg-slate-50 text-slate-600 font-mono text-[10px] p-6 rounded-2xl outline-none border-2 border-slate-200 focus:border-cyan-500 transition-all custom-scrollbar resize-y" value={SUPABASE_SCHEMA} />
                        <button onClick={() => {navigator.clipboard.writeText(SUPABASE_SCHEMA); alert("SQL Copied!");}} className="absolute top-4 right-4 bg-white text-slate-900 px-4 py-2 rounded-xl font-black text-[10px] uppercase shadow-md hover:bg-cyan-50 transition-all active:scale-95">Copy SQL</button>
                    </div>
                </div>
           </div>
       )}

       {/* Edit Slot & Team & Template Modals (Existing Code) */}
    </div>
  );
};

export default Settings;