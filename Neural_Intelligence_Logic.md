
# MNF Engineering Services - Neural Intelligence Logic v2

## Arsitektur Sambungan Automatik

### 1. WhatsApp Bridge (server.js)
- Menerima isyarat (mesej) dari perkakasan WhatsApp.
- Menghantar data identiti pelanggan ke **Supabase** secara real-time.
- Melancarkan event `new-message` ke UI Dashboard.

### 2. AI Neural Hub (geminiService.ts)
- Mengambil "Snapshot" data perniagaan terkini dari pangkalan data (Harga, Slot, Arahan Admin).
- Membina System Instruction secara dinamik:
  - `Context = Data Katalog + Data Booking + Arahan Admin`
- Menghasilkan jawapan dalam format JSON untuk diproses oleh sistem.

### 3. Database Sync (Supabase)
- **Automatic Learning**: Soalan yang tidak diketahui (`isUnknown`) disimpan dalam `mnf_unknown_questions`.
- **Admin Review**: Admin menjawab soalan tersebut di Dashboard.
- **Knowledge Update**: Jawapan baru tersebut disuntik ke dalam System Instruction AI pada perbualan seterusnya.

### 4. Peraturan Larangan AI (Mutlak)
- Dilarang memberi harga selain dari katalog.
- Dilarang membuat janji temujanji tanpa slot kosong.
- Dilarang menjawab isu sensitif (Politik/Agama).
- Wajib menggunakan Bahasa Melayu yang sopan.

---
*Status: Sambungan Neural Stabil | Kernel: v16.30.5*
