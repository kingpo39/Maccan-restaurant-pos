// MACCAN RMS - Recipes Routes + Cost Engine

const express = require('express');
const { getDb } = require('../db/connection');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Cost Engine: Calculate cost per serving
function calculateRecipeCost(db, recipeId) {
  const recipe = db.prepare('SELECT * FROM recipes WHERE id = ?').get(recipeId);
  if (!recipe) return null;

  const items = db.prepare(`
    SELECT ri.*, i.cost_per_unit, i.unit as ingredient_unit, i.name as ingredient_name
    FROM recipe_items ri
    JOIN ingredients i ON ri.ingredient_id = i.id
    WHERE ri.recipe_id = ?
  `).all(recipeId);

  let totalCost = 0;
  const itemDetails = [];

  items.forEach(item => {
    const lineCost = item.quantity * item.cost_per_unit;
    totalCost += lineCost;
    itemDetails.push({
      id: item.id,
      ingredient_id: item.ingredient_id,
      ingredient_name: item.ingredient_name,
      quantity: item.quantity,
      unit: item.ingredient_unit,
      cost_per_unit: item.cost_per_unit,
      line_cost: lineCost
    });
  });

  // Apply waste factor
  const adjustedCost = totalCost * recipe.waste_factor;
  
  // Cost per serving
  const costPerServing = recipe.yield_qty > 0 
    ? adjustedCost / recipe.yield_qty 
    : adjustedCost;

  // Food cost percentage
  const foodCostPercent = recipe.menu_price > 0 
    ? (costPerServing / recipe.menu_price) * 100 
    : 0;

  return {
    recipe_id: recipe.id,
    raw_cost: totalCost,
    waste_factor: recipe.waste_factor,
    adjusted_cost: adjustedCost,
    yield_qty: recipe.yield_qty,
    cost_per_serving: Math.round(costPerServing),
    menu_price: recipe.menu_price,
    food_cost_percent: Math.round(foodCostPercent * 10) / 10,
    profit: recipe.menu_price - costPerServing,
    items: itemDetails
  };
}

// GET /api/recipes - List all recipes with costs
router.get('/', authenticate, (req, res) => {
  try {
    const db = getDb();
    const { category, search } = req.query;
    
    let query = 'SELECT * FROM recipes';
    const params = [];
    const conditions = [];

    if (category) {
      conditions.push('category = ?');
      params.push(category);
    }
    if (search) {
      conditions.push('(name LIKE ? OR description LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY name ASC';
    
    const recipes = db.prepare(query).all(...params);

    // Calculate costs for each recipe
    const recipesWithCosts = recipes.map(recipe => {
      const costData = calculateRecipeCost(db, recipe.id);
      return {
        ...recipe,
        cost_analysis: costData
      };
    });

    res.json(recipesWithCosts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/recipes/:id - Get recipe with full cost breakdown
router.get('/:id', authenticate, (req, res) => {
  try {
    const db = getDb();
    const recipe = db.prepare('SELECT * FROM recipes WHERE id = ?').get(req.params.id);

    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found.' });
    }

    const costData = calculateRecipeCost(db, recipe.id);

    res.json({
      ...recipe,
      cost_analysis: costData
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/recipes
router.post('/', authenticate, authorize('owner', 'manager', 'head_chef'), (req, res) => {
  try {
    const { name, description, category, yield_qty, waste_factor, menu_price, items } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Recipe name is required.' });
    }

    const db = getDb();
    
    const result = db.prepare(`
      INSERT INTO recipes (name, description, category, yield_qty, waste_factor, menu_price)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      name,
      description || '',
      category || 'main',
      yield_qty || 1,
      waste_factor || 1.0,
      menu_price || 0
    );

    const recipeId = result.lastInsertRowid;

    // Insert recipe items if provided
    if (items && Array.isArray(items)) {
      const insertItem = db.prepare(
        'INSERT INTO recipe_items (recipe_id, ingredient_id, quantity) VALUES (?, ?, ?)'
      );
      
      items.forEach(item => {
        insertItem.run(recipeId, item.ingredient_id, item.quantity);
      });
    }

    const recipe = db.prepare('SELECT * FROM recipes WHERE id = ?').get(recipeId);
    const costData = calculateRecipeCost(db, recipeId);

    res.status(201).json({
      ...recipe,
      cost_analysis: costData
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/recipes/:id
router.put('/:id', authenticate, authorize('owner', 'manager', 'head_chef'), (req, res) => {
  try {
    const { name, description, category, yield_qty, waste_factor, menu_price } = req.body;
    const db = getDb();

    const existing = db.prepare('SELECT * FROM recipes WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Recipe not found.' });
    }

    db.prepare(`
      UPDATE recipes SET 
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        category = COALESCE(?, category),
        yield_qty = COALESCE(?, yield_qty),
        waste_factor = COALESCE(?, waste_factor),
        menu_price = COALESCE(?, menu_price)
      WHERE id = ?
    `).run(
      name || null,
      description != null ? description : null,
      category || null,
      yield_qty != null ? yield_qty : null,
      waste_factor != null ? waste_factor : null,
      menu_price != null ? menu_price : null,
      req.params.id
    );

    const updated = db.prepare('SELECT * FROM recipes WHERE id = ?').get(req.params.id);
    const costData = calculateRecipeCost(db, parseInt(req.params.id));

    res.json({
      ...updated,
      cost_analysis: costData
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/recipes/:id
router.delete('/:id', authenticate, authorize('owner', 'manager'), (req, res) => {
  try {
    const db = getDb();
    const result = db.prepare('DELETE FROM recipes WHERE id = ?').run(req.params.id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Recipe not found.' });
    }

    res.json({ message: 'Recipe deleted.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/recipes/:id/items - Add item to recipe
router.post('/:id/items', authenticate, authorize('owner', 'manager', 'head_chef'), (req, res) => {
  try {
    const { ingredient_id, quantity } = req.body;
    const db = getDb();

    if (!ingredient_id || !quantity) {
      return res.status(400).json({ error: 'ingredient_id and quantity required.' });
    }

    const recipe = db.prepare('SELECT * FROM recipes WHERE id = ?').get(req.params.id);
    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found.' });
    }

    const result = db.prepare(
      'INSERT INTO recipe_items (recipe_id, ingredient_id, quantity) VALUES (?, ?, ?)'
    ).run(req.params.id, ingredient_id, quantity);

    const costData = calculateRecipeCost(db, parseInt(req.params.id));
    res.status(201).json(costData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/recipes/:recipeId/items/:itemId
router.delete('/:recipeId/items/:itemId', authenticate, authorize('owner', 'manager', 'head_chef'), (req, res) => {
  try {
    const db = getDb();
    db.prepare('DELETE FROM recipe_items WHERE id = ? AND recipe_id = ?').run(
      req.params.itemId, 
      req.params.recipeId
    );

    const costData = calculateRecipeCost(db, parseInt(req.params.recipeId));
    res.json(costData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/recipes/:id/cost - Get detailed cost breakdown
router.get('/:id/cost', authenticate, (req, res) => {
  try {
    const db = getDb();
    const costData = calculateRecipeCost(db, parseInt(req.params.id));
    
    if (!costData) {
      return res.status(404).json({ error: 'Recipe not found.' });
    }

    res.json(costData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
