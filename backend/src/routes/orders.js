// MACCAN RMS - Orders Routes (Phase 3)
// Full order lifecycle: create → in_progress → ready → served → closed
// WebSocket broadcast on every status change

const express = require('express');
const { getDb } = require('../db/connection');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Will be set by server.js after WebSocket is initialized
let broadcast = () => {};

router.setBroadcast = (fn) => { broadcast = fn; };

// ─── GET /api/tables — List all tables with status ─────────
router.get('/tables', authenticate, (req, res) => {
  try {
    const db = getDb();
    const tables = db.prepare(`
      SELECT t.*,
        (SELECT COUNT(*) FROM orders WHERE table_id = t.id AND status IN ('open','in_progress')) as active_orders
      FROM tables t ORDER BY t.label
    `).all();
    res.json(tables);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── PUT /api/tables/:id — Update table status ─────────────
router.put('/tables/:id', authenticate, authorize('owner', 'manager', 'server'), (req, res) => {
  try {
    const { status } = req.body;
    if (!['free', 'occupied', 'reserved'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    const db = getDb();
    db.prepare('UPDATE tables SET status = ? WHERE id = ?').run(status, req.params.id);
    const table = db.prepare('SELECT * FROM tables WHERE id = ?').get(req.params.id);
    if (!table) return res.status(404).json({ error: 'Table not found' });
    broadcast({ type: 'TABLE_UPDATE', data: table });
    res.json(table);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/orders — Create new order ───────────────────
router.post('/', authenticate, authorize('owner', 'manager', 'server', 'head_chef'), (req, res) => {
  try {
    const { table_id, items } = req.body;
    if (!table_id || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'table_id and items array required' });
    }

    const db = getDb();
    const server_id = req.user.id;

    // Create order
    const orderResult = db.prepare(
      'INSERT INTO orders (table_id, server_id, status) VALUES (?, ?, ?)'
    ).run(table_id, server_id, 'open');
    const orderId = orderResult.lastInsertRowid;

    // Create order items
    const insertItem = db.prepare(
      'INSERT INTO order_items (order_id, recipe_id, quantity, notes, status) VALUES (?, ?, ?, ?, ?)'
    );

    const orderItems = [];
    for (const item of items) {
      const result = insertItem.run(orderId, item.recipe_id, item.quantity || 1, item.notes || '', 'pending');
      orderItems.push({
        id: result.lastInsertRowid,
        order_id: orderId,
        recipe_id: item.recipe_id,
        quantity: item.quantity || 1,
        notes: item.notes || '',
        status: 'pending'
      });
    }

    // Update table status
    db.prepare('UPDATE tables SET status = ? WHERE id = ?').run('occupied', table_id);

    // Get recipe names for broadcast
    const recipes = db.prepare('SELECT id, name, category FROM recipes').all();
    const recipeMap = {};
    recipes.forEach(r => { recipeMap[r.id] = r; });

    const enrichedItems = orderItems.map(item => ({
      ...item,
      recipe_name: recipeMap[item.recipe_id]?.name || 'Unknown',
      recipe_category: recipeMap[item.recipe_id]?.category || '',
    }));

    // Get table label
    const table = db.prepare('SELECT label FROM tables WHERE id = ?').get(table_id);

    const orderData = {
      id: orderId,
      table_id,
      table_label: table?.label || '?',
      server_id,
      status: 'open',
      created_at: new Date().toISOString(),
      items: enrichedItems,
    };

    // Broadcast to KDS
    broadcast({ type: 'NEW_ORDER', data: orderData });

    res.status(201).json(orderData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/orders — List orders (active or all) ──────────
router.get('/', authenticate, (req, res) => {
  try {
    const db = getDb();
    const { status, active } = req.query;

    let query = `
      SELECT o.*, t.label as table_label, u.name as server_name
      FROM orders o
      LEFT JOIN tables t ON o.table_id = t.id
      LEFT JOIN users u ON o.server_id = u.id
    `;
    const params = [];

    if (active === 'true') {
      query += " WHERE o.status IN ('open', 'in_progress', 'ready', 'served')";
    } else if (status) {
      query += ' WHERE o.status = ?';
      params.push(status);
    }

    query += ' ORDER BY o.created_at DESC LIMIT 100';

    const orders = db.prepare(query).all(...params);

    // Attach items to each order
    const getItems = db.prepare(`
      SELECT oi.*, r.name as recipe_name, r.category as recipe_category
      FROM order_items oi
      JOIN recipes r ON oi.recipe_id = r.id
      WHERE oi.order_id = ?
    `);

    for (const order of orders) {
      order.items = getItems.all(order.id);
    }

    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/orders/:id — Get single order with items ──────
router.get('/:id', authenticate, (req, res) => {
  try {
    const db = getDb();
    const order = db.prepare(`
      SELECT o.*, t.label as table_label, u.name as server_name
      FROM orders o
      LEFT JOIN tables t ON o.table_id = t.id
      LEFT JOIN users u ON o.server_id = u.id
      WHERE o.id = ?
    `).get(req.params.id);

    if (!order) return res.status(404).json({ error: 'Order not found' });

    order.items = db.prepare(`
      SELECT oi.*, r.name as recipe_name, r.category as recipe_category
      FROM order_items oi
      JOIN recipes r ON oi.recipe_id = r.id
      WHERE oi.order_id = ?
    `).all(order.id);

    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── PUT /api/orders/:id/status — Update order status ───────
router.put('/:id/status', authenticate, authorize('owner', 'manager', 'server', 'head_chef'), (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['open', 'in_progress', 'ready', 'served', 'closed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const db = getDb();
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, order.id);

    // If closed, free the table
    if (status === 'closed' && order.table_id) {
      db.prepare('UPDATE tables SET status = ? WHERE id = ?').run('free', order.table_id);
    }

    const table = db.prepare('SELECT label FROM tables WHERE id = ?').get(order.table_id);

    const updated = {
      ...order,
      status,
      table_label: table?.label || '?',
    };

    broadcast({ type: 'ORDER_STATUS', data: updated });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── PUT /api/orders/:id/items/:itemId/status — Update item status (KDS) ──
router.put('/:id/items/:itemId/status', authenticate, authorize('owner', 'manager', 'head_chef'), (req, res) => {
  try {
    const { status } = req.body;
    const validItemStatuses = ['pending', 'preparing', 'ready', 'delivered'];
    if (!validItemStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid item status' });
    }

    const db = getDb();
    db.prepare('UPDATE order_items SET status = ? WHERE id = ? AND order_id = ?')
      .run(status, req.params.itemId, req.params.id);

    // Get all items for this order
    const items = db.prepare(`
      SELECT oi.*, r.name as recipe_name
      FROM order_items oi
      JOIN recipes r ON oi.recipe_id = r.id
      WHERE oi.order_id = ?
    `).all(req.params.id);

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    const table = db.prepare('SELECT label FROM tables WHERE id = ?').get(order?.table_id);

    // Auto-update order status based on item statuses
    if (order) {
      const allReady = items.every(i => i.status === 'ready' || i.status === 'delivered');
      const anyPreparing = items.some(i => i.status === 'preparing');
      const allDelivered = items.every(i => i.status === 'delivered');

      let newOrderStatus = order.status;
      if (allDelivered && order.status !== 'closed') newOrderStatus = 'served';
      else if (allReady && order.status === 'in_progress') newOrderStatus = 'ready';
      else if (anyPreparing && order.status === 'open') newOrderStatus = 'in_progress';

      if (newOrderStatus !== order.status) {
        db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(newOrderStatus, order.id);
        order.status = newOrderStatus;
      }
    }

    const data = {
      order_id: parseInt(req.params.id),
      item_id: parseInt(req.params.itemId),
      item_status: status,
      order_status: order?.status,
      table_label: table?.label || '?',
      items,
    };

    broadcast({ type: 'ITEM_STATUS', data });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/orders/:id/add-item — Add item to existing order ──
router.post('/:id/add-item', authenticate, authorize('owner', 'manager', 'server', 'head_chef'), (req, res) => {
  try {
    const { recipe_id, quantity, notes } = req.body;
    if (!recipe_id) return res.status(400).json({ error: 'recipe_id required' });

    const db = getDb();
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const result = db.prepare(
      'INSERT INTO order_items (order_id, recipe_id, quantity, notes, status) VALUES (?, ?, ?, ?, ?)'
    ).run(order.id, recipe_id, quantity || 1, notes || '', 'pending');

    const recipe = db.prepare('SELECT name, category FROM recipes WHERE id = ?').get(recipe_id);
    const table = db.prepare('SELECT label FROM tables WHERE id = ?').get(order.table_id);

    const newItem = {
      id: result.lastInsertRowid,
      order_id: order.id,
      recipe_id,
      quantity: quantity || 1,
      notes: notes || '',
      status: 'pending',
      recipe_name: recipe?.name || 'Unknown',
      recipe_category: recipe?.category || '',
    };

    broadcast({ type: 'NEW_ITEM', data: { ...newItem, table_label: table?.label || '?', order_status: order.status } });
    res.status(201).json(newItem);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
