const axios = require('axios');

// ─── Vercel Serverless Function: POST /api/screenshot ──────────────────────────
// Memakai layanan Microlink (browser jalan di server mereka), jadi fungsi ini
// ringan — tidak perlu Chromium di Vercel. Inilah yang menghindari crash.
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method tidak diizinkan.' });
  }

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

  try {
    // Susun parameter Microlink
    const params = {
      url: targetUrl,
      screenshot: true,
      meta: false,
      fullPage: Boolean(full_page),
      'viewport.width': parseInt(width) || 1280,
      'viewport.height': parseInt(height) || 720,
      'viewport.deviceScaleFactor': parseInt(device_scale) || 1,
      type: 'png',
    };

    const apiResp = await axios.get('https://api.microlink.io', {
      params,
      timeout: 55000,
    });

    const data = apiResp.data;

    if (data.status === 'success' && data.data && data.data.screenshot && data.data.screenshot.url) {
      // Kembalikan URL gambar hasil (di-host Microlink)
      return res.status(200).json({ success: true, image_url: data.data.screenshot.url });
    }

    return res.status(500).json({
      success: false,
      message: 'Provider tidak mengembalikan screenshot. Coba URL lain.',
    });

  } catch (err) {
    let userMessage = 'Gagal mengambil screenshot.';
    const status = err.response && err.response.status;

    if (status === 429) {
      userMessage = 'Terlalu banyak permintaan. Tunggu sebentar lalu coba lagi.';
    } else if (err.code === 'ECONNABORTED' || (err.message && err.message.includes('timeout'))) {
      userMessage = 'Timeout — website terlalu lama loading atau terlalu besar.';
    } else if (status === 400) {
      userMessage = 'URL tidak bisa diproses. Cek lagi alamatnya.';
    }

    return res.status(500).json({ success: false, message: userMessage });
  }
};
