# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY package-lock.json ./

RUN npm ci

COPY . .

RUN npm run build

# Production stage
FROM node:22-alpine AS production

WORKDIR /app

COPY package*.json ./
COPY package-lock.json ./
COPY --from=builder /app/dist ./dist

RUN npm ci --only=production

EXPOSE 3000

CMD ["node", "dist/main"]
