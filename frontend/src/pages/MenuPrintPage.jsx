import { useState, useEffect } from 'react';
import { api } from '../utils/api';

export default function MenuPrintPage() {
  const [recipes, setRecipes] = useState([]);
  const [nutrition, setNutrition] = useState({});
  const [allergens, setAllergens] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/recipes'),
      api.get('/nutrition/allergens'),
    ]).then(async ([recs, alg]) => {
      setRecipes(recs);
      const algMap = {};
      alg.forEach(a => { algMap[a.id] = a.allergens; });
      setAllergens(algMap);

      // Fetch nutrition for each recipe
      const nutData = {};
      for (const r of recs) {
        try {
          nutData[r.id] = await api.get(`/nutrition/recipe/${r.id}`);
        } catch { nutData[r.id] = { has_nutrition_data: false }; }
      }
      setNutrition(nutData);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-20">در حال بارگذاری...</div>;

  const categories = {};
  recipes.forEach(r => {
    const cat = r.category || 'main';
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(r);
  });

  const categoryLabels = {
    main: { fa: 'غذاهای اصلی', en: 'Main Courses', icon: '🍽️' },
    starter: { fa: 'پیش‌غذا و سالاد', en: 'Starters & Salads', icon: '🥗' },
    dessert: { fa: 'دسر', en: 'Desserts', icon: '🍰' },
    drink: { fa: 'نوشیدنی', en: 'Beverages', icon: '🍹' },
  };

  const allergenIcons = {
    fish: '🐟', dairy: '🥛', gluten: '🌾', eggs: '🥚', shellfish: '🦐',
  };

  return (
    <>
      {/* Print button - hidden when printing */}
      <div className="no-print p-6 bg-gray-100">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold">📋 Menu Print Preview</h1>
          <button onClick={() => window.print()} className="bg-green-900 hover:bg-green-800 text-white px-6 py-3 rounded-lg font-medium transition">
            🖨️ چاپ منو | Print Menu
          </button>
        </div>
      </div>

      {/* Menu Content - Print Optimized */}
      <div className="menu-print max-w-4xl mx-auto p-8 bg-white">
        {/* Header */}
        <div className="text-center mb-8 border-b-4 border-green-900 pb-6">
          <div className="text-3xl font-bold text-green-900 mb-1">دهکده جنگلی ماکان</div>
          <div className="text-lg text-gray-600">Maccan Forest Village</div>
          <div className="text-sm text-gray-400 mt-2">🌿🌊 جایی که جنگل به دریا می‌رسد · لالیم سر، مازندران</div>
        </div>

        {/* Categories */}
        {Object.entries(categories).map(([cat, items]) => (
          <div key={cat} className="mb-8">
            <div className="flex items-center gap-2 mb-4 border-b-2 border-green-800 pb-2">
              <span className="text-2xl">{categoryLabels[cat]?.icon || '🍽️'}</span>
              <div>
                <div className="text-xl font-bold text-green-900">{categoryLabels[cat]?.fa || cat}</div>
                <div className="text-sm text-gray-500">{categoryLabels[cat]?.en || ''}</div>
              </div>
            </div>

            <div className="space-y-4">
              {items.map(recipe => {
                const n = nutrition[recipe.id];
                const allergenList = allergens[recipe.id] || [];
                return (
                  <div key={recipe.id} className="flex justify-between items-start border-b border-dashed border-gray-200 pb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900">{recipe.name}</span>
                        {allergenList.length > 0 && (
                          <span className="text-xs">
                            {allergenList.map(a => (
                              <span key={a} title={a} className="ml-1">{allergenIcons[a] || '⚠️'}</span>
                            ))}
                          </span>
                        )}
                      </div>
                      {recipe.description && (
                        <div className="text-sm text-gray-500 mt-0.5">{recipe.description}</div>
                      )}
                      {n?.has_nutrition_data && (
                        <div className="text-[10px] text-gray-400 mt-1">
                          🔥 {n.per_serving.calories} cal · 💪 {n.per_serving.protein}g P · 🧈 {n.per_serving.fat}g F · 🌾 {n.per_serving.carbs}g C
                        </div>
                      )}
                    </div>
                    <div className="text-lg font-bold text-green-800 ml-4 whitespace-nowrap">
                      {recipe.menu_price?.toLocaleString('fa-IR')} ت
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Allergen Legend */}
        <div className="mt-8 pt-4 border-t-2 border-gray-200">
          <div className="text-sm font-bold text-gray-700 mb-2">راهنمای آلرژن‌ها | Allergen Guide:</div>
          <div className="flex flex-wrap gap-4 text-xs text-gray-500">
            <span>🐟 ماهی | Fish</span>
            <span>🦐 صدف | Shellfish</span>
            <span>🥛 لبنیات | Dairy</span>
            <span>🥚 تخم‌مرغ | Eggs</span>
            <span>🌾 گلوتن | Gluten</span>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 pt-4 border-t text-xs text-gray-400">
          <div>دهکده جنگلی ماکان · لالیم سر، مازندران</div>
          <div>Maccan Forest Village · Lavilan, Mazandaran</div>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
          .menu-print { padding: 20px; max-width: 100%; }
          .menu-print * { color: #000 !important; }
          .menu-print .border-b-4 { border-color: #000 !important; }
          .menu-print .border-b-2 { border-color: #000 !important; }
          .menu-print .border-t-2 { border-color: #000 !important; }
          .menu-print .border-dashed { border-style: dashed !important; }
        }
      `}</style>
    </>
  );
}
