import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useToast } from '../contexts/ToastContext';

export default function TablesPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-green-900">🍽️ میزها و سفارش | Tables & Orders</h1>
      <p className="text-gray-500 text-sm mt-1 mb-6">مدیریت میزها و ثبت سفارش جدید</p>
      <TablesView />
    </div>
  );
}

function TablesView() {
  const [tables, setTables] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showOrderForm, setShowOrderForm] = useState(null); // table or null
  const [orderResult, setOrderResult] = useState(null);
  const toast = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const [t, o] = await Promise.all([
        api.get('/orders/tables'),
        api.get('/orders?active=true'),
      ]);
      // Backend returns status as FREE/OCCUPIED/RESERVED; the UI config below
      // is keyed lowercase (free/occupied/reserved). Normalize once on load so
      // status colors, icons, counts, and the click-to-order handler all work.
      setTables((t || []).map(tb => ({ ...tb, status: String(tb.status || 'free').toLowerCase() })));
      setOrders(o || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const statusConfig = {
    free: { color: 'bg-green-100 border-green-300 hover:border-green-500', icon: '🟢', label: 'آزاد' },
    occupied: { color: 'bg-red-100 border-red-300 hover:border-red-500', icon: '🔴', label: 'اشغال' },
    reserved: { color: 'bg-yellow-100 border-yellow-300 hover:border-yellow-500', icon: '🟡', label: 'رزرو' },
  };

  const zoneConfig = {
    'Indoor': { icon: '🏠', label: 'سالن اصلی' },
    'VIP': { icon: '⭐', label: 'ویژه' },
    'Garden': { icon: '🌿', label: 'باغچه' },
  };

  // Group tables by zone
  const zones = {};
  tables.forEach(t => {
    const zone = t.label.includes('VIP') ? 'VIP' : t.label.includes('Garden') ? 'Garden' : 'Indoor';
    if (!zones[zone]) zones[zone] = [];
    zones[zone].push(t);
  });

  return (
    <div>
      {/* Summary */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-green-700">{tables.filter(t => t.status === 'free').length}</div>
          <div className="text-xs text-gray-500">🟢 آزاد</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-red-700">{tables.filter(t => t.status === 'occupied').length}</div>
          <div className="text-xs text-gray-500">🔴 اشغال</div>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-yellow-700">{tables.filter(t => t.status === 'reserved').length}</div>
          <div className="text-xs text-gray-500">🟡 رزرو</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-blue-700">{orders.length}</div>
          <div className="text-xs text-gray-500">📋 سفارش فعال</div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">در حال بارگذاری...</div>
      ) : (
        <div className="space-y-6">
          {Object.entries(zones).map(([zone, zoneTables]) => (
            <div key={zone}>
              <h3 className="font-bold text-gray-700 mb-3">
                {zoneConfig[zone]?.icon} {zoneConfig[zone]?.label || zone}
                <span className="text-sm font-normal text-gray-400 mr-2">({zoneTables.length} میز)</span>
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {zoneTables.map(table => {
                  const st = statusConfig[table.status] || statusConfig.free;
                  const activeOrder = orders.find(o => o.table_id === table.id);
                  return (
                    <div
                      key={table.id}
                      className={`${st.color} border-2 rounded-xl p-4 cursor-pointer transition-all hover:shadow-md`}
                      onClick={() => {
                        if (table.status === 'free') {
                          setShowOrderForm(table);
                        }
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xl font-bold">{table.label}</span>
                        <span className="text-sm">{st.icon}</span>
                      </div>
                      <div className="text-xs text-gray-600">
                        ظرفیت: {table.capacity} نفر
                      </div>
                      <div className="text-xs text-gray-500 mt-1">{st.label}</div>
                      {activeOrder && (
                        <div className="mt-2 bg-white/60 rounded-lg px-2 py-1 text-xs">
                          <div className="font-medium">سفارش #{activeOrder.id}</div>
                          <div className="text-gray-500">{activeOrder.items?.length} آیتم • {activeOrder.status}</div>
                        </div>
                      )}
                      {table.status === 'free' && (
                        <div className="mt-2 text-xs text-green-700 font-medium">+ سفارش جدید</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Order Form Modal */}
      {showOrderForm && (
        <OrderFormModal
          table={showOrderForm}
          onClose={() => { setShowOrderForm(null); setOrderResult(null); }}
          onCreated={(order) => { setOrderResult(order); setShowOrderForm(null); load(); toast.orderPlaced(order.table_label, order.items?.length || 0); }}
        />
      )}

      {/* Order Created Success */}
      {orderResult && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
            <div className="text-5xl mb-4">✅</div>
            <h3 className="text-xl font-bold text-green-900 mb-2">سفارش ثبت شد!</h3>
            <p className="text-gray-600 mb-4">
              میز {orderResult.table_label} — سفارش #{orderResult.id}
            </p>
            <div className="bg-gray-50 rounded-lg p-4 mb-6 text-right">
              {orderResult.items?.map((item, i) => (
                <div key={i} className="flex justify-between py-1 text-sm">
                  <span>{item.recipe_name} × {item.quantity}</span>
                  {item.notes && <span className="text-gray-400 text-xs">({item.notes})</span>}
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mb-4">👨‍🍳 سفارش به صفحه آشپزخانه (KDS) ارسال شد</p>
            <button
              onClick={() => setOrderResult(null)}
              className="bg-green-900 hover:bg-green-800 text-white px-6 py-3 rounded-lg font-medium transition"
            >
              بستن
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function OrderFormModal({ table, onClose, onCreated }) {
  const [recipes, setRecipes] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/recipes')
      .then(setRecipes)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const addItem = (recipe) => {
    // Check if already in the list
    const existing = items.find(i => i.recipe_id === recipe.id);
    if (existing) {
      setItems(items.map(i => i.recipe_id === recipe.id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setItems([...items, { recipe_id: recipe.id, recipe_name: recipe.name, recipe_category: recipe.category, quantity: 1, notes: '', menu_price: recipe.menu_price }]);
    }
  };

  const updateItem = (idx, field, value) => {
    setItems(items.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const removeItem = (idx) => setItems(items.filter((_, i) => i !== idx));

  const handleSubmit = async () => {
    if (items.length === 0) { setError('حداقل یک آیتم اضافه کنید'); return; }
    setSaving(true); setError('');
    try {
      const res = await api.post('/orders', {
        table_id: table.id,
        items: items.map(i => ({ recipe_id: i.recipe_id, quantity: i.quantity, notes: i.notes })),
      });
      onCreated(res);
    } catch (e) { setError(e.message); }
    setSaving(false);
  };

  const total = items.reduce((sum, i) => sum + (i.menu_price || 0) * i.quantity, 0);
  const filtered = recipes.filter(r => r.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-green-900 text-white px-6 py-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg">🍽️ سفارش میز {table.label}</h3>
            <div className="text-sm text-green-300">ظرفیت: {table.capacity} نفر</div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {error && <div className="bg-red-50 text-red-700 px-4 py-2 rounded-lg mb-4 text-sm">{error}</div>}

          {/* Search + Recipe Grid */}
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="🔍 جستجوی غذا..."
            className="w-full px-4 py-2 border rounded-lg mb-3 focus:ring-2 focus:ring-green-500 outline-none"
          />

          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-6">
            {filtered.map(r => (
              <button
                key={r.id}
                onClick={() => addItem(r)}
                className="text-right bg-gray-50 hover:bg-green-50 border hover:border-green-300 rounded-lg px-3 py-2 transition text-sm"
              >
                <div className="font-medium">{r.name}</div>
                <div className="text-xs text-gray-500">{r.menu_price?.toLocaleString('fa-IR')} ت • {r.category}</div>
              </button>
            ))}
          </div>

          {/* Selected Items */}
          {items.length > 0 && (
            <div>
              <h4 className="font-bold text-sm text-gray-700 mb-2">آیتم‌های انتخاب شده:</h4>
              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 bg-green-50 rounded-lg px-4 py-2">
                    <div className="flex-1">
                      <span className="font-medium">{item.recipe_name}</span>
                      {item.notes && <span className="text-xs text-gray-400 mr-2">({item.notes})</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateItem(idx, 'quantity', Math.max(1, item.quantity - 1))} className="w-7 h-7 bg-white border rounded text-sm hover:bg-gray-100">−</button>
                      <span className="font-mono w-6 text-center">{item.quantity}</span>
                      <button onClick={() => updateItem(idx, 'quantity', item.quantity + 1)} className="w-7 h-7 bg-white border rounded text-sm hover:bg-gray-100">+</button>
                    </div>
                    <input
                      type="text"
                      value={item.notes}
                      onChange={e => updateItem(idx, 'notes', e.target.value)}
                      placeholder="یادداشت..."
                      className="w-24 px-2 py-1 border rounded text-xs"
                    />
                    <div className="font-mono text-sm w-20 text-left">{((item.menu_price || 0) * item.quantity).toLocaleString('fa-IR')} ت</div>
                    <button onClick={() => removeItem(idx)} className="text-red-500 hover:text-red-700">✕</button>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center mt-3 pt-3 border-t font-bold">
                <span>جمع کل:</span>
                <span className="text-green-700">{total.toLocaleString('fa-IR')} تومان</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4 flex gap-3">
          <button onClick={onClose} className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 rounded-lg transition">انصراف</button>
          <button
            onClick={handleSubmit}
            disabled={saving || items.length === 0}
            className="flex-1 bg-green-900 hover:bg-green-800 text-white py-3 rounded-lg font-medium transition disabled:opacity-50"
          >
            {saving ? 'در حال ثبت...' : `🍽️ ثبت سفارش (${items.length} آیتم)`}
          </button>
        </div>
      </div>
    </div>
  );
}
