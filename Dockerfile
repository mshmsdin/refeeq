# ==============================================================================
# Multi-Stage Production Dockerfile for «رفيق المناظر» (The Debater's Companion)
# Node.js 24.19.0 LTS (Debian Bookworm Slim)
# ==============================================================================

# --- Stage 1: Build Frontend (React + Vite) ---
FROM node:24.19.0-bookworm-slim AS client-builder

WORKDIR /app/client

COPY client/package*.json ./
RUN npm ci

COPY client/ ./
ENV NODE_ENV=production
RUN npm run build

# --- Stage 2: Production Server Dependencies ---
FROM node:24.19.0-bookworm-slim AS server-deps

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
FROM node:24.19.0-bookworm-slim AS runner

WORKDIR /app

# Set production environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
ENV DB_PATH=/app/data/library.db
ENV MEDIA_PATH=/app/data/media
ENV ARCHIVE_PATH=/app/data/media

# Create persistent data directories and assign ownership to node user
RUN mkdir -p /app/data /app/data/media && chown -R node:node /app

# Copy server code and production dependencies
COPY --chown=node:node server/package*.json ./server/
COPY --chown=node:node --from=server-deps /app/server/node_modules ./server/node_modules
COPY --chown=node:node server/ ./server/

# Copy built frontend assets
COPY --chown=node:node --from=client-builder /app/client/dist ./client/dist

# Set user to non-root node user (Rule 24)
USER node

# Expose internal production port (Rule 6)
EXPOSE 3000

# Docker Health Check (Rule 7)
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

# Start production server (Rule 27)
WORKDIR /app/server
CMD ["node", "server.js"]
