// @ts-nocheck
/**
 * MNF ENGINEERING - WHATSAPP SYNC ENGINE (v7.5 - NEURAL INTELLIGENCE ACTIVE)
 * NEURAL CORE: GEMINI 3 FLASH | VISION & AUDIO ENABLED
 * FEATURES: ANTI-CRASH | AUTO-HEAL | SUPABASE SYNC | LIVE CONTEXT | SMART ADS
 * STATUS: PERMANENT & SECURE
 */


import { createServer as createViteServer } from "vite";
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pkg from 'whatsapp-web.js';
const { Client, LocalAuth, MessageMedia, Location } = pkg;
import qrcode from 'qrcode';
import { Server } from 'socket.io';
import http from 'node:http';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';
import express from 'express';
import cors from 'cors';
import { exec } from 'child_process';
import open from 'open';


// ================= GLOBAL ANTI-CRASH GUARD (MEMORI KEKAL) =================
process.on('uncaughtException', (err) => {
    console.error('[SYSTEM] ⚠️ CRITICAL ERROR CAUGHT (Preventing Exit):', err.message);
    console.error(err.stack);
});


process.on('unhandledRejection', (reason, promise) => {
    console.error('[SYSTEM] ⚠️ Unhandled Rejection at:', promise, 'reason:', reason);
});


// ================= ENV LOADING & SECURITY =================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '.env');


// Hardcoded fallback values (Safety Net)
const DEFAULT_ENV = {
    API_KEY: "AIzaSyDEGDKxCcLP2yA-yq9O6P_9_GqTHghRsMA",
    SUPABASE_URL: "https://scnbjrkwrgshihgnixvu.supabase.co",
    SUPABASE_KEY: "", 
    PORT: "3000"
};


// 1. Ensure .env exists with correct structure
if (!fs.existsSync(envPath)) {
    console.log('[SYSTEM] .env file missing. Initializing secure configuration...');
    const content = Object.entries(DEFAULT_ENV).map(([k, v]) => `${k}=${v}`).join('\n');
    fs.writeFileSync(envPath, content);
}


// 2. Manual Parse
try {
    const rawEnv = fs.readFileSync(envPath, 'utf-8');
    rawEnv.split(/\r?\n/).forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
            const splitIdx = trimmed.indexOf('=');
            if (splitIdx > 0) {
                const key = trimmed.substring(0, splitIdx).trim();
                const val = trimmed.substring(splitIdx + 1).trim().replace(/^["'](.*)["']$/, '$1');
                process.env[key] = val;
            }
        }
    });
} catch (e) { console.error('[SYSTEM] Config Read Error:', e.message); }


// 3. Fallback Injection
if (!process.env.API_KEY) process.env.API_KEY = DEFAULT_ENV.API_KEY;
if (!process.env.PORT) process.env.PORT = DEFAULT_ENV.PORT;


const CONFIG = {
    API_KEY: process.env.API_KEY,
    SUPABASE_URL: process.env.SUPABASE_URL || DEFAULT_ENV.SUPABASE_URL,
    SUPABASE_KEY: process.env.SUPABASE_KEY,
    PORT: parseInt(process.env.PORT || '3000')
};


console.log('--- MNF NEURAL CORE STARTUP ---');
console.log(`[SYSTEM] Key Check: ${CONFIG.API_KEY ? '✅ SECURE' : '❌ MISSING'}`);


// ================= SUPABASE CONNECTION =================
let supabase = null;
if (CONFIG.SUPABASE_URL && CONFIG.SUPABASE_KEY && !CONFIG.SUPABASE_KEY.includes('PASTE_') && CONFIG.SUPABASE_KEY.length > 10) {
    try {
        supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);
        console.log('[SYSTEM] Supabase Cloud: ✅ CONNECTED');
    } catch (e) { console.error('[SYSTEM] Supabase Init Failed:', e.message); }
} else {
    console.warn('[SYSTEM] Supabase Cloud: ⚠️ OFFLINE (Missing/Invalid Key)');
}


// ================= SERVER SETUP =================
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });


app.use(cors());
app.use(express.json());


// ================= MEMORY & CONTEXT (LIVE STATE) =================
let WA_STATUS = 'OFFLINE';
let client = null;
let isAutoReplyActive = true; 
let aiCampaigns = []; 
let currentAdminInfo = null;
let dashboardStats = {
    totalBookings: 0,
    monthlySales: 0,
    whatsappStatus: 'OFFLINE',
    aiStatus: 'Active'
};
let recentMessages = [];

// Persistent AI Context - LIVE UPDATABLE
let activeAiContext = {
    instructions: 'Anda adalah AI Admin MNF Engineering. Anda membantu pelanggan membuat tempahan servis aircond. Apabila pelanggan memberikan maklumat lengkap (Nama, Tarikh, Masa, Alamat, Servis), anda WAJIB mengesahkan tempahan tersebut dengan menggunakan format [BOOKING SERVICE JOB][CONFIRM JOB]. Pastikan Tarikh sentiasa dalam format YYYY-MM-DD.',
    serviceCatalog: 'Memuatkan katalog...', 
    brainContext: '',
    templates: { 
        booking: '[BOOKING SERVICE JOB][CONFIRM JOB]\nNama: [Nama Pelanggan]\nTarikh: [YYYY-MM-DD]\nMasa: [9AM-11AM / 11AM-1PM / 1PM-3PM / 3PM-5PM]\nServis: [Jenis Servis]\nUnit: [Jumlah Unit]\nAlamat: [Alamat Penuh]\nNo. Tel: [Nombor Telefon]\nTeam: [Team A/B]', 
        receipt: 'Terima kasih. Bayaran RM [TOTAL] diterima.', 
        pending: 'Mohon jelaskan baki RM [TOTAL].', 
        location: 'Berikut adalah lokasi kami: [MAP_URL]',
        warranty: 'Waranti servis dan alat ganti kami adalah [TEMPOH].'
    },
    locationInfo: 'Johor Bahru',
    slotAvailability: 'Checking slots...',
    systemTime: '',
    teamStatus: 'Loading teams...',
    autoDiscount: false,
    socialLinks: '',
    targetGroupLink: '',
    isAutoConfirmActive: false
};

async function loadNeuralMemory() {
    if (!supabase) return;
    try {
        // 1. Load Settings
        const { data: settings, error: settingsError } = await supabase.from('mnf_settings').select('*');
        if (!settingsError && settings) {
            settings.forEach(item => {
                const key = item.setting_key;
                const val = item.setting_value;
                
                if (key === 'ai_system_instructions') activeAiContext.instructions = val;
                if (key === 'ai_template_booking') activeAiContext.templates.booking = val;
                if (key === 'ai_template_paid') activeAiContext.templates.receipt = val;
                if (key === 'ai_template_pending') activeAiContext.templates.pending = val;
                if (key === 'ai_template_location') activeAiContext.templates.location = val;
                if (key === 'ai_template_warranty') activeAiContext.templates.warranty = val;
                if (key === 'ai_is_auto_confirm') activeAiContext.isAutoConfirmActive = val === 'true';
                if (key === 'mnf_admin_group_link') activeAiContext.targetGroupLink = val;
                if (key === 'admin_info') {
                    try {
                        currentAdminInfo = JSON.parse(val);
                    } catch (e) {
                        console.error('[SYSTEM] Failed to parse admin_info:', e.message);
                    }
                }
            });
        }

        // 2. Load Templates (Dedicated Table)
        const { data: templates, error: templatesError } = await supabase.from('mnf_templates').select('*');
        if (!templatesError && templates) {
            templates.forEach(t => {
                if (t.code === 'booking') activeAiContext.templates.booking = t.content;
                if (t.code === 'receipt') activeAiContext.templates.receipt = t.content;
                if (t.code === 'pending') activeAiContext.templates.pending = t.content;
                if (t.code === 'location') activeAiContext.templates.location = t.content;
                if (t.code === 'warranty') activeAiContext.templates.warranty = t.content;
            });
        }

        console.log('[SYSTEM] Neural Memory: ✅ LOADED FROM CLOUD');
    } catch (e) {
        console.error('[SYSTEM] Neural Memory Load Error:', e.message);
    }
}


// ================= API ROUTES =================
app.get('/api/status', (req, res) => res.json({ status: WA_STATUS }));
app.get('/api/context', (req, res) => res.json(activeAiContext));
app.get('/api/admin', async (req, res) => {
    if (currentAdminInfo && currentAdminInfo.image) return res.json(currentAdminInfo);
    if (!client || !client.info) return res.json(currentAdminInfo || { name: 'Admin', phone: 'Offline', image: '' });
    try {
        const myId = client.info.wid._serialized;
        let picUrl = '';
        try {
            const contact = await client.getContactById(myId);
            picUrl = await contact.getProfilePicUrl();
            if (!picUrl) {
                picUrl = await client.getProfilePicUrl(myId);
            }
        } catch (e) {
            picUrl = '';
        }
        const data = { name: client.info.pushname || 'Admin', phone: client.info.wid.user, image: picUrl || '', platform: client.info.platform };
        currentAdminInfo = data;
        
        // Persist to Supabase
        if (supabase) {
            supabase.from('mnf_settings').upsert({ 
                setting_key: 'admin_info', 
                setting_value: JSON.stringify(data) 
            }).catch(e => console.error('[SYSTEM] API Admin Persist Error:', e.message));
        }

        res.json(data);
    } catch (e) { res.json(currentAdminInfo || { name: 'Admin', phone: 'Syncing...', image: '' }); }
});

app.get('/status', (req, res) => {
    try {
        res.json({ status: 'ok', server: 'running', wa_status: WA_STATUS });
    } catch (error) {
        console.error('[API Error] /status:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/send-message', async (req, res) => {
    try {
        const { phone, message } = req.body;
        if (!phone || !message) {
            return res.status(400).json({ error: 'Phone and message are required' });
        }
        
        if (!client || WA_STATUS !== 'READY') {
            return res.status(503).json({ error: 'WhatsApp client is not ready' });
        }
        
        const target = phone.includes('@c.us') ? phone : `${phone.replace(/\D/g, '')}@c.us`;
        await client.sendMessage(target, message);
        
        res.json({ success: true, message: 'Message sent successfully' });
    } catch (error) {
        console.error('[API Error] /send-message:', error);
        res.status(500).json({ error: error.message });
    }
});


// ================= DATABASE SYNC (AUTO-HEAL) =================
async function fullSyncFromDB() {
    if (!supabase) return;
    try {
        // Sync Services
        const { data: services } = await supabase.from('mnf_services').select('*').eq('is_active', true);
        if (services && services.length > 0) {
            activeAiContext.serviceCatalog = services.map(s => `- ${s.name}: RM${s.price}${s.price_end ? ' - RM' + s.price_end : ''} (${s.desc})`).join('\n');
        }


        // Sync Settings & Instructions (INCLUDES ADDRESS & LOCATION)
        const { data: settings } = await supabase.from('mnf_settings').select('*');
        if (settings) {
            const getVal = (k) => settings.find(s => s.setting_key === k)?.setting_value || '';
            
            const dbInstructions = getVal('ai_system_instructions');
            if (dbInstructions) activeAiContext.instructions = dbInstructions;
            
            const addr = getVal('mnf_co_addr');
            const lat = getVal('mnf_co_lat');
            const lng = getVal('mnf_co_lng');
            const mapUrl = getVal('mnf_co_map_url');
            const locDesc = getVal('mnf_co_location_desc');
            
            // Construct Rich Location Context
            activeAiContext.locationInfo = `Alamat Kedai: ${addr}\nKoordinat: ${lat}, ${lng}\nMap: ${mapUrl}\nPanduan: ${locDesc}`;
            
            const fb = getVal('mnf_social_fb');
            const tt = getVal('mnf_social_tt');
            const autoDiscount = getVal('mnf_social_auto_discount') === 'true';
            
            let socialContext = `Facebook: ${fb}\nTikTok: ${tt}`;
            if (autoDiscount) {
                socialContext += `\n[POLICY] JIKA PELANGGAN MINTA DISKAUN: Beritahu mereka syarat wajib: "Boleh dapat harga promo, tapi wajib bayar tunai."`;
            }
            activeAiContext.socialLinks = socialContext;


            // Group Notification Sync
            const groupLink = getVal('mnf_admin_group_link');
            if (groupLink) activeAiContext.targetGroupLink = groupLink;
        }


        // Sync Templates
        const { data: templates } = await supabase.from('mnf_templates').select('*');
        if (templates) {
            templates.forEach(t => {
                if (t.code === 'booking') activeAiContext.templates.booking = t.content;
                if (t.code === 'receipt') activeAiContext.templates.receipt = t.content;
                if (t.code === 'pending') activeAiContext.templates.pending = t.content;
                if (t.code === 'location') activeAiContext.templates.location = t.content;
                if (t.code === 'warranty') activeAiContext.templates.warranty = t.content;
            });
        }


        // Sync Teams
        const { data: teams } = await supabase.from('mnf_teams').select('*').eq('is_active', true);
        if (teams) activeAiContext.teamStatus = teams.map(t => `${t.name}`).join(', ');


        // Sync AI Brain (Knowledge)
        const { data: maps } = await supabase.from('mnf_ai_mappings').select('*').eq('status', 'Aktif');
        if (maps) {
            const { data: qs } = await supabase.from('mnf_ai_questions').select('*');
            const { data: as } = await supabase.from('mnf_ai_answers').select('*');
            activeAiContext.brainContext = maps.map(m => {
                const q = qs?.find(i => i.id === m.question_id);
                const a = as?.find(i => i.id === m.answer_id);
                return q && a ? `Q: "${q.question}"\nA: "${a.answer}"` : '';
            }).join('\n\n');
        }


        // Sync Campaigns (Auto-Broadcast) - Populate Memory from DB
        const { data: promos } = await supabase.from('mnf_promotions').select('*').eq('status', 'Pending').eq('ai_active', true);
        if (promos) {
            aiCampaigns = promos.map(p => ({
                id: p.id,
                message: p.message,
                postDate: p.post_date,
                postTime: p.post_time,
                targetPhone: p.target_phone,
                mediaData: p.media_data,
                aiActive: p.ai_active,
                status: p.status
            }));
        }


        // Sync Dashboard Stats (Bookings & Sales)
        const today = new Date().toISOString().split('T')[0];
        const { count: todayCount } = await supabase.from('mnf_bookings').select('*', { count: 'exact', head: true }).gte('booking_date', today);
        if (todayCount !== null) dashboardStats.totalBookings = todayCount;

        const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
        const { count: monthCount } = await supabase.from('mnf_bookings').select('*', { count: 'exact', head: true }).gte('booking_date', firstDayOfMonth);
        if (monthCount !== null) dashboardStats.monthlySales = monthCount * 150; // Estimate RM150 per booking
        
        dashboardStats.whatsappStatus = WA_STATUS;
        dashboardStats.aiStatus = isAutoReplyActive ? 'Active' : 'Inactive';
        io.emit('dashboard-stats', dashboardStats);


    } catch (e) { }
}
setInterval(fullSyncFromDB, 60000); // Check every minute
setTimeout(fullSyncFromDB, 3000);


// ================= AI CAMPAIGN SCHEDULER (SMART ADS) =================
setInterval(async () => {
    if (!client || !aiCampaigns.length || WA_STATUS !== 'READY') return;
    
    const now = new Date();
    // Format YYYY-MM-DD
    const currentDate = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
    // Format HH:MM (24h)
    const currentTime = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');


    for (let campaign of aiCampaigns) {
        if (campaign.aiActive && campaign.status === 'Pending') {
            // Check if time matches (simple exact match)
            if (campaign.postDate === currentDate && campaign.postTime === currentTime) {
                
                console.log(`[CAMPAIGN] Executing: ${campaign.id}`);
                
                let media = null;
                if (campaign.mediaData && campaign.mediaData.includes('base64')) {
                    try {
                        const parts = campaign.mediaData.split(',');
                        const mime = parts[0].match(/:(.*?);/)[1];
                        const b64 = parts[1];
                        media = new MessageMedia(mime, b64);
                    } catch(e) { console.error('[CAMPAIGN] Media Error:', e.message); }
                }


                const sendTo = async (phone) => {
                    try {
                        const chatId = phone.includes('@') ? phone : `${phone.replace(/[^0-9]/g, '')}@c.us`;
                        if (media) {
                            await client.sendMessage(chatId, media, { caption: campaign.message });
                        } else {
                            await client.sendMessage(chatId, campaign.message);
                        }
                    } catch (e) { console.error(`[CAMPAIGN] Fail ${phone}:`, e.message); }
                };


                if (campaign.targetPhone === 'ALL') {
                    // Fetch customers from DB for broadcast (LIMIT to prevent spam bans - handle with care)
                    if (supabase) {
                        const { data: custs } = await supabase.from('mnf_customers').select('phone');
                        if (custs) {
                            let delay = 0;
                            for (const c of custs) {
                                if (c.phone && c.phone.length > 9) {
                                    setTimeout(() => sendTo(c.phone), delay);
                                    delay += 3000; // 3s delay between messages
                                }
                            }
                        }
                    }
                } else {
                    await sendTo(campaign.targetPhone);
                }


                // Update Status Locally & DB
                campaign.status = 'Sent';
                io.emit('campaign-update', { id: campaign.id, status: 'Sent' });
                
                if (supabase) {
                    await supabase.from('mnf_promotions').update({ status: 'Sent' }).eq('id', campaign.id);
                }
                
                console.log(`[CAMPAIGN] Done: ${campaign.id}`);
            }
        }
    }
}, 60000); // Check every minute


// ================= AI ENGINE (GEMINI 3 FLASH) =================


async function processAIResponse(userMessage, contactName, contactPhone, media = null) {
    if (!userMessage && !media) {
        console.log("⚠️ AI input detected as empty, skipping generation.");
        return null;
    }

    if (!CONFIG.API_KEY || CONFIG.API_KEY.includes('PASTE_')) {
        return "Sistem AI sedang diselenggara (Kunci API tidak sah). Sila hubungi admin.";
    }
    
    // Construct Dynamic Context with LIVE TEMPLATES
    const systemInstruction = `${activeAiContext.instructions}\n\n` +
        `=== MASA SISTEM (LIVE) ===\n${activeAiContext.systemTime || new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })}\n\n` +
        `=== STATUS SLOT & PASUKAN (LIVE) ===\n${activeAiContext.slotAvailability}\nPasukan Aktif: ${activeAiContext.teamStatus}\n\n` +
        `=== LOGIK AUTOMASI PENTING ===\n` +
        `1. JIKA SLOT PENUH: Anda WAJIB semak slot kosong terdekat (sama ada hari ini atau esok) dan maklumkan kepada pelanggan.\n` +
        `2. JIKA MASA SEKARANG SELEPAS 5:00 PM (17:00): Anda WAJIB tawarkan slot untuk ESOK secara proaktif.\n` +
        `3. JIKA PELANGGAN MINTA HARI INI TAPI SUDAH LEWAT/PENUH: Cadangkan slot terawal esok pagi.\n\n` +
        `=== KATALOG HARGA & SERVIS ===\n${activeAiContext.serviceCatalog}\n\n` +
        `=== FORMAT & TEMPLATES (WAJIB GUNA) ===\n` +
        `1. JIKA ANDA MENGESAHKAN TEMPAHAN (CONFIRM JOB), ANDA WAJIB GUNAKAN FORMAT INI:\n` +
        `"${activeAiContext.templates.booking}"\n\n` +
        `PENTING: [YYYY-MM-DD] MESTI DALAM FORMAT TAHUN-BULAN-HARI (Contoh: 2026-04-12). Pilih Team A atau Team B yang betul dari senarai LIVE yang diberikan.\n\n` +
        `2. JIKA PELANGGAN MEMBUAT ADUAN (COMPLAIN), GUNAKAN FORMAT:\n` +
        `[COMPLAIN JOB]\n` +
        `Nama: [NAMA]\n` +
        `No. Tel: [TEL]\n` +
        `Aduan: [DETAIL ADUAN]\n\n` +
        `PENTING: [DATE] MESTI DALAM FORMAT YYYY-MM-DD (Contoh: 2026-04-12). Pilih [TEAM_ID] dan [SLOT_ID] yang betul dari senarai LIVE yang diberikan.\n\n` +
        `3. JIKA DITANYA LOKASI, GUNAKAN:\n"${activeAiContext.templates.location}"\n(Pastikan [MAP_URL] diisi)\n` +
        `4. JIKA DITANYA TENTANG WARANTI, GUNAKAN:\n"${activeAiContext.templates.warranty}"\n(Pastikan [TEMPOH] diisi)\n\n` +
        `=== Q&A DATABASE ===\n${activeAiContext.brainContext}\n\n` +
        `=== INFO LOKASI & SOSIAL ===\n${activeAiContext.locationInfo}\n${activeAiContext.socialLinks}\n\n` +
        `SITUASI: Pelanggan ${contactName} (${contactPhone}) menghantar mesej.`;


    const parts = [];
    if (userMessage) parts.push({ text: userMessage });
    if (media) {
        parts.push({
            inlineData: {
                mimeType: media.mimetype,
                data: media.data
            }
        });
    }


    const maxRetries = 3;
    let retryCount = 0;

    while (retryCount < maxRetries) {
        try {
            const ai = new GoogleGenAI({ apiKey: CONFIG.API_KEY });
            const response = await ai.models.generateContent({
                model: "gemini-3-flash-preview",
                contents: [{ role: 'user', parts: parts }],
                config: { 
                    systemInstruction: systemInstruction,
                    temperature: 0.6 
                }
            });


            const reply = response.text;
            io.emit('neural-log', { timestamp: new Date().toLocaleTimeString(), step: 'OUTPUT', detail: reply, phone: contactPhone });
            
            // Auto-Detect Booking Confirmation
            const lowerReply = reply.toLowerCase();
            if (lowerReply.includes('[confirm job]') || lowerReply.includes('confirm job') || lowerReply.includes('tempahan disahkan')) {
                if (activeAiContext.isAutoConfirmActive) {
                    console.log('🎯 AI Auto-Confirmation Triggered! Processing booking...');
                    saveBookingToDB(reply, contactName, contactPhone);
                    
                    // Emit neural log for frontend feedback
                    io.emit('neural-log', {
                        timestamp: new Date().toLocaleTimeString(),
                        step: 'SYSTEM',
                        detail: `✅ AUTO-CONFIRM: Tempahan untuk ${contactName || contactPhone} telah disahkan secara automatik oleh AI.`,
                        phone: contactPhone
                    });
                } else {
                    console.log('ℹ️ AI Confirmation Detected but Auto-Confirm is OFF. Waiting for manual action.');
                }
            }

            // Auto-Detect Complaint
            if (lowerReply.includes('[complain job]') || lowerReply.includes('complain job')) {
                console.log('⚠️ AI Complaint Detected! Notifying admin...');
                handleComplainJob(reply, contactName, contactPhone);
            }
            
            return reply;
        } catch (e) {
            retryCount++;
            console.error(`[AI] Generation Error (Attempt ${retryCount}/${maxRetries}):`, e.message);
            
            if (retryCount < maxRetries && (e.message.includes('503') || e.message.includes('429') || e.message.includes('high demand'))) {
                const delay = Math.pow(2, retryCount) * 1000;
                console.log(`[AI] Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }

            io.emit('sys-log', { time: new Date().toLocaleTimeString(), msg: `AI Error: ${e.message}`, type: 'error' });
            if (e.message.includes('429') || e.message.includes('503')) return "Maaf, sistem sedang sibuk. Sila cuba sebentar lagi.";
            return null; 
        }
    }
}


async function handleComplainJob(aiReply, customerName, customerPhone) {
    console.log('⚠️ handleComplainJob triggered');
    
    const extract = (key) => {
        const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(?:\\*\\*|\\*|\\s|^)${escapedKey}[\\*\\s]*[:\\-]\\s*(.*?)(?:\\n|$)`, 'i');
        const match = aiReply.match(regex);
        return match ? match[1].trim().replace(/\*+/g, '') : null;
    };

    const complaint = {
        customer_name: extract('Nama') || customerName || 'Pelanggan',
        phone: extract('No. Tel') || extract('Tel') || customerPhone || '-',
        issue: extract('Aduan') || extract('Masalah') || 'Aduan Am',
        time: new Date().toLocaleTimeString(),
        date: new Date().toLocaleDateString()
    };

    console.log('🚨 Complaint data extracted:', JSON.stringify(complaint, null, 2));

    // Notify Admin via Socket
    io.emit('new-complaint', complaint);
    
    // Log to system
    io.emit('sys-log', { 
        time: new Date().toLocaleTimeString(), 
        msg: `ADUAN BARU: ${complaint.customer_name} - ${complaint.issue}`, 
        type: 'error' 
    });

    // Save to Supabase if table exists (optional, but good practice)
    if (supabase) {
        try {
            await supabase.from('mnf_complaints').insert([{
                customer_name: complaint.customer_name,
                phone: complaint.phone,
                issue: complaint.issue,
                status: 'Pending'
            }]);
        } catch (e) {
            console.warn('[SUPABASE] Failed to save complaint, but notification sent.');
        }
    }
}


async function saveBookingToDB(aiReply, customerName, customerPhone) {
    console.log('📝 saveBookingToDB triggered with reply length:', aiReply.length);
    
    const extract = (key) => {
        // Escape key for regex
        const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(?:\\*\\*|\\*|\\s|^)${escapedKey}[\\*\\s]*[:\\-]\\s*(.*?)(?:\\n|$)`, 'i');
        const match = aiReply.match(regex);
        return match ? match[1].trim().replace(/\*+/g, '') : null;
    };

    // Normalize date to YYYY-MM-DD
    let bookingDate = extract('Tarikh') || new Date().toISOString().split('T')[0];
    if (bookingDate.includes('T')) {
        bookingDate = bookingDate.split('T')[0];
    } else if (bookingDate.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
        // Handle DD/MM/YYYY
        const [d, m, y] = bookingDate.split('/');
        bookingDate = `${y}-${m}-${d}`;
    }

    const booking: any = {
        customer_name: extract('Nama') || customerName || 'Pelanggan',
        phone: extract('Telefon') || extract('No. Tel') || extract('Tel') || customerPhone || '-',
        booking_date: bookingDate,
        time_slot: extract('Slot') || extract('Masa') || '9:00 AM – 12:00 PM',
        service_type: extract('Servis') || 'Servis Umum',
        address: extract('Alamat') || '-',
        quantity: extract('Unit') || extract('Kuantiti') || '1 Unit',
        team: extract('Team') || extract('Pasukan') || 'A',
        status: 'Confirmed'
    };

    // Only add IDs if they look like real IDs (not default '1')
    const teamId = extract('TeamID');
    const slotId = extract('SlotID');
    
    if (teamId && teamId !== '1') booking.team_id = teamId;
    if (slotId && slotId !== '1') booking.time_slot_id = slotId;
    
    console.log('🚀 Booking data extracted:', JSON.stringify(booking, null, 2));

    let realBooking = { ...booking, id: `AI-B${Date.now().toString().slice(-5)}` };

    if (supabase) {
        try {
            console.log('☁️ Saving to Supabase...');
            const { data, error } = await supabase.from('mnf_bookings').insert([booking]).select();
            if (!error && data && data[0]) {
                realBooking = data[0];
                console.log('✅ Saved to Supabase with ID:', realBooking.id);
                io.emit('sys-log', { time: new Date().toLocaleTimeString(), msg: `Booking Auto-Saved to Cloud: ${realBooking.customer_name}`, type: 'success' });

                // --- SYNC CUSTOMER AUTOMATICALLY ---
                try {
                    const { data: existingCust } = await supabase.from('mnf_customers').select('*').eq('phone', booking.phone);
                    if (existingCust && existingCust.length > 0) {
                        // Update existing customer
                        await supabase.from('mnf_customers').update({
                            name: booking.customer_name,
                            address: booking.address,
                            last_service: new Date().toISOString().split('T')[0]
                        }).eq('id', existingCust[0].id);
                    } else {
                        // Create new customer
                        await supabase.from('mnf_customers').insert([{
                            name: booking.customer_name,
                            phone: booking.phone,
                            address: booking.address,
                            total_spent: 0,
                            last_service: new Date().toISOString().split('T')[0]
                        }]);
                    }
                } catch (custErr) {
                    console.error('⚠️ Customer Sync Error:', custErr.message);
                }
            } else if (error) {
                console.error('❌ Supabase Insert Error:', error.message);
                io.emit('sys-log', { time: new Date().toLocaleTimeString(), msg: `DB Error: ${error.message}`, type: 'error' });
            }
        } catch (e) {
            console.error('💥 Supabase Exception:', e.message);
        }
    }

    // Emit compatible object for App.tsx handleAutoBooking
    // ALWAYS EMIT so UI can update even in offline/local mode
    console.log('📡 Emitting ai-booking-confirmed event...');
    io.emit('ai-booking-confirmed', {
        ...realBooking,
        name: realBooking.customer_name || realBooking.name,
        date: realBooking.booking_date || realBooking.date,
        time: realBooking.time_slot || realBooking.time,
        service: realBooking.service_type || realBooking.service,
        unit: realBooking.quantity || realBooking.unit
    });

    if (!supabase) {
        io.emit('sys-log', { time: new Date().toLocaleTimeString(), msg: `Booking Confirmed (Local Only): ${realBooking.customer_name}`, type: 'info' });
    }
    
    // AUTO NOTIFY GROUP
    if(activeAiContext.targetGroupLink) {
        handleGroupNotify(realBooking, true);
    }
}


// Helper to send group notifications
async function handleGroupNotify(booking, isAuto = false) {
    if (!client) return;
    let target = activeAiContext.targetGroupLink;
    if (!target) return;
    
    if(!target.includes('@g.us') && !target.includes('.')) target += '@g.us';
    
    const msg = `🤖 *AI AGENT REPORT*\n\n` +
                `📦 *NEW JOB CONFIRMED*\n` +
                `👤 ${booking.customer_name || booking.customerName}\n` +
                `📞 ${booking.phone}\n` +
                `🛠 ${booking.service_type || booking.serviceType}\n` +
                `📅 ${booking.booking_date || booking.date} | ${booking.time_slot || booking.timeSlot}\n` +
                `📍 ${booking.address}\n\n` +
                `_Auto-processed by MNF Neural Core_`;
    
    try {
        await client.sendMessage(target, msg);
        console.log('[SYSTEM] Group Notification Sent');
    } catch (e) {
        console.error('Group Send Failed', e.message);
    }
}


// ================= WHATSAPP BRIDGE =================


// Helper to fetch and sync admin profile
async function fetchAdminProfile() {
    try {

        if (!client || !client.info) return;

        const myId = client.info.wid._serialized;

        let picUrl = '';

        try {
            const contact = await client.getContactById(myId);
            picUrl = await contact.getProfilePicUrl();
            if (!picUrl) {
                picUrl = await client.getProfilePicUrl(myId);
            }
        } catch (e) {
            picUrl = '';
        }

        const adminData = {
            name: client.info.pushname || 'Admin',
            phone: client.info.wid.user,
            image: picUrl || '',
            platform: client.info.platform
        };

        currentAdminInfo = adminData;
        
        // Persist to Supabase
        if (supabase) {
            supabase.from('mnf_settings').upsert({ 
                setting_key: 'admin_info', 
                setting_value: JSON.stringify(adminData) 
            }).then(({ error }) => {
                if (error) console.error('[SYSTEM] Failed to persist admin info:', error.message);
            });
        }

        io.emit('admin-info', adminData);

        console.log("✅ Admin profile synced:", adminData.name);

    } catch (err) {

        console.error("❌ Admin profile error:", err.message);

    }
}


function startWhatsApp() {
  if (client) return;
  WA_STATUS = 'LAUNCHING';
  io.emit('stage-update', WA_STATUS);
  
  client = new Client({
    authStrategy: new LocalAuth({ clientId: 'mnf-neural-v7', dataPath: './.wwebjs_auth' }),
    puppeteer: { 
        headless: true, // Visual Browser Mode Disabled
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
        executablePath: process.env.CHROME_BIN || undefined,
    },
    qrMaxRetries: 5
  });


  client.on('qr', (qr) => {
    qrcode.toDataURL(qr, { scale: 10 }).then(url => {
        io.emit('qr-code', url);
        io.emit('stage-update', 'SCAN_QR');
    }).catch(err => {
        console.error('[WHATSAPP] QR Generation Error:', err.message);
    });
  });


  client.on('ready', async () => {
    try {
      WA_STATUS = 'READY';
      io.emit('stage-update', WA_STATUS);
      console.log('[WHATSAPP] Bridge Connected Successfully!');


      // AUTO-FETCH ADMIN IMAGE & NAME
      await fetchAdminProfile();
    } catch (e) {
      console.error('[WHATSAPP] Ready Handler Error:', e.message);
    }
  });


  client.on('message_create', async (msg) => {
    try {
      if (msg.from === 'status@broadcast' || msg.fromMe) return;
      if (!msg.body && !msg.hasMedia) return; // Filter empty messages
      
      let chat;
      try {
          chat = await msg.getChat();
      } catch (e) {
          console.warn('[WHATSAPP] Failed to get chat:', e.message);
          return;
      }
      
      if (chat.isGroup) return;


      let mediaData = null;
      let msgBody = msg.body;
      let msgType = 'text';


      if (msg.type === 'location') {
          msgBody = `[LOKASI] Lat: ${msg.location.latitude}, Lng: ${msg.location.longitude}`;
          msgType = 'location';
      } 
      else if (msg.hasMedia) {
          try {
              const media = await msg.downloadMedia();
              if (media) {
                  mediaData = media;
                  msgBody = media.mimetype.startsWith('image/') ? '[Gambar]' : '[Audio/File]';
                  msgType = 'media';
              }
          } catch (e) { console.error('[MEDIA] Download Failed:', e.message); }
      }


      const contact = await msg.getContact().catch(() => ({ number: 'Unknown', pushname: 'Unknown' }));
      const msgData = {
          id: msg.id._serialized,
          body: msgBody,
          phone: contact.number,
          name: contact.pushname,
          senderRole: 'user',
          type: msgType,
          time: new Date().toLocaleTimeString()
      };


      // Store in memory for dashboard
      recentMessages.unshift({
          id: msgData.id,
          customer: msgData.name || msgData.phone,
          message: msgData.body,
          time: msgData.time
      });
      if (recentMessages.length > 20) recentMessages.pop();
      io.emit('recent-messages', recentMessages);


      io.emit('new-msg', msgData);
      io.emit('neural-log', { timestamp: new Date().toLocaleTimeString(), step: 'INPUT', detail: `Mesej dari ${msgData.name || msgData.phone}: "${msgData.body}"`, phone: msgData.phone });


      if (isAutoReplyActive) {
          try {
              await chat.sendStateTyping();
              const reply = await processAIResponse(msgBody, contact.pushname, contact.number, mediaData);
              await chat.clearState();
              if (reply) await msg.reply(reply);
          } catch (e) {
              console.error('[AI] Reply Error:', e.message);
          }
      }
    } catch (err) {
      console.error('[WHATSAPP] Message Handler Error:', err.message);
      if (err.message.includes('Execution context was destroyed')) {
          console.log('[SYSTEM] Navigation detected, skipping message processing.');
      }
    }
  });


  client.on('disconnected', (reason) => {
      console.log('[WHATSAPP] Disconnected:', reason);
      client = null;
      WA_STATUS = 'OFFLINE';
      io.emit('stage-update', WA_STATUS);
  });


  client.initialize().catch(err => {
      console.error('[WHATSAPP] Init Fatal Error:', err.message);
      WA_STATUS = 'OFFLINE';
      io.emit('stage-update', WA_STATUS);
      client = null;
      setTimeout(startWhatsApp, 10000);
  });
}


// ================= COMMAND CENTER (SOCKET) =================


io.on('connection', (socket) => {
    socket.emit('stage-update', WA_STATUS);
    socket.emit('ai-status', isAutoReplyActive);
    socket.emit('dashboard-stats', dashboardStats);
    socket.emit('recent-messages', recentMessages);
    if (currentAdminInfo) socket.emit('admin-info', currentAdminInfo);


    socket.on('cmd-connect', () => {
        if (client) {
            socket.emit('stage-update', WA_STATUS);
            return;
        }
        startWhatsApp();
    });
    socket.on('cmd-disconnect', async () => { 
        if(client) { 
            try {
                await client.destroy(); 
            } catch (e) {
                console.error('[WHATSAPP] Destroy Error:', e.message);
            }
            client=null; 
            WA_STATUS='OFFLINE'; 
            io.emit('stage-update', 'OFFLINE'); 
        } 
    });
    socket.on('cmd-toggle-ai', (status) => { isAutoReplyActive = status; io.emit('ai-status', isAutoReplyActive); io.emit('sys-log', { time: new Date().toLocaleTimeString(), msg: `AI Status: ${status}`, type: 'info' }); });


    socket.on('cmd-send-msg', async (data) => {
        if (!client) return;
        try {
            const target = data.to.includes('@') ? data.to : `${data.to}@c.us`;
            
            if (data.type === 'media' && data.media) {
                const media = new MessageMedia(data.media.mimetype, data.media.data, data.media.filename);
                await client.sendMessage(target, media, { caption: data.body });
            } 
            else if (data.type === 'location' && data.location) {
                const loc = new Location(data.location.lat, data.location.lng, data.location.description);
                await client.sendMessage(target, loc);
            }
            else {
                await client.sendMessage(target, data.body);
            }
        } catch (e) { io.emit('sys-log', { time: new Date().toLocaleTimeString(), msg: `Send Failed: ${e.message}`, type: 'error' }); }
    });


    socket.on('cmd-status-check', async () => {
        socket.emit('stage-update', WA_STATUS);
        socket.emit('ai-status', isAutoReplyActive);
        
        if (currentAdminInfo) {
            socket.emit('admin-info', currentAdminInfo);
        } else if (client && client.info) {
            // If we have client info but no cached admin info, fetch it now
            await fetchAdminProfile();
        }
    });


    // CRITICAL: Manual Profile Refresh Handler
    socket.on('cmd-refresh-profile', async () => {
        if(client) {
            console.log('[SYSTEM] Manual Admin Profile Refresh Requested');
            await fetchAdminProfile();
        }
    });


    // CRITICAL: Live Update Context Listener
    socket.on('cmd-update-ai-context', (data) => {
        activeAiContext = { ...activeAiContext, ...data };
        console.log('[CONTEXT] Live Update Received:', Object.keys(data).join(', '));
        io.emit('sys-log', { time: new Date().toLocaleTimeString(), msg: `AI Context Updated: ${Object.keys(data).join(', ')}`, type: 'info' });
    });

    // NEW: Dynamic API Key Update
    socket.on('cmd-update-api-key', (newKey) => {
        if (newKey && newKey.length >= 20) {
            CONFIG.API_KEY = newKey;
            process.env.API_KEY = newKey;
            console.log('[SYSTEM] Gemini API Key updated dynamically via Socket');
            io.emit('sys-log', { time: new Date().toLocaleTimeString(), msg: `Gemini API Key Updated Successfully`, type: 'success' });
        } else {
            console.warn('[SYSTEM] Invalid API Key received via Socket (Too short)');
            io.emit('sys-log', { time: new Date().toLocaleTimeString(), msg: `Failed to update API Key: Key too short`, type: 'error' });
        }
    });
    
    // NEW: Group Notification Handler
    socket.on('cmd-group-notify', async (booking) => {
        await handleGroupNotify(booking);
        io.emit('sys-log', { time: new Date().toLocaleTimeString(), msg: `Manual Group Notify Triggered`, type: 'info' });
    });


    
    // SIMULATION: Simulate a message from a customer
    socket.on('cmd-simulate-msg', async (data) => {
        console.log('🧪 Simulating message from:', data.senderName);
        const aiReply = await processAIResponse(data.text, data.senderName, data.senderPhone);
        
        // Emit the simulated message to the dashboard
        const msgData = {
            id: `sim-${Date.now()}`,
            body: data.text,
            phone: data.senderPhone,
            name: data.senderName,
            senderRole: 'user',
            type: 'text',
            time: new Date().toLocaleTimeString()
        };
        io.emit('new-msg', msgData);
        
        // Emit the AI reply too
        const aiMsgData = {
            id: `sim-ai-${Date.now()}`,
            body: aiReply,
            phone: data.senderPhone,
            name: 'AI Admin',
            senderRole: 'ai',
            type: 'text',
            time: new Date().toLocaleTimeString()
        };
        io.emit('new-msg', aiMsgData);
    });

    // MANUAL CONFIRM: Manually trigger a booking from the dashboard
    socket.on('cmd-manual-confirm', async (data) => {
        console.log('👆 Manual confirmation requested for:', data.phone);
        // We can use the same logic as saveBookingToDB but with provided data
        await saveBookingToDB(data.aiReply || '[CONFIRM JOB]', data.name, data.phone);
        io.emit('sys-log', { time: new Date().toLocaleTimeString(), msg: `Manual Booking Confirmed for ${data.name}`, type: 'success' });
    });

    socket.on('cmd-get-groups', async () => {
        if (!client) return;
        try {
            const chats = await client.getChats();
            const groups = chats
                .filter(chat => chat.isGroup)
                .map(group => ({
                    id: group.id._serialized,
                    name: group.name
                }));
            socket.emit('groups-list', groups);
        } catch (e) {
            console.error('[SOCKET] Failed to get groups:', e.message);
        }
    });

    socket.on('cmd-sync-inventory', async (item) => {
        if(supabase) await supabase.from('mnf_inventory').upsert({ id: item.id, item_name: item.item_name, stock: item.stock, sell_price: item.sell_price });
    });


    socket.on('cmd-sync-campaigns', (campaigns) => { aiCampaigns = campaigns; });
});


// ================= BOOTSTRAP =================

async function startServer(port) {

    // Vite middleware for development
    if (process.env.NODE_ENV !== "production") {
        const vite = await createViteServer({
            server: { middlewareMode: true },
            appType: "spa",
        });
        app.use(vite.middlewares);
    } else {
        app.use(express.static("dist"));
    }

    server.listen(port, "0.0.0.0", async () => {

        console.log(`🚀 MNF Neural Engine running on port ${port}`);
        
        // Load persistent memory
        await loadNeuralMemory();

        try {
            // buka WhatsApp Web sahaja (Commented out for cloud compatibility)
            // await open("https://web.whatsapp.com");
            console.log("📱 WhatsApp Web bridge active");
        } catch (err) {
            console.error("[SYSTEM] Browser open error:", err.message);
        }

        // auto start WhatsApp jika ada session
        if (fs.existsSync("./.wwebjs_auth")) {
            setTimeout(startWhatsApp, 2000);
        }

    }).on("error", (err) => {
        console.error("⚠️ Server error:", err);
    });

}

startServer(CONFIG.PORT);