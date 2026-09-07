# Backend (Express + Playwright). Frontend is deployed separately on Vercel.
FROM mcr.microsoft.com/playwright:v1.45.0-jammy

WORKDIR /app

COPY package.json package-lock.json* ./
COPY server/package.json ./server/package.json
COPY client/package.json ./client/package.json
RUN npm install --workspace server --no-audit --no-fund || npm install --prefix server --no-audit --no-fund

COPY server ./server

ENV NODE_ENV=production
ENV PORT=5000
ENV BROWSER_HEADLESS=true
ENV DEMO_MODE=true
ENV ENABLE_SCHEDULER=true

EXPOSE 5000

CMD ["node", "server/src/index.js"]
