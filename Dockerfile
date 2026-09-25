# ========================================================
# WaBot Pro — Production Multi-Arch Dockerfile
# Supported: AMD64 (x86_64), ARM64 (Apple Silicon, AWS Graviton), ARMv7 (Raspberry Pi)
# ========================================================

FROM node:20-alpine AS runner

WORKDIR /app

# Install bash and curl/wget for healthchecks and scripts
RUN apk add --no-cache bash curl wget tzdata

# Set production environment
ENV NODE_ENV=production
ENV PORT=4000
ENV WABOT_ALLOW_ANY_ORIGIN=true
ENV TRUST_PROXY=true

# Copy package manifests
COPY package.json ./
COPY server/package*.json ./server/

# Install production server dependencies
RUN npm --prefix server install --omit=dev --no-audit --no-fund

# Copy server application source
COPY server/ ./server/

# Copy pre-built frontend distribution
COPY web/dist/ ./web/dist/

# Copy CLI manager
COPY cli.js ./cli.js
RUN chmod +x ./cli.js && ln -s /app/cli.js /usr/local/bin/wabot

# Declare volumes for persistent WhatsApp session credentials and user configuration
VOLUME ["/app/server/auth", "/app/server/logs"]

# Expose default HTTP/WebSocket port
EXPOSE 4000

# Docker healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O - http://127.0.0.1:4000/api/health || exit 1

# Start command
CMD ["node", "server/src/index.js"]
