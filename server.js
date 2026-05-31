const express = require('express');
const puppeteer = require('puppeteer');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.static(path.join(__dirname))); // serve index.html

// ─── Helper: launch browser ───────────────────────────────────────────────────
async function launchBrowser() {
  return puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--window-size=1920,1080',
    ],
  });
}

// ─── Helper: auto-scroll ───────────────────────────────────────────────────────
// Scroll perlahan dari atas ke bawah untuk memicu lazy-load & scroll animation,
// lalu balik ke atas. Tanpa ini, konten yang baru render saat di-scroll akan
// kosong di screenshot full-page.
async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 200;          // px per langkah
      const delay = 100;             // ms jeda antar langkah
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        // Berhenti kalau sudah sampai bawah
        if (totalHeight >= scrollHeight - window.innerHeight) {
          clearInterval(timer);
          resolve();
        }
      }, delay);
    });
  });

  // Balik ke atas
  await page.evaluate(() => window.scrollTo(0, 0));

  // Beri waktu animasi "muncul" selesai setelah balik ke atas
  await new Promise((r) => setTimeout(r, 800));
}

// ─── API: POST /api/screenshot ────────────────────────────────────────────────
// Body: { url, width, height, device_scale, full_page }
// Returns: { success: true, image_url: "data:image/png;base64,..." }
app.post('/api/screenshot', async (req, res) => {
  const {
    url,
    width = 1280,
    height = 720,
    device_scale = 1,
    full_page = false,
  } = req.body;

  // Validasi URL
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ success: false, message: 'URL tidak boleh kosong.' });
  }

  let targetUrl = url.trim();

  // Tambahkan https:// jika user lupa
  if (!/^https?:\/\//i.test(targetUrl)) {
    targetUrl = 'https://' + targetUrl;
  }

  // Validasi format URL
  try {
    new URL(targetUrl);
  } catch {
    return res.status(400).json({ success: false, message: 'Format URL tidak valid.' });
  }

  console.log(`📸 Screenshot: ${targetUrl} | ${width}x${height} | scale:${device_scale} | full_page:${full_page}`);

  let browser = null;

  try {
    browser = await launchBrowser();
    const page = await browser.newPage();

    // Set viewport
    await page.setViewport({
      width: parseInt(width),
      height: parseInt(height),
      deviceScaleFactor: parseInt(device_scale),
    });

    // Set user agent agar tidak diblok
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
    );

    // Set timeout 30 detik, tunggu hingga network idle
    await page.goto(targetUrl, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    // Tunggu sebentar agar render awal selesai
    await new Promise((r) => setTimeout(r, 1000));

    // Matikan durasi animasi/transisi agar elemen langsung "snap" ke kondisi
    // final (tidak ketangkap di tengah-tengah fade saat screenshot).
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
          scroll-behavior: auto !important;
        }
      `,
    });

    // Scroll seluruh halaman untuk memicu lazy-load & scroll-animation.
    // Wajib untuk full_page; juga membantu viewport-mode kalau ada lazy image.
    await autoScroll(page);

    // Tunggu network idle lagi setelah scroll (gambar lazy mungkin baru ke-fetch)
    try {
      await page.waitForNetworkIdle({ idleTime: 500, timeout: 8000 });
    } catch {
      // abaikan kalau timeout — lanjut screenshot saja
    }

    // Ambil screenshot
    const screenshotBuffer = await page.screenshot({
      fullPage: Boolean(full_page),
      type: 'png',
    });

    // Konversi ke base64 data URL
    const base64Image = screenshotBuffer.toString('base64');
    const imageUrl = `data:image/png;base64,${base64Image}`;

    console.log(`✅ Screenshot berhasil: ${targetUrl}`);
    res.json({ success: true, image_url: imageUrl });

  } catch (err) {
    console.error(`❌ Screenshot gagal: ${err.message}`);

    // Pesan error yang lebih ramah
    let userMessage = 'Gagal mengambil screenshot.';
    if (err.message.includes('net::ERR_NAME_NOT_RESOLVED')) {
      userMessage = 'Domain tidak ditemukan. Cek URL-nya lagi bro.';
    } else if (err.message.includes('net::ERR_CONNECTION_REFUSED')) {
      userMessage = 'Koneksi ditolak. Website target tidak bisa diakses.';
    } else if (err.message.includes('TimeoutError') || err.message.includes('timeout')) {
      userMessage = 'Timeout — website terlalu lama loading. Coba lagi.';
    } else if (err.message.includes('net::ERR_CERT')) {
      userMessage = 'SSL certificate bermasalah pada website target.';
    }

    res.status(500).json({ success: false, message: userMessage });

  } finally {
    if (browser) await browser.close();
  }
});

// ─── API: GET /api/download ───────────────────────────────────────────────────
// Query: ?url=<encoded data URL atau https URL>
// Proxy gambar agar bisa diunduh tanpa CORS issue
app.get('/api/download', async (req, res) => {
  const { url: imageUrl } = req.query;

  if (!imageUrl) {
    return res.status(400).send('URL gambar tidak ditemukan.');
  }

  try {
    // Kalau base64 data URL langsung — convert dan kirim sebagai file
    if (imageUrl.startsWith('data:image/')) {
      const matches = imageUrl.match(/^data:image\/(\w+);base64,(.+)$/);
      if (!matches) {
        return res.status(400).send('Format data URL tidak valid.');
      }

      const ext = matches[1]; // 'png'
      const base64Data = matches[2];
      const buffer = Buffer.from(base64Data, 'base64');

      const filename = `screenshot_${Date.now()}.${ext}`;
      res.setHeader('Content-Type', `image/${ext}`);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', buffer.length);
      return res.send(buffer);
    }

    // Kalau URL biasa — fetch dulu baru proxy
    if (imageUrl.startsWith('http')) {
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 15000,
      });

      const contentType = response.headers['content-type'] || 'image/png';
      const ext = contentType.includes('jpeg') ? 'jpg' : 'png';
      const filename = `screenshot_${Date.now()}.${ext}`;

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(Buffer.from(response.data));
    }

    res.status(400).send('Format URL tidak dikenali.');

  } catch (err) {
    console.error(`❌ Download gagal: ${err.message}`);
    res.status(500).send('Gagal mengunduh gambar.');
  }
});

// ─── Fallback: semua route lain → index.html ─────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ─── Start server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('');
  console.log('┌─────────────────────────────────────────┐');
  console.log(`│  🚀 Screenshot Web Server RUNNING        │`);
  console.log(`│  📡 http://localhost:${PORT}               │`);
  console.log('│  Tekan Ctrl+C untuk stop                 │');
  console.log('└─────────────────────────────────────────┘');
  console.log('');
});
