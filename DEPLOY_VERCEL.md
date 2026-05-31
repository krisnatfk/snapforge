# Cara Deploy SnapForge ke Vercel

## Struktur Project (sudah siap untuk Vercel)

```
WEB SS/
├── index.html           # Frontend
├── api/
│   ├── screenshot.js     # Serverless function: ambil screenshot
│   └── download.js       # Serverless function: download gambar
├── package.json          # Dependencies (puppeteer-core + chromium)
├── vercel.json           # Konfigurasi Vercel (memory & timeout)
├── .gitignore            # node_modules tidak ikut ter-upload
└── server.js             # (untuk testing LOKAL saja, diabaikan Vercel)
```

> Catatan: `server.js` masih ada untuk menjalankan project di lokal (`npm start`).
> Vercel mengabaikannya dan langsung pakai folder `api/`.

---

## Langkah Deploy (cara termudah — lewat GitHub)

### 1. Upload ke GitHub
1. Buat repository baru di https://github.com (mis. namanya `snapforge`)
2. Upload semua file project KECUALI `node_modules` (sudah otomatis di-skip oleh `.gitignore`)

Kalau pakai Git command:
```
git init
git add .
git commit -m "SnapForge - web screenshot tool"
git branch -M main
git remote add origin https://github.com/USERNAME/snapforge.git
git push -u origin main
```

### 2. Connect ke Vercel
1. Buka https://vercel.com → login (bisa pakai akun GitHub)
2. Klik **Add New** → **Project**
3. Pilih repository `snapforge` yang tadi
4. Biarkan semua setting default → klik **Deploy**
5. Tunggu beberapa menit sampai selesai

### 3. Selesai
Website langsung online di `https://snapforge-xxx.vercel.app`

---

## Langkah Deploy (alternatif — lewat Vercel CLI)

```
npm install -g vercel
vercel login
vercel --prod
```

Ikuti instruksi di terminal.

---

## Kalau Masih Error Setelah Deploy

**"FUNCTION_INVOCATION_FAILED" atau timeout:**
- Coba screenshot website yang lebih ringan dulu (mis. example.com)
- Website yang sangat panjang + full page mungkin kena batas 60 detik
- Cek logs di dashboard Vercel → tab **Logs** untuk lihat error detail

**Screenshot lambat di percobaan pertama:**
- Normal. Serverless function "dingin" (cold start) butuh waktu load Chromium
- Percobaan berikutnya lebih cepat

**Batas Vercel Free (Hobby) plan:**
- Memory function: maks 1024 MB (sudah di-set di vercel.json)
- Durasi: maks 60 detik (sudah di-set)
- Kalau butuh lebih, upgrade ke Pro

---

## Test di Lokal Dulu (Opsional, Sebelum Deploy)

Untuk memastikan semua jalan sebelum deploy, pakai Vercel CLI:
```
npm install -g vercel
vercel dev
```
Lalu buka http://localhost:3000

> `vercel dev` mensimulasikan environment Vercel di komputer kamu,
> jadi folder `api/` jalan seperti di production.
