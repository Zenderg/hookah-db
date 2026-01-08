# =============================================================================
# Stage 1: Build
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

# Create a standalone tsconfig for building without project references
RUN echo '{"compilerOptions":{"target":"ES2024","module":"commonjs","lib":["ES2024"],"moduleResolution":"node","resolveJsonModule":true,"allowJs":true,"checkJs":false,"outDir":"dist","rootDir":"src","removeComments":false,"noEmit":false,"importHelpers":true,"downlevelIteration":true,"isolatedModules":true,"allowSyntheticDefaultImports":true,"esModuleInterop":true,"forceConsistentCasingInFileNames":true,"strict":true,"noUnusedLocals":true,"noUnusedParameters":true,"noImplicitReturns":true,"noFallthroughCasesInSwitch":true,"skipLibCheck":true,"declaration":true,"declarationMap":true,"sourceMap":true,"incremental":true},"include":["src/**/*"],"exclude":["node_modules","dist","**/*.test.ts","**/*.spec.ts"]}' > /tmp/tsconfig.build.json

# Build each package individually using standalone tsconfig
RUN cd /app/packages/types && cp /tmp/tsconfig.build.json tsconfig.build.json && npx tsc --project tsconfig.build.json
RUN cd /app/packages/utils && cp /tmp/tsconfig.build.json tsconfig.build.json && npx tsc --project tsconfig.build.json
RUN cd /app/packages/cache && cp /tmp/tsconfig.build.json tsconfig.build.json && npx tsc --project tsconfig.build.json
RUN cd /app/packages/database && cp /tmp/tsconfig.build.json tsconfig.build.json && npx tsc --project tsconfig.build.json
RUN cd /app/packages/scraper && cp /tmp/tsconfig.build.json tsconfig.build.json && npx tsc --project tsconfig.build.json
RUN cd /app/packages/scheduler && cp /tmp/tsconfig.build.json tsconfig.build.json && npx tsc --project tsconfig.build.json
RUN cd /app/packages/services && cp /tmp/tsconfig.build.json tsconfig.build.json && npx tsc --project tsconfig.build.json
RUN cd /app/apps/cli && cp /tmp/tsconfig.build.json tsconfig.build.json && npx tsc --project tsconfig.build.json
RUN cd /app/apps/api && cp /tmp/tsconfig.build.json tsconfig.build.json && npx tsc --project tsconfig.build.json

# Verify that JavaScript files were generated
RUN find /app/apps/api/dist -name "*.js" | wc -l

# =============================================================================
# Stage 2: Runtime
# This stage runs pre-compiled JavaScript for optimal performance
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

# Copy package.json files from each package for dependency resolution
COPY apps/api/package.json ./apps/api/package.json
COPY apps/cli/package.json ./apps/cli/package.json
COPY packages/cache/package.json ./packages/cache/package.json
COPY packages/config/package.json ./packages/config/package.json
COPY packages/database/package.json ./packages/database/package.json
COPY packages/parser/package.json ./packages/parser/package.json
COPY packages/scheduler/package.json ./packages/scheduler/package.json
COPY packages/scraper/package.json ./packages/scraper/package.json
COPY packages/services/package.json ./packages/services/package.json
COPY packages/types/package.json ./packages/types/package.json
COPY packages/utils/package.json ./packages/utils/package.json
COPY packages/tsconfig/package.json ./packages/tsconfig/package.json

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

# Copy ALL compiled files from build stage (JavaScript + TypeScript declarations + maps)
COPY --from=builder /app/apps ./apps/
COPY --from=builder /app/packages ./packages/

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

# Start API server using pre-compiled JavaScript
CMD ["node", "apps/api/dist/server.js"]
