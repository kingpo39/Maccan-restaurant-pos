process.env.NO_AUTO_SAVE = '1';
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { initDb, getDb, saveDb, closeDb } = require('./connection');

async function seedNutrition() {
  const db = await initDb();
  console.log('🥗 Seeding nutrition data...');

  // Nutrition per 100g (realistic Iranian food values)
  const nutritionData = {
    'Salmon Fillet':     { calories: 208, protein: 20.4, fat: 13.4, carbs: 0 },
    'Chicken Breast':    { calories: 165, protein: 31.0, fat: 3.6, carbs: 0 },
    'Ground Lamb':       { calories: 282, protein: 17.3, fat: 23.4, carbs: 0 },
    'Shrimp (Large)':    { calories: 99,  protein: 20.9, fat: 1.7, carbs: 0.2 },
    'Beef Tenderloin':   { calories: 217, protein: 26.1, fat: 11.8, carbs: 0 },
    'Eggs':              { calories: 155, protein: 12.6, fat: 10.6, carbs: 1.1 },
    'Butter':            { calories: 717, protein: 0.9, fat: 81.1, carbs: 0.1 },
    'Cream':             { calories: 340, protein: 2.1, fat: 36.1, carbs: 2.8 },
    'Feta Cheese':       { calories: 264, protein: 14.2, fat: 21.3, carbs: 4.1 },
    'Yogurt':            { calories: 59,  protein: 10.0, fat: 0.7, carbs: 3.6 },
    'Tomatoes':          { calories: 18,  protein: 0.9, fat: 0.2, carbs: 3.9 },
    'Onions':            { calories: 40,  protein: 1.1, fat: 0.1, carbs: 9.3 },
    'Garlic':            { calories: 149, protein: 6.4, fat: 0.5, carbs: 33.1 },
    'Bell Peppers':      { calories: 31,  protein: 1.0, fat: 0.3, carbs: 6.0 },
    'Lettuce':           { calories: 15,  protein: 1.4, fat: 0.2, carbs: 2.9 },
    'Cucumbers':         { calories: 15,  protein: 0.7, fat: 0.1, carbs: 3.6 },
    'Potatoes':          { calories: 77,  protein: 2.0, fat: 0.1, carbs: 17.5 },
    'Mushrooms':         { calories: 22,  protein: 3.1, fat: 0.3, carbs: 3.3 },
    'Spinach':           { calories: 23,  protein: 2.9, fat: 0.4, carbs: 3.6 },
    'Fresh Herbs (Mixed)':{ calories: 25, protein: 2.1, fat: 0.5, carbs: 4.2 },
    'Rice (Basmati)':    { calories: 130, protein: 2.7, fat: 0.3, carbs: 28.2 },
    'Olive Oil':         { calories: 884, protein: 0, fat: 100, carbs: 0 },
    'Sunflower Oil':     { calories: 884, protein: 0, fat: 100, carbs: 0 },
    'Flour':             { calories: 364, protein: 10.3, fat: 1.0, carbs: 76.3 },
    'Sugar':             { calories: 387, protein: 0, fat: 0, carbs: 100 },
    'Salt':              { calories: 0, protein: 0, fat: 0, carbs: 0 },
    'Black Pepper':      { calories: 251, protein: 10.4, fat: 3.3, carbs: 63.9 },
    'Cumin':             { calories: 375, protein: 17.8, fat: 22.3, carbs: 44.2 },
    'Turmeric':          { calories: 354, protein: 7.8, fat: 9.9, carbs: 64.9 },
    'Saffron':           { calories: 310, protein: 11.4, fat: 5.9, carbs: 65.4 },
    'Lemon Juice':       { calories: 22,  protein: 0.4, fat: 0.2, carbs: 6.9 },
    'Tomato Paste':      { calories: 82,  protein: 4.3, fat: 0.5, carbs: 18.9 },
    'Naan Bread':        { calories: 250, protein: 8.1, fat: 3.7, carbs: 46.8 },
    'Barbari Bread':     { calories: 260, protein: 8.5, fat: 3.2, carbs: 49.0 },
  };

  const upsert = db.prepare(`
    INSERT OR REPLACE INTO nutrition (ingredient_id, calories, protein, fat, carbs, per_unit)
    VALUES (?, ?, ?, ?, ?, 'per_100g')
  `);

  const ingredients = db.prepare('SELECT id, name FROM ingredients').all();
  let count = 0;

  ingredients.forEach(ing => {
    const data = nutritionData[ing.name];
    if (data) {
      upsert.run(ing.id, data.calories, data.protein, data.fat, data.carbs);
      count++;
    }
  });

  console.log(`✅ Nutrition data seeded for ${count} ingredients`);
  saveDb();
  closeDb();
  process.exit(0);
}

seedNutrition().catch(err => {
  console.error('❌ Failed:', err);
  process.exit(1);
});
