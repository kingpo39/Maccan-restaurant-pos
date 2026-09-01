import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useToast } from '../contexts/ToastContext';

export default function InventoryPage() {
  const [tab, setTab] = useState('stock');

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-green-900">📦 انبار و دریافت کالا | Inventory</h1>
        <p className="text-gray-500 text-sm mt-1">مدیریت موجودی، دریافت کالا و هشدار انقضا</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl">
        {[
          { id: 'stock', label: '📊 موجودی', en: 'Stock Levels' },
          { id: 'receive', label: '📥 دریافت کالا', en: 'Receive Goods' },
          { id: 'alerts', label: '⚠️ هشدارها', en: 'Alerts' },
          { id: 'log', label: '📋 تاریخچه', en: 'History' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition ${
              tab === t.id
                ? 'bg-green-900 text-white shadow'
                : 'text-gray-600 hover:bg-gray-200'
            }`}
          >
            {t.label}
            <span className="block text-xs opacity-70">{t.en}</span>
          </button>
        ))}
      </div>

      {tab === 'stock' && <StockLevels />}
      {tab === 'receive' && <ReceivingForm />}
      {tab === 'alerts' && <ExpiryAlerts />}
      {tab === 'log' && <InventoryLog />}
    </div>
  );
}

// ─── STOCK LEVELS ──────────────────────────────────────────
function StockLevels() {
  const [stock, setStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const toast = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const params = filter === 'low' ? '?low_stock_only=true' : filter === 'expiring' ? '?expired_only=true' : '';
      const data = await api.get(`/inventory/stock${params}`);
      setStock(data);
      // Fire alerts for out-of-stock items on first load
      if (filter === 'all') {
        const outOfStock = data.filter(s => s.status === 'out_of_stock');
        const expiring = data.filter(s => s.status === 'expiring' || s.status === 'near_expiry');
        if (outOfStock.length > 0) {
          toast.warning('مواد تمام شده ⚠️', `${outOfStock.length} ماده اولیه تمام شده است`);
        }
        if (expiring.length > 0) {
          toast.warning('نزدیک انقضا ⏰', `${expiring.length} ماده نزدیک انقضا است`);
        }
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [filter]);

  const statusColors = {
    ok: 'bg-green-100 text-green-800',
    near_expiry: 'bg-yellow-100 text-yellow-800',
    expiring: 'bg-orange-100 text-orange-800',
    out_of_stock: 'bg-red-100 text-red-800',
  };

  const statusIcons = {
    ok: '✅',
    near_expiry: '⏰',
    expiring: '🔴',
    out_of_stock: '❌',
  };

  return (
    <div>
      {/* Filter */}
      <div className="flex gap-2 mb-4">
        {[
          { id: 'all', label: 'همه', count: stock.length },
          { id: 'low', label: 'تمام شده', count: stock.filter(s => s.status === 'out_of_stock').length },
          { id: 'expiring', label: 'انقضا نزدیک', count: stock.filter(s => s.status === 'expiring' || s.status === 'near_expiry').length },
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              filter === f.id ? 'bg-green-900 text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'
            }`}
          >
            {f.label} ({f.count})
          </button>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="bg-white border rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-gray-800">{stock.length}</div>
          <div className="text-xs text-gray-500">کل مواد</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-green-700">{stock.filter(s => s.status === 'ok').length}</div>
          <div className="text-xs text-gray-500">موجود ✅</div>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-yellow-700">{stock.filter(s => s.status === 'near_expiry' || s.status === 'expiring').length}</div>
          <div className="text-xs text-gray-500">نزدیک انقضا ⏰</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-red-700">{stock.filter(s => s.status === 'out_of_stock').length}</div>
          <div className="text-xs text-gray-500">تمام شده ❌</div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">در حال بارگذاری...</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-green-900 text-white">
              <tr>
                <th className="px-4 py-3 text-right">#</th>
                <th className="px-4 py-3 text-right">ماده اولیه</th>
                <th className="px-4 py-3 text-right">واحد</th>
                <th className="px-4 py-3 text-right">موجودی فعلی</th>
                <th className="px-4 py-3 text-right">هزینه/واحد</th>
                <th className="px-4 py-3 text-right">تأمین‌کننده</th>
                <th className="px-4 py-3 text-right">تاریخ آخرین دریافت</th>
                <th className="px-4 py-3 text-right">انقضا</th>
                <th className="px-4 py-3 text-center">وضعیت</th>
              </tr>
            </thead>
            <tbody>
              {stock.map((item, idx) => (
                <tr key={item.id} className={`border-t ${item.status === 'out_of_stock' ? 'bg-red-50' : item.status === 'expiring' ? 'bg-orange-50' : item.status === 'near_expiry' ? 'bg-yellow-50' : 'hover:bg-gray-50'}`}>
                  <td className="px-4 py-3 text-gray-500">{idx + 1}</td>
                  <td className="px-4 py-3 font-medium">
                    {item.name}
                    {item.allergens?.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {item.allergens.map(a => (
                          <span key={a} className="bg-red-100 text-red-600 px-1.5 py-0.5 rounded text-[10px]">{a}</span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="bg-gray-100 px-2 py-0.5 rounded text-xs">{item.unit}</span>
                  </td>
                  <td className="px-4 py-3 font-mono font-bold">
                    {item.current_stock > 0 ? item.current_stock.toLocaleString('fa-IR') : <span className="text-red-600">۰</span>}
                  </td>
                  <td className="px-4 py-3 font-mono text-sm">
                    {item.cost_per_unit?.toLocaleString('fa-IR')} ت
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{item.supplier_name || '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{item.last_received || '—'}</td>
                  <td className="px-4 py-3 text-xs">
                    {item.next_expiry ? (
                      <span className={item.days_to_expiry <= 3 ? 'text-red-600 font-bold' : item.days_to_expiry <= 7 ? 'text-yellow-600' : 'text-gray-500'}>
                        {item.next_expiry}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`${statusColors[item.status]} px-2 py-1 rounded-full text-xs font-medium`}>
                      {statusIcons[item.status]} {item.status_label}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── RECEIVING FORM ──────────────────────────────────────────
function ReceivingForm() {
  const [ingredients, setIngredients] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const toast = useToast();

  useEffect(() => {
    api.get('/ingredients')
      .then(setIngredients)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const addItem = () => {
    setSelectedItems([...selectedItems, {
      ingredient_id: ingredients[0]?.id || 1,
      quantity: 1,
      unit_cost: 0,
      batch_date: new Date().toISOString().split('T')[0],
      expiry_date: '',
      note: ''
    }]);
  };

  const updateItem = (idx, field, value) => {
    const updated = [...selectedItems];
    updated[idx] = { ...updated[idx], [field]: value };
    setSelectedItems(updated);
  };

  const removeItem = (idx) => {
    setSelectedItems(selectedItems.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (selectedItems.length === 0) { setError('حداقل یک ردیف اضافه کنید'); return; }
    setError(''); setSaving(true); setResult(null);
    try {
      const payload = {
        items: selectedItems.map(item => ({
          ...item,
          quantity: parseFloat(item.quantity) || 0,
          unit_cost: parseFloat(item.unit_cost) || 0,
        }))
      };
      const res = await api.post('/inventory/receive', payload);
      setResult(res);
      setSelectedItems([]);
      res.items?.forEach(item => {
        toast.stockReceived(item.ingredient_name, item.received_qty);
      });
    } catch (e) { setError(e.message); }
    setSaving(false);
  };

  const getIngName = (id) => ingredients.find(i => i.id === parseInt(id))?.name || '?';
  const getIngUnit = (id) => ingredients.find(i => i.id === parseInt(id))?.unit || '';

  const filteredIngredients = ingredients.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="🔍 جستجوی ماده اولیه..."
          className="w-full max-w-md px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
        />
      </div>

      {/* Result */}
      {result && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
          <h4 className="font-bold text-green-800 mb-2">✅ با موفقیت دریافت شد</h4>
          {result.items.map((item, i) => (
            <div key={i} className="text-sm text-green-700">
              • {item.ingredient_name}: {item.received_qty} دریافت | میانگین جدید: {item.new_avg_cost?.toLocaleString('fa-IR')} ت | موجودی: {item.total_stock}
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>
      )}

      {/* Items */}
      {selectedItems.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border">
          <div className="text-4xl mb-3">📥</div>
          <p className="text-gray-500 mb-4">هنوز کالایی اضافه نشده</p>
          <button onClick={addItem} className="bg-green-900 hover:bg-green-800 text-white px-6 py-2 rounded-lg transition">
            + افزودن ردیف دریافت
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-3 mb-4">
            {selectedItems.map((item, idx) => (
              <div key={idx} className="bg-white border rounded-xl p-4 flex items-center gap-3">
                <div className="flex-1 grid grid-cols-2 md:grid-cols-5 gap-3">
                  <select
                    value={item.ingredient_id}
                    onChange={e => updateItem(idx, 'ingredient_id', e.target.value)}
                    className="px-3 py-2 border rounded-lg text-sm"
                  >
                    {filteredIngredients.map(i => (
                      <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>
                    ))}
                  </select>
                  <div>
                    <label className="text-xs text-gray-400">مقدار</label>
                    <input type="number" step="0.1" value={item.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">هزینه واحد (تومان)</label>
                    <input type="number" value={item.unit_cost} onChange={e => updateItem(idx, 'unit_cost', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">تاریخ دریافت</label>
                    <input type="date" value={item.batch_date} onChange={e => updateItem(idx, 'batch_date', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">تاریخ انقضا</label>
                    <input type="date" value={item.expiry_date} onChange={e => updateItem(idx, 'expiry_date', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-mono font-bold text-green-700">
                    {((parseFloat(item.quantity) || 0) * (parseFloat(item.unit_cost) || 0)).toLocaleString('fa-IR')} ت
                  </div>
                </div>
                <button onClick={() => removeItem(idx)} className="text-red-500 hover:text-red-700 text-lg">✕</button>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button onClick={addItem} className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm transition">
              + ردیف دیگر
            </button>
            <button onClick={handleSubmit} disabled={saving} className="flex-1 bg-green-900 hover:bg-green-800 text-white py-3 rounded-lg font-medium transition disabled:opacity-50">
              {saving ? 'در حال ذخیره...' : `📥 تأیید دریافت (${selectedItems.length} ردیف)`}
            </button>
            <button onClick={() => { setSelectedItems([]); setResult(null); setError(''); }} className="bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-lg text-sm transition">
              پاک کردن
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── EXPIRY ALERTS ──────────────────────────────────────────
function ExpiryAlerts() {
  const [alerts, setAlerts] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/inventory/alerts')
      .then(setAlerts)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-12 text-gray-400">در حال بارگذاری...</div>;
  if (!alerts) return <div className="text-center py-12 text-red-400">خطا در بارگذاری</div>;

  const levelColors = {
    ok: 'bg-green-100 border-green-300 text-green-800',
    warning: 'bg-yellow-100 border-yellow-300 text-yellow-800',
    critical: 'bg-red-100 border-red-300 text-red-800',
  };

  return (
    <div>
      {/* Alert Level Banner */}
      <div className={`border-2 rounded-xl p-4 mb-6 ${levelColors[alerts.summary.alert_level]}`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-lg">
              {alerts.summary.alert_level === 'ok' ? '✅ همه چیز مرتب است' :
               alerts.summary.alert_level === 'warning' ? '⚠️ هشدار: کالاهای نزدیک انقضا' :
               '🚨 هشدار بحرانی: کالاهای منقضی شده'}
            </h3>
            <p className="text-sm mt-1">
              منقضی: {alerts.summary.expired_count} | نزدیک انقضا: {alerts.summary.expiring_count} | تمام شده: {alerts.summary.out_of_stock_count}
            </p>
          </div>
        </div>
      </div>

      {/* Expired Items */}
      {alerts.expired.length > 0 && (
        <div className="mb-6">
          <h3 className="font-bold text-red-700 mb-3">🚨 کالاهای منقضی شده ({alerts.expired.length})</h3>
          <div className="bg-white border-2 border-red-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-red-50">
                <tr>
                  <th className="px-4 py-3 text-right">ماده</th>
                  <th className="px-4 py-3 text-right">واحد</th>
                  <th className="px-4 py-3 text-right">تاریخ انقضا</th>
                  <th className="px-4 py-3 text-right">روز گذشته</th>
                  <th className="px-4 py-3 text-right">تأمین‌کننده</th>
                </tr>
              </thead>
              <tbody>
                {alerts.expired.map((item, i) => (
                  <tr key={i} className="border-t bg-red-50">
                    <td className="px-4 py-3 font-medium">{item.name}</td>
                    <td className="px-4 py-3">{item.unit}</td>
                    <td className="px-4 py-3 text-red-600 font-bold">{item.expiry_date}</td>
                    <td className="px-4 py-3 text-red-600">{item.days_past} روز پیش</td>
                    <td className="px-4 py-3 text-gray-500">{item.supplier_name || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Expiring Soon */}
      {alerts.expiring_soon.length > 0 && (
        <div className="mb-6">
          <h3 className="font-bold text-yellow-700 mb-3">⏰ نزدیک انقضا ({alerts.expiring_soon.length})</h3>
          <div className="bg-white border-2 border-yellow-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-yellow-50">
                <tr>
                  <th className="px-4 py-3 text-right">ماده</th>
                  <th className="px-4 py-3 text-right">تاریخ انقضا</th>
                  <th className="px-4 py-3 text-right">روز مانده</th>
                  <th className="px-4 py-3 text-right">مقدار</th>
                  <th className="px-4 py-3 text-right">تأمین‌کننده</th>
                </tr>
              </thead>
              <tbody>
                {alerts.expiring_soon.map((item, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-4 py-3 font-medium">{item.name}</td>
                    <td className="px-4 py-3 text-yellow-600">{item.expiry_date}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${item.days_left <= 1 ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {item.days_left} روز
                      </span>
                    </td>
                    <td className="px-4 py-3">{item.quantity} {item.unit}</td>
                    <td className="px-4 py-3 text-gray-500">{item.supplier_name || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Out of Stock */}
      {alerts.out_of_stock.length > 0 && (
        <div className="mb-6">
          <h3 className="font-bold text-gray-700 mb-3">📭 تمام شده ({alerts.out_of_stock.length})</h3>
          <div className="bg-white border rounded-xl p-4">
            <div className="flex flex-wrap gap-2">
              {alerts.out_of_stock.map((item, i) => (
                <span key={i} className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg text-sm">
                  {item.name}
                  {item.supplier_name && <span className="text-gray-400 text-xs mr-1">({item.supplier_name})</span>}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {alerts.expired.length === 0 && alerts.expiring_soon.length === 0 && alerts.out_of_stock.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border">
          <div className="text-4xl mb-3">🎉</div>
          <p className="text-gray-500">همه مواد اولیه موجود و سالم هستند!</p>
        </div>
      )}
    </div>
  );
}

// ─── INVENTORY LOG ──────────────────────────────────────────
function InventoryLog() {
  const [log, setLog] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/inventory/log?limit=100')
      .then(setLog)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-12 text-gray-400">در حال بارگذاری...</div>;

  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-green-900 text-white">
          <tr>
            <th className="px-4 py-3 text-right">تاریخ</th>
            <th className="px-4 py-3 text-right">ماده</th>
            <th className="px-4 py-3 text-right">تغییر مقدار</th>
            <th className="px-4 py-3 text-right">هزینه</th>
            <th className="px-4 py-3 text-right">تاریخ دریافت</th>
            <th className="px-4 py-3 text-right">انقضا</th>
            <th className="px-4 py-3 text-right">یادداشت</th>
          </tr>
        </thead>
        <tbody>
          {log.map((item, idx) => (
            <tr key={item.id || idx} className="border-t hover:bg-gray-50">
              <td className="px-4 py-3 text-xs text-gray-500">{item.created_at}</td>
              <td className="px-4 py-3 font-medium">{item.ingredient_name}</td>
              <td className="px-4 py-3 font-mono">
                <span className={item.quantity_change > 0 ? 'text-green-600 font-bold' : 'text-red-600'}>
                  {item.quantity_change > 0 ? '+' : ''}{item.quantity_change} {item.ingredient_unit}
                </span>
              </td>
              <td className="px-4 py-3 font-mono">{item.cost > 0 ? item.cost.toLocaleString('fa-IR') + ' ت' : '—'}</td>
              <td className="px-4 py-3 text-xs">{item.batch_date || '—'}</td>
              <td className="px-4 py-3 text-xs">{item.expiry_date || '—'}</td>
              <td className="px-4 py-3 text-xs text-gray-500">{item.note || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {log.length === 0 && <div className="text-center py-8 text-gray-400">هنوز تراکنشی ثبت نشده</div>}
    </div>
  );
}
