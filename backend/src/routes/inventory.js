// MACCAN RMS - Inventory Routes
// Phase 2: Receiving, Stock Levels, Expiry Alerts, Weighted Avg Cost

const express = require('express');
const { getDb } = require('../db/connection');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// ─── RECEIVE GOODS ──────────────────────────────────────────
// POST /api/inventory/receive — Log a new receiving entry
// Body: { items: [{ ingredient_id, quantity, unit_cost, batch_date?, expiry_date?, note? }] }
// Effect: writes inventory_log, updates weighted avg cost on ingredient
router.post('/receive', authenticate, authorize('owner', 'manager', 'inventory', 'head_chef'), (req, res) => {
  try {
    const { items } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'At least one item is required.' });
    }

    const db = getDb();
    const results = [];
    const today = new Date().toISOString().split('T')[0];

    // Use a transaction-like approach (sql.js doesn't have transactions, so we do manual)
    for (const item of items) {
      const { ingredient_id, quantity, unit_cost, batch_date, expiry_date, note } = item;

      if (!ingredient_id || !quantity || quantity <= 0) {
        return res.status(400).json({ error: `Invalid item: ingredient_id=${ingredient_id}, quantity=${quantity}` });
      }

      // 1. Insert into inventory_log
      const logResult = db.prepare(`
        INSERT INTO inventory_log (ingredient_id, quantity_change, cost, batch_date, expiry_date, note)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        ingredient_id,
        Math.abs(quantity), // positive = receiving
        unit_cost || 0,
        batch_date || today,
        expiry_date || null,
        note || 'Receiving'
      );

      // 2. Calculate weighted average cost and update ingredient
      const ing = db.prepare('SELECT * FROM ingredients WHERE id = ?').get(ingredient_id);
      if (ing) {
        // Get current total quantity and total cost from inventory_log
        const stats = db.prepare(`
          SELECT 
            COALESCE(SUM(quantity_change), 0) as total_qty,
            COALESCE(SUM(cost * quantity_change), 0) as total_cost
          FROM inventory_log 
          WHERE ingredient_id = ?
        `).get(ingredient_id);

        const newAvgCost = stats.total_qty > 0 ? stats.total_cost / stats.total_qty : unit_cost || 0;

        // Update ingredient cost_per_unit with weighted average
        db.prepare('UPDATE ingredients SET cost_per_unit = ? WHERE id = ?')
          .run(Math.round(newAvgCost * 100) / 100, ingredient_id);

        // 3. Recalculate recipe costs for this ingredient
        recalculateRecipeCosts(db, ingredient_id);

        results.push({
          ingredient_id,
          ingredient_name: ing.name,
          received_qty: quantity,
          unit_cost,
          new_avg_cost: Math.round(newAvgCost * 100) / 100,
          total_stock: stats.total_qty,
          log_id: logResult.lastInsertRowid
        });
      }
    }

    res.status(201).json({
      message: `${results.length} item(s) received successfully`,
      items: results,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── STOCK LEVELS ──────────────────────────────────────────
// GET /api/inventory/stock — Get current stock levels for all ingredients
router.get('/stock', authenticate, (req, res) => {
  try {
    const db = getDb();
    const { low_stock_only, expired_only } = req.query;

    const stock = db.prepare(`
      SELECT 
        i.id,
        i.name,
        i.unit,
        i.cost_per_unit,
        i.allergens,
        s.name as supplier_name,
        s.id as supplier_id,
        COALESCE(SUM(il.quantity_change), 0) as current_stock,
        COALESCE(received.total_received, 0) as total_received,
        COALESCE(used.total_used, 0) as total_used,
        -- Next expiry date (closest upcoming)
        (SELECT MIN(expiry_date) FROM inventory_log 
         WHERE ingredient_id = i.id AND expiry_date IS NOT NULL AND expiry_date >= date('now')
        ) as next_expiry,
        -- Days until expiry
        CAST(julianday((SELECT MIN(expiry_date) FROM inventory_log 
         WHERE ingredient_id = i.id AND expiry_date IS NOT NULL AND expiry_date >= date('now')
        )) - julianday('now') AS INTEGER) as days_to_expiry,
        -- Last received date
        (SELECT MAX(batch_date) FROM inventory_log WHERE ingredient_id = i.id) as last_received
      FROM ingredients i
      LEFT JOIN suppliers s ON i.supplier_id = s.id
      LEFT JOIN inventory_log il ON i.id = il.ingredient_id
      LEFT JOIN (
        SELECT ingredient_id, SUM(quantity_change) as total_received
        FROM inventory_log WHERE quantity_change > 0
        GROUP BY ingredient_id
      ) received ON i.id = received.ingredient_id
      LEFT JOIN (
        SELECT ingredient_id, ABS(SUM(quantity_change)) as total_used
        FROM inventory_log WHERE quantity_change < 0
        GROUP BY ingredient_id
      ) used ON i.id = used.ingredient_id
      GROUP BY i.id
      ORDER BY i.name ASC
    `).all();

    // Add status flags
    const result = stock.map(item => {
      let status = 'ok';
      let status_label = 'موجود';

      if (item.current_stock <= 0) {
        status = 'out_of_stock';
        status_label = 'تمام شده';
      } else if (item.days_to_expiry !== null && item.days_to_expiry <= 3) {
        status = 'expiring';
        status_label = item.days_to_expiry <= 0 ? 'منقضی شده' : `${item.days_to_expiry} روز مانده`;
      } else if (item.days_to_expiry !== null && item.days_to_expiry <= 7) {
        status = 'near_expiry';
        status_label = `${item.days_to_expiry} روز مانده`;
      }

      // Parse allergens
      try { item.allergens = JSON.parse(item.allergens || '[]'); } catch { item.allergens = []; }

      return { ...item, status, status_label };
    });

    // Apply filters
    let filtered = result;
    if (low_stock_only === 'true') {
      filtered = filtered.filter(i => i.current_stock <= 0);
    }
    if (expired_only === 'true') {
      filtered = filtered.filter(i => i.days_to_expiry !== null && i.days_to_expiry <= 3);
    }

    res.json(filtered);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── EXPIRY ALERTS ──────────────────────────────────────────
// GET /api/inventory/alerts — Get items expiring soon or out of stock
router.get('/alerts', authenticate, (req, res) => {
  try {
    const db = getDb();
    const { days = 7 } = req.query;

    // Expiring soon (within N days)
    const expiring = db.prepare(`
      SELECT 
        i.id, i.name, i.unit,
        il.expiry_date,
        il.batch_date,
        il.quantity_change as quantity,
        CAST(julianday(il.expiry_date) - julianday('now') AS INTEGER) as days_left,
        s.name as supplier_name
      FROM inventory_log il
      JOIN ingredients i ON il.ingredient_id = i.id
      LEFT JOIN suppliers s ON i.supplier_id = s.id
      WHERE il.expiry_date IS NOT NULL 
        AND il.expiry_date >= date('now')
        AND julianday(il.expiry_date) - julianday('now') <= ?
        AND il.expiry_date != ''
      ORDER BY il.expiry_date ASC
    `).all(days);

    // Already expired
    const expired = db.prepare(`
      SELECT 
        i.id, i.name, i.unit,
        il.expiry_date,
        il.batch_date,
        il.quantity_change as quantity,
        CAST(julianday('now') - julianday(il.expiry_date) AS INTEGER) as days_past,
        s.name as supplier_name
      FROM inventory_log il
      JOIN ingredients i ON il.ingredient_id = i.id
      LEFT JOIN suppliers s ON i.supplier_id = s.id
      WHERE il.expiry_date IS NOT NULL 
        AND il.expiry_date < date('now')
        AND il.expiry_date != ''
      ORDER BY il.expiry_date DESC
    `).all();

    // Out of stock
    const outOfStock = db.prepare(`
      SELECT i.id, i.name, i.unit, s.name as supplier_name
      FROM ingredients i
      LEFT JOIN suppliers s ON i.supplier_id = s.id
      WHERE i.id NOT IN (
        SELECT DISTINCT ingredient_id FROM inventory_log WHERE quantity_change > 0
      )
      ORDER BY i.name ASC
    `).all();

    res.json({
      expiring_soon: expiring,
      expired: expired,
      out_of_stock: outOfStock,
      summary: {
        expiring_count: expiring.length,
        expired_count: expired.length,
        out_of_stock_count: outOfStock.length,
        alert_level: expired.length > 0 ? 'critical' : expiring.length > 0 ? 'warning' : 'ok'
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── INVENTORY LOG (History) ────────────────────────────────
// GET /api/inventory/log — Get inventory movement history
router.get('/log', authenticate, (req, res) => {
  try {
    const db = getDb();
    const { ingredient_id, limit = 50 } = req.query;

    let query = `
      SELECT 
        il.*,
        i.name as ingredient_name,
        i.unit as ingredient_unit,
        s.name as supplier_name
      FROM inventory_log il
      JOIN ingredients i ON il.ingredient_id = i.id
      LEFT JOIN suppliers s ON i.supplier_id = s.id
    `;
    const params = [];

    if (ingredient_id) {
      query += ' WHERE il.ingredient_id = ?';
      params.push(ingredient_id);
    }

    query += ' ORDER BY il.created_at DESC LIMIT ?';
    params.push(parseInt(limit));

    const log = db.prepare(query).all(...params);
    res.json(log);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── CONSUME (Waste/Usage) ──────────────────────────────────
// POST /api/inventory/consume — Record ingredient usage/waste
// Body: { ingredient_id, quantity, note }
router.post('/consume', authenticate, authorize('owner', 'manager', 'inventory', 'head_chef'), (req, res) => {
  try {
    const { ingredient_id, quantity, note } = req.body;

    if (!ingredient_id || !quantity || quantity <= 0) {
      return res.status(400).json({ error: 'ingredient_id and positive quantity required.' });
    }

    const db = getDb();
    const ing = db.prepare('SELECT * FROM ingredients WHERE id = ?').get(ingredient_id);
    if (!ing) {
      return res.status(404).json({ error: 'Ingredient not found.' });
    }

    const result = db.prepare(`
      INSERT INTO inventory_log (ingredient_id, quantity_change, cost, batch_date, note)
      VALUES (?, ?, ?, ?, ?)
    `).run(ingredient_id, -Math.abs(quantity), 0, new Date().toISOString().split('T')[0], note || 'Usage/Waste');

    res.status(201).json({
      message: 'Usage recorded',
      ingredient: ing.name,
      quantity_used: quantity,
      log_id: result.lastInsertRowid
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── RECIPE COST RECALCULATION ─────────────────────────────
function recalculateRecipeCosts(db, ingredientId) {
  const affectedRecipes = db.prepare(`
    SELECT DISTINCT recipe_id FROM recipe_items WHERE ingredient_id = ?
  `).all(ingredientId);

  for (const { recipe_id } of affectedRecipes) {
    const recipe = db.prepare('SELECT * FROM recipes WHERE id = ?').get(recipe_id);
    if (!recipe) continue;

    const items = db.prepare(`
      SELECT ri.quantity, i.cost_per_unit
      FROM recipe_items ri
      JOIN ingredients i ON ri.ingredient_id = i.id
      WHERE ri.recipe_id = ?
    `).all(recipe_id);

    let rawCost = 0;
    items.forEach(item => { rawCost += item.quantity * item.cost_per_unit; });

    console.log(`♻️ Recipe #${recipe_id} (${recipe.name}): new raw cost = ${rawCost.toFixed(2)}`);
  }
}

module.exports = router;
