# MACCAN RMS — Progress Tracker

## Phase 1: Recipe & Costing MVP ✅

### Backend (Express + SQLite/sql.js)
- [x] Project init: `/backend` directory structure
- [x] Database schema with all tables (users, suppliers, ingredients, recipes, recipe_items, inventory_log, tables, orders, order_items, nutrition)
- [x] SQLite connection via sql.js with async wrapper
- [x] Schema migration runner
- [x] JWT + bcrypt authentication middleware
- [x] Auth routes (login/register/me)
- [x] Ingredients CRUD API (with search, allergens, supplier link)
- [x] Recipes CRUD API (with recipe_items management)
- [x] Recipe cost engine: `Σ(qty × cost) × waste_factor / yield_qty`
- [x] Food cost %: `cost_per_serving / menu_price × 100`
- [x] Suppliers CRUD API
- [x] Dashboard stats API (counts, avg food cost)
- [x] Dashboard cost-analysis API (per-recipe breakdown)
- [x] Demo seed script (5 users, 5 suppliers, 34 ingredients, 12 recipes, 12 tables, sample orders)
- [x] Server starts on port 3000

### Frontend (React + Vite + Tailwind CSS v4)
- [x] Vite + React project init
- [x] Tailwind CSS v4 integration
- [x] API proxy to backend (port 3000)
- [x] Auth context (JWT storage, login/logout)
- [x] Private/Public route guards
- [x] Login page with demo account buttons
- [x] Sidebar layout (bilingual FR/EN)
- [x] Dashboard page (stats cards + recipe costing table)
- [x] Ingredients page (CRUD, search, allergen tags, modal form)
- [x] Recipes page (CRUD, live cost calculator, ingredient picker)
- [x] Suppliers page (CRUD, modal form)
- [x] Build compiles successfully

### Verified End-to-End
- [x] Backend API responds: `GET /api/health` → `{status: "ok"}`
- [x] Auth flow: login → token → protected routes
- [x] Seed data: 34 ingredients, 12 recipes with real costs
- [x] Cost engine: Grilled Salmon = 1,372,755 T (161.5% food cost due to saffron)
- [x] Frontend renders: login → sidebar → dashboard with live data
- [x] Vite dev server at http://localhost:5180
- [x] Backend server at http://localhost:3000

---

## Phase 2: Inventory & Receiving ✅

### Backend
- [x] Receiving API: `POST /api/inventory/receive` — batch receiving with multi-item support
- [x] Weighted average cost: auto-calculates on each receiving, updates `ingredients.cost_per_unit`
- [x] Stock levels: `GET /api/inventory/stock` — net quantity from inventory_log, status flags
- [x] Expiry alerts: `GET /api/inventory/alerts` — expired, expiring soon, out of stock
- [x] Consume/waste: `POST /api/inventory/consume` — negative quantity entries
- [x] Inventory log: `GET /api/inventory/log` — full movement history
- [x] Supplier price history: `GET /api/suppliers/:id` — cost trends, price history
- [x] Auto-recalculate recipe costs on ingredient cost change

### Frontend
- [x] Inventory page with 4 tabs: Stock, Receive, Alerts, History
- [x] Stock levels table with status badges (✅ ok, ⏰ expiring, ❌ out of stock)
- [x] Filter: All / Out of Stock / Expiring Soon
- [x] Receiving form: multi-item, ingredient search, cost/qty/expiry fields
- [x] Expiry alerts with color-coded severity
- [x] Inventory movement history log
- [x] Dashboard alert banner (shows when alerts exist)
- [x] Ingredients page shows current stock level

### Verified
- [x] Receive tomatoes: 10 kg × 45,000 T → stock=10, cost=45,000 T
- [x] Receive chicken: 5 kg × 185,000 + 3 kg × 175,000 → weighted avg = 181,250 T
- [x] Recipe costs auto-update: Chicken Kabab cost changed from 82,852 to 83,265 T
- [x] All 34 ingredients show stock status in real-time

## Phase 3: POS & Kitchen Orders ✅

### Backend
- [x] WebSocket server (`ws`) on `/ws` path for real-time KDS broadcasting
- [x] Tables API: `GET /api/orders/tables` — list with active_order count
- [x] Table status: `PUT /api/orders/tables/:id` — toggle free/occupied/reserved
- [x] Create order: `POST /api/orders` — with items array, auto-broadcasts to KDS
- [x] List orders: `GET /api/orders?active=true` — with table labels and server names
- [x] Order status: `PUT /api/orders/:id/status` — open→in_progress→ready→served→closed
- [x] Item status: `PUT /api/orders/:id/items/:itemId/status` — pending→preparing→ready→delivered
- [x] Auto-table release on order close
- [x] Auto-order status from item statuses

### Frontend
- [x] Tables page: 12 tables by zone (Garden/Indoor/VIP), color-coded status
- [x] Order form: recipe grid search, quantity +/-, notes, live total
- [x] KDS page: dark theme kitchen display, WebSocket connected
- [x] KDS cards: color-coded (red=new, yellow=in-progress, green=ready)
- [x] Per-item buttons: 🔥 شروع → ✅ آماده → 📤 تحویل
- [x] Order actions: شروع, همه آماده شد, تحویل و بستن
- [x] Sound alert on new orders
- [x] Stats bar: pending/preparing/ready counts

## Phase 4: Menu Engineering & Analytics ✅

### Backend
- [x] Analytics API: `GET /api/analytics/overview` — full per-dish breakdown with orders
- [x] Per-dish: cost, price, profit, food cost %, order count, revenue
- [x] Category breakdown: avg food cost, total revenue/profit per category
- [x] Top/Bottom performers: most profitable, most ordered, lowest cost
- [x] Margin distribution: high/medium/low/loss counts
- [x] Seed data: 51 orders across 14 days for meaningful charts

### Frontend (Recharts)
- [x] KPI cards: Revenue, Profit, Avg Food Cost, Orders
- [x] Food Cost % bar chart (horizontal, color-coded: green/yellow/red)
- [x] Profit per Dish bar chart (revenue/profit/cost grouped bars)
- [x] Margin Distribution donut/pie chart
- [x] Revenue by Category bar chart
- [x] Top 5 profitable dishes leaderboard
- [x] Most ordered dishes leaderboard
- [x] Full dish analysis table with all metrics

### Key Findings
- 🏆 Most profitable: Lamb Kebab Koobideh (1.3M T), Chicken Kabab (873K T)
- ⚠️ Loss leaders: Grilled Salmon (-1M T), Fattoush Salad (-10K T)
- ✅ Best margins: Cream Soup (3.2%), Zereshk Polo (3.8%), Mirza Ghasemi (4.7%)

## Phase 5: Nutrition ✅

### Backend
- [x] Nutrition CRUD: `GET/PUT/DELETE /api/nutrition/:ingredientId`
- [x] Per-dish rollup: `GET /api/nutrition/recipe/:id` — sums ingredient nutrition by qty
- [x] Allergen summary: `GET /api/nutrition/allergens` — per-recipe allergen flags
- [x] Seed data: 34 ingredients with realistic nutrition (per 100g)
- [x] Fixed sql.js WAL export bug for data persistence

### Frontend
- [x] NutritionPage with 3 tabs: Per Dish, Per Ingredient, Allergens
- [x] Per-dish cards: calorie/protein/fat/carbs boxes + macro bar visualization
- [x] Per-ingredient table: inline editing for nutrition values
- [x] Allergen view: allergen types with dish counts, allergen-free dishes
- [x] Recipe cards: allergen badges (fish, dairy, gluten, eggs, shellfish)
- [x] Sidebar: 🥗 تغذیه Nutrition link added

### Key Nutrition Values (per serving)
- 🔥 Lamb Kebab Koobideh: 1,446 cal (highest)
- 🔥 Grilled Salmon: 1,131 cal
- 🔥 Chicken Kabab: 955 cal
- ✅ Cream Soup: 210 cal (lowest main)
- ✅ Caesar Salad: 206 cal (lightest)

## Phase 6: Deployment & Operations ✅

### Production Config
- [x] PM2 ecosystem.config.js (cluster mode, auto-restart, log rotation)
- [x] Docker Compose (backend + frontend + health checks)
- [x] Backend Dockerfile (multi-stage, non-root user, health check)
- [x] Frontend Dockerfile (multi-stage build + nginx)
- [x] nginx.conf (SPA routing, API proxy, WebSocket proxy, cache headers)
- [x] deploy.sh (one-click deployment script)
- [x] Print-friendly customer menu page (/menu-print)
- [x] Rich order data: 412 orders across 30 days with time-of-day patterns

### Print Menu Features
- Customer-facing menu with prices
- Nutrition facts per dish (calories, protein, fat, carbs)
- Allergen icons (fish, dairy, gluten, eggs, shellfish)
- Print-optimized CSS (no buttons, clean layout)
- Bilingual headers (Persian + English)

## Project Status: Phases 1-6 COMPLETE ✅

### Files Created
```
maccan-rms/
├── backend/
│   ├── src/index.js, routes/ (8 files), db/ (6 files), middleware/
│   ├── package.json, .env, ecosystem.config.js, Dockerfile
├── frontend/
│   ├── src/App.jsx, pages/ (10 files), components/, contexts/, utils/
│   ├── vite.config.js, package.json, Dockerfile, nginx.conf
├── docker-compose.yml
├── deploy.sh
├── PROGRESS.md
└── README.md
```

### Access
- **Frontend**: http://localhost:5180
- **Backend API**: http://localhost:3000/api
- **WebSocket KDS**: ws://localhost:3000/ws
- **Login**: admin@maccan.com / admin123

---

## Tech Stack
- **Backend**: Node.js + Express, SQLite (sql.js), JWT + bcrypt
- **Frontend**: React 19 + Vite 8, Tailwind CSS v4, React Router, Recharts
- **Database**: SQLite (fallback from PostgreSQL for dev)
- **Port**: Backend=3000, Frontend=5180
