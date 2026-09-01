// MACCAN RMS - Ingredients Routes

const express = require('express');
const { getDb } = require('../db/connection');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// GET /api/ingredients - List all ingredients
router.get('/', authenticate, (req, res) => {
  try {
    const db = getDb();
    const { search, supplier_id } = req.query;
    
    let query = `
      SELECT i.*, s.name as supplier_name 
      FROM ingredients i 
      LEFT JOIN suppliers s ON i.supplier_id = s.id
    `;
    const params = [];
    const conditions = [];

    if (search) {
      conditions.push('i.name LIKE ?');
      params.push(`%${search}%`);
    }
    if (supplier_id) {
      conditions.push('i.supplier_id = ?');
      params.push(supplier_id);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY i.name ASC';
    
    const ingredients = db.prepare(query).all(...params);
    
    // Parse allergens JSON
    ingredients.forEach(ing => {
      try { ing.allergens = JSON.parse(ing.allergens || '[]'); }
      catch { ing.allergens = []; }
    });

    res.json(ingredients);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/ingredients/:id
router.get('/:id', authenticate, (req, res) => {
  try {
    const db = getDb();
    const ingredient = db.prepare(`
      SELECT i.*, s.name as supplier_name 
      FROM ingredients i 
      LEFT JOIN suppliers s ON i.supplier_id = s.id
      WHERE i.id = ?
    `).get(req.params.id);

    if (!ingredient) {
      return res.status(404).json({ error: 'Ingredient not found.' });
    }

    try { ingredient.allergens = JSON.parse(ingredient.allergens || '[]'); }
    catch { ingredient.allergens = []; }

    res.json(ingredient);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ingredients
router.post('/', authenticate, authorize('owner', 'manager', 'inventory'), (req, res) => {
  try {
    const { name, unit, cost_per_unit, supplier_id, allergens } = req.body;
    
    if (!name || !unit) {
      return res.status(400).json({ error: 'Name and unit are required.' });
    }

    const db = getDb();
    const result = db.prepare(`
      INSERT INTO ingredients (name, unit, cost_per_unit, supplier_id, allergens)
      VALUES (?, ?, ?, ?, ?)
    `).run(name, unit, cost_per_unit || 0, supplier_id || null, JSON.stringify(allergens || []));

    const ingredient = db.prepare('SELECT * FROM ingredients WHERE id = ?').get(result.lastInsertRowid);
    
    res.status(201).json(ingredient);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/ingredients/:id
router.put('/:id', authenticate, authorize('owner', 'manager', 'inventory'), (req, res) => {
  try {
    const { name, unit, cost_per_unit, supplier_id, allergens } = req.body;
    const db = getDb();

    const existing = db.prepare('SELECT * FROM ingredients WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Ingredient not found.' });
    }

    db.prepare(`
      UPDATE ingredients SET 
        name = COALESCE(?, name),
        unit = COALESCE(?, unit),
        cost_per_unit = COALESCE(?, cost_per_unit),
        supplier_id = COALESCE(?, supplier_id),
        allergens = COALESCE(?, allergens)
      WHERE id = ?
    `).run(
      name || null,
      unit || null,
      cost_per_unit != null ? cost_per_unit : null,
      supplier_id != null ? supplier_id : null,
      allergens ? JSON.stringify(allergens) : null,
      req.params.id
    );

    // Recalculate recipe costs if cost changed
    if (cost_per_unit != null && cost_per_unit !== existing.cost_per_unit) {
      recalculateRecipeCosts(db, parseInt(req.params.id));
    }

    const updated = db.prepare('SELECT * FROM ingredients WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/ingredients/:id
router.delete('/:id', authenticate, authorize('owner', 'manager'), (req, res) => {
  try {
    const db = getDb();
    const result = db.prepare('DELETE FROM ingredients WHERE id = ?').run(req.params.id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Ingredient not found.' });
    }

    res.json({ message: 'Ingredient deleted.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Helper: Recalculate all recipe costs when ingredient cost changes
function recalculateRecipeCosts(db, ingredientId) {
  const affectedRecipes = db.prepare(`
    SELECT DISTINCT recipe_id FROM recipe_items WHERE ingredient_id = ?
  `).all(ingredientId);

  console.log(`♻️ Recalculating costs for ${affectedRecipes.length} recipes...`);
  // Cost recalculation happens dynamically in the recipe GET endpoint
}

module.exports = router;
