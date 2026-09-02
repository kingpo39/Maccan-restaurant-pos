import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ─── INGREDIENTS: [english, persian, unit, category, costPerUnit] ───────

const ingredients: [string, string, string, string, number][] = [
  // PROTEINS
  ['Chicken Breast', 'سینه مرغ', 'kg', 'PROTEIN', 480],
  ['Chicken Wings', 'بال مرغ', 'kg', 'PROTEIN', 420],
  ['Beef', 'گوشت گاو', 'kg', 'PROTEIN', 950],
  ['Beef Mince', 'چرخ‌کرده گاو', 'kg', 'PROTEIN', 850],
  ['Lamb', 'گوشت بره', 'kg', 'PROTEIN', 1100],
  ['Shrimp', 'میگو', 'kg', 'PROTEIN', 1200],
  ['Salmon', 'سالمون', 'kg', 'PROTEIN', 2400],
  ['Sea Bass', 'سیاباس', 'kg', 'PROTEIN', 1600],
  ['Sturgeon', 'ماهی خاویاری', 'kg', 'PROTEIN', 2200],
  ['Trout', 'قزل‌آلا', 'kg', 'PROTEIN', 1100],
  ['Carp', 'ماهی کپور', 'kg', 'PROTEIN', 700],
  ['Duck', 'اردک', 'kg', 'PROTEIN', 1200],

  // PRODUCE
  ['Eggplant', 'بادمجان', 'kg', 'PRODUCE', 180],
  ['Tomato', 'گوجه‌فرنگی', 'kg', 'PRODUCE', 120],
  ['Garlic', 'سیر', 'kg', 'PRODUCE', 260],
  ['Onion', 'پیاز', 'kg', 'PRODUCE', 80],
  ['Lettuce', 'کاهو', 'kg', 'PRODUCE', 180],
  ['Cucumber', 'خیار', 'kg', 'PRODUCE', 100],
  ['Spinach', 'اسفناج', 'kg', 'PRODUCE', 220],
  ['Avocado', 'آووکادو', 'kg', 'PRODUCE', 700],
  ['Radish', 'تربچه', 'kg', 'PRODUCE', 130],
  ['Mango', 'مانگو', 'kg', 'PRODUCE', 450],
  ['Cilantro', 'گشنیز', 'kg', 'PRODUCE', 220],
  ['Corn', 'ذرت', 'kg', 'PRODUCE', 180],
  ['Broccoli', 'بروکلی', 'kg', 'PRODUCE', 220],
  ['Red Cabbage', 'کلم قرمز', 'kg', 'PRODUCE', 140],
  ['Lemon', 'لیمو', 'kg', 'PRODUCE', 180],
  ['Potato', 'سیب‌زمینی', 'kg', 'PRODUCE', 100],
  ['Plum', 'آلو', 'kg', 'PRODUCE', 250],
  ['Pumpkin', 'کدو', 'kg', 'PRODUCE', 180],
  ['Bitter Orange', 'ترنج', 'L', 'PRODUCE', 220],
  ['Watermelon', 'هندوانه', 'kg', 'PRODUCE', 100],
  ['Ginger', 'زنجبیل', 'kg', 'PRODUCE', 300],
  ['Mint', 'نعناع', 'kg', 'PRODUCE', 250],
  ['Dill', 'شوید', 'kg', 'PRODUCE', 300],
  ['Raspberry', 'تمشک', 'kg', 'PRODUCE', 650],
  ['Peach', 'هلو', 'kg', 'PRODUCE', 350],
  ['Carrot', 'هویج', 'kg', 'PRODUCE', 100],
  ['Apple', 'سیب', 'kg', 'PRODUCE', 180],
  ['Strawberry', 'توت‌فرنگی', 'kg', 'PRODUCE', 450],
  ['Mushrooms', 'قارچ', 'kg', 'PRODUCE', 380],
  ['Edamame', 'لوبیا سبز', 'kg', 'PRODUCE', 450],

  // DAIRY
  ['Egg', 'تخم‌مرغ', 'ea', 'DAIRY', 35],
  ['Quail Egg', 'تخم‌بلدرچین', 'ea', 'DAIRY', 25],
  ['Kashk', 'کشک', 'kg', 'DAIRY', 300],
  ['Yogurt', 'ماست', 'kg', 'DAIRY', 180],
  ['Parmesan Cheese', 'پارمسان', 'kg', 'DAIRY', 900],
  ['Cheddar Cheese', 'چeddar', 'kg', 'DAIRY', 700],
  ['Cream', 'خامه', 'L', 'DAIRY', 400],
  ['Milk', 'شیر', 'L', 'DAIRY', 180],
  ['Butter', 'کره', 'kg', 'DAIRY', 650],
  ['Cream Cheese', 'پنیر خامه‌ای', 'kg', 'DAIRY', 800],
  ['Ice Cream', 'بستنی', 'L', 'DAIRY', 500],

  // PANTRY
  ['Sriracha Sauce', 'سس سریاچا', 'L', 'PANTRY', 280],
  ['Soy Sauce', 'سس سویا', 'L', 'PANTRY', 180],
  ['Ketchup', 'کچاپ', 'L', 'PANTRY', 150],
  ['Mayonnaise', 'مایونز', 'kg', 'PANTRY', 220],
  ['Taco Shell', 'تورتیلا', 'ea', 'PANTRY', 25],
  ['Walnut', 'گردو', 'kg', 'NUTS', 1100],
  ['Pomegranate Paste', 'رب انار', 'kg', 'PANTRY', 500],
  ['Olives', 'زیتون', 'kg', 'PANTRY', 650],
  ['Vinegar', 'سرکه', 'L', 'PANTRY', 120],
  ['Raisin', 'کشمش', 'kg', 'PANTRY', 350],
  ['Honey', 'عسل', 'kg', 'PANTRY', 500],
  ['Croutons', 'نان تست', 'kg', 'PANTRY', 350],
  ['Pita Bread', 'نان پیتا', 'kg', 'BAKERY', 180],
  ['Sumac', 'سماق', 'kg', 'SPICE', 650],
  ['Quinoa', 'کینوا', 'kg', 'PANTRY', 400],
  ['Balsamic Vinegar', 'سرکه بالزامیک', 'L', 'PANTRY', 400],
  ['Rice', 'برنج', 'kg', 'PANTRY', 180],
  ['Barberries', 'زرشک', 'kg', 'PANTRY', 700],
  ['Potato (Pantry)', 'سیب‌زمینی', 'kg', 'PANTRY', 100],
  ['Penne Pasta', 'پنه', 'kg', 'PANTRY', 260],
  ['Fettuccine Pasta', 'فتوچینی', 'kg', 'PANTRY', 300],
  ['Pickles', 'ترشی', 'kg', 'PANTRY', 260],
  ['Sugar', 'شکر', 'kg', 'PANTRY', 100],
  ['Gelatin', 'ژلاتین', 'kg', 'PANTRY', 600],
  ['Flour', 'آرد', 'kg', 'BAKERY', 120],
  ['Chocolate', 'شکلات', 'kg', 'BAKERY', 900],
  ['Burger Bun', 'نان همبرگر', 'ea', 'BAKERY', 35],
  ['Pomegranate Sauce', 'سس انار', 'L', 'PANTRY', 400],
  ['Miso', 'میسو', 'kg', 'PANTRY', 900],
  ['Mustard', 'خردل', 'kg', 'PANTRY', 300],
  ['Seasonal Vegetables', 'سبزیجات فصل', 'kg', 'PRODUCE', 180],
  ['Seasonal Fruits', 'میوه‌های فصل', 'kg', 'PRODUCE', 300],

  // SPICES
  ['Dried Mint', 'نعناع خشک', 'kg', 'SPICE', 450],
  ['Smoked Paprika', 'پاپریکا دودی', 'kg', 'SPICE', 900],
  ['Sesame Seeds', 'کنجد', 'kg', 'SPICE', 500],
  ['Saffron', 'زعفران', 'kg', 'SPICE', 180000],
  ['Cinnamon', 'دارچین', 'kg', 'SPICE', 500],

  // NUTS
  ['Pistachio', 'پسته', 'kg', 'NUTS', 1800],

  // BEVERAGES
  ['Pomegranate Juice', 'آب انار', 'L', 'BEVERAGE', 300],
  ['Verjuice', 'آب غوره', 'L', 'BEVERAGE', 220],
  ['Tea', 'چای', 'kg', 'BEVERAGE', 500],
  ['Hibiscus', 'به‌لیمو', 'kg', 'BEVERAGE', 500],
  ['Green Tea', 'چای سبز', 'kg', 'BEVERAGE', 800],
  ['Masala Tea Spice', 'ادویه چای ماسالا', 'kg', 'BEVERAGE', 650],
  ['Coffee Beans', 'دانه قهوه', 'kg', 'BEVERAGE', 1800],
  ['Cocoa', 'کاکائو', 'kg', 'BEVERAGE', 800],
  ['Lemon Verbena', 'ورونا', 'kg', 'BEVERAGE', 700],
  ['Ginger (Beverage)', 'زنجبیل', 'kg', 'BEVERAGE', 300],
  ['Borage', 'گاوزبان', 'kg', 'BEVERAGE', 700],

  // BAKERY
  ['Aromatic Herbs', 'سبزی معطر', 'kg', 'SPICE', 450],
  ['Broad Beans', 'باقلی', 'kg', 'PRODUCE', 300],
  ['Carp (Fish)', 'ماهی کپور', 'kg', 'PROTEIN', 700],
];

// ─── RECIPES: [english, persian, category, price, [[ingredientEn, qty], ...]] ───

type RecipeItem = [string, number];
type RecipeDef = [string, string, string, number, RecipeItem[]];

const recipes: RecipeDef[] = [
  // ═══ APPETIZERS ═══
  ['Soup of the Day', 'سوپ روز', 'starter', 250, [['Seasonal Vegetables', 0]]],
  ['Mirza Ghasemi', 'میرزا قاسمی', 'starter', 400, [['Eggplant', .25], ['Tomato', .12], ['Garlic', .015], ['Egg', 1], ['Quail Egg', 1]]],
  ['Kashk-e Bademjan', 'کشک بادمجان', 'starter', 350, [['Eggplant', .25], ['Kashk', .05], ['Onion', .08], ['Garlic', .01], ['Dried Mint', .003]]],
  ['Chicken Wings', 'بال مرغ', 'starter', 900, [['Chicken Wings', .35], ['Sriracha Sauce', .02], ['Soy Sauce', .02], ['Smoked Paprika', .003], ['Sesame Seeds', .005]]],
  ['Fried Mushrooms', 'قارچ سوخاری', 'starter', 600, [['Mushrooms', .25], ['Flour', .03], ['Ketchup', .02], ['Mayonnaise', .02], ['Garlic', .005]]],
  ['Chicken Tacos', 'تاکو مرغ', 'starter', 1300, [['Chicken Breast', .18], ['Taco Shell', 2], ['Lettuce', .03], ['Tomato', .03], ['Cucumber', .02], ['Mayonnaise', .02]]],
  ['Beef Tacos', 'تاکو گوشت', 'starter', 1650, [['Beef Mince', .18], ['Taco Shell', 2], ['Lettuce', .03], ['Tomato', .03], ['Cucumber', .02], ['Mayonnaise', .02]]],
  ['Shrimp Tacos', 'تاکو میگو', 'starter', 1550, [['Shrimp', .18], ['Taco Shell', 2], ['Lettuce', .03], ['Tomato', .03], ['Cucumber', .02], ['Mayonnaise', .02]]],
  ['Mediterranean Shrimp', 'میگو مدیترانه‌ای', 'starter', 1450, [['Shrimp', .18], ['Garlic', .01], ['Potato', .18], ['Butter', .02], ['Lemon', .03]]],
  ['Baghali Ghatogh', 'باقلاقه', 'starter', 450, [['Broad Beans', .18], ['Egg', 2], ['Dill', .01], ['Garlic', .01]]],
  ['Naz Khatoon', 'naz خاتون', 'starter', 250, [['Eggplant', .2], ['Walnut', .02], ['Pomegranate Juice', .03], ['Garlic', .005]]],
  ['Zeytoon Parvardeh', 'زیتون پرورده', 'starter', 300, [['Olives', .12], ['Walnut', .02], ['Pomegranate Paste', .02], ['Garlic', .005]]],
  ['Plain Olives', 'زیتون ساده', 'starter', 200, [['Olives', .12]]],
  ['Pickled Garlic', 'سیر ترشی', 'starter', 200, [['Garlic', .08], ['Vinegar', .03]]],
  ['Spinach Borani', 'اسفناج بورانی', 'starter', 250, [['Yogurt', .1], ['Spinach', .08], ['Garlic', .005]]],
  ['Eggplant Borani', 'بادمجان بورانی', 'starter', 250, [['Yogurt', .1], ['Eggplant', .12], ['Garlic', .005], ['Dried Mint', .002]]],
  ['Dalal Yogurt', 'ماست دلال', 'starter', 250, [['Yogurt', .15], ['Aromatic Herbs', .005]]],
  ['Cucumber Yogurt', 'ماست خیار', 'starter', 300, [['Yogurt', .15], ['Cucumber', .06], ['Mint', .003], ['Walnut', .01], ['Raisin', .01]]],
  ['Plain Yogurt', 'ماست ساده', 'starter', 150, [['Yogurt', .15]]],

  // ═══ SALADS ═══
  ['Green Jungle Salad', 'سلاد سبز جنگلی', 'salad', 500, [['Lettuce', .08], ['Seasonal Vegetables', .12], ['Lemon', .02]]],
  ['Jungle Shirazi Salad', 'سلاد شیرازی جنگلی', 'salad', 400, [['Cucumber', .08], ['Tomato', .08], ['Onion', .03], ['Verjuice', .02], ['Aromatic Herbs', .003]]],
  ['Chicken Avocado Salad', 'سلاد مرغ و آووکادو', 'salad', 1300, [['Chicken Breast', .12], ['Avocado', .08], ['Lettuce', .06], ['Tomato', .04], ['Honey', .01], ['Mustard', .01]]],
  ['Caesar Salad', 'سلاد سزار', 'salad', 700, [['Chicken Breast', .1], ['Lettuce', .08], ['Parmesan Cheese', .025], ['Croutons', .025], ['Mayonnaise', .03]]],
  ['Fattoush Salad', 'سلاد فتوش', 'salad', 500, [['Lettuce', .06], ['Cucumber', .05], ['Tomato', .05], ['Radish', .03], ['Pita Bread', .03], ['Sumac', .002]]],
  ['Beef Salad', 'سلاد گوشت', 'salad', 1480, [['Beef', .12], ['Lettuce', .06], ['Tomato', .04], ['Cucumber', .04], ['Balsamic Vinegar', .02]]],
  ['Quinoa & Avocado Salad', 'سلاد کینوا و آووکادو', 'salad', 1100, [['Quinoa', .08], ['Avocado', .08], ['Mango', .06], ['Cilantro', .003], ['Balsamic Vinegar', .015]]],
  ['Shrimp Salad', 'سلاد میگو', 'salad', 1250, [['Shrimp', .12], ['Spinach', .05], ['Corn', .04], ['Broccoli', .04], ['Red Cabbage', .03], ['Edamame', .04], ['Lemon', .02]]],

  // ═══ KEBABS & GRILLS ═══
  ['Shishlik', 'شیشلیک', 'main', 3500, [['Lamb', .35], ['Tomato', .05], ['Onion', .03], ['Lemon', .02]]],
  ['Vaziri Kebab', 'کباب وزیری', 'main', 1700, [['Beef Mince', .15], ['Chicken Breast', .15], ['Saffron', .0002], ['Onion', .03], ['Tomato', .05]]],
  ['Barg Kebab', 'کباب برگ', 'main', 2650, [['Beef', .25], ['Onion', .03], ['Lemon', .02]]],
  ['Chenjeh Kebab', 'کباب چنجه', 'main', 2500, [['Beef', .25], ['Onion', .03], ['Lemon', .02]]],
  ['Torsh Fillet Kebab', 'کباب فیله ترش', 'main', 2850, [['Beef', .25], ['Walnut', .025], ['Pomegranate Paste', .025], ['Aromatic Herbs', .003]]],
  ['Saffron Koobideh Kebab', 'کباب کوبیده زعفرانی', 'main', 850, [['Beef Mince', .18], ['Saffron', .0002], ['Onion', .03]]],
  ['Saffron Chicken Kebab', 'کباب مرغ زعفرانی', 'main', 650, [['Chicken Breast', .2], ['Saffron', .0002], ['Lemon', .02]]],
  ['Torsh Chicken Kebab', 'کباب مرغ ترش', 'main', 850, [['Chicken Breast', .2], ['Walnut', .02], ['Pomegranate Paste', .02], ['Aromatic Herbs', .003]]],

  // ═══ CHARCOAL-GRILLED PLATTERS ═══
  ['Classic Charcoal-Grilled Kebab Platter', 'پلاتو کباب کلاسیک', 'main', 4600, [['Lamb', .15], ['Beef Mince', .08], ['Chicken Breast', .08], ['Saffron', .0002], ['Tomato', .08], ['Onion', .04]]],
  ['Premium Charcoal-Grilled Kebab Platter', 'پلاتو کباب پریمیوم', 'main', 8500, [['Beef', .12], ['Lamb', .15], ['Beef Mince', .08], ['Chicken Breast', .08], ['Saffron', .0002], ['Walnut', .015], ['Tomato', .1]]],
  ['Charcoal-Grilled Seafood Kebab Platter', 'پلاتو کباب دریایی', 'main', 6500, [['Carp', .15], ['Sturgeon', .12], ['Trout', .12], ['Shrimp', .1], ['Tomato', .08], ['Lemon', .02]]],

  // ═══ SIDES ═══
  ['Vegetable Platter', 'پلاتو سبزیجات', 'side', 800, [['Seasonal Vegetables', .25]]],
  ['Saffron Rice', 'برنج زعفرانی', 'side', 250, [['Rice', .15], ['Saffron', .0001]]],
  ['Saffron Kateh', 'کته زعفرانی', 'side', 250, [['Rice', .15], ['Saffron', .0001]]],
  ['Sabzi Polo', 'سبزی پلو', 'side', 300, [['Rice', .15], ['Aromatic Herbs', .01]]],
  ['Baked Potato', 'سیب‌زمینی تنوری', 'side', 450, [['Potato', .25]]],
  ['French Fries', 'سیب‌زمینی سرخ‌کرده', 'side', 450, [['Potato', .25], ['Parmesan Cheese', .01]]],
  ['Mashed Potatoes', 'پوره سیب‌زمینی', 'side', 500, [['Potato', .25], ['Butter', .02], ['Cream', .03], ['Cheddar Cheese', .02]]],

  // ═══ SEAFOOD ═══
  ['Salmon Steak', 'استیک سالمون', 'main', 6500, [['Salmon', .25], ['Miso', .025], ['Potato', .18], ['Butter', .02]]],
  ['Sea Bass Steak', 'استیک سیاباس', 'main', 3500, [['Sea Bass', .25], ['Spinach', .08], ['Lemon', .03], ['Butter', .025], ['Potato', .18]]],
  ['Sturgeon Steak with Walnut Sauce', 'استیک خاویاری با سس گردو', 'main', 2000, [['Sturgeon', .25], ['Walnut', .03], ['Potato', .18]]],
  ['Sturgeon Steak with Wild Raspberry Sauce', 'استیک خاویاری با سس تمشک', 'main', 1850, [['Sturgeon', .25], ['Raspberry', .05], ['Potato', .18]]],
  ['Grilled Sturgeon Kebab', 'کباب خاویاری', 'main', 1700, [['Sturgeon', .22], ['Tomato', .06], ['Potato', .15]]],
  ['Herbed Rice with Trout', 'برنج سبزی با قزل‌آلا', 'main', 1600, [['Trout', .25], ['Rice', .15], ['Aromatic Herbs', .01]]],
  ['Grilled Trout', 'قزل‌آلا کبابی', 'main', 1300, [['Trout', .25], ['Tomato', .06], ['Lemon', .02]]],
  ['Grilled Shrimp Skewers', 'سیخ میگو کبابی', 'main', 2100, [['Shrimp', .25], ['Tomato', .06], ['Lemon', .02]]],

  // ═══ PERSIAN CUISINE ═══
  ['Baghali Polo with Lamb Shank', 'باقلی پلو با ران بره', 'main', 2400, [['Lamb', .25], ['Rice', .15], ['Broad Beans', .06], ['Dill', .01]]],
  ['Baghali Polo with Lamb', 'باقلی پلو با بره', 'main', 2200, [['Lamb', .2], ['Rice', .15], ['Aromatic Herbs', .01]]],
  ['Zereshk Polo with Chicken', 'زرشک پلو با مرغ', 'main', 750, [['Chicken Breast', .2], ['Rice', .15], ['Barberries', .025], ['Saffron', .0001]]],
  ['Slow-Cooked Lamb Shank', 'ران بره آهسته‌پز', 'main', 2100, [['Lamb', .3], ['Onion', .05], ['Tomato', .05]]],
  ['Akbar Joojeh with Saffron Rice', 'اکبر جوجه با برنج زعفرانی', 'main', 1050, [['Chicken Breast', .25], ['Butter', .025], ['Pomegranate Sauce', .04], ['Rice', .15], ['Saffron', .0001]]],

  // ═══ LOCAL CUISINE ═══
  ['Fesenjan Stew with Persian Rice', 'فسنجان با برنج', 'local', 2500, [['Walnut', .06], ['Pomegranate Paste', .04], ['Chicken Breast', .2], ['Rice', .15]]],
  ['Duck with Nardoon', 'اردک با ناردون', 'local', 2300, [['Duck', .25], ['Pomegranate Paste', .04], ['Rice', .15]]],
  ['Anardoon Chicken with Persian Rice', 'مرغ ناردون با برنج', 'local', 850, [['Chicken Breast', .2], ['Pomegranate Paste', .04], ['Rice', .15]]],
  ['Aloo Morgh with Persian Rice', 'آلو مرغ با برنج', 'local', 850, [['Chicken Breast', .2], ['Plum', .1], ['Rice', .15]]],
  ['Kahi Pela with Anardoon & Chicken', 'کاهی پلا با ناردون و مرغ', 'local', 1200, [['Chicken Breast', .2], ['Pomegranate Paste', .04], ['Pumpkin', .1], ['Egg', 1], ['Rice', .15]]],
  ['Laveh Kebab with Saffron Kateh', 'کباب لáveis با کته زعفرانی', 'local', 2350, [['Lamb', .2], ['Bitter Orange', .03], ['Pomegranate Paste', .03], ['Rice', .15], ['Saffron', .0001]]],
  ['Pan-Fried Kebab with Saffron Kateh', 'کباب تابه‌ای با کته زعفرانی', 'local', 1300, [['Lamb', .1], ['Beef Mince', .1], ['Sumac', .003], ['Rice', .15], ['Saffron', .0001]]],

  // ═══ QUICK DINING ═══
  ['Chicken Strips', 'مرغ سوخاری', 'quick', 850, [['Chicken Breast', .2], ['Flour', .05], ['Egg', 1], ['Potato', .2], ['Ketchup', .02], ['Mayonnaise', .02]]],
  ['Chicken Alfredo Pasta', 'پاستا آلفردو مرغ', 'quick', 800, [['Penne Pasta', .12], ['Chicken Breast', .12], ['Mushrooms', .08], ['Cream', .06], ['Parmesan Cheese', .025]]],
  ['Shrimp Pasta', 'پاستا میگو', 'quick', 1200, [['Fettuccine Pasta', .12], ['Shrimp', .12], ['Broccoli', .06], ['Cream', .06], ['Parmesan Cheese', .025]]],
  ['Hamburger', 'همبرگر', 'quick', 850, [['Beef Mince', .18], ['Burger Bun', 1], ['Lettuce', .03], ['Tomato', .03], ['Pickles', .02], ['Mayonnaise', .02]]],
  ['Cheeseburger', 'چیزبرگر', 'quick', 950, [['Beef Mince', .18], ['Burger Bun', 1], ['Cheddar Cheese', .025], ['Lettuce', .03], ['Tomato', .03], ['Pickles', .02], ['Mayonnaise', .02]]],

  // ═══ COLD BEVERAGES ═══
  ['Coca-Cola', 'کوکاکولا', 'beverage', 120, []],
  ['Fanta', 'فانتا', 'beverage', 120, []],
  ['Sprite', 'اسپرایت', 'beverage', 120, []],
  ['Yogurt Drink', 'دوغ', 'beverage', 120, [['Yogurt', .25]]],
  ['Non-Alcoholic Malt Beverage', 'ماءالشعیر', 'beverage', 120, []],
  ['Lemonade', 'لیموناد', 'beverage', 120, [['Lemon', .05], ['Sugar', .02]]],
  ['Sparkling Water', 'آب گازدار', 'beverage', 65, []],
  ['Mineral Water', 'آب معدنی', 'beverage', 40, []],
  ['Fruit Juice Nectar', 'آبمیوه', 'beverage', 90, []],

  // ═══ MOCKTAILS ═══
  ['Mixed Smoothie', ' اسموتی میکس', 'beverage', 100, [['Seasonal Fruits', .2]]],
  ['Saffron Drink', 'شربت زعفران', 'beverage', 120, [['Saffron', .0001], ['Sugar', .02]]],
  ['Watermelon & Mint Drink', 'شربت هندوانه و نعناع', 'beverage', 450, [['Watermelon', .25], ['Mint', .005]]],
  ['Verjuice Dalal Drink', 'شربت غوره دلال', 'beverage', 350, [['Verjuice', .08], ['Aromatic Herbs', .003]]],
  ['Cucumber Sekanjabin Drink', 'شربت خیار سکنجبین', 'beverage', 350, [['Cucumber', .1], ['Vinegar', .02], ['Mint', .003]]],
  ['Mojito', 'موهیتو', 'beverage', 350, [['Lemon', .05], ['Mint', .005], ['Sugar', .02]]],

  // ═══ HOT BEVERAGES ═══
  ['Brewed Tea', 'چای دمی', 'beverage', 150, [['Tea', .004]]],
  ['Pot-Brewed Tea', 'چای قورمه', 'beverage', 400, [['Tea', .01]]],
  ['Hibiscus Tea', 'چای به‌لیمو', 'beverage', 250, [['Hibiscus', .004]]],
  ['Green Tea', 'چای سبز', 'beverage', 190, [['Green Tea', .004]]],
  ['Masala Tea', 'چای ماسالا', 'beverage', 225, [['Masala Tea Spice', .004], ['Milk', .08]]],

  // ═══ ORGANIC HERBAL DRINKS ═══
  ['Jungle Breeze Herbal Tea', 'دمنوش باد جنگل', 'beverage', 350, [['Lemon Verbena', .004]]],
  ['Vitality Herbal Tea', 'دمنوش نیرو', 'beverage', 400, [['Ginger (Beverage)', .004]]],
  ['Relaxation Herbal Tea', 'دمنوش آرامش', 'beverage', 350, [['Borage', .004]]],
  ['Forest Freshness Herbal Tea', 'دمنوش تازگی جنگل', 'beverage', 350, [['Mint', .004]]],
  ['Smile Herbal Tea', 'دمنوش لبخند', 'beverage', 380, [['Apple', .04], ['Cinnamon', .002]]],

  // ═══ COFFEE ═══
  ['Single Espresso', 'اسپرسو سینگل', 'beverage', 180, [['Coffee Beans', .009]]],
  ['Double Espresso', 'اسپرسو دبل', 'beverage', 240, [['Coffee Beans', .018]]],
  ['Espresso Macchiato', 'ماکیاتو', 'beverage', 240, [['Coffee Beans', .009], ['Milk', .03]]],
  ['Cappuccino', 'کاپوچینو', 'beverage', 350, [['Coffee Beans', .009], ['Milk', .15]]],
  ['Caffe Latte', 'لاته', 'beverage', 350, [['Coffee Beans', .009], ['Milk', .2]]],
  ['Latte Macchiato', 'لاته ماکیاتو', 'beverage', 370, [['Coffee Beans', .009], ['Milk', .2]]],
  ['Americano', 'آمریکانو', 'beverage', 280, [['Coffee Beans', .009]]],
  ['Hot Chocolate', 'شکلات داغ', 'beverage', 320, [['Cocoa', .02], ['Milk', .2], ['Sugar', .01]]],
  ['Hot Milk', 'شیر داغ', 'beverage', 180, [['Milk', .2]]],
  ['Milk Shot', 'شات شیر', 'beverage', 80, [['Milk', .05]]],

  // ═══ CAKES & SWEETS ═══
  ['Strawberry Cheesecake', 'چیزکیک توت‌فرنگی', 'dessert', 550, [['Cream Cheese', .1], ['Strawberry', .05], ['Flour', .03], ['Sugar', .03]]],
  ['Caramel Cheesecake', 'چیزکیک کاراملی', 'dessert', 500, [['Cream Cheese', .1], ['Sugar', .04], ['Milk', .03]]],
  ['Saffron Cake', 'کیک زعفرانی', 'dessert', 550, [['Flour', .06], ['Egg', 1], ['Sugar', .03], ['Saffron', .0001]]],
  ['Daily Cake', 'کیک روز', 'dessert', 270, [['Flour', .06], ['Egg', 1], ['Sugar', .03]]],
  ['Plain Croissant', 'کروسان ساده', 'dessert', 320, [['Flour', .08], ['Butter', .03]]],
  ['Chocolate Croissant', 'کروسان شکلاتی', 'dessert', 370, [['Flour', .08], ['Butter', .03], ['Chocolate', .02]]],
  ['Chocolate Cookie', 'کوکی شکلاتی', 'dessert', 320, [['Flour', .04], ['Butter', .02], ['Chocolate', .015], ['Sugar', .02]]],

  // ═══ DESSERTS ═══
  ['Classic Tiramisu', 'تیرامیسو کلاسیک', 'dessert', 450, [['Cream Cheese', .08], ['Coffee Beans', .004], ['Egg', 1], ['Sugar', .02]]],
  ['Pistachio Tiramisu', 'تیرامیسو پسته‌ای', 'dessert', 550, [['Cream Cheese', .08], ['Pistachio', .02], ['Coffee Beans', .004], ['Egg', 1], ['Sugar', .02]]],
  ['Scoop Ice Cream', 'بستنی قیفی', 'dessert', 250, [['Ice Cream', .12]]],
  ['Peach Dessert', 'دسر هلو', 'dessert', 450, [['Peach', .12], ['Ice Cream', .08]]],
  ['Carrot Halva', 'حلوا هویج', 'dessert', 350, [['Carrot', .12], ['Sugar', .04], ['Walnut', .02]]],
  ['Siyah Halva', 'حلوای سیاه', 'dessert', 350, [['Flour', .06], ['Sugar', .04], ['Butter', .03]]],
];

// ─── ALLERGEN MAP ────────────────────────────────────────────────

const dairyAllergens = ['Egg', 'Quail Egg', 'Kashk', 'Yogurt', 'Parmesan Cheese', 'Cheddar Cheese', 'Cream', 'Milk', 'Butter', 'Cream Cheese', 'Ice Cream'];
const nutAllergens = ['Walnut', 'Pistachio'];
const glutenAllergens = ['Flour', 'Pita Bread', 'Croutons', 'Penne Pasta', 'Fettuccine Pasta', 'Burger Bun'];

function getAllergens(name: string): string[] {
  const a: string[] = [];
  if (dairyAllergens.includes(name)) a.push('DAIRY');
  if (nutAllergens.includes(name)) a.push('NUTS');
  if (glutenAllergens.includes(name)) a.push('GLUTEN');
  if (['Egg', 'Quail Egg'].includes(name)) a.push('EGG');
  if (['Shrimp'].includes(name)) a.push('SHELLFISH');
  return a;
}

// ─── SEED ───────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Seeding MACCAN RMS — bilingual menu from PDF...\n');

  // Use the EXISTING organization/location (first found) so seeded data is visible
  // to users already in the database; fall back to a fixed org if none exists.
  let org = await prisma.organization.findFirst();
  if (!org) org = await prisma.organization.create({ data: { id: 'org-maccan', name: 'MACCAN Group', legalName: 'MACCAN Hospitality Ltd.' } });
  let loc = await prisma.location.findFirst({ where: { organizationId: org.id } });
  if (!loc) loc = await prisma.location.create({ data: { id: 'loc-lalimsar', organizationId: org.id, name: 'لالیم سر، مازندران', address: 'لالیم سر، مازندران، ایران' } });
  console.log(`📍 Org: ${org.name} (${org.id}) | Loc: ${loc.name}`);

  // Users
  const salt = await bcrypt.genSalt(10);
  const ownerHash = await bcrypt.hash('Maccan@6', salt);
  const staffHash = await bcrypt.hash('staff123', salt);
  const ownerPerms = JSON.stringify(['dashboard:view','dashboard:edit','ingredients:view','ingredients:create','ingredients:edit','ingredients:delete','recipes:view','recipes:create','recipes:edit','recipes:delete','recipes:pricing','inventory:view','inventory:receive','inventory:adjust','inventory:delete','orders:view','orders:create','orders:cancel','orders:refund','kds:view','kds:manage','nutrition:view','nutrition:edit','nutrition:delete','analytics:view','analytics:export','suppliers:view','suppliers:manage','users:manage','settings:manage']);
  const demoAccounts = [
    { email: 'dara@maccan.com', passwordHash: ownerHash, firstName: 'Dara', lastName: 'Owner', role: 'OWNER', permissions: ownerPerms },
    { email: 'bijan@maccan.com', passwordHash: ownerHash, firstName: 'Bijan', lastName: 'Owner', role: 'OWNER', permissions: ownerPerms },
    { email: 'ali@maccan.com', passwordHash: staffHash, firstName: 'Ali', lastName: 'Server', role: 'SERVER', permissions: JSON.stringify(['dashboard:view','ingredients:view','recipes:view','orders:view','orders:create','kds:view','nutrition:view','suppliers:view']) },
    { email: 'guest@maccan.com', passwordHash: staffHash, firstName: 'Guest', lastName: 'User', role: 'GUEST', permissions: JSON.stringify(['dashboard:view','recipes:view','orders:view','menu:view']) },
  ];
  for (const u of demoAccounts) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (existing) {
      await prisma.user.update({ where: { id: existing.id }, data: { firstName: u.firstName, lastName: u.lastName, role: u.role, permissions: u.permissions, organizationId: org.id, locationId: loc.id, isActive: true } });
    } else {
      await prisma.user.create({ data: { ...u, organizationId: org.id, locationId: loc.id } });
    }
  }
  console.log('✅ Users seeded (idempotent by email)');

  // Remove ad-hoc/non-canonical recipes (created during testing) so the app
  // shows exactly one canonical menu set. Only affects recipes not id-prefixed menu-.
  const orphanRecipes = await prisma.recipe.findMany({ where: { NOT: { id: { startsWith: 'menu-' } } }, select: { id: true } });
  if (orphanRecipes.length) {
    await prisma.order.deleteMany({ where: { items: { some: { recipeId: { in: orphanRecipes.map(r => r.id) } } } } });
    await prisma.recipeItem.deleteMany({ where: { recipeId: { in: orphanRecipes.map(r => r.id) } } });
    await prisma.recipe.deleteMany({ where: { id: { in: orphanRecipes.map(r => r.id) } } });
    console.log(`🧹 Removed ${orphanRecipes.length} legacy recipes`);
  }

  // Ingredients
  const ingredientMap = new Map<string, string>();
  // Opening stock by category (base units: kg / L / ea)
  const openingStock: Record<string, number> = { PROTEIN: 15, PRODUCE: 20, DAIRY: 12, PANTRY: 25, SPICE: 8, BAKERY: 15, BEVERAGE: 60, NUTS: 10 };
  for (const [en, fa, unit, category, cost] of ingredients) {
    const allergens = getAllergens(en);
    const row = await prisma.ingredient.upsert({
      where: { organizationId_locationId_name: { organizationId: org.id, locationId: loc.id, name: en } },
      update: { nameFa: fa, baseUnit: unit, category, costPerUnit: cost, allergens: JSON.stringify(allergens), isActive: true },
      create: { name: en, nameFa: fa, baseUnit: unit, category, costPerUnit: cost, allergens: JSON.stringify(allergens), organizationId: org.id, locationId: loc.id },
    });
    ingredientMap.set(en, row.id);
    // Ensure an opening stock balance exists (keeps existing quantities untouched)
    const hasStock = await prisma.stockBalance.findUnique({ where: { ingredientId: row.id } });
    if (!hasStock) {
      await prisma.stockBalance.create({
        data: { organizationId: org.id, locationId: loc.id, ingredientId: row.id, quantity: openingStock[category] ?? 15, lastCostPerUnit: cost },
      });
    }
  }
  console.log(`✅ ${ingredients.length} bilingual ingredients seeded`);

  // Recipes
  let recipeCount = 0;
  for (const [en, fa, category, price, items] of recipes) {
    const id = `menu-${en.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    const recipe = await prisma.recipe.upsert({
      where: { id },
      update: { name: en, nameFa: fa, category, menuPrice: price, isActive: true },
      create: { id, name: en, nameFa: fa, category, menuPrice: price, organizationId: org.id, locationId: loc.id },
    });
    for (const [ingredientName, qty] of items) {
      const ingredientId = ingredientMap.get(ingredientName);
      if (!ingredientId) continue;
      await prisma.recipeItem.upsert({
        where: { recipeId_ingredientId: { recipeId: recipe.id, ingredientId } },
        update: { quantity: qty },
        create: { recipeId: recipe.id, ingredientId, quantity: qty },
      });
    }
    recipeCount++;
  }
  console.log(`✅ ${recipeCount} bilingual recipes seeded`);
  console.log(`   Categories: starter, salad, main, side, local, quick, beverage, dessert`);
  console.log('\nLogin: bijan@maccan.com / Maccan@6');
}

main().catch((e) => { console.error('❌ Seed failed:', e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
