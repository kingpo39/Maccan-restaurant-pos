// Seed additional orders for analytics
process.env.NO_AUTO_SAVE = '1';
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { initDb, getDb, saveDb, closeDb } = require('./connection');

async function seedOrders() {
  const db = await initDb();
  console.log('📊 Seeding additional orders for analytics...');

  const today = new Date();
  const dates = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString());
  }

  // Recipe IDs and their typical prices
  const recipes = db.prepare('SELECT id, menu_price FROM recipes').all();
  const recipeMap = {};
  recipes.forEach(r => { recipeMap[r.id] = r.menu_price; });

  const servers = [4]; // Ali Server
  const tables = db.prepare('SELECT id FROM tables').all().map(t => t.id);

  let orderId = 1;
  const insertOrder = db.prepare('INSERT INTO orders (table_id, server_id, status, created_at) VALUES (?, ?, ?, ?)');
  const insertItem = db.prepare('INSERT INTO order_items (order_id, recipe_id, quantity, notes, status) VALUES (?, ?, ?, ?, ?)');

  // Create 60 orders spread across 14 days
  for (let day = 0; day < 14; day++) {
    const ordersPerDay = day === 0 ? 8 : day < 5 ? 4 : 3; // more recent = more orders
    for (let o = 0; o < ordersPerDay; o++) {
      const tableId = tables[Math.floor(Math.random() * tables.length)];
      const serverId = servers[0];
      const date = dates[day];
      const status = 'closed';

      insertOrder.run(tableId, serverId, status, date);

      // 1-3 items per order
      const numItems = 1 + Math.floor(Math.random() * 3);
      const usedRecipes = new Set();
      for (let i = 0; i < numItems; i++) {
        let recipeId;
        do {
          recipeId = 1 + Math.floor(Math.random() * recipes.length);
        } while (usedRecipes.has(recipeId));
        usedRecipes.add(recipeId);

        const qty = 1 + Math.floor(Math.random() * 2);
        insertItem.run(orderId, recipeId, qty, '', 'delivered');
      }
      orderId++;
    }
  }

  console.log(`✅ ${orderId - 1} orders seeded across 14 days`);

  saveDb();
  closeDb();
  process.exit(0);
}

seedOrders().catch(err => {
  console.error('❌ Failed:', err);
  process.exit(1);
});
