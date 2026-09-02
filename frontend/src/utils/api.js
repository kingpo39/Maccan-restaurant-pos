// MACCAN RMS - API utility
// The NestJS backend speaks camelCase; the UI components were written for an
// older Express API that used snake_case. This file bridges both shapes so all
// pages render correctly without touching every component.
const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('maccan_token');
}

function errorMessage(data, status) {
  if (typeof data === 'string') return data;
  const message = data?.error || data?.message || data?.errors?.[0]?.message;
  if (Array.isArray(message)) return message.join(', ');
  if (message && typeof message === 'object') return message.message || JSON.stringify(message);
  return `Request failed (${status})`;
}

// ─── Shape bridging helpers ────────────────────────────────────

const toSnake = (s) => s.replace(/[A-Z]/g, (m) => '_' + m.toLowerCase());

// Deep: add snake_case aliases for every camelCase key (leaves camel keys intact).
function addSnakeAliases(value, depth = 0) {
  if (depth > 5 || value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) { value.forEach((v) => addSnakeAliases(v, depth + 1)); return value; }
  for (const [k, v] of Object.entries(value)) {
    if (/[A-Z]/.test(k)) {
      const sk = toSnake(k);
      if (!(sk in value)) value[sk] = v;
    }
    addSnakeAliases(v, depth + 1);
  }
  return value;
}

const toCamel = (s) => s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());

// Deep: rename snake_case keys to camelCase (only keys containing '_').
function camelizeBody(value) {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(camelizeBody);
  const out = {};
  for (const [k, v] of Object.entries(value)) {
    const nk = k.includes('_') ? toCamel(k) : k;
    out[nk] = camelizeBody(v);
  }
  return out;
}

// Normalize a GET response to the shapes the pages expect.
function applyResponseCompat(endpoint, data) {
  if (data === null || typeof data !== 'object') return data;
  const path = endpoint.split('?')[0];

  const isArr = Array.isArray(data);
  const items = isArr ? data : [data];

  // Flatten costAnalysis into the legacy recipe fields.
  const fixRecipe = (r) => {
    if (!r || typeof r !== 'object') return;
    const ca = r.costAnalysis || {};
    if (ca.costPerServing != null && r.cost_per_serving == null) r.cost_per_serving = ca.costPerServing;
    if (ca.foodCostPercent != null && r.food_cost_percent == null) r.food_cost_percent = ca.foodCostPercent;
    if (ca.menuPrice != null && r.menu_price == null) r.menu_price = ca.menuPrice;
    if (r.menuPrice != null && r.menu_price == null) r.menu_price = r.menuPrice;
    if (r.yieldQuantity != null && r.yield_qty == null) r.yield_qty = r.yieldQuantity;
    if (r.wasteFactor != null && r.waste_factor == null) r.waste_factor = r.wasteFactor;
  };

  const fixIngredient = (x) => {
    if (!x || typeof x !== 'object') return;
    if (x.baseUnit != null && x.unit == null) x.unit = x.baseUnit;
    if (x.supplier && x.supplier_name == null) x.supplier_name = x.supplier.name;
  };

  if (path === '/recipes') {
    items.forEach(fixRecipe);
  } else if (path === '/ingredients') {
    items.forEach((x) => { fixIngredient(x); addSnakeAliases(x); });
  } else if (path === '/inventory/stock') {
    items.forEach((x) => {
      fixIngredient(x);
      if (x.status && ['OK', 'OUT_OF_STOCK', 'LOW'].includes(x.status)) {
        x.status = ({ OK: 'ok', OUT_OF_STOCK: 'out_of_stock', LOW: 'low' })[x.status];
      }
      addSnakeAliases(x);
    });
  } else if (path === '/suppliers') {
    items.forEach(addSnakeAliases);
  }

  // Generic aliasing for everything else (overview summaries, orders, nutrition…).
  addSnakeAliases(data);

  if (path === '/recipes') items.forEach(fixRecipe);
  return data;
}

async function apiCall(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  let res;
  try {
    res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
  } catch {
    throw new Error('Backend is unavailable. Start the POS server on port 3001.');
  }

  if (res.status === 401) {
    localStorage.removeItem('maccan_token');
    localStorage.removeItem('maccan_user');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await res.json() : await res.text();
  if (!res.ok) throw new Error(errorMessage(data, res.status));

  // Translate NestJS camelCase responses into the shapes components expect.
  if ((options.method || 'GET') === 'GET') applyResponseCompat(endpoint, data);
  return data;
}

function toDto(endpoint, body) {
  const path = endpoint.split('?')[0];
  // Orders, inventory receive, and other writes go through DTO validation that
  // expects camelCase — convert snake_case bodies coming from legacy pages.
  return camelizeBody(body);
}

export const api = {
  get: (ep) => apiCall(ep),
  post: (ep, body) => apiCall(ep, { method: 'POST', body: JSON.stringify(toDto(ep, body)) }),
  put: (ep, body) => apiCall(ep, { method: 'PUT', body: JSON.stringify(toDto(ep, body ?? {})) }),
  delete: (ep) => apiCall(ep, { method: 'DELETE' }),
};
