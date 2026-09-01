# 🍽️ MACCAN RMS — Restaurant Management System

> **🌿🌊 جایی که جنگل به دریا می‌رسد · لالیم سر، مازندران**
> *Where the forest meets the sea · Lavilan, Mazandaran*

A complete end-to-end restaurant management system built for Maccan Forest Village. From ingredient receiving → recipe costing → menu pricing → POS/orders → kitchen display → analytics → nutrition.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [Features](#features)
- [Pages Guide](#pages-guide)
- [API Reference](#api-reference)
- [Database Schema](#database-schema)
- [Deployment](#deployment)
- [Default Accounts](#default-accounts)
- [Development](#development)

---

## Overview

MACCAN RMS covers **5 phases** of restaurant operations:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    MACCAN RMS — 5-Phase Pipeline                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Phase 1: Recipe & Costing    → Cost/serving, food cost %, margin  │
│  Phase 2: Inventory           → Receiving, weighted avg, expiry     │
│  Phase 3: POS & KDS           → Orders, WebSocket real-time kitchen │
│  Phase 4: Analytics           → Charts, profit analysis, trends     │
│  Phase 5: Nutrition           → Calories, macros, allergen flags    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENTS                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Owner/     │  │   Server     │  │   Kitchen    │     │
│  │   Manager    │  │   (Tablet)   │  │   Display    │     │
│  │   (Desktop)  │  │              │  │   (KDS)      │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                 │                  │              │
│         └────────┬────────┴────────┬────────┘              │
│                  │                 │                        │
│         ┌────────▼─────────────────▼────────┐              │
│         │        React + Vite + Tailwind     │              │
│         │        Frontend (Port 5180)        │              │
│         └────────────────┬──────────────────┘              │
│                          │                                  │
│              ┌───────────▼───────────┐                     │
│              │    HTTP REST API      │                     │
│              │    WebSocket (ws)     │                     │
│              └───────────┬───────────┘                     │
│                          │                                  │
│         ┌────────────────▼──────────────────┐              │
│         │     Express.js Backend (3000)      │              │
│         │     JWT Auth · WebSocket Server    │              │
│         └────────────────┬──────────────────┘              │
│                          │                                  │
│              ┌───────────▼───────────┐                     │
│              │     SQLite (sql.js)   │                     │
│              │     maccan.db         │                     │
│              └───────────────────────┘                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Real-Time Flow

```
Server places order ──► POST /api/orders ──► Backend
                                                  │
                                                  ├── Writes to DB
                                                  └── WebSocket broadcast
                                                          │
                                                          ▼
                                            KDS receives NEW_ORDER
                                            (instant, < 100ms)
```

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Backend** | Node.js + Express | 20+ / 4.x |
| **Database** | SQLite via sql.js | 1.x |
| **Frontend** | React + Vite | 19+ / 8.x |
| **Styling** | Tailwind CSS | 4.x |
| **Charts** | Recharts | 2.x |
| **Auth** | JWT + bcryptjs | |
| **WebSocket** | ws | 8.x |
| **Language** | JavaScript (ES Modules) | |

---

## Quick Start

### Prerequisites

- **Node.js** v20+ ([download](https://nodejs.org))
- **npm** v10+ (comes with Node.js)

### Installation

```bash
# Clone the repository
git clone https://github.com/maccan-group/maccan-rms.git
cd maccan-rms

# Install backend dependencies
cd backend
npm install

# Seed the database with demo data
node src/db/seed.js
node src/db/seed-orders.js
node src/db/seed-nutrition.js

# Start the backend server
PORT=3000 node src/index.js &
cd ..

# Install frontend dependencies
cd frontend
npm install

# Start the frontend dev server
npx vite --host 0.0.0.0 --port 5180
```

### Access

| Service | URL |
|---------|-----|
| **Frontend** | http://localhost:5180 |
| **Backend API** | http://localhost:3000/api |
| **Health Check** | http://localhost:3000/api/health |
| **KDS WebSocket** | ws://localhost:3000/ws |

### Login

| Role | Email | Password |
|------|-------|----------|
| Owner | admin@maccan.com | admin123 |
| Manager | sara@maccan.com | staff123 |
| Head Chef | reza@maccan.com | staff123 |
| Server | ali@maccan.com | staff123 |
| Inventory | mina@maccan.com | staff123 |

---

## Features

### Phase 1: Recipe & Costing
- ✅ 34 ingredients with real Iranian pricing
- ✅ 12 recipes with full ingredient breakdown
- ✅ Automatic cost/serving calculation: `Σ(qty × cost) × waste_factor / yield`
- ✅ Food cost %: cost per serving ÷ menu price
- ✅ Ingredient CRUD with supplier linking and allergen tags
- ✅ Recipe CRUD with live cost calculator

### Phase 2: Inventory & Receiving
- ✅ Multi-item batch receiving with batch/expiry dates
- ✅ Weighted average cost updates on each receiving
- ✅ Stock levels derived from inventory log
- ✅ Expiry alerts (expired, expiring soon, out of stock)
- ✅ Supplier price history and cost trends
- ✅ Dashboard alert banner

### Phase 3: POS & Kitchen Orders
- ✅ 12 tables across 3 zones (Garden, Indoor, VIP)
- ✅ Order entry with recipe search, quantity, notes
- ✅ WebSocket real-time KDS (Kitchen Display System)
- ✅ Color-coded status: pending (red) → preparing (yellow) → ready (green)
- ✅ Per-item status buttons: 🔥 شروع → ✅ آماده → 📤 تحویل
- ✅ Sound alert on new orders
- ✅ Auto table release on order close

### Phase 4: Analytics
- ✅ Revenue, profit, food cost % summary cards
- ✅ Food cost % bar chart (color-coded)
- ✅ Profit per dish grouped bar chart
- ✅ Margin distribution donut chart
- ✅ Revenue by category chart
- ✅ Top 5 profitable dishes leaderboard
- ✅ Most ordered dishes leaderboard
- ✅ Full dish analysis table

### Phase 5: Nutrition
- ✅ 34 ingredients with per-100g nutrition data
- ✅ Per-dish rollup (calories, protein, fat, carbs)
- ✅ Macro distribution visualization bars
- ✅ Inline nutrition editing for ingredients
- ✅ Allergen flags per recipe (fish, dairy, gluten, eggs, shellfish)
- ✅ Allergen summary view with dish counts

---

## Pages Guide

| # | Page | Route | Purpose |
|---|------|-------|---------|
| 1 | 📊 Dashboard | `/` | KPI cards, recipe costing table, inventory alerts |
| 2 | 🥩 Ingredients | `/ingredients` | CRUD, search, allergens, stock levels |
| 3 | 🍳 Recipes | `/recipes` | CRUD, live cost calculator, nutrition |
| 4 | 📦 Inventory | `/inventory` | Stock levels, receiving form, expiry alerts, history |
| 5 | 🍽️ Tables | `/tables` | Table map, zone view, order entry |
| 6 | 👨‍🍳 KDS | `/kds` | Kitchen display, real-time orders, status buttons |
| 7 | 🥗 Nutrition | `/nutrition` | Per-dish nutrition, ingredient editor, allergens |
| 8 | 📈 Analytics | `/analytics` | Charts, profit analysis, leaderboard |
| 9 | 🏪 Suppliers | `/suppliers` | Supplier CRUD, price history |
| 10 | 🔐 Login | `/login` | Authentication, demo accounts |

---

## API Reference

### Authentication
```
POST /api/auth/login    → { email, password } → { token, user }
POST /api/auth/register → { name, email, password, role }
GET  /api/auth/me       → Bearer token → user profile
```

### Ingredients
```
GET    /api/ingredients              → list all (with search, supplier_id filter)
GET    /api/ingredients/:id          → single ingredient
POST   /api/ingredients              → create (name, unit, cost_per_unit, supplier_id, allergens)
PUT    /api/ingredients/:id          → update
DELETE /api/ingredients/:id          → delete
```

### Recipes
```
GET    /api/recipes                  → list all with cost calculation
GET    /api/recipes/:id              → recipe with ingredients
POST   /api/recipes                  → create
PUT    /api/recipes/:id              → update
DELETE /api/recipes/:id              → delete
POST   /api/recipes/:id/items        → add ingredient to recipe
PUT    /api/recipes/:id/items/:itemId → update recipe item
```

### Inventory
```
POST   /api/inventory/receive   → { items: [{ingredient_id, quantity, unit_cost, expiry_date}] }
GET    /api/inventory/stock      → stock levels with status flags
GET    /api/inventory/alerts     → expired, expiring, out of stock
POST   /api/inventory/consume    → { ingredient_id, quantity, note }
GET    /api/inventory/log        → movement history
```

### Orders & Tables
```
GET    /api/orders/tables                     → list tables with status
PUT    /api/orders/tables/:id                 → toggle table status
POST   /api/orders                            → create order with items
GET    /api/orders?active=true                → active orders with items
GET    /api/orders/:id                        → single order
PUT    /api/orders/:id/status                 → update order status
PUT    /api/orders/:id/items/:itemId/status   → update item status (KDS)
POST   /api/orders/:id/add-item               → add item to existing order
```

### Nutrition
```
GET    /api/nutrition                         → all ingredient nutrition
GET    /api/nutrition/recipe/:recipeId         → per-dish rollup
PUT    /api/nutrition/:ingredientId            → upsert nutrition
DELETE /api/nutrition/:ingredientId            → delete
GET    /api/nutrition/allergens               → allergen summary per recipe
```

### Analytics
```
GET    /api/analytics/overview    → full analytics with dishes, categories, summaries
```

### Dashboard
```
GET    /api/dashboard/stats       → ingredient/recipe/supplier counts, avg food cost
GET    /api/dashboard/cost-analysis → per-recipe cost breakdown
```

---

## Database Schema

```sql
users              (id, name, email, password_hash, role, created_at)
suppliers          (id, name, contact, payment_terms, created_at)
ingredients        (id, name, unit, cost_per_unit, supplier_id, allergens, created_at)
recipes            (id, name, description, category, yield_qty, waste_factor, menu_price, created_at)
recipe_items       (id, recipe_id, ingredient_id, quantity)
inventory_log      (id, ingredient_id, quantity_change, cost, batch_date, expiry_date, note, created_at)
tables             (id, label, capacity, status)
orders             (id, table_id, server_id, status, created_at)
order_items        (id, order_id, recipe_id, quantity, notes, status)
nutrition          (id, ingredient_id, calories, protein, fat, carbs, per_unit)
```

### Status Values
- **Tables**: `free | occupied | reserved`
- **Orders**: `open | in_progress | ready | served | closed`
- **Order Items**: `pending | preparing | ready | delivered`
- **User Roles**: `owner | manager | head_chef | server | inventory`

---

## Deployment

### Production Build

```bash
# Backend
cd backend
npm install --production

# Frontend
cd frontend
npm run build
# Serve dist/ with nginx or copy to backend/public
```

### PM2 (Process Manager)

```bash
npm install -g pm2

# Create ecosystem.config.js
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'maccan-rms',
    script: 'backend/src/index.js',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
EOF

pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name maccan.local;

    # Frontend
    location / {
        root /opt/maccan-rms/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # API
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # WebSocket
    location /ws {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### Docker Compose (Production)

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/backend/data
    environment:
      - NODE_ENV=production
      - PORT=3000
      - JWT_SECRET=change-this-in-production
    restart: always
```

---

## Project Structure

```
maccan-rms/
├── backend/
│   ├── src/
│   │   ├── index.js              # Main server (Express + WebSocket)
│   │   ├── db/
│   │   │   ├── connection.js     # SQLite connection (sql.js)
│   │   │   ├── schema.js         # Database schema
│   │   │   ├── seed.js           # Demo data seeder
│   │   │   ├── seed-orders.js    # Orders seeder
│   │   │   └── seed-nutrition.js # Nutrition data seeder
│   │   ├── middleware/
│   │   │   └── auth.js           # JWT authentication
│   │   └── routes/
│   │       ├── auth.js           # Login, register, profile
│   │       ├── ingredients.js    # Ingredient CRUD
│   │       ├── recipes.js        # Recipe CRUD + cost engine
│   │       ├── suppliers.js      # Supplier CRUD + price history
│   │       ├── dashboard.js      # Stats + cost analysis
│   │       ├── inventory.js      # Receiving, stock, alerts
│   │       ├── orders.js         # Orders + tables + WebSocket
│   │       ├── analytics.js      # Charts data
│   │       └── nutrition.js      # Nutrition CRUD + rollup
│   ├── data/
│   │   └── maccan.db             # SQLite database file
│   ├── package.json
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── App.jsx               # Router + routes
│   │   ├── main.jsx              # Entry point
│   │   ├── index.css             # Tailwind imports
│   │   ├── contexts/
│   │   │   └── AuthContext.jsx   # JWT auth context
│   │   ├── components/
│   │   │   └── Layout.jsx        # Sidebar navigation
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx     # Login with demo accounts
│   │   │   ├── DashboardPage.jsx # KPI cards + costing table
│   │   │   ├── IngredientsPage.jsx # CRUD + search + stock
│   │   │   ├── RecipesPage.jsx   # CRUD + cost calculator
│   │   │   ├── InventoryPage.jsx # 4 tabs: stock/receive/alerts/log
│   │   │   ├── TablesPage.jsx    # Table map + order entry
│   │   │   ├── KDSPage.jsx       # Kitchen display + WebSocket
│   │   │   ├── NutritionPage.jsx # Nutrition + allergens
│   │   │   ├── AnalyticsPage.jsx # Recharts dashboard
│   │   │   └── SuppliersPage.jsx # Supplier CRUD
│   │   └── utils/
│   │       └── api.js            # API utility with JWT
│   ├── vite.config.js
│   └── package.json
├── PROGRESS.md                   # Phase completion tracker
└── README.md                     # This file
```

---

## Default Accounts

| Role | Email | Password | Permissions |
|------|-------|----------|-------------|
| 👑 Owner | admin@maccan.com | admin123 | Full access to everything |
| 📋 Manager | sara@maccan.com | staff123 | Orders, inventory, analytics |
| 👨‍🍳 Head Chef | reza@maccan.com | staff123 | Orders, recipes, kitchen |
| 🍽️ Server | ali@maccan.com | staff123 | Orders, tables |
| 📦 Inventory | mina@maccan.com | staff123 | Ingredients, receiving |

---

## Development

```bash
# Backend (with auto-restart)
cd backend
npx nodemon src/index.js

# Frontend (with HMR)
cd frontend
npx vite --host

# Run all seeds
cd backend
node src/db/seed.js && node src/db/seed-orders.js && node src/db/seed-nutrition.js
```

---

## Environment Variables

```env
# Backend
PORT=3000
DB_PATH=./data/maccan.db
JWT_SECRET=your-secret-key
NODE_ENV=development
NO_AUTO_SAVE=1  # Set during seeding
```

---

## License

Private — Maccan Forest Village, Lavilan, Mazandaran, Iran

---

> 🌿🌊 **جایی که جنگل به دریا می‌رسد** · لالیم سر، مازندران
