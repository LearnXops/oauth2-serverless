# Stage 1: Build the application
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy application source
COPY . .

# Build the application if needed (e.g., for TypeScript)
# RUN npm run build

# Stage 2: Create the production image
FROM node:20-alpine

# Install runtime dependencies
RUN apk add --no-cache tini

# Set working directory
WORKDIR /app

# Copy built application from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/index.js .
COPY --from=builder /app/handler.js .
COPY --from=builder /app/model.js .
COPY --from=builder /app/apidoc.json .
COPY --from=builder /app/swagger.yaml .

# Create non-root user and switch to it
RUN addgroup -S appgroup && \
    adduser -S appuser -G appgroup && \
    chown -R appuser:appgroup /app
USER appuser

# Set environment variables for production
ENV NODE_ENV=production
ENV PORT=3000

# Expose the application port
EXPOSE 3000

# Use tini as init system to handle signals properly
ENTRYPOINT ["/sbin/tini", "--"]

# Command to run the application
CMD ["node", "index.js"]

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/status || exit 1
