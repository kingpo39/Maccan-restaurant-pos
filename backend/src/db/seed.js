// MACCAN RMS - Seed Demo Data
// Run: node src/db/seed.js

process.env.NO_AUTO_SAVE = '1';
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { initDb, getDb, saveDb, closeDb } = require('./connection');
const bcrypt = require('bcryptjs');

async function seed() {
  const db = await initDb();

  console.log('🌱 Seeding demo data...');

  // Disable foreign keys for re-seeding
  db.exec('PRAGMA foreign_keys = OFF');

  // Clear all data in correct order
  db.exec('DELETE FROM order_items');
  db.exec('DELETE FROM orders');
  db.exec('DELETE FROM recipe_items');
  db.exec('DELETE FROM inventory_log');
  db.exec('DELETE FROM nutrition');
  db.exec('DELETE FROM recipes');
  db.exec('DELETE FROM ingredients');
  db.exec('DELETE FROM suppliers');
  db.exec('DELETE FROM tables');
  db.exec('DELETE FROM users');

  // Re-enable foreign keys
  db.exec('PRAGMA foreign_keys = ON');

  // Reset auto-increment
  db.exec("DELETE FROM sqlite_sequence");

  // --- 1. Users ---
  const passwordHash = bcrypt.hashSync('admin123', 10);
  const staffHash = bcrypt.hashSync('staff123', 10);

  db.prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)').run('Owner Admin', 'admin@maccan.com', passwordHash, 'owner');
  db.prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)').run('Sara Manager', 'sara@maccan.com', staffHash, 'manager');
  db.prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)').run('Chef Reza', 'reza@maccan.com', staffHash, 'head_chef');
  db.prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)').run('Ali Server', 'ali@maccan.com', staffHash, 'server');
  db.prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)').run('Mina Inventory', 'mina@maccan.com', staffHash, 'inventory');
  console.log('✅ Users seeded');

  // --- 2. Suppliers ---
  db.prepare('INSERT INTO suppliers (name, contact, payment_terms) VALUES (?, ?, ?)').run('Laleh Fish Market', '+98 911 123 4567', 'Cash on delivery');
  db.prepare('INSERT INTO suppliers (name, contact, payment_terms) VALUES (?, ?, ?)').run('Tehran Fresh Produce', '+98 912 234 5678', 'Net 7 days');
  db.prepare('INSERT INTO suppliers (name, contact, payment_terms) VALUES (?, ?, ?)').run('Mazandaran Dairy', '+98 913 345 6789', 'Net 14 days');
  db.prepare('INSERT INTO suppliers (name, contact, payment_terms) VALUES (?, ?, ?)').run('Spice World Iran', '+98 914 456 7890', 'Cash on delivery');
  db.prepare('INSERT INTO suppliers (name, contact, payment_terms) VALUES (?, ?, ?)').run('Local Bread Bakery', '+98 915 567 8901', 'Daily credit');
  console.log('✅ Suppliers seeded');

  // --- 3. Ingredients ---
  const ingredients = [
    ['Salmon Fillet', 'kg', 380000, 1, '["fish"]'],
    ['Chicken Breast', 'kg', 180000, 2, '[]'],
    ['Ground Lamb', 'kg', 320000, 2, '[]'],
    ['Shrimp (Large)', 'kg', 450000, 1, '["shellfish"]'],
    ['Beef Tenderloin', 'kg', 550000, 2, '[]'],
    ['Eggs', 'pcs', 8000, 3, '["eggs"]'],
    ['Butter', 'kg', 280000, 3, '["dairy"]'],
    ['Cream', 'L', 120000, 3, '["dairy"]'],
    ['Feta Cheese', 'kg', 180000, 3, '["dairy"]'],
    ['Yogurt', 'kg', 60000, 3, '["dairy"]'],
    ['Tomatoes', 'kg', 45000, 2, '[]'],
    ['Onions', 'kg', 25000, 2, '[]'],
    ['Garlic', 'kg', 80000, 2, '[]'],
    ['Bell Peppers', 'kg', 65000, 2, '[]'],
    ['Lettuce', 'kg', 35000, 2, '[]'],
    ['Cucumbers', 'kg', 30000, 2, '[]'],
    ['Potatoes', 'kg', 28000, 2, '[]'],
    ['Mushrooms', 'kg', 95000, 2, '[]'],
    ['Spinach', 'kg', 40000, 2, '[]'],
    ['Fresh Herbs (Mixed)', 'kg', 120000, 2, '[]'],
    ['Rice (Basmati)', 'kg', 85000, 4, '[]'],
    ['Olive Oil', 'L', 250000, 4, '[]'],
    ['Sunflower Oil', 'L', 80000, 4, '[]'],
    ['Flour', 'kg', 25000, 4, '["gluten"]'],
    ['Sugar', 'kg', 35000, 4, '[]'],
    ['Salt', 'kg', 12000, 4, '[]'],
    ['Black Pepper', 'kg', 180000, 4, '[]'],
    ['Cumin', 'kg', 150000, 4, '[]'],
    ['Turmeric', 'kg', 120000, 4, '[]'],
    ['Saffron', 'kg', 35000000, 4, '[]'],
    ['Lemon Juice', 'L', 90000, 4, '[]'],
    ['Tomato Paste', 'kg', 65000, 4, '[]'],
    ['Naan Bread', 'pcs', 15000, 5, '["gluten"]'],
    ['Barbari Bread', 'pcs', 12000, 5, '["gluten"]'],
  ];

  const insIng = db.prepare('INSERT INTO ingredients (name, unit, cost_per_unit, supplier_id, allergens) VALUES (?, ?, ?, ?, ?)');
  ingredients.forEach(ing => insIng.run(...ing));
  console.log(`✅ ${ingredients.length} ingredients seeded`);

  // --- 4. Recipes ---
  const recipes = [
    ['Grilled Salmon', 'Fresh salmon with herbs and lemon butter', 'main', 1, 1.15, 850000],
    ['Chicken Kabab', 'Marinated chicken breast skewers with rice', 'main', 1, 1.10, 520000],
    ['Lamb Kebab Koobideh', 'Traditional ground lamb kebab', 'main', 1, 1.10, 580000],
    ['Shrimp Polo', 'Shrimp with saffron rice', 'main', 1, 1.12, 720000],
    ['Steak Tenderloin', 'Grilled beef tenderloin with mushroom sauce', 'main', 1, 1.18, 950000],
    ['Fattoush Salad', 'Fresh garden salad with crispy bread', 'starter', 4, 1.05, 280000],
    ['Mirza Ghasemi', 'Smoky eggplant with tomato and egg', 'starter', 4, 1.08, 320000],
    ['Ghormeh Sabzi', 'Herb stew with lamb and kidney beans', 'main', 4, 1.10, 680000],
    ['Zereshk Polo', 'Barberry rice with saffron chicken', 'main', 4, 1.08, 620000],
    ['Baghali Polo', 'Dill and fava bean rice with lamb', 'main', 4, 1.10, 640000],
    ['Cream Soup', 'Forest mushroom cream soup', 'starter', 6, 1.05, 350000],
    ['Caesar Salad', 'Classic Caesar with grilled chicken', 'starter', 4, 1.08, 380000],
  ];

  const insRec = db.prepare('INSERT INTO recipes (name, description, category, yield_qty, waste_factor, menu_price) VALUES (?, ?, ?, ?, ?, ?)');
  recipes.forEach(r => insRec.run(...r));
  console.log(`✅ ${recipes.length} recipes seeded`);

  // --- 5. Recipe Items ---
  const insRI = db.prepare('INSERT INTO recipe_items (recipe_id, ingredient_id, quantity) VALUES (?, ?, ?)');

  insRI.run(1, 1, 0.35); insRI.run(1, 22, 0.03); insRI.run(1, 31, 0.005);
  insRI.run(1, 20, 0.02); insRI.run(1, 30, 0.03); insRI.run(1, 25, 0.01);
  insRI.run(2, 2, 0.30); insRI.run(2, 21, 0.20); insRI.run(2, 12, 0.05);
  insRI.run(2, 31, 0.003); insRI.run(2, 23, 0.02); insRI.run(2, 20, 0.01);
  insRI.run(3, 3, 0.35); insRI.run(3, 12, 0.08); insRI.run(3, 24, 0.03);
  insRI.run(3, 28, 0.005); insRI.run(3, 25, 0.01); insRI.run(3, 34, 1);
  insRI.run(4, 4, 0.30); insRI.run(4, 21, 0.25); insRI.run(4, 31, 0.005);
  insRI.run(4, 22, 0.02); insRI.run(4, 13, 0.02);
  insRI.run(5, 5, 0.30); insRI.run(5, 18, 0.10); insRI.run(5, 7, 0.03);
  insRI.run(5, 8, 0.05); insRI.run(5, 17, 0.15); insRI.run(5, 27, 0.005);
  insRI.run(6, 15, 0.15); insRI.run(6, 11, 0.10); insRI.run(6, 16, 0.10);
  insRI.run(6, 14, 0.05); insRI.run(6, 33, 2); insRI.run(6, 22, 0.03);
  insRI.run(6, 30, 0.03);
  insRI.run(7, 11, 0.30); insRI.run(7, 13, 0.03); insRI.run(7, 6, 4);
  insRI.run(7, 22, 0.03); insRI.run(7, 29, 0.003); insRI.run(7, 25, 0.01);
  insRI.run(8, 3, 0.25); insRI.run(8, 20, 0.30); insRI.run(8, 32, 0.05);
  insRI.run(8, 12, 0.10); insRI.run(8, 21, 0.20); insRI.run(8, 26, 0.005);
  insRI.run(9, 2, 0.30); insRI.run(9, 21, 0.30); insRI.run(9, 31, 0.005);
  insRI.run(9, 22, 0.03);
  insRI.run(10, 3, 0.30); insRI.run(10, 21, 0.30); insRI.run(10, 20, 0.05);
  insRI.run(10, 22, 0.03);
  insRI.run(11, 18, 0.25); insRI.run(11, 8, 0.20); insRI.run(11, 7, 0.05);
  insRI.run(11, 12, 0.05); insRI.run(11, 24, 0.03); insRI.run(11, 25, 0.01);
  insRI.run(12, 2, 0.20); insRI.run(12, 15, 0.20); insRI.run(12, 9, 0.05);
  insRI.run(12, 6, 1); insRI.run(12, 22, 0.02);
  console.log('✅ Recipe items seeded');

  // --- 6. Tables ---
  const insTbl = db.prepare('INSERT INTO tables (label, capacity, status) VALUES (?, ?, ?)');
  const tables = [['T1',2],['T2',4],['T3',4],['T4',4],['T5',6],['T6',6],['T7',8],['T8',10],['VIP-1',4],['VIP-2',6],['Garden-1',4],['Garden-2',8]];
  tables.forEach(([l,c]) => insTbl.run(l, c, 'free'));
  console.log('✅ Tables seeded');

  // --- 7. Sample Orders ---
  const insOrd = db.prepare('INSERT INTO orders (table_id, server_id, status, created_at) VALUES (?, ?, ?, ?)');
  const insOI = db.prepare('INSERT INTO order_items (order_id, recipe_id, quantity, notes, status) VALUES (?, ?, ?, ?, ?)');
  const today = new Date().toISOString();

  insOrd.run(1, 4, 'closed', today);
  insOI.run(1, 1, 2, 'No lemon', 'delivered');
  insOI.run(1, 6, 1, '', 'delivered');

  insOrd.run(2, 4, 'served', today);
  insOI.run(2, 3, 3, 'Extra bread', 'delivered');
  insOI.run(2, 8, 1, '', 'delivered');

  insOrd.run(3, 4, 'in_progress', today);
  insOI.run(3, 5, 1, 'Medium rare', 'preparing');
  insOI.run(3, 11, 1, '', 'ready');
  insOI.run(3, 12, 1, '', 'pending');

  insOrd.run(4, 4, 'open', today);
  insOI.run(4, 2, 2, '', 'pending');
  insOI.run(4, 4, 1, 'Extra saffron', 'pending');
  console.log('✅ Sample orders seeded');

  saveDb();
  console.log('\n🎉 Seed complete!');
  console.log('   Login: admin@maccan.com / admin123');
  console.log('   Staff: ali@maccan.com / staff123');

  closeDb();
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
