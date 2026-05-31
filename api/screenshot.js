const chromium = require('@sparticuz/chromium-min');
const puppeteer = require('puppeteer-core');

// URL remote binary Chromium (brotli pack) — versi HARUS cocok dengan chromium-min.
// chromium-min 131.0.1 → pakai release @sparticuz/chromium v131.0.1
const CHROMIUM_PACK_URL =
  'https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar';

// ─── Helper: auto-scroll untuk memicu lazy-load & scroll-animation ─────────────
async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 250;
      const delay = 80;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;
        if (totalHeight >= scrollHeight - window.innerHeight) {
          clearInterval(timer);
          resolve();
        }
      }, delay);
    });
  });
  await page.evaluate(() => window.scrollTo(0, 0));
  await new Promise((r) => setTimeout(r, 500));
}

// ─── Vercel Serverless Function ────────────────────────────────────────────────
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method tidak diizinkan.' });
  }

  // Body parsing (Vercel biasanya sudah auto-parse, tapi jaga-jaga)
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }

  const {
    url,
    width = 1280,
    height = 720,
    device_scale = 1,
    full_page = false,
  } = body || {};

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ success: false, message: 'URL tidak boleh kosong.' });
  }

  let targetUrl = url.trim();
  if (!/^https?:\/\//i.test(targetUrl)) {
    targetUrl = 'https://' + targetUrl;
  }

  try {
    new URL(targetUrl);
  } catch {
    return res.status(400).json({ success: false, message: 'Format URL tidak valid.' });
  }

  let browser = null;

  try {
    // Hemat memory di serverless
    chromium.setGraphicsMode = false;

    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(CHROMIUM_PACK_URL),
      headless: chromium.headless,
    });

    const page = await browser.newPage();

    await page.setViewport({
      width: parseInt(width),
      height: parseInt(height),
      deviceScaleFactor: parseInt(device_scale),
    });

    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
    );

    await page.goto(targetUrl, {
      waitUntil: 'networkidle2',
      timeout: 25000,
    });

    await new Promise((r) => setTimeout(r, 800));

    // Matikan durasi animasi agar elemen langsung "snap" ke kondisi final
    await page.addStyleTag({
      content: `*, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
        scroll-behavior: auto !important;
      }`,
    });

    // Scroll untuk memicu lazy-load & animasi
    await autoScroll(page);

    try {
      await page.waitForNetworkIdle({ idleTime: 400, timeout: 5000 });
    } catch { /* abaikan timeout */ }

    const screenshotBuffer = await page.screenshot({
      fullPage: Boolean(full_page),
      type: 'png',
    });

    const base64Image = screenshotBuffer.toString('base64');
    const imageUrl = `data:image/png;base64,${base64Image}`;

    return res.status(200).json({ success: true, image_url: imageUrl });

  } catch (err) {
    console.error('Screenshot error:', err);
    let userMessage = 'Gagal mengambil screenshot.';
    if (err.message.includes('net::ERR_NAME_NOT_RESOLVED')) {
      userMessage = 'Domain tidak ditemukan. Cek URL-nya lagi bro.';
    } else if (err.message.includes('net::ERR_CONNECTION_REFUSED')) {
      userMessage = 'Koneksi ditolak. Website target tidak bisa diakses.';
    } else if (err.message.includes('TimeoutError') || err.message.includes('timeout')) {
      userMessage = 'Timeout — website terlalu lama loading atau terlalu besar.';
    } else if (err.message.includes('net::ERR_CERT')) {
      userMessage = 'SSL certificate bermasalah pada website target.';
    }
    // debug: sertakan pesan asli (bisa dihapus nanti kalau sudah stabil)
    return res.status(500).json({ success: false, message: userMessage, debug: err.message });

  } finally {
    if (browser) await browser.close();
  }
};
