// Server LOKAL untuk testing (npm start / npm run dev).
// Vercel TIDAK memakai file ini — Vercel langsung pakai folder api/.
// Logikanya sengaja disamakan dengan api/ agar lokal = production.

const express = require('express');
const path = require('path');
const screenshotHandler = require('./api/screenshot');
const downloadHandler = require('./api/download');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname)));

// Routing ke handler yang sama dengan Vercel
app.post('/api/screenshot', (req, res) => screenshotHandler(req, res));
app.get('/api/download', (req, res) => downloadHandler(req, res));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log('');
  console.log('┌─────────────────────────────────────────┐');
  console.log(`│  🚀 SnapForge (LOCAL) RUNNING            │`);
  console.log(`│  📡 http://localhost:${PORT}               │`);
  console.log('└─────────────────────────────────────────┘');
  console.log('');
});
