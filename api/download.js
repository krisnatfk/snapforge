const axios = require('axios');

// ─── Vercel Serverless Function: GET /api/download?url=... ─────────────────────
module.exports = async (req, res) => {
  const imageUrl = req.query.url;

  if (!imageUrl) {
    return res.status(400).send('URL gambar tidak ditemukan.');
  }

  try {
    // Base64 data URL → langsung convert ke file
    if (imageUrl.startsWith('data:image/')) {
      const matches = imageUrl.match(/^data:image\/(\w+);base64,(.+)$/);
      if (!matches) {
        return res.status(400).send('Format data URL tidak valid.');
      }

      const ext = matches[1];
      const base64Data = matches[2];
      const buffer = Buffer.from(base64Data, 'base64');

      const filename = `snapforge_${Date.now()}.${ext}`;
      res.setHeader('Content-Type', `image/${ext}`);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', buffer.length);
      return res.status(200).send(buffer);
    }

    // URL biasa → fetch lalu proxy
    if (imageUrl.startsWith('http')) {
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 15000,
      });

      const contentType = response.headers['content-type'] || 'image/png';
      const ext = contentType.includes('jpeg') ? 'jpg' : 'png';
      const filename = `snapforge_${Date.now()}.${ext}`;

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.status(200).send(Buffer.from(response.data));
    }

    return res.status(400).send('Format URL tidak dikenali.');

  } catch (err) {
    return res.status(500).send('Gagal mengunduh gambar.');
  }
};
