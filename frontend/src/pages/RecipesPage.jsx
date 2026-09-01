import { useState, useEffect } from 'react';
import { api } from '../utils/api';

export default function RecipesPage() {
  const [recipes, setRecipes] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editRecipe, setEditRecipe] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', category: 'main', yield_qty: 1, waste_factor: 1.0, menu_price: '' });
  const [recipeItems, setRecipeItems] = useState([]);
  const [nutrition, setNutrition] = useState({});
  const [allergens, setAllergens] = useState({});
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [recs, ings, allNut, allAlg] = await Promise.all([
        api.get('/recipes'), api.get('/ingredients'),
        api.get('/nutrition'), api.get('/nutrition/allergens'),
      ]);
      setRecipes(recs);
      setIngredients(ings);
      // Build nutrition lookup by ingredient_id
      const nutMap = {};
      allNut.forEach(n => { nutMap[n.ingredient_id] = n; });
      setNutrition(nutMap);
      // Build allergen lookup by recipe_id
      const algMap = {};
      allAlg.forEach(a => { algMap[a.id] = a.allergens; });
      setAllergens(algMap);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openForm = async (recipe = null) => {
    if (recipe) {
      setEditRecipe(recipe);
      setForm({
        name: recipe.name,
        description: recipe.description || '',
        category: recipe.category,
        yield_qty: recipe.yield_qty,
        waste_factor: recipe.waste_factor,
        menu_price: recipe.menu_price,
      });
      try {
        const items = await api.get(`/recipes/${recipe.id}`);
        setRecipeItems(items.items || []);
      } catch { setRecipeItems([]); }
    } else {
      setEditRecipe(null);
      setForm({ name: '', description: '', category: 'main', yield_qty: 1, waste_factor: 1.0, menu_price: '' });
      setRecipeItems([]);
    }
    setShowForm(true);
  };

  const handleSaveRecipe = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const payload = { ...form, yield_qty: parseFloat(form.yield_qty) || 1, waste_factor: parseFloat(form.waste_factor) || 1, menu_price: parseFloat(form.menu_price) || 0 };
      let recipeId;
      if (editRecipe) {
        await api.put(`/recipes/${editRecipe.id}`, payload);
        recipeId = editRecipe.id;
      } else {
        const res = await api.post('/recipes', payload);
        recipeId = res.id;
      }
      // Save recipe items
      for (const item of recipeItems) {
        if (item.id) {
          await api.put(`/recipes/${recipeId}/items/${item.id}`, { ingredient_id: item.ingredient_id, quantity: item.quantity });
        } else {
          await api.post(`/recipes/${recipeId}/items`, { ingredient_id: item.ingredient_id, quantity: item.quantity });
        }
      }
      setShowForm(false);
      load();
    } catch (e) { setError(e.message); }
  };

  const addRecipeItem = () => {
    setRecipeItems([...recipeItems, { ingredient_id: ingredients[0]?.id || 1, quantity: 0.1 }]);
  };

  const updateRecipeItem = (idx, field, value) => {
    const updated = [...recipeItems];
    updated[idx] = { ...updated[idx], [field]: field === 'quantity' ? parseFloat(value) || 0 : parseInt(value) };
    setRecipeItems(updated);
  };

  const removeRecipeItem = (idx) => {
    setRecipeItems(recipeItems.filter((_, i) => i !== idx));
  };

  const calcItemCost = (item) => {
    const ing = ingredients.find(i => i.id === item.ingredient_id);
    return ing ? item.quantity * ing.cost_per_unit : 0;
  };

  const calcTotalCost = () => recipeItems.reduce((sum, item) => sum + calcItemCost(item), 0);

  const getIngName = (id) => ingredients.find(i => i.id === id)?.name || '?';

  const handleDelete = async (id) => {
    if (!confirm('حذف دستور پخت?')) return;
    try { await api.delete(`/recipes/${id}`); load(); } catch (e) { setError(e.message); }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-green-900">🍳 دستور پخت | Recipes</h1>
          <p className="text-gray-500 text-sm mt-1">محاسبه هزینه و حاشیه سود هر دish</p>
        </div>
        <button onClick={() => openForm()} className="bg-green-900 hover:bg-green-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
          + دستور پخت جدید
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 overflow-y-auto py-8">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-3xl mx-4">
            <h3 className="text-lg font-bold mb-4">{editRecipe ? '✏️ ویرایش' : '➕ دستور جدید'}</h3>
            {error && <div className="bg-red-50 text-red-700 px-4 py-2 rounded mb-4 text-sm">{error}</div>}
            <form onSubmit={handleSaveRecipe} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="نام دish" className="px-4 py-2 border rounded-lg" required />
                <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="px-4 py-2 border rounded-lg">
                  <option value="main">غذای اصلی (Main)</option>
                  <option value="starter">پیش‌غذا (Starter)</option>
                  <option value="dessert">دسر (Dessert)</option>
                  <option value="drink">نوشیدنی (Drink)</option>
                </select>
              </div>
              <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="توضیحات" className="w-full px-4 py-2 border rounded-lg" rows={2} />
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-gray-500">تعداد پورسیون</label>
                  <input type="number" step="0.1" value={form.yield_qty} onChange={e => setForm({...form, yield_qty: e.target.value})} className="w-full px-4 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">ضریب ضایعات</label>
                  <input type="number" step="0.01" value={form.waste_factor} onChange={e => setForm({...form, waste_factor: e.target.value})} className="w-full px-4 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">قیمت منو (تومان)</label>
                  <input type="number" value={form.menu_price} onChange={e => setForm({...form, menu_price: e.target.value})} className="w-full px-4 py-2 border rounded-lg" />
                </div>
              </div>

              {/* Recipe Items */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-sm">مواد اولیه این دish</h4>
                  <button type="button" onClick={addRecipeItem} className="text-green-700 hover:text-green-900 text-sm font-medium">+ افزودن ماده</button>
                </div>
                {recipeItems.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 mb-2">
                    <select value={item.ingredient_id} onChange={e => updateRecipeItem(idx, 'ingredient_id', e.target.value)} className="flex-1 px-3 py-2 border rounded text-sm">
                      {ingredients.map(i => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
                    </select>
                    <input type="number" step="0.001" value={item.quantity} onChange={e => updateRecipeItem(idx, 'quantity', e.target.value)} className="w-24 px-3 py-2 border rounded text-sm" placeholder="مقدار" />
                    <span className="text-xs text-gray-500 w-24 text-left font-mono">{calcItemCost(item).toLocaleString('fa-IR')} ت</span>
                    <button type="button" onClick={() => removeRecipeItem(idx)} className="text-red-500 hover:text-red-700">✕</button>
                  </div>
                ))}
                {recipeItems.length > 0 && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm">
                    <div className="flex justify-between">
                      <span>هزینه کل مواد:</span>
                      <span className="font-bold font-mono">{calcTotalCost().toLocaleString('fa-IR')} تومان</span>
                    </div>
                    <div className="flex justify-between mt-1">
                      <span>هزینه با ضایعات:</span>
                      <span className="font-bold font-mono">{(calcTotalCost() * parseFloat(form.waste_factor || 1)).toLocaleString('fa-IR')} تومان</span>
                    </div>
                    <div className="flex justify-between mt-1">
                      <span>هزینه هر پورسیون:</span>
                      <span className="font-bold font-mono text-green-800">{((calcTotalCost() * parseFloat(form.waste_factor || 1)) / parseFloat(form.yield_qty || 1)).toLocaleString('fa-IR')} تومان</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 bg-green-900 hover:bg-green-800 text-white py-2 rounded-lg transition">ذخیره</button>
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 rounded-lg transition">انصراف</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Recipe List */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">در حال بارگذاری...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recipes.map(r => {
            const cost = r.cost_per_serving || 0;
            const price = r.menu_price || 0;
            const margin = price > 0 ? ((price - cost) / price * 100).toFixed(1) : '—';
            const foodCostPct = r.food_cost_percent || '—';

            return (
              <div key={r.id} className="bg-white rounded-xl shadow-sm border hover:shadow-md transition">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-lg">{r.name}</h3>
                    <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-xs">{r.category}</span>
                  </div>
                  <p className="text-gray-500 text-xs mb-3">{r.description}</p>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">هزینه هر پورسیون:</span>
                      <span className="font-mono font-bold">{cost.toLocaleString('fa-IR')} ت</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">قیمت منو:</span>
                      <span className="font-mono font-bold text-green-700">{price.toLocaleString('fa-IR')} ت</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">درصد هزینه غذا:</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${parseFloat(foodCostPct) > 35 ? 'bg-red-100 text-red-800' : parseFloat(foodCostPct) > 30 ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                        {foodCostPct}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">حاشیه سود:</span>
                      <span className="font-mono font-bold text-blue-700">{margin}%</span>
                    </div>
                    {/* Allergen badges */}
                    {allergens[r.id]?.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {allergens[r.id].map(a => (
                          <span key={a} className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-[10px] font-medium">⚠️ {a}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex border-t">
                  <button onClick={() => openForm(r)} className="flex-1 py-2 text-sm text-blue-600 hover:bg-blue-50 transition">✏️ ویرایش</button>
                  <button onClick={() => handleDelete(r.id)} className="flex-1 py-2 text-sm text-red-600 hover:bg-red-50 border-l transition">🗑️ حذف</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
