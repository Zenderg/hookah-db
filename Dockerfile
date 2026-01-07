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

# Install dependencies
RUN pnpm install --frozen-lockfile

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

# Install dependencies (better-sqlite3 uses precompiled binaries for Alpine)
RUN pnpm install

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

# Install dependencies (better-sqlite3 uses precompiled binaries for Alpine)
RUN pnpm install

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

# Start application with tsx (no JSDoc YAML parsing issues)
CMD ["npx", "tsx", "src/server.ts"]
