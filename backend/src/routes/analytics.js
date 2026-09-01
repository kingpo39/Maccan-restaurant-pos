// MACCAN RMS - Analytics Routes
// Phase 4: Charts, trends, profit analysis

const express = require('express');
const { getDb } = require('../db/connection');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');

const router = express.Router();

// GET /api/analytics/overview — Full analytics data for charts
router.get('/overview', authenticate, requirePermission('analytics:view'), (req, res) => {
  try {
    const db = getDb();

    // 1. Per-dish analytics: cost, price, profit, margin, orders count
    const dishAnalytics = db.prepare(`
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
        END as profit_per_serving,
        COALESCE(oi.order_count, 0) as order_count,
        COALESCE(oi.total_revenue, 0) as total_revenue,
        COALESCE(oi.total_cost, 0) as total_actual_cost,
        COALESCE(oi.total_revenue, 0) - COALESCE(oi.total_cost, 0) as total_profit
      FROM recipes r
      LEFT JOIN (
        SELECT recipe_id, SUM(quantity * cost_per_unit) as total
        FROM recipe_items ri
        JOIN ingredients i ON ri.ingredient_id = i.id
        GROUP BY recipe_id
      ) ri_cost ON r.id = ri_cost.recipe_id
      LEFT JOIN (
        SELECT 
          oi.recipe_id,
          COUNT(*) as order_count,
          SUM(oi.quantity * r.menu_price) as total_revenue,
          SUM(oi.quantity * (COALESCE(ri_cost.total, 0) * r.waste_factor / r.yield_qty)) as total_cost
        FROM order_items oi
        JOIN recipes r ON oi.recipe_id = r.id
        LEFT JOIN (
          SELECT recipe_id, SUM(quantity * cost_per_unit) as total
          FROM recipe_items ri
          JOIN ingredients i ON ri.ingredient_id = i.id
          GROUP BY recipe_id
        ) ri_cost ON r.id = ri_cost.recipe_id
        GROUP BY oi.recipe_id
      ) oi ON r.id = oi.recipe_id
      ORDER BY r.name
    `).all();

    // 2. Category breakdown (computed from dishAnalytics in JS)
    const catMap = {};
    dishAnalytics.forEach(d => {
      if (!catMap[d.category]) {
        catMap[d.category] = { category: d.category, dish_count: 0, total_cost: 0, total_revenue: 0, total_orders: 0, total_profit: 0, food_costs: [] };
      }
      const c = catMap[d.category];
      c.dish_count++;
      c.total_cost += d.total_actual_cost;
      c.total_revenue += d.total_revenue;
      c.total_orders += d.order_count;
      c.total_profit += d.total_profit;
      if (d.food_cost_percent > 0) c.food_costs.push(d.food_cost_percent);
    });
    const categoryBreakdown = Object.values(catMap).map(c => ({
      ...c,
      avg_food_cost_pct: c.food_costs.length > 0 ? Math.round(c.food_costs.reduce((a,b)=>a+b,0) / c.food_costs.length * 10) / 10 : 0,
    }));

    // 3. Summary stats
    const totalRevenue = dishAnalytics.reduce((sum, d) => sum + d.total_revenue, 0);
    const totalCost = dishAnalytics.reduce((sum, d) => sum + d.total_actual_cost, 0);
    const totalProfit = totalRevenue - totalCost;
    const totalOrders = dishAnalytics.reduce((sum, d) => sum + d.order_count, 0);
    const avgFoodCost = dishAnalytics.filter(d => d.food_cost_percent > 0)
      .reduce((sum, d, _, arr) => sum + d.food_cost_percent / arr.length, 0);

    // 4. Top/Bottom performers
    const topProfit = [...dishAnalytics].filter(d => d.total_profit > 0).sort((a, b) => b.total_profit - a.total_profit).slice(0, 5);
    const bottomProfit = [...dishAnalytics].sort((a, b) => a.food_cost_percent - b.food_cost_percent).slice(0, 5);
    const mostOrdered = [...dishAnalytics].sort((a, b) => b.order_count - a.order_count).slice(0, 5);

    // 5. Profit margin distribution (for pie chart)
    const marginDistribution = {
      high: dishAnalytics.filter(d => d.food_cost_percent > 0 && d.food_cost_percent < 25).length,
      medium: dishAnalytics.filter(d => d.food_cost_percent >= 25 && d.food_cost_percent < 35).length,
      low: dishAnalytics.filter(d => d.food_cost_percent >= 35 && d.food_cost_percent < 50).length,
      loss: dishAnalytics.filter(d => d.food_cost_percent >= 50).length,
    };

    res.json({
      dishes: dishAnalytics,
      categories: categoryBreakdown,
      summary: {
        total_revenue: totalRevenue,
        total_cost: totalCost,
        total_profit: totalProfit,
        total_orders: totalOrders,
        avg_food_cost_percent: Math.round(avgFoodCost * 10) / 10,
        dish_count: dishAnalytics.length,
      },
      top_profit: topProfit,
      bottom_profit: bottomProfit,
      most_ordered: mostOrdered,
      margin_distribution: marginDistribution,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
