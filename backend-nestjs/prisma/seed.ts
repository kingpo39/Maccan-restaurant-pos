import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding MACCAN RMS database...\n');

  // 1. Create Organization
  const org = await prisma.organization.upsert({
    where: { id: 'org-maccan' },
    update: {},
    create: {
      id: 'org-maccan',
      name: 'MACCAN Group',
      legalName: 'MACCAN Hospitality Ltd.',
    },
  });
  console.log('✅ Organization created');

  // 2. Create Location
  const loc = await prisma.location.upsert({
    where: { id: 'loc-lalimsar' },
    update: {},
    create: {
      id: 'loc-lalimsar',
      organizationId: org.id,
      name: 'لالیم سر، مازندران',
      address: 'لالیم سر، مازندران، ایران',
    },
  });
  console.log('✅ Location created');

  // 3. Create Users
  const salt = await bcrypt.genSalt(10);
  const adminHash = await bcrypt.hash('admin123', salt);
  const staffHash = await bcrypt.hash('staff123', salt);

  const users = [
    {
      id: 'user-admin',
      email: 'admin@maccan.com',
      passwordHash: adminHash,
      firstName: 'Admin',
      lastName: 'Owner',
      role: 'OWNER',
      permissions: JSON.stringify([
        'dashboard:view', 'dashboard:edit',
        'ingredients:view', 'ingredients:create', 'ingredients:edit', 'ingredients:delete',
        'recipes:view', 'recipes:create', 'recipes:edit', 'recipes:delete', 'recipes:pricing',
        'inventory:view', 'inventory:receive', 'inventory:adjust', 'inventory:delete',
        'orders:view', 'orders:create', 'orders:cancel', 'orders:refund',
        'kds:view', 'kds:manage',
        'nutrition:view', 'nutrition:edit',
        'analytics:view', 'analytics:export',
        'suppliers:view', 'suppliers:create', 'suppliers:edit', 'suppliers:delete',
        'users:manage', 'settings:manage',
      ]),
    },
    {
      id: 'user-server',
      email: 'ali@maccan.com',
      passwordHash: staffHash,
      firstName: 'Ali',
      lastName: 'Server',
      role: 'SERVER',
      permissions: JSON.stringify([
        'dashboard:view', 'ingredients:view', 'recipes:view',
        'orders:view', 'orders:create', 'kds:view', 'nutrition:view', 'suppliers:view',
      ]),
    },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { id: u.id },
      update: {},
      create: { ...u, organizationId: org.id, locationId: loc.id },
    });
  }
  console.log('✅ Users created');

  // 4. Create Supplier
  const supplier = await prisma.supplier.upsert({
    where: { id: 'sup-freshfarm' },
    update: {},
    create: {
      id: 'sup-freshfarm',
      organizationId: org.id,
      locationId: loc.id,
      name: 'Fresh Farm Co.',
      code: 'FF-001',
      contactPerson: 'Ahmad',
      paymentTerms: 'NET30',
    },
  });
  console.log('✅ Supplier created');

  // 5. Create Ingredients
  const ingredients = [
    { id: 'ing-chicken', name: 'Chicken Breast', baseUnit: 'kg', costPerUnit: 180000, category: 'PROTEIN' },
    { id: 'ing-lamb', name: 'Lamb Meat', baseUnit: 'kg', costPerUnit: 450000, category: 'PROTEIN' },
    { id: 'ing-rice', name: 'Basmati Rice', baseUnit: 'kg', costPerUnit: 85000, category: 'GRAIN' },
    { id: 'ing-tomato', name: 'Fresh Tomatoes', baseUnit: 'kg', costPerUnit: 35000, category: 'PRODUCE' },
    { id: 'ing-onion', name: 'Onions', baseUnit: 'kg', costPerUnit: 25000, category: 'PRODUCE' },
    { id: 'ing-saffron', name: 'Saffron', baseUnit: 'g', costPerUnit: 120000, category: 'SPICE' },
    { id: 'ing-oil', name: 'Cooking Oil', baseUnit: 'L', costPerUnit: 95000, category: 'PANTRY' },
    { id: 'ing-butter', name: 'Butter', baseUnit: 'kg', costPerUnit: 320000, category: 'DAIRY' },
    { id: 'ing-flour', name: 'All-Purpose Flour', baseUnit: 'kg', costPerUnit: 28000, category: 'GRAIN' },
    { id: 'ing-egg', name: 'Eggs', baseUnit: 'ea', costPerUnit: 12000, category: 'DAIRY' },
  ];

  for (const ing of ingredients) {
    await prisma.ingredient.upsert({
      where: { id: ing.id },
      update: {},
      create: {
        ...ing,
        organizationId: org.id,
        locationId: loc.id,
        supplierId: supplier.id,
      },
    });
  }
  console.log('✅ Ingredients created');

  // 6. Create Stock Balances
  const stocks = [
    { ingredientId: 'ing-chicken', quantity: 25 },
    { ingredientId: 'ing-lamb', quantity: 15 },
    { ingredientId: 'ing-rice', quantity: 50 },
    { ingredientId: 'ing-tomato', quantity: 20 },
    { ingredientId: 'ing-onion', quantity: 30 },
    { ingredientId: 'ing-saffron', quantity: 500 },
    { ingredientId: 'ing-oil', quantity: 20 },
    { ingredientId: 'ing-butter', quantity: 10 },
    { ingredientId: 'ing-flour', quantity: 40 },
    { ingredientId: 'ing-egg', quantity: 200 },
  ];

  for (const s of stocks) {
    await prisma.stockBalance.upsert({
      where: {
        organizationId_locationId_ingredientId: {
          organizationId: org.id,
          locationId: loc.id,
          ingredientId: s.ingredientId,
        },
      },
      update: {},
      create: {
        organizationId: org.id,
        locationId: loc.id,
        ingredientId: s.ingredientId,
        quantity: s.quantity,
      },
    });
  }
  console.log('✅ Stock balances created');

  // 7. Create Recipes
  const recipes = [
    {
      id: 'recipe-chicken-kabab',
      name: 'Chicken Kabab',
      category: 'main',
      menuPrice: 520000,
      yieldQuantity: 1,
      wasteFactor: 1.1,
      items: [
        { ingredientId: 'ing-chicken', quantity: 0.35 },
        { ingredientId: 'ing-rice', quantity: 0.2 },
        { ingredientId: 'ing-saffron', quantity: 2 },
        { ingredientId: 'ing-onion', quantity: 0.1 },
      ],
    },
    {
      id: 'recipe-lamb-kebab',
      name: 'Lamb Kebab Koobideh',
      category: 'main',
      menuPrice: 580000,
      yieldQuantity: 1,
      wasteFactor: 1.05,
      items: [
        { ingredientId: 'ing-lamb', quantity: 0.3 },
        { ingredientId: 'ing-rice', quantity: 0.2 },
        { ingredientId: 'ing-onion', quantity: 0.1 },
      ],
    },
    {
      id: 'recipe-zereshk-polo',
      name: 'Zereshk Polo ba Morgh',
      category: 'main',
      menuPrice: 620000,
      yieldQuantity: 1,
      wasteFactor: 1.08,
      items: [
        { ingredientId: 'ing-chicken', quantity: 0.3 },
        { ingredientId: 'ing-rice', quantity: 0.25 },
        { ingredientId: 'ing-saffron', quantity: 3 },
        { ingredientId: 'ing-oil', quantity: 0.03 },
      ],
    },
  ];

  for (const r of recipes) {
    const { items, ...recipeData } = r;
    await prisma.recipe.upsert({
      where: { id: r.id },
      update: {},
      create: {
        ...recipeData,
        organizationId: org.id,
        locationId: loc.id,
      },
    });

    for (const item of items) {
      await prisma.recipeItem.upsert({
        where: { recipeId_ingredientId: { recipeId: r.id, ingredientId: item.ingredientId } },
        update: {},
        create: {
          recipeId: r.id,
          ingredientId: item.ingredientId,
          quantity: item.quantity,
        },
      });
    }
  }
  console.log('✅ Recipes created');

  // 8. Create Tables
  const tables = [
    { id: 'table-t1', label: 'T1', capacity: 4, zone: 'INDOOR' },
    { id: 'table-t2', label: 'T2', capacity: 4, zone: 'INDOOR' },
    { id: 'table-t3', label: 'T3', capacity: 6, zone: 'INDOOR' },
    { id: 'table-t4', label: 'T4', capacity: 2, zone: 'GARDEN' },
    { id: 'table-t5', label: 'T5', capacity: 8, zone: 'GARDEN' },
    { id: 'table-vip1', label: 'VIP-1', capacity: 10, zone: 'VIP' },
  ];

  for (const t of tables) {
    await prisma.table.upsert({
      where: { id: t.id },
      update: {},
      create: t,
    });
  }
  console.log('✅ Tables created');

  console.log('\n🎉 Seed complete!');
  console.log('Login: admin@maccan.com / admin123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
