FROM node:20-alpine

WORKDIR /app

# Copy package files first for layer caching
COPY package*.json ./
RUN npm install --production

# Copy application code
COPY src/ ./src/

# Create data directory
RUN mkdir -p /app/data

# Create non-root user
RUN addgroup -S maccan && adduser -S maccan -G maccan
RUN chown -R maccan:maccan /app
USER maccan

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000
ENV DB_PATH=./data/maccan.db

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["node", "src/index.js"]
