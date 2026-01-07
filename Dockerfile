# =============================================================================
# Stage1: Build
# This stage compiles TypeScript to JavaScript using pnpm workspaces
# =============================================================================
FROM node:22-alpine AS builder

# Set working directory
WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm@latest

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy tsconfig files and turbo.json for build orchestration
COPY tsconfig.json tsconfig.docker.json turbo.json ./

# Copy all source code
COPY apps/ ./apps/
COPY packages/ ./packages/

# Install all dependencies (including devDependencies for building)
RUN pnpm install --frozen-lockfile

# Build project - this creates all dist/ directories with compiled JavaScript
RUN pnpm build

# =============================================================================
# Stage 2: Runtime
# This stage runs TypeScript files directly with tsx for proper module resolution
# =============================================================================
FROM node:22-alpine AS runtime

# Set working directory
WORKDIR /app

# Install build tools needed for native module compilation
RUN apk add --no-cache python3 make g++

# Install pnpm globally
RUN npm install -g pnpm@latest

# Copy package files for production dependency resolution
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy tsconfig files (needed for package resolution)
COPY tsconfig.json tsconfig.docker.json ./

# Copy source code (not compiled dist) - tsx will compile on the fly
COPY --from=builder /app/apps ./apps/
COPY --from=builder /app/packages ./packages/

# Copy package.json files for dependency resolution
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/apps/cli/package.json ./apps/cli/package.json
COPY --from=builder /app/packages/cache/package.json ./packages/cache/package.json
COPY --from=builder /app/packages/database/package.json ./packages/database/package.json
COPY --from=builder /app/packages/scheduler/package.json ./packages/scheduler/package.json
COPY --from=builder /app/packages/scraper/package.json ./packages/scraper/package.json
COPY --from=builder /app/packages/services/package.json ./packages/services/package.json
COPY --from=builder /app/packages/types/package.json ./packages/types/package.json
COPY --from=builder /app/packages/utils/package.json ./packages/utils/package.json

# Install all dependencies fresh with build scripts enabled to compile native modules
RUN pnpm install --frozen-lockfile

# Rebuild better-sqlite3 native module for runtime platform
RUN cd /app/node_modules/.pnpm/better-sqlite3@11.10.0/node_modules/better-sqlite3 && \
    npm rebuild --build-from-source

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Create data directory and set ownership
RUN mkdir -p /app/data && \
    chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose API port
EXPOSE 3000

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_PATH=/app/data/hookah-db.db

# Set NODE_PATH to help Node.js find workspace packages
ENV NODE_PATH=/app/node_modules:/app/packages/*/node_modules

# Start API server using tsx to run TypeScript files directly
CMD ["npx", "tsx", "apps/api/src/server.ts"]
