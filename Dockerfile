FROM node:18-bullseye-slim

# Instala dependências básicas e Chromium
RUN apt-get update && \
    apt-get install -y wget gnupg ca-certificates \
    fonts-liberation libappindicator3-1 libasound2 libatk-bridge2.0-0 libatk1.0-0 \
    libcups2 libdbus-1-3 libdrm2 libgbm1 libgtk-3-0 libnspr4 libnss3 \
    libx11-xcb1 libxcomposite1 libxdamage1 libxrandr2 xdg-utils --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# Instala o Chromium igual ao que o Puppeteer espera
RUN wget -qO- https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb \
    > /tmp/chrome.deb && \
    apt-get update && dpkg -i /tmp/chrome.deb; apt-get -fy install && rm /tmp/chrome.deb

# Cria diretório de trabalho
WORKDIR /usr/src/app

# Copia package.json e instala deps
COPY package.json yarn.lock ./
RUN yarn install --production

# Copia o restante do código
COPY . .

# Diz ao Puppeteer/whatsapp-web.js onde está o Chrome
ENV PUPPETEER_EXECUTABLE_PATH="/usr/bin/google-chrome-stable"
ENV NODE_ENV="production"

# Expõe porta (não muito relevante, mas Railway espera)
EXPOSE 3000

# Comando para rodar seu bot
CMD ["node", "dist/index.js"]
