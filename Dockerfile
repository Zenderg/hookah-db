# Build stage
FROM node:22-bookworm AS builder

WORKDIR /app

COPY package*.json ./
COPY package-lock.json ./

RUN npm ci

COPY . .

RUN npm run build

# Production stage
FROM node:22-bookworm AS production

WORKDIR /app

COPY package*.json ./
COPY package-lock.json ./
COPY --from=builder /app/dist ./dist

RUN npm ci --only=production

# Install Playwright browser binaries and system dependencies
RUN npx playwright install chromium --with-deps

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --retries=3 CMD ["node", "-e", "const port=process.env.PORT||3000; fetch(`http://127.0.0.1:${port}/health`).then((response)=>process.exit(response.ok?0:1)).catch(()=>process.exit(1))"]

CMD ["node", "dist/main"]
