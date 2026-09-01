import { useState, useEffect } from 'react';
import { api } from '../utils/api';

export default function NutritionPage() {
  const [tab, setTab] = useState('dishes');
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-green-900">🥗 تغذیه | Nutrition</h1>
      <p className="text-gray-500 text-sm mt-1 mb-6">اطلاعات تغذیه‌ای مواد و غذاها</p>
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl">
        {[
          { id: 'dishes', label: '🍽️ غذاها', en: 'Per Dish' },
          { id: 'ingredients', label: '🥩 مواد اولیه', en: 'Per Ingredient' },
          { id: 'allergens', label: '⚠️ آلرژن‌ها', en: 'Allergens' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition ${tab === t.id ? 'bg-green-900 text-white shadow' : 'text-gray-600 hover:bg-gray-200'}`}>
            {t.label}<span className="block text-xs opacity-70">{t.en}</span>
          </button>
        ))}
      </div>
      {tab === 'dishes' && <DishNutrition />}
      {tab === 'ingredients' && <IngredientNutrition />}
      {tab === 'allergens' && <AllergenView />}
    </div>
  );
}

function DishNutrition() {
  const [recipes, setRecipes] = useState([]);
  const [nutritionData, setNutritionData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/recipes').then(async (recs) => {
      setRecipes(recs);
      const data = {};
      for (const r of recs) {
        try {
          data[r.id] = await api.get(`/nutrition/recipe/${r.id}`);
        } catch { data[r.id] = { has_nutrition_data: false }; }
      }
      setNutritionData(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-12 text-gray-400">در حال بارگذاری...</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {recipes.map(r => {
        const n = nutritionData[r.id];
        if (!n) return null;
        return (
          <div key={r.id} className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="px-4 py-3 bg-green-50 border-b flex items-center justify-between">
              <h3 className="font-bold text-sm">{r.name}</h3>
              <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-[10px]">{r.category}</span>
            </div>
            {n.has_nutrition_data ? (
              <div className="p-4">
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <NutriBox icon="🔥" label="کالری" value={n.per_serving.calories} unit="cal" color="bg-orange-50 text-orange-700" />
                  <NutriBox icon="💪" label="پروتئین" value={n.per_serving.protein} unit="g" color="bg-blue-50 text-blue-700" />
                  <NutriBox icon="🧈" label="چربی" value={n.per_serving.fat} unit="g" color="bg-yellow-50 text-yellow-700" />
                  <NutriBox icon="🌾" label="کربوهیدرات" value={n.per_serving.carbs} unit="g" color="bg-green-50 text-green-700" />
                </div>
                <div className="text-[10px] text-gray-400 text-center">هر پورسیون (per serving)</div>
                {/* Macro bar */}
                <div className="mt-3 flex rounded-full overflow-hidden h-3 bg-gray-100">
                  {n.per_serving.calories > 0 && (
                    <>
                      <div className="bg-blue-500" style={{ width: `${(n.per_serving.protein * 4 / n.per_serving.calories * 100)}%` }} title="Protein"></div>
                      <div className="bg-yellow-500" style={{ width: `${(n.per_serving.fat * 9 / n.per_serving.calories * 100)}%` }} title="Fat"></div>
                      <div className="bg-green-500" style={{ width: `${(n.per_serving.carbs * 4 / n.per_serving.calories * 100)}%` }} title="Carbs"></div>
                    </>
                  )}
                </div>
                <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                  <span>🔵 پروتئین</span><span>🟡 چربی</span><span>🟢 کربوهیدرات</span>
                </div>
              </div>
            ) : (
              <div className="p-4 text-center text-gray-400 text-sm">اطلاعات تغذیه‌ای موجود نیست</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function IngredientNutrition() {
  const [nutrition, setNutrition] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ calories: '', protein: '', fat: '', carbs: '' });

  const load = async () => {
    setLoading(true);
    try {
      const [nut, ings] = await Promise.all([api.get('/nutrition'), api.get('/ingredients')]);
      setNutrition(nut);
      setIngredients(ings);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const nutMap = {};
  nutrition.forEach(n => { nutMap[n.ingredient_id] = n; });

  const startEdit = (ing) => {
    const existing = nutMap[ing.id];
    setEditId(ing.id);
    setForm({
      calories: existing?.calories || '',
      protein: existing?.protein || '',
      fat: existing?.fat || '',
      carbs: existing?.carbs || '',
    });
  };

  const saveNutrition = async (ingredientId) => {
    try {
      await api.put(`/nutrition/${ingredientId}`, {
        calories: parseFloat(form.calories) || 0,
        protein: parseFloat(form.protein) || 0,
        fat: parseFloat(form.fat) || 0,
        carbs: parseFloat(form.carbs) || 0,
      });
      setEditId(null);
      load();
    } catch (e) { console.error(e); }
  };

  if (loading) return <div className="text-center py-12 text-gray-400">در حال بارگذاری...</div>;

  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-green-900 text-white">
          <tr>
            <th className="px-4 py-3 text-right">ماده اولیه</th>
            <th className="px-4 py-3 text-right">واحد</th>
            <th className="px-4 py-3 text-right">کالری</th>
            <th className="px-4 py-3 text-right">پروتئین (g)</th>
            <th className="px-4 py-3 text-right">چربی (g)</th>
            <th className="px-4 py-3 text-right">کربوهیدرات (g)</th>
            <th className="px-4 py-3 text-center">عملیات</th>
          </tr>
        </thead>
        <tbody>
          {ingredients.map(ing => {
            const n = nutMap[ing.id];
            const isEditing = editId === ing.id;
            return (
              <tr key={ing.id} className={`border-t ${isEditing ? 'bg-green-50' : 'hover:bg-gray-50'}`}>
                <td className="px-4 py-2 font-medium">{ing.name}</td>
                <td className="px-4 py-2"><span className="bg-gray-100 px-2 py-0.5 rounded text-xs">{ing.unit}</span></td>
                {isEditing ? (
                  <>
                    <td className="px-2 py-1"><input type="number" value={form.calories} onChange={e => setForm({...form, calories: e.target.value})} className="w-full px-2 py-1 border rounded text-sm" /></td>
                    <td className="px-2 py-1"><input type="number" step="0.1" value={form.protein} onChange={e => setForm({...form, protein: e.target.value})} className="w-full px-2 py-1 border rounded text-sm" /></td>
                    <td className="px-2 py-1"><input type="number" step="0.1" value={form.fat} onChange={e => setForm({...form, fat: e.target.value})} className="w-full px-2 py-1 border rounded text-sm" /></td>
                    <td className="px-2 py-1"><input type="number" step="0.1" value={form.carbs} onChange={e => setForm({...form, carbs: e.target.value})} className="w-full px-2 py-1 border rounded text-sm" /></td>
                    <td className="px-2 py-2 text-center">
                      <button onClick={() => saveNutrition(ing.id)} className="bg-green-600 text-white px-3 py-1 rounded text-xs mx-1">💾</button>
                      <button onClick={() => setEditId(null)} className="bg-gray-300 text-gray-700 px-3 py-1 rounded text-xs">✕</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-2 font-mono">{n?.calories ?? '—'}</td>
                    <td className="px-4 py-2 font-mono">{n?.protein ?? '—'}</td>
                    <td className="px-4 py-2 font-mono">{n?.fat ?? '—'}</td>
                    <td className="px-4 py-2 font-mono">{n?.carbs ?? '—'}</td>
                    <td className="px-4 py-2 text-center">
                      <button onClick={() => startEdit(ing)} className="text-blue-600 hover:text-blue-800 text-sm">✏️</button>
                    </td>
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function AllergenView() {
  const [allergens, setAllergens] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/nutrition/allergens')
      .then(setAllergens)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-12 text-gray-400">در حال بارگذاری...</div>;

  const allTypes = [...new Set(allergens.flatMap(r => r.allergens))].sort();

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-6">
        {allTypes.map(type => {
          const count = allergens.filter(r => r.allergens.includes(type)).length;
          return (
            <span key={type} className="bg-red-100 text-red-700 px-3 py-1.5 rounded-full text-sm font-medium">
              ⚠️ {type} ({count} غذا)
            </span>
          );
        })}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {allergens.filter(r => r.allergens.length > 0).map(r => (
          <div key={r.id} className="bg-white rounded-xl shadow-sm border p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold">{r.name}</h3>
              <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-xs">{r.category}</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {r.allergens.map(a => (
                <span key={a} className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs">⚠️ {a}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
      {allergens.filter(r => r.allergens.length === 0).length > 0 && (
        <div className="mt-6">
          <h3 className="font-bold text-green-700 mb-3">✅ بدون آلرژن ({allergens.filter(r => r.allergens.length === 0).length})</h3>
          <div className="flex flex-wrap gap-2">
            {allergens.filter(r => r.allergens.length === 0).map(r => (
              <span key={r.id} className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm">{r.name}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function NutriBox({ icon, label, value, unit, color }) {
  return (
    <div className={`${color} rounded-lg p-2 text-center`}>
      <div className="text-lg">{icon}</div>
      <div className="font-bold text-lg">{value}</div>
      <div className="text-[10px] opacity-70">{unit}</div>
      <div className="text-[10px] opacity-60">{label}</div>
    </div>
  );
}
