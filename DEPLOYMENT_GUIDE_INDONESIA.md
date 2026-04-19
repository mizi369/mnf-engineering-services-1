# Panduan Deployment MNF Engineering System

Aplikasi ini adalah sistem **Full-Stack** yang menggunakan:
- **Express & Vite:** Server untuk web dashboard.
- **Socket.io:** Untuk komunikasi real-time (WhatsApp Monitoring).
- **whatsapp-web.js:** Memerlukan Node.js yang berjalan terus-menerus dan headless browser (Chromium).

## Mengapa Netlify Tidak Sesuai?
Netlify dirancang untuk **Static Site Hosting** atau **Serverless Functions**. 
Sistem ini **TIDAK BISA** di-host di Netlify karena:
1. **Persistent Connection:** Bot WhatsApp perlu online 24 jam. Netlify akan mematikan fungsi jika tidak ada trafik.
2. **WebSockets:** Netlify Functions tidak mendukung Socket.io secara penuh.
3. **Headless Browser:** Bot WhatsApp memerlukan Puppeteer/Chromium yang sulit dikonfigurasi di Netlify.

---

## Rekomendasi Platform Hosting

### 1. Render (Recommended untuk Pemula)
Platform yang sangat mudah untuk Node.js server.
- **Tipe Service:** Web Service.
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm start`
- **Environment Variables:** Masukkan `GEMINI_API_KEY`, `SUPABASE_URL`, dll di dashboard Render.

### 2. Railway.app (Terbaik untuk Bot)
Sangat stabil untuk aplikasi yang memerlukan database dan bot. 
- Hubungkan akun GitHub Anda.
- Railway akan otomatis mendeteksi `package.json` dan menjalankannya.

### 3. Google Cloud Run (Hosting Sekarang)
Aplikasi Anda saat ini sudah berjalan di Google Cloud melalui AI Studio.
- Anda bisa membagikan link **Shared App URL** yang ada di dashboard AI Studio.

---

## Langkah-langkah Export ke Platform Lain
1. Pergi ke **Settings** di AI Studio.
2. Pilih **Export to GitHub**.
3. Buat repository baru di GitHub.
4. Hubungkan repository tersebut ke **Render** atau **Railway**.
5. Tambahkan Environment Variables dari file `.env.example` ke dashboard hosting tersebut.

---

## Catatan Penting untuk WhatsApp Bot
Pastikan hosting Anda mendukung **Puppeteer**. Di Render atau Railway, biasanya sudah tersedia dependency yang diperlukan atau Anda bisa menggunakan **Docker**.

### Contoh Dockerfile (Jika ingin menggunakan VPS/Docker)
Jika Anda menggunakan VPS (DigitalOcean/Ubuntu), gunakan Dockerfile ini:

```dockerfile
FROM node:18-slim

# Install dependencies untuk Puppeteer/WhatsApp
RUN apt-get update && apt-get install -y \
    gconf-service libasound2 libatk1.0-0 libc6 libcairo2 libcups2 \
    libdbus-1-3 libexpat1 libfontconfig1 libgcc1 libgconf-2-4 \
    libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 \
    libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 \
    libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 \
    libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 \
    libxtst6 ca-certificates fonts-liberation libappindicator1 \
    libnss3 lsb-release xdg-utils wget \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```
