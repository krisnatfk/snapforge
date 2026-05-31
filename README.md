# Screenshot Web — R_hmt ofc

Tool screenshot website otomatis. Masukkan URL, pilih resolusi, klik tombol — hasilnya langsung bisa diunduh.

## Cara Menjalankan

### 1. Install dependencies (sekali saja)
```
npm install
```

### 2. Jalankan server
```
npm start
```

### 3. Buka di browser
```
http://localhost:3000
```

---

## Struktur File

```
WEB SS/
├── index.html      # Frontend (UI)
├── server.js       # Backend (Express + Puppeteer)
├── package.json    # Konfigurasi project
└── README.md       # Panduan ini
```

## API Endpoints

| Method | Endpoint | Fungsi |
|---|---|---|
| POST | `/api/screenshot` | Ambil screenshot, return base64 PNG |
| GET | `/api/download?url=...` | Download gambar hasil screenshot |

### POST /api/screenshot

Request body:
```json
{
  "url": "https://example.com",
  "width": 1920,
  "height": 1080,
  "device_scale": 1,
  "full_page": false
}
```

Response:
```json
{
  "success": true,
  "image_url": "data:image/png;base64,..."
}
```

## Fitur

- Screenshot full page atau viewport saja
- Preset resolusi: Mobile, Tablet, Laptop, PC FHD, PC 4K
- Custom resolusi bebas
- Render scale 1x / 2x (Retina) / 3x (4K)
- Download hasil langsung ke komputer
- Error handling yang jelas

## Catatan

- Server butuh koneksi internet untuk mengakses website target
- Website yang memblok bot/scraper mungkin tidak bisa di-screenshot
- Untuk deploy ke hosting, bisa pakai Railway, Render, atau VPS
