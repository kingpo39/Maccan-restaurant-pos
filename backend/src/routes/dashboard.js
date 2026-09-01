// MACCAN RMS - Dashboard & Reports Routes

const express = require('express');
const { getDb } = require('../db/connection');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/dashboard/stats
router.get('/stats', authenticate, (req, res) => {
  try {
    const db = getDb();

    const totalIngredients = db.prepare('SELECT COUNT(*) as count FROM ingredients').get().count;
    const totalRecipes = db.prepare('SELECT COUNT(*) as count FROM recipes').get().count;
    const totalSuppliers = db.prepare('SELECT COUNT(*) as count FROM suppliers').get().count;
    const totalOrders = db.prepare('SELECT COUNT(*) as count FROM orders').get().count;

    // Today's stats
    const today = new Date().toISOString().split('T')[0];
    const todayOrders = db.prepare(
      "SELECT COUNT(*) as count FROM orders WHERE date(created_at) = date('now')"
    ).get().count;

    // Average food cost %
    const avgFoodCost = db.prepare(`
      SELECT AVG(
        CASE WHEN r.menu_price > 0 
          THEN (ri_cost.total / r.yield_qty * r.waste_factor) / r.menu_price * 100 
          ELSE 0 
        END
      ) as avg_cost
      FROM recipes r
      LEFT JOIN (
        SELECT recipe_id, SUM(quantity * cost_per_unit) as total
        FROM recipe_items ri
        JOIN ingredients i ON ri.ingredient_id = i.id
        GROUP BY recipe_id
      ) ri_cost ON r.id = ri_cost.recipe_id
    `).get().avg_cost || 0;

    res.json({
      total_ingredients: totalIngredients,
      total_recipes: totalRecipes,
      total_suppliers: totalSuppliers,
      total_orders: totalOrders,
      today_orders: todayOrders,
      avg_food_cost_percent: Math.round(avgFoodCost * 10) / 10
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dashboard/cost-analysis - Recipe cost ranking
router.get('/cost-analysis', authenticate, (req, res) => {
  try {
    const db = getDb();

    const analysis = db.prepare(`
      SELECT 
        r.id,
        r.name,
        r.category,
        r.menu_price,
        r.yield_qty,
        r.waste_factor,
        COALESCE(ri_cost.total, 0) as raw_cost,
        COALESCE(ri_cost.total, 0) * r.waste_factor as adjusted_cost,
        CASE WHEN r.yield_qty > 0 
          THEN COALESCE(ri_cost.total, 0) * r.waste_factor / r.yield_qty 
          ELSE 0 
        END as cost_per_serving,
        CASE WHEN r.menu_price > 0 AND r.yield_qty > 0
          THEN (COALESCE(ri_cost.total, 0) * r.waste_factor / r.yield_qty) / r.menu_price * 100
          ELSE 0
        END as food_cost_percent,
        CASE WHEN r.yield_qty > 0
          THEN r.menu_price - (COALESCE(ri_cost.total, 0) * r.waste_factor / r.yield_qty)
          ELSE r.menu_price
        END as profit_per_serving
      FROM recipes r
      LEFT JOIN (
        SELECT recipe_id, SUM(quantity * cost_per_unit) as total
        FROM recipe_items ri
        JOIN ingredients i ON ri.ingredient_id = i.id
        GROUP BY recipe_id
      ) ri_cost ON r.id = ri_cost.recipe_id
      ORDER BY food_cost_percent DESC
    `).all();

    res.json(analysis);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
