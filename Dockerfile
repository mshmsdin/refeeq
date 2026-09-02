# ==============================================================================
# Multi-Stage Production Dockerfile for «رفيق المناظر» (The Debater's Companion)
# Node.js 24.19.0 LTS (Debian Bookworm Slim)
# ==============================================================================

# --- Stage 1: Build Frontend (React + Vite) ---
FROM node:22.19.0-bookworm-slim AS client-builder

WORKDIR /app/client

COPY client/package*.json ./
RUN npm ci

COPY client/ ./
ENV NODE_ENV=production
RUN npm run build

# --- Stage 2: Production Server Dependencies ---
FROM node:22.19.0-bookworm-slim AS server-deps

WORKDIR /app/server

# Install build tools required for native SQLite compilation (better-sqlite3)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

COPY server/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# --- Stage 3: Production Runner ---
FROM node:22.19.0-bookworm-slim AS runner

WORKDIR /app

# Set production environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
ENV DB_PATH=/app/data/library.db
ENV MEDIA_PATH=/app/data/media
ENV ARCHIVE_PATH=/app/data/media

# Create persistent data directories
RUN mkdir -p /app/data /app/data/media /app/data/tmp_sync /app/client/dist && chmod -R 777 /app/data

# Copy server code and production dependencies
COPY server/ ./server/
COPY --from=server-deps /app/server/node_modules ./server/node_modules

# Copy built frontend assets
COPY --from=client-builder /app/client/dist ./client/dist

# Expose internal production port
EXPOSE 3000

# Docker Health Check
HEALTHCHECK --interval=20s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

# Start production server
WORKDIR /app/server
CMD ["node", "server.js"]
