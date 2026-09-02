#!/bin/bash
# MACCAN RMS - Deployment Script
set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

echo "🚀 MACCAN RMS Deployment Starting..."
echo "========================================"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

if command -v docker &> /dev/null && docker compose version &> /dev/null; then
    echo "📦 Building and starting Docker services..."
    docker compose up -d --build
    echo -e "${GREEN}✅ Docker services started${NC}"
    echo "🌐 Frontend: http://localhost"
    echo "📊 API: http://localhost:3001/api"
    exit 0
fi

echo -e "${YELLOW}⚠️ Docker Compose not found; using local Node.js deployment${NC}"

if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found. Install Node.js 20+${NC}"
    exit 1
fi
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm not found${NC}"
    exit 1
fi

echo "📦 Installing NestJS backend dependencies..."
cd "$ROOT_DIR/backend-nestjs"
npm ci
npm run prisma:generate
npm run build

if [ ! -f "data/dev.db" ] && [ -f "prisma/dev.db" ]; then
    mkdir -p data
    cp prisma/dev.db data/dev.db
fi

if command -v pm2 &> /dev/null; then
    pm2 delete maccan-backend 2>/dev/null || true
    PORT=3001 NODE_ENV=production pm2 start dist/main.js --name maccan-backend
    pm2 save
else
    echo "🚀 Starting NestJS backend manually..."
    PORT=3001 NODE_ENV=production node dist/main.js &
fi

cd "$ROOT_DIR/frontend"
echo "📦 Installing frontend dependencies and building..."
npm ci
npm run build

cd "$ROOT_DIR"
echo -e "${GREEN}✅ MACCAN RMS Deployment Complete!${NC}"
echo "========================================"
echo "🌐 Frontend build: $ROOT_DIR/frontend/dist"
echo "📊 API: http://localhost:3001/api"
echo ""
echo "Login: admin@maccan.com / admin123"
