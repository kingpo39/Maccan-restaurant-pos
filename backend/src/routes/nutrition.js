// MACCAN RMS - Nutrition Routes (Phase 5)
// Per-ingredient nutrition CRUD + per-dish rollup

const express = require('express');
const { getDb } = require('../db/connection');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// GET /api/nutrition — All nutrition data
router.get('/', authenticate, (req, res) => {
  try {
    const db = getDb();
    const nutrition = db.prepare(`
      SELECT n.*, i.name as ingredient_name, i.unit
      FROM nutrition n
      JOIN ingredients i ON n.ingredient_id = i.id
      ORDER BY i.name
    `).all();
    res.json(nutrition);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/nutrition/recipe/:recipeId — Per-dish nutrition rollup
router.get('/recipe/:recipeId', authenticate, (req, res) => {
  try {
    const db = getDb();
    const recipe = db.prepare('SELECT * FROM recipes WHERE id = ?').get(req.params.recipeId);
    if (!recipe) return res.status(404).json({ error: 'Recipe not found' });

    const items = db.prepare(`
      SELECT 
        ri.quantity,
        n.calories, n.protein, n.fat, n.carbs,
        i.name as ingredient_name, i.unit,
        COALESCE(n.per_unit, 'per_100g') as per_unit
      FROM recipe_items ri
      JOIN ingredients i ON ri.ingredient_id = i.id
      LEFT JOIN nutrition n ON i.id = n.ingredient_id
      WHERE ri.recipe_id = ?
    `).all(req.params.recipeId);

    let totalCalories = 0, totalProtein = 0, totalFat = 0, totalCarbs = 0;
    let hasData = false;

    items.forEach(item => {
      if (item.calories != null) {
        hasData = true;
        // Nutrition is per 100g, recipe quantity is in the ingredient's unit
        // Assume quantities in kg for kg items, L for L items, and per-piece for pcs
        const qtyInGrams = item.unit === 'kg' ? item.quantity * 1000 
          : item.unit === 'L' ? item.quantity * 1000 
          : item.unit === 'g' ? item.quantity
          : item.quantity * 100; // pcs/packs: assume ~100g per unit

        const factor = qtyInGrams / 100; // nutrition is per 100g
        totalCalories += (item.calories || 0) * factor;
        totalProtein += (item.protein || 0) * factor;
        totalFat += (item.fat || 0) * factor;
        totalCarbs += (item.carbs || 0) * factor;
      }
    });

    // Per serving
    const yieldQty = recipe.yield_qty || 1;
    res.json({
      recipe_id: recipe.id,
      recipe_name: recipe.name,
      has_nutrition_data: hasData,
      total: {
        calories: Math.round(totalCalories),
        protein: Math.round(totalProtein * 10) / 10,
        fat: Math.round(totalFat * 10) / 10,
        carbs: Math.round(totalCarbs * 10) / 10,
      },
      per_serving: {
        calories: Math.round(totalCalories / yieldQty),
        protein: Math.round(totalProtein / yieldQty * 10) / 10,
        fat: Math.round(totalFat / yieldQty * 10) / 10,
        carbs: Math.round(totalCarbs / yieldQty * 10) / 10,
      },
      items: items.map(i => ({
        name: i.ingredient_name,
        quantity: i.quantity,
        unit: i.unit,
        calories: i.calories,
        protein: i.protein,
        fat: i.fat,
        carbs: i.carbs,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/nutrition/:ingredientId — Upsert nutrition for an ingredient
router.put('/:ingredientId', authenticate, authorize('owner', 'manager', 'head_chef'), (req, res) => {
  try {
    const { calories, protein, fat, carbs, per_unit } = req.body;
    const db = getDb();

    const existing = db.prepare('SELECT * FROM nutrition WHERE ingredient_id = ?').get(req.params.ingredientId);

    if (existing) {
      db.prepare(`
        UPDATE nutrition SET 
          calories = COALESCE(?, calories),
          protein = COALESCE(?, protein),
          fat = COALESCE(?, fat),
          carbs = COALESCE(?, carbs),
          per_unit = COALESCE(?, per_unit)
        WHERE ingredient_id = ?
      `).run(
        calories != null ? calories : null,
        protein != null ? protein : null,
        fat != null ? fat : null,
        carbs != null ? carbs : null,
        per_unit || null,
        req.params.ingredientId
      );
    } else {
      db.prepare(`
        INSERT INTO nutrition (ingredient_id, calories, protein, fat, carbs, per_unit)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        req.params.ingredientId,
        calories || 0,
        protein || 0,
        fat || 0,
        carbs || 0,
        per_unit || 'per_100g'
      );
    }

    const updated = db.prepare('SELECT * FROM nutrition WHERE ingredient_id = ?').get(req.params.ingredientId);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/nutrition/:ingredientId
router.delete('/:ingredientId', authenticate, authorize('owner', 'manager'), (req, res) => {
  try {
    const db = getDb();
    db.prepare('DELETE FROM nutrition WHERE ingredient_id = ?').run(req.params.ingredientId);
    res.json({ message: 'Nutrition data deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/nutrition/allergens — Allergen summary for all recipes
router.get('/allergens', authenticate, (req, res) => {
  try {
    const db = getDb();
    const recipes = db.prepare(`
      SELECT 
        r.id, r.name, r.category, r.menu_price,
        GROUP_CONCAT(DISTINCT i.allergens) as all_allergens
      FROM recipes r
      JOIN recipe_items ri ON r.id = ri.recipe_id
      JOIN ingredients i ON ri.ingredient_id = i.id
      GROUP BY r.id
      ORDER BY r.name
    `).all();

    const result = recipes.map(r => {
      let allergenSet = new Set();
      try {
        // Parse each ingredient's allergens JSON array
        const allergenStrs = r.all_allergens?.split('},') || [];
        // Actually, allergens is stored as a JSON string per ingredient, we need to parse them
      } catch {}

      // Better approach: get allergens per ingredient
      const items = db.prepare(`
        SELECT i.allergens
        FROM recipe_items ri
        JOIN ingredients i ON ri.ingredient_id = i.id
        WHERE ri.recipe_id = ?
      `).all(r.id);

      const allergens = new Set();
      items.forEach(item => {
        try {
          const arr = JSON.parse(item.allergens || '[]');
          arr.forEach(a => allergens.add(a));
        } catch {}
      });

      return {
        id: r.id,
        name: r.name,
        category: r.category,
        menu_price: r.menu_price,
        allergens: [...allergens],
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
