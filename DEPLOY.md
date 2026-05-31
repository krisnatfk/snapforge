# Cara Deploy SnapForge (Puppeteer Sendiri, Tanpa API)

Project ini menjalankan Puppeteer + Chromium sendiri. Karena itu **TIDAK bisa di Vercel**
(serverless terbatas). Pakai platform yang menjalankan container/server sungguhan:
**Railway** (rekomendasi), Render, atau Fly.io.

Server akan jalan 24 jam di cloud — komputer kamu TIDAK perlu nyala.

---

## OPSI 1 — Railway (paling mudah, REKOMENDASI)

### Langkah:
1. Pastikan kode terbaru sudah di-push ke GitHub (repo `snapforge`)
2. Buka https://railway.app → **Login with GitHub**
3. Klik **New Project** → **Deploy from GitHub repo**
4. Pilih repo **`snapforge`**
5. Railway otomatis mendeteksi **Dockerfile** dan build pakai itu
6. Tunggu build selesai (~3-5 menit, karena install Chromium)
7. Setelah selesai, masuk ke **Settings** → **Networking** → klik **Generate Domain**
8. Website online di `https://snapforge-production-xxxx.up.railway.app`

### Catatan Railway:
- Free trial ada credit terbatas; setelah itu sekitar $5/bulan untuk pemakaian ringan
- Tidak ada batas request (beda dengan API pihak ketiga)
- Tidak perlu set env var manual — sudah diatur di Dockerfile

---

## OPSI 2 — Render

1. Push kode ke GitHub
2. Buka https://render.com → Login with GitHub
3. **New** → **Web Service** → pilih repo `snapforge`
4. Runtime: pilih **Docker**
5. Instance Type: **Free** (atau Starter biar tidak "tidur")
6. Klik **Create Web Service**
7. Online di `https://snapforge.onrender.com`

### Catatan Render:
- Free tier "tidur" setelah 15 menit idle → request pertama lambat (~30 detik bangun)
- Cocok untuk demo / pemakaian santai

---

## OPSI 3 — Fly.io

1. Install Fly CLI: https://fly.io/docs/hands-on/install-flyctl/
2. `fly launch` (otomatis deteksi Dockerfile)
3. `fly deploy`

---

## Tes Lokal Pakai Docker (Opsional)

Kalau punya Docker Desktop, bisa tes build sebelum deploy:
```
docker build -t snapforge .
docker run -p 3000:3000 snapforge
```
Buka http://localhost:3000

---

## File Penting untuk Deploy

| File | Fungsi |
|---|---|
| `Dockerfile` | Resep build: Node + Chromium + dependency |
| `.dockerignore` | File yang tidak ikut ke build |
| `server.js` | Backend (auto-pakai Chromium sistem via env var) |
| `package.json` | Dependencies |

> `server.js` otomatis memakai Chromium sistem saat env `PUPPETEER_EXECUTABLE_PATH`
> di-set (sudah diatur di Dockerfile). Di lokal Windows, env ini kosong jadi Puppeteer
> pakai Chromium bawaannya. Satu kode jalan di dua tempat.
