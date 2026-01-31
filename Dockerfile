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

CMD ["node", "dist/main"]
