// MACCAN RMS - Rich Order Seed (30 days, 200+ orders)
process.env.NO_AUTO_SAVE = '1';
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { initDb, getDb, saveDb, closeDb } = require('./connection');

async function seedRichOrders() {
  const db = await initDb();
  console.log('📊 Seeding rich order data (30 days)...');

  db.prepare('DELETE FROM order_items').run();
  db.prepare('DELETE FROM orders').run();
  db.prepare("DELETE FROM sqlite_sequence WHERE name IN ('orders','order_items')").run();

  const recipes = db.prepare('SELECT id, category FROM recipes').all();
  const recipeIds = recipes.map(r => r.id);
  const starterIds = recipes.filter(r => r.category === 'starter').map(r => r.id);
  const mainIds = recipes.filter(r => r.category === 'main').map(r => r.id);
  const tables = db.prepare('SELECT id, label FROM tables').all();
  const serverIds = db.prepare("SELECT id FROM users WHERE role='server'").all().map(s => s.id);
  if (serverIds.length === 0) serverIds.push(4);

  const popularMain = [2, 3, 8, 5, 9, 10];
  const notes = ['', '', '', '', '', '', 'Extra rice', 'No lemon', 'Medium rare', 'Extra bread', 'Extra saffron', 'No onions', 'Spicy', 'Extra salad'];

  const insertOrder = db.prepare('INSERT INTO orders (table_id, server_id, status, created_at) VALUES (?, ?, ?, ?)');
  const insertItem = db.prepare('INSERT INTO order_items (order_id, recipe_id, quantity, notes, status) VALUES (?, ?, ?, ?, ?)');

  // Time slots: hour -> probability weight
  const hours = {
    6: 2, 7: 5, 8: 7, 9: 4, 10: 3, 11: 7, 12: 10, 13: 9, 14: 5,
    15: 2, 16: 2, 17: 5, 18: 8, 19: 10, 20: 9, 21: 6, 22: 2
  };

  const now = new Date();
  let orderId = 0;

  for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
    const day = new Date(now);
    day.setDate(day.getDate() - dayOffset);
    const dayOfWeek = day.getDay();
    const isWeekend = dayOfWeek === 4 || dayOfWeek === 5; // Thu-Fri
    const weekendMult = isWeekend ? 1.4 : 1.0;

    for (const [hourStr, weight] of Object.entries(hours)) {
      const hour = parseInt(hourStr);
      const adjustedWeight = weight * weekendMult;
      const numOrders = Math.random() * 10 < adjustedWeight ? (Math.random() < 0.3 ? 2 : 1) : 0;

      for (let o = 0; o < numOrders; o++) {
        const minute = Math.floor(Math.random() * 60);
        const orderDate = new Date(day);
        orderDate.setHours(hour, minute, 0, 0);

        const table = tables[Math.floor(Math.random() * tables.length)];
        const serverId = serverIds[Math.floor(Math.random() * serverIds.length)];

        insertOrder.run(table.id, serverId, 'closed', orderDate.toISOString());
        orderId++;

        // 1-4 items per order
        const numItems = 1 + Math.floor(Math.random() * 3);
        const usedRecipes = new Set();

        for (let i = 0; i < numItems; i++) {
          let recipeId;
          let attempts = 0;
          do {
            recipeId = Math.random() < 0.6
              ? popularMain[Math.floor(Math.random() * popularMain.length)]
              : (hour >= 6 && hour <= 9
                ? starterIds[Math.floor(Math.random() * starterIds.length)]
                : recipeIds[Math.floor(Math.random() * recipeIds.length)]);
            attempts++;
          } while (usedRecipes.has(recipeId) && attempts < 10);
          if (usedRecipes.has(recipeId)) continue;
          usedRecipes.add(recipeId);

          const qty = 1 + Math.floor(Math.random() * 2);
          const note = notes[Math.floor(Math.random() * notes.length)];
          insertItem.run(orderId, recipeId, qty, note, 'delivered');
        }
      }
    }
  }

  console.log(`✅ ${orderId} orders seeded across 30 days`);

  // Print distribution
  const dist = db.prepare(`
    SELECT strftime('%H', created_at) as hour, COUNT(*) as cnt
    FROM orders GROUP BY hour ORDER BY hour
  `).all();
  console.log('\n📊 Orders by hour:');
  dist.forEach(d => {
    const bar = '█'.repeat(Math.round(d.cnt / 2));
    console.log(`  ${d.hour}:00  ${bar} (${d.cnt})`);
  });

  const totalItems = db.prepare('SELECT COUNT(*) as c FROM order_items').get();
  console.log(`\n📋 Total order items: ${totalItems.c}`);

  saveDb();
  closeDb();
  process.exit(0);
}

seedRichOrders().catch(err => { console.error('❌ Failed:', err); process.exit(1); });
