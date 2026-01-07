# Multi-stage Dockerfile for Hookah DB API
# Stage 1: Dependencies
FROM node:24-alpine AS dependencies

# Set working directory
WORKDIR /app

# Install pnpm
RUN corepack enable pnpm && corepack prepare pnpm@10.20.0 --activate

# Copy package management files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./

# Copy workspace packages and apps
COPY packages ./packages
COPY apps ./apps

# Copy TypeScript configuration
COPY tsconfig.json ./

# Stage 2: Development
FROM node:24-alpine AS development

# Set labels
LABEL maintainer="Hookah DB Team"
LABEL description="Hookah Tobacco Database API - Development Environment"
LABEL version="1.0.0"

# Set working directory
WORKDIR /app

# Set environment to development
ENV NODE_ENV=development

# Install pnpm
RUN corepack enable pnpm && corepack prepare pnpm@10.20.0 --activate

# Copy package management files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./

# Copy workspace packages and apps
COPY packages ./packages
COPY apps ./apps

# Copy TypeScript configuration
COPY tsconfig.json ./
COPY tsconfig.docker.json ./

# Install build tools needed for native modules (better-sqlite3)
RUN apk add --no-cache python3 make g++ sqlite-dev

# Install dependencies (allow build scripts for better-sqlite3 native bindings)
RUN pnpm install --frozen-lockfile --ignore-scripts=false

# Build better-sqlite3 from source for Alpine Linux ARM64
RUN cd node_modules/.pnpm/better-sqlite3@*/node_modules/better-sqlite3 && \
    npm run build-release

# Install development tools
RUN pnpm add -D -w tsx nodemon

# Create directory for SQLite database
RUN mkdir -p /app/data

# Expose API port
EXPOSE 3000

# Set working directory to API app
WORKDIR /app/apps/api

# Start application with nodemon for development
CMD ["npx", "nodemon", "--watch", "src", "--ext", "ts", "--exec", "npx", "tsx", "src/server.ts"]

# Stage 3: Production Build
FROM node:24-alpine AS production-build

# Set working directory
WORKDIR /app

# Set environment to production
ENV NODE_ENV=production

# Install pnpm
RUN corepack enable pnpm && corepack prepare pnpm@10.20.0 --activate

# Copy package management files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./

# Copy workspace packages and apps
COPY packages ./packages
COPY apps ./apps

# Copy TypeScript configuration
COPY tsconfig.json ./
COPY tsconfig.docker.json ./

# Install build tools needed for native modules (better-sqlite3)
RUN apk add --no-cache python3 make g++ sqlite-dev

# Install dependencies (allow build scripts for better-sqlite3 native bindings)
RUN pnpm install --ignore-scripts=false

# Build better-sqlite3 from source for Alpine Linux ARM64
RUN cd node_modules/.pnpm/better-sqlite3@*/node_modules/better-sqlite3 && \
    npm run build-release

# Install tsx for production runtime (no JSDoc YAML parsing issues)
RUN pnpm add -D -w tsx

# Build all packages to create dist/ directories
RUN pnpm build

# Stage 4: Production Runtime
FROM node:24-alpine AS production

# Set labels
LABEL maintainer="Hookah DB Team"
LABEL description="Hookah Tobacco Database API - Production Runtime"
LABEL version="1.0.0"

# Install curl for health checks
RUN apk add --no-cache curl

# Set working directory
WORKDIR /app

# Set environment to production
ENV NODE_ENV=production

# Install pnpm
RUN corepack enable pnpm && corepack prepare pnpm@10.20.0 --activate

# Copy package management files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./

# Copy workspace packages and apps
COPY packages ./packages
COPY apps ./apps

# Copy TypeScript configuration
COPY tsconfig.json ./
COPY tsconfig.docker.json ./

# Install build tools needed for native modules (better-sqlite3)
RUN apk add --no-cache python3 make g++ sqlite-dev

# Install dependencies (allow build scripts for better-sqlite3 native bindings)
RUN pnpm install --ignore-scripts=false

# Build better-sqlite3 from source for Alpine Linux ARM64
RUN cd node_modules/.pnpm/better-sqlite3@*/node_modules/better-sqlite3 && \
    npm run build-release

# Install tsx for production runtime (no JSDoc YAML parsing issues)
RUN pnpm add -D -w tsx

# Copy node_modules from build stage (includes compiled better-sqlite3 bindings)
COPY --from=production-build /app/node_modules ./node_modules

# Copy compiled dist/ directories from build stage
COPY --from=production-build /app/packages/*/dist ./packages/
COPY --from=production-build /app/apps/*/dist ./apps/

# Create directory for SQLite database
RUN mkdir -p /app/data

# Expose API port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Set working directory to API app
WORKDIR /app/apps/api

# Start application with node (using compiled JavaScript from dist/)
CMD ["node", "dist/server.js"]
