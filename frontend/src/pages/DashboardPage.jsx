import { useState, useEffect } from 'react';
import { api } from '../utils/api';

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get('/dashboard/stats'), api.get('/dashboard/cost-analysis'), api.get('/inventory/alerts')])
      .then(([stats, recipes, alerts]) => setStats({ ...stats, recipes, alerts }))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-900 mx-auto"></div>
          <p className="mt-4 text-gray-500">در حال بارگذاری...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-green-900">📊 داشبورد | Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">🌿🌊 جایی که جنگل به دریا می‌رسد · لالیم سر، مازندران</p>
      </div>

      {/* Inventory Alert Banner */}
      {stats?.alerts && stats.alerts.summary.alert_level !== 'ok' && (
        <div className={`mb-6 border-2 rounded-xl p-4 ${
          stats.alerts.summary.alert_level === 'critical' ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className={`font-bold ${stats.alerts.summary.alert_level === 'critical' ? 'text-red-700' : 'text-yellow-700'}`}>
                {stats.alerts.summary.alert_level === 'critical' ? '🚨 هشدار بحرانی انبار' : '⚠️ هشدار انبار'}
              </h3>
              <div className="text-sm mt-1 flex gap-4">
                {stats.alerts.summary.expired_count > 0 && <span className="text-red-600">منقضی: {stats.alerts.summary.expired_count}</span>}
                {stats.alerts.summary.expiring_count > 0 && <span className="text-yellow-600">نزدیک انقضا: {stats.alerts.summary.expiring_count}</span>}
                {stats.alerts.summary.out_of_stock_count > 0 && <span className="text-gray-600">تمام شده: {stats.alerts.summary.out_of_stock_count}</span>}
              </div>
            </div>
            <a href="/inventory" className="bg-green-900 hover:bg-green-800 text-white px-4 py-2 rounded-lg text-sm transition">
              مشاهده انبار →
            </a>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon="🥩" label="مواد اولیه" en="Ingredients" value={stats?.total_ingredients || 0} color="bg-red-50 border-red-200" />
        <StatCard icon="🍳" label="دستور پخت" en="Recipes" value={stats?.total_recipes || 0} color="bg-blue-50 border-blue-200" />
        <StatCard icon="📦" label="تأمین‌کنندگان" en="Suppliers" value={stats?.total_suppliers || 0} color="bg-purple-50 border-purple-200" />
        <StatCard icon="📊" label="میانگین هزینه" en="Avg Food Cost" value={(stats?.avg_food_cost_percent || 0) + '%'} color="bg-yellow-50 border-yellow-200" />
      </div>

      {/* Recipe Cost Table */}
      {stats?.recipes && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 bg-green-900 text-white">
            <h2 className="font-bold">💰 هزینه هر دdish | Recipe Costing</h2>
            <p className="text-green-300 text-sm mt-1">محاسبه خودکار هزینه و درصد هزینه غذا</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">دستور پخت</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">دسته‌بندی</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">هزینه مواد (خالص)</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">ضریب ضایعات</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">هزینه/porção</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">قیمت منو</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">درصد هزینه</th>
                </tr>
              </thead>
              <tbody>
                {stats.recipes.map((r) => (
                  <tr key={r.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{r.name}</td>
                    <td className="px-4 py-3">
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">{r.category}</span>
                    </td>
                    <td className="px-4 py-3 font-mono">{r.raw_cost?.toLocaleString('fa-IR')} ت</td>
                    <td className="px-4 py-3 font-mono">{((r.waste_factor - 1) * 100).toFixed(0)}% (+{(r.adjusted_cost - r.raw_cost)?.toLocaleString('fa-IR')} ت)</td>
                    <td className="px-4 py-3 font-mono font-bold text-orange-700">{Math.round(r.cost_per_serving)?.toLocaleString('fa-IR')} ت</td>
                    <td className="px-4 py-3 font-mono text-green-700">{r.menu_price?.toLocaleString('fa-IR')} ت</td>
                    <td className="px-4 py-3">
                      <FoodCostBadge percent={r.food_cost_percent} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, en, value, color }) {
  return (
    <div className={`${color} border rounded-xl p-4`}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-2xl font-bold text-gray-800">{value}</div>
          <div className="text-sm font-medium text-gray-600">{label}</div>
          <div className="text-xs text-gray-400">{en}</div>
        </div>
        <div className="text-3xl">{icon}</div>
      </div>
    </div>
  );
}

function FoodCostBadge({ percent }) {
  if (percent == null) return <span className="text-gray-400">—</span>;
  const p = parseFloat(percent);
  let color = 'bg-green-100 text-green-800';
  if (p > 35) color = 'bg-red-100 text-red-800';
  else if (p > 30) color = 'bg-yellow-100 text-yellow-800';
  return (
    <span className={`${color} px-2 py-1 rounded-full text-xs font-bold`}>
      {percent}%
    </span>
  );
}
