# Base image Node + Chromium sudah terpasang (cocok untuk Puppeteer)
FROM node:20-slim

# Install Chromium + dependency yang dibutuhkan headless browser
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-liberation \
    fonts-noto-color-emoji \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Beri tahu Puppeteer: jangan download Chromium sendiri, pakai yang dari sistem
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

# Install dependency dulu (biar cache layer efisien)
COPY package*.json ./
RUN npm install --omit=dev

# Copy sisa kode
COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
