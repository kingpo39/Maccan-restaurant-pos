import { useState, useEffect } from 'react';
import { api } from '../utils/api';

export default function IngredientsPage() {
  const [ingredients, setIngredients] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ name: '', nameFa: '', unit: 'kg', cost_per_unit: '', supplier_id: '', allergens: '' });
  const [filter, setFilter] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [ings, sups, stock] = await Promise.all([api.get('/ingredients'), api.get('/suppliers'), api.get('/inventory/stock')]);
      // Merge stock data into ingredients
      const stockMap = {};
      stock.forEach(s => { stockMap[s.id] = s; });
      const merged = ings.map(i => ({ ...i, stock: stockMap[i.id] }));
      setIngredients(merged);
      setSuppliers(sups);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const payload = {
        ...form,
        cost_per_unit: parseFloat(form.cost_per_unit) || 0,
        supplier_id: form.supplier_id ? parseInt(form.supplier_id) : null,
        allergens: form.allergens ? JSON.stringify(form.allergens.split(',').map(s => s.trim())) : '[]',
      };
      if (editItem) {
        await api.put(`/ingredients/${editItem.id}`, payload);
      } else {
        await api.post('/ingredients', payload);
      }
      setShowForm(false);
      setEditItem(null);
      resetForm();
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('آیا مطمئن هستید? | Are you sure?')) return;
    try {
      await api.delete(`/ingredients/${id}`);
      load();
    } catch (e) { setError(e.message); }
  };

  const startEdit = (item) => {
    setEditItem(item);
    setForm({
      name: item.name,
      nameFa: item.nameFa || '',
      unit: item.unit,
      cost_per_unit: item.cost_per_unit,
      supplier_id: item.supplier_id || '',
      allergens: parseAllergens(item.allergens).join(', '),
    });
    setShowForm(true);
  };

  const resetForm = () => setForm({ name: '', nameFa: '', unit: 'kg', cost_per_unit: '', supplier_id: '', allergens: '' });

  const filtered = ingredients.filter(i =>
    i.name.toLowerCase().includes(filter.toLowerCase()) ||
    (i.nameFa && i.nameFa.includes(filter)) ||
    i.unit.toLowerCase().includes(filter.toLowerCase())
  );

  const getSupplierName = (id) => suppliers.find(s => s.id === id)?.name || '—';

  // allergens can arrive as a parsed array, a JSON string, or a raw comma string
  const parseAllergens = (allergens) => {
    if (!allergens) return [];
    if (Array.isArray(allergens)) return allergens;
    try {
      const parsed = JSON.parse(allergens);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return allergens.split(',').map(s => s.trim()).filter(Boolean);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-green-900">🥩 مواد اولیه | Ingredients</h1>
          <p className="text-gray-500 text-sm mt-1">مدیریت مواد اولیه و قیمت‌ها</p>
        </div>
        <button
          onClick={() => { resetForm(); setEditItem(null); setShowForm(true); }}
          className="bg-green-900 hover:bg-green-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          + افزودن ماده جدید
        </button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="🔍 جستجو بر اساس نام فارسی یا انگلیسی..."
          className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
        />
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg">
            <h3 className="text-lg font-bold mb-4">{editItem ? '✏️ ویرایش ماده' : '➕ ماده جدید'}</h3>
            {error && <div className="bg-red-50 text-red-700 px-4 py-2 rounded mb-4 text-sm">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="نام انگلیسی | English Name"
                  className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                  required
                />
                <input
                  type="text"
                  value={form.nameFa}
                  onChange={(e) => setForm({ ...form, nameFa: e.target.value })}
                  placeholder="نام فارسی | Persian Name"
                  className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                  dir="rtl"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <select
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  className="px-4 py-2 border rounded-lg"
                >
                  <option value="kg">کیلو (kg)</option>
                  <option value="g">گرم (g)</option>
                  <option value="L">لیتر (L)</option>
                  <option value="ea">عدد (ea)</option>
                  <option value="pcs">عدد (pcs)</option>
                  <option value="pack">بسته (pack)</option>
                  <option value="box">جعبه (box)</option>
                  <option value="roll">رول (roll)</option>
                </select>
                <input
                  type="number"
                  step="0.01"
                  value={form.cost_per_unit}
                  onChange={(e) => setForm({ ...form, cost_per_unit: e.target.value })}
                  placeholder="هزینه هر واحد (تومان)"
                  className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                  required
                />
              </div>
              <select
                value={form.supplier_id}
                onChange={(e) => setForm({ ...form, supplier_id: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
              >
                <option value="">انتخاب تأمین‌کننده...</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <input
                type="text"
                value={form.allergens}
                onChange={(e) => setForm({ ...form, allergens: e.target.value })}
                placeholder="آلرژن‌ها: fish, dairy, gluten (با کاما)"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
              />
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 bg-green-900 hover:bg-green-800 text-white py-2 rounded-lg transition">
                  {editItem ? 'ذخیره تغییرات' : 'افزودن'}
                </button>
                <button type="button" onClick={() => { setShowForm(false); setEditItem(null); }} className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 rounded-lg transition">
                  انصراف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">در حال بارگذاری...</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-green-900 text-white">
              <tr>
                <th className="px-4 py-3 text-right">#</th>
                <th className="px-4 py-3 text-right">نام | Name</th>
                <th className="px-4 py-3 text-right">واحد</th>
                <th className="px-4 py-3 text-right">هزینه/واحد</th>
                <th className="px-4 py-3 text-right">موجودی</th>
                <th className="px-4 py-3 text-right">تأمین‌کننده</th>
                <th className="px-4 py-3 text-right">آلرژن</th>
                <th className="px-4 py-3 text-center">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item, idx) => (
                <tr key={item.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500">{idx + 1}</td>
                  <td className="px-4 py-3">
                    <span className="font-medium">{item.name}</span>
                    {item.nameFa && (
                      <span className="block text-xs text-gray-500" dir="rtl">{item.nameFa}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="bg-gray-100 px-2 py-1 rounded text-xs">{item.unit}</span>
                  </td>
                  <td className="px-4 py-3 font-mono font-bold text-green-800">
                    {item.cost_per_unit?.toLocaleString('fa-IR')} ت
                  </td>
                  <td className="px-4 py-3">
                    {item.stock ? (
                      <span className={`font-mono font-bold ${item.stock.current_stock > 0 ? 'text-green-700' : 'text-red-600'}`}>
                        {item.stock.current_stock} {item.unit}
                        {item.stock.current_stock <= 0 && <span className="text-xs block text-red-500">تمام شده</span>}
                      </span>
                    ) : <span className="text-gray-300 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{getSupplierName(item.supplier_id)}</td>
                  <td className="px-4 py-3">
                    {parseAllergens(item.allergens).length > 0
                      ? parseAllergens(item.allergens).map(a => (
                          <span key={a} className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs ml-1">{a}</span>
                        ))
                      : <span className="text-gray-300">—</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => startEdit(item)} className="text-blue-600 hover:text-blue-800 mx-1">✏️</button>
                    <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-800 mx-1">🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-8 text-gray-400">ماده‌ای یافت نشد</div>
          )}
        </div>
      )}
    </div>
  );
}
