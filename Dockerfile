# Multi-stage build for BrainLeap Backend Server
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Build stage (for future TypeScript compilation if needed)
FROM base AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Build commands would go here if needed

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

# Copy dependencies and application files
COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/src ./src
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./

# Expose port
EXPOSE 4000

ENV PORT=4000

# Install wget for health check
USER root
RUN apk add --no-cache wget

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/health || exit 1

# Switch back to non-root user
USER nodejs

# Start the server
CMD ["node", "src/server.js"]

