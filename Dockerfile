# =============================================================================
# Stage 1: Build
# This stage compiles TypeScript to JavaScript using npm build
# =============================================================================
FROM node:22-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json ./

# Copy TypeScript configuration
COPY tsconfig.json ./

# Copy all source code
COPY src ./src/

# Install all dependencies (including devDependencies for building)
RUN npm install

# Build TypeScript to JavaScript
RUN npm run build

# Verify that JavaScript files were generated
RUN find /app/dist -name "*.js" | wc -l

# =============================================================================
# Stage 2: Runtime
# This stage runs pre-compiled JavaScript for optimal performance
# =============================================================================
FROM node:22-alpine AS runtime

# Set working directory
WORKDIR /app

# Install build tools needed for native module compilation
RUN apk add --no-cache python3 make g++

# Copy package files for production dependency resolution
COPY package.json ./

# Install production dependencies only
RUN npm install --only=production

# Copy ALL compiled files from build stage (JavaScript + TypeScript declarations + maps)
COPY --from=builder /app/dist ./dist/

# Rebuild better-sqlite3 native module for runtime platform
RUN cd /app/node_modules/better-sqlite3 && \
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

# Start API server using pre-compiled JavaScript
CMD ["node", "dist/server.js"]
