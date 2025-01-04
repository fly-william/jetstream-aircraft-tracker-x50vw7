# Build stage
FROM node:20-alpine AS builder
# node:20-alpine v20.11.0

# Set working directory
WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./

# Install dependencies with npm ci for deterministic builds
RUN npm ci --production=false

# Copy source code and configuration files
COPY . .

# Set build environment variables
ARG VITE_API_URL
ARG VITE_WS_URL
ARG VITE_MAPBOX_TOKEN
ARG VITE_AZURE_CLIENT_ID
ARG VITE_AZURE_TENANT_ID
ENV NODE_ENV=production \
    VITE_API_URL=${VITE_API_URL} \
    VITE_WS_URL=${VITE_WS_URL} \
    VITE_MAPBOX_TOKEN=${VITE_MAPBOX_TOKEN} \
    VITE_AZURE_CLIENT_ID=${VITE_AZURE_CLIENT_ID} \
    VITE_AZURE_TENANT_ID=${VITE_AZURE_TENANT_ID}

# Build production bundle
RUN npm run build

# Clean up
RUN npm prune --production && \
    rm -rf /root/.npm /root/.node-gyp /tmp/*

# Production stage
FROM nginx:1.25-alpine
# nginx:1.25-alpine v1.25.3

# Create non-root user
RUN addgroup -g 101 -S nginx && \
    adduser -S -D -H -u 101 -h /var/cache/nginx -s /sbin/nologin -G nginx -g nginx nginx

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Set proper permissions
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

# Configure security headers
RUN echo 'add_header X-Frame-Options "SAMEORIGIN";' >> /etc/nginx/conf.d/default.conf && \
    echo 'add_header X-Content-Type-Options "nosniff";' >> /etc/nginx/conf.d/default.conf && \
    echo 'add_header X-XSS-Protection "1; mode=block";' >> /etc/nginx/conf.d/default.conf && \
    echo 'add_header Content-Security-Policy "default-src '\''self'\''; script-src '\''self'\'' '\''unsafe-inline'\'' '\''unsafe-eval'\''; style-src '\''self'\'' '\''unsafe-inline'\''; img-src '\''self'\'' data: https://*.mapbox.com; connect-src '\''self'\'' https://*.mapbox.com wss: https:; worker-src '\''self'\'' blob:;";' >> /etc/nginx/conf.d/default.conf

# Create health check endpoint
RUN echo "location /health { return 200 'healthy\n'; }" >> /etc/nginx/conf.d/default.conf

# Configure logging
RUN sed -i 's/access_log.*/access_log \/var\/log\/nginx\/access.log combined buffer=512k flush=1m;/' /etc/nginx/nginx.conf && \
    sed -i 's/error_log.*/error_log \/var\/log\/nginx\/error.log warn;/' /etc/nginx/nginx.conf

# Expose port
EXPOSE 80

# Switch to non-root user
USER nginx

# Health check configuration
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:80/health || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]