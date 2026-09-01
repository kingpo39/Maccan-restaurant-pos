#!/bin/bash
# MACCAN RMS - Deployment Script
set -e

echo "🚀 MACCAN RMS Deployment Starting..."
echo "========================================"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# --- Check Prerequisites ---
echo "📦 Checking prerequisites..."

if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found. Install Node.js 20+${NC}"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm not found${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites OK${NC}"

# --- Setup ---
echo "📦 Installing dependencies..."

cd backend
npm install --production
cd ..

cd frontend
npm install
npm run build
cd ..

# --- Seed Data ---
echo "📦 Seeding database..."
cd backend
node src/db/seed.js
node src/db/seed-orders.js
node src/db/seed-nutrition.js
cd ..

# --- Start with PM2 ---
echo "🚀 Starting services..."

if command -v pm2 &> /dev/null; then
    cd backend
    pm2 start ecosystem.config.js
    pm2 save
    cd ..
    echo -e "${GREEN}✅ Started with PM2${NC}"
else
    echo -e "${YELLOW}⚠️ PM2 not found. Install with: npm install -g pm2${NC}"
    echo "   Starting manually..."
    cd backend
    PORT=3000 node src/index.js &
    cd ..
fi

echo ""
echo -e "${GREEN}✅ MACCAN RMS Deployment Complete!${NC}"
echo "========================================"
echo "🌐 Frontend: http://localhost"
echo "📊 API: http://localhost:3000/api/health"
echo ""
echo "Login: admin@maccan.com / admin123"
