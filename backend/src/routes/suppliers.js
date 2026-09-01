// MACCAN RMS - Suppliers Routes

const express = require('express');
const { getDb } = require('../db/connection');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// GET /api/suppliers — List all suppliers
router.get('/', authenticate, (req, res) => {
  try {
    const db = getDb();
    const suppliers = db.prepare(`
      SELECT s.*, 
        COUNT(DISTINCT i.id) as ingredient_count
      FROM suppliers s
      LEFT JOIN ingredients i ON i.supplier_id = s.id
      GROUP BY s.id
      ORDER BY s.name ASC
    `).all();
    res.json(suppliers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/suppliers/:id — Get supplier with their ingredients and price history
router.get('/:id', authenticate, (req, res) => {
  try {
    const db = getDb();
    const supplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(req.params.id);
    if (!supplier) return res.status(404).json({ error: 'Supplier not found.' });

    // Get ingredients from this supplier
    const ingredients = db.prepare(`
      SELECT i.* FROM ingredients i WHERE i.supplier_id = ?
    `).all(req.params.id);

    // Get price history for all ingredients from this supplier
    const priceHistory = db.prepare(`
      SELECT 
        il.*,
        i.name as ingredient_name,
        i.unit as ingredient_unit
      FROM inventory_log il
      JOIN ingredients i ON il.ingredient_id = i.id
      WHERE i.supplier_id = ? AND il.cost > 0
      ORDER BY il.created_at DESC
      LIMIT 100
    `).all(req.params.id);

    // Get cost trends per ingredient
    const costTrends = db.prepare(`
      SELECT 
        i.id as ingredient_id,
        i.name as ingredient_name,
        i.unit,
        i.cost_per_unit as current_cost,
        MIN(CASE WHEN il.cost > 0 THEN il.cost END) as min_cost,
        MAX(CASE WHEN il.cost > 0 THEN il.cost END) as max_cost,
        AVG(CASE WHEN il.cost > 0 THEN il.cost END) as avg_cost,
        COUNT(CASE WHEN il.cost > 0 THEN 1 END) as price_updates
      FROM ingredients i
      LEFT JOIN inventory_log il ON i.id = il.ingredient_id
      WHERE i.supplier_id = ?
      GROUP BY i.id
      ORDER BY i.name
    `).all(req.params.id);

    res.json({
      supplier,
      ingredients,
      price_history: priceHistory,
      cost_trends: costTrends
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/suppliers
router.post('/', authenticate, authorize('owner', 'manager'), (req, res) => {
  try {
    const { name, contact, payment_terms } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required.' });

    const db = getDb();
    const result = db.prepare('INSERT INTO suppliers (name, contact, payment_terms) VALUES (?, ?, ?)')
      .run(name, contact || null, payment_terms || null);

    const supplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(supplier);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/suppliers/:id
router.put('/:id', authenticate, authorize('owner', 'manager'), (req, res) => {
  try {
    const { name, contact, payment_terms } = req.body;
    const db = getDb();

    const existing = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Supplier not found.' });

    db.prepare(`
      UPDATE suppliers SET 
        name = COALESCE(?, name),
        contact = COALESCE(?, contact),
        payment_terms = COALESCE(?, payment_terms)
      WHERE id = ?
    `).run(name || null, contact || null, payment_terms || null, req.params.id);

    const updated = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/suppliers/:id
router.delete('/:id', authenticate, authorize('owner', 'manager'), (req, res) => {
  try {
    const db = getDb();
    const result = db.prepare('DELETE FROM suppliers WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Supplier not found.' });
    res.json({ message: 'Supplier deleted.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
