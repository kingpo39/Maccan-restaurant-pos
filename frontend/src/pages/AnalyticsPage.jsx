import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, RadialBarChart, RadialBar,
  AreaChart, Area,
} from 'recharts';

const COLORS = ['#2d5016', '#4a8a2a', '#c8a951', '#e8a030', '#d45050', '#1a7a8a', '#6b4fa0'];

export default function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/analytics/overview')
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="p-8 flex items-center justify-center h-full">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-900 mx-auto"></div>
        <p className="mt-4 text-gray-500">در حال بارگذاری تحلیل‌ها...</p>
      </div>
    </div>
  );

  if (!data) return <div className="p-8 text-center text-red-500">خطا در بارگذاری</div>;

  // The NestJS /analytics/overview returns counts/today/costAnalysis instead of
  // the legacy Express shape (dishes/summary/margin_distribution/...). Normalize
  // the real payload so every section below renders from actual data.
  const rawDishes = Array.isArray(data.costAnalysis)
    ? data.costAnalysis
    : Array.isArray(data.dishes)
    ? data.dishes
    : [];
  const dishes = rawDishes.map(d => {
    const menu_price = d.menuPrice ?? d.menu_price ?? 0;
    const cost_per_serving = d.costPerServing ?? d.cost_per_serving ?? 0;
    const food_cost_percent = d.foodCostPercent ?? d.food_cost_percent ?? 0;
    const profit_per_serving = d.profit ?? d.profit_per_serving ?? (menu_price - cost_per_serving);
    return {
      ...d,
      name: d.name || '—',
      category: d.category || 'other',
      menu_price,
      cost_per_serving,
      food_cost_percent,
      profit_per_serving,
      // No order history yet, so order-based metrics are present but zero.
      order_count: d.order_count ?? 0,
      total_revenue: d.total_revenue ?? 0,
      total_actual_cost: d.total_actual_cost ?? 0,
      total_profit: d.total_profit ?? profit_per_serving,
    };
  });

  const summary = {
    total_revenue: data.today?.revenue ?? 0,
    total_profit: 0,
    avg_food_cost_percent: data.avgFoodCostPercent ?? 0,
    total_orders: data.today?.orderCount ?? 0,
  };
  const top_profit = [...dishes].sort((a, b) => b.total_profit - a.total_profit).slice(0, 5);
  const most_ordered = [...dishes].filter(d => d.order_count > 0).sort((a, b) => b.order_count - a.order_count).slice(0, 5);

  // Prepare chart data
  const foodCostData = dishes
    .filter(d => d.food_cost_percent > 0)
    .sort((a, b) => a.food_cost_percent - b.food_cost_percent)
    .map(d => ({
      name: d.name.length > 14 ? d.name.substring(0, 14) + '…' : d.name,
      fullName: d.name,
      'درصد هزینه': Math.round(d.food_cost_percent * 10) / 10,
      category: d.category,
    }));

  const profitData = dishes
    .filter(d => d.order_count > 0)
    .sort((a, b) => b.total_profit - a.total_profit)
    .map(d => ({
      name: d.name.length > 14 ? d.name.substring(0, 14) + '…' : d.name,
      fullName: d.name,
      سود: Math.round(d.total_profit),
      درآمد: Math.round(d.total_revenue),
      هزینه: Math.round(d.total_actual_cost),
    }));

  // Margin buckets derived from food-cost percent (no order history yet).
  const bucket = (pred) => dishes.filter(pred).length;
  const margin_distribution = {
    high: bucket(d => d.food_cost_percent < 25),
    medium: bucket(d => d.food_cost_percent >= 25 && d.food_cost_percent <= 35),
    low: bucket(d => d.food_cost_percent > 35 && d.food_cost_percent <= 50),
    loss: bucket(d => d.food_cost_percent > 50),
  };
  const marginPieData = [
    { name: 'حاشیه بالا (<25%)', value: margin_distribution.high, color: '#2d5016' },
    { name: 'حاشیه متوسط (25-35%)', value: margin_distribution.medium, color: '#c8a951' },
    { name: 'حاشیه پایین (35-50%)', value: margin_distribution.low, color: '#e8a030' },
    { name: 'زیان‌ده (>50%)', value: margin_distribution.loss, color: '#d45050' },
  ].filter(d => d.value > 0);

  const catAgg = {};
  for (const d of dishes) {
    if (!catAgg[d.category]) catAgg[d.category] = { category: d.category, total_revenue: 0, total_profit: 0, total_orders: 0, count: 0 };
    catAgg[d.category].count += 1;
  }
  const categories = Object.values(catAgg);
  const revenueByCategory = categories.map((c, i) => ({
    name: c.category,
    درآمد: Math.round(c.total_revenue),
    سود: Math.round(c.total_profit),
    سفارشات: c.total_orders,
    count: c.count,
    color: COLORS[i % COLORS.length],
  }));

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-green-900">📈 تحلیل‌ها | Analytics</h1>
        <p className="text-gray-500 text-sm mt-1">نمودار سود، هزینه و عملکرد منو</p>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <KPICard label="درآمد کل" value={`${Math.round(summary.total_revenue).toLocaleString('fa-IR')} ت`} unit="امروز | Today" color="text-green-700" icon="💰" />
        <KPICard label="سود خالص" value={`${Math.round(summary.total_profit).toLocaleString('fa-IR')} ت`} unit="امروز | Today" color="text-blue-700" icon="📈" />
        <KPICard label="میانگین هزینه" value={`${summary.avg_food_cost_percent}%`} unit="food cost" color="text-yellow-700" icon="📊" />
        <KPICard label="تعداد سفارشات" value={summary.total_orders} unit="order" color="text-purple-700" icon="🛒" />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        
        {/* Food Cost % Bar Chart */}
        <ChartCard title="💰 درصد هزینه غذا | Food Cost %" subtitle="هرچه کمتر بهتر (هدف: زیر ۳۰٪)">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={foodCostData} layout="vertical" margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" domain={[0, 'auto']} tickFormatter={v => v + '%'} tick={{ fontSize: 11 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={100} />
              <Tooltip formatter={(v) => [v + '%', 'درصد هزینه']} labelFormatter={(l) => l} />
              <Bar dataKey="درصد هزینه" radius={[0, 6, 6, 0]}>
                {foodCostData.map((entry) => (
                  <Cell key={entry.name} fill={entry['درصد هزینه'] > 35 ? '#d45050' : entry['درصد هزینه'] > 25 ? '#c8a951' : '#2d5016'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Profit per Dish */}
        <ChartCard title="📈 سود هر دish | Profit per Dish" subtitle="بر اساس تعداد سفارشات">
          {profitData.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={profitData} margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={v => Math.round(v).toLocaleString('fa-IR')} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => [v.toLocaleString('fa-IR') + ' ت', '']} />
                <Legend />
                <Bar dataKey="درآمد" fill="#4a8a2a" radius={[4, 4, 0, 0]} />
                <Bar dataKey="سود" fill="#c8a951" radius={[4, 4, 0, 0]} />
                <Bar dataKey="هزینه" fill="#d45050" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-400">هنوز سفارشی ثبت نشده</div>
          )}
        </ChartCard>

        {/* Margin Distribution Pie */}
        <ChartCard title="🎯 توزیع حاشیه سود | Margin Distribution" subtitle="تعداد دish‌ها در هر سطح سودآوری">
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={marginPieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={110}
                paddingAngle={4}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}
              >
                {marginPieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} stroke="white" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Revenue by Category */}
        <ChartCard title="📊 درآمد بر اساس دسته | Revenue by Category">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={revenueByCategory} margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={v => Math.round(v).toLocaleString('fa-IR')} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => [v.toLocaleString('fa-IR') + ' ت', '']} />
              <Legend />
              <Bar dataKey="درآمد" fill="#2d5016" radius={[4, 4, 0, 0]} />
              <Bar dataKey="سود" fill="#c8a951" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Leaderboard Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Top Profit */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="px-6 py-4 bg-green-900 text-white">
            <h3 className="font-bold">🏆 پرسودترین غذاها</h3>
            <p className="text-green-300 text-xs">Top Profitable Dishes</p>
          </div>
          <div className="divide-y">
            {top_profit.map((d, i) => (
              <div key={d.id} className="px-6 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-gray-400">#{i + 1}</span>
                  <div>
                    <div className="font-medium">{d.name}</div>
                    <div className="text-xs text-gray-500">{d.category}</div>
                  </div>
                </div>
                <div className="text-left">
                  <div className="font-mono font-bold text-green-700">{Math.round(d.total_profit).toLocaleString('fa-IR')} ت</div>
                  <div className="text-xs text-gray-500">{d.order_count} سفارش</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Most Ordered */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="px-6 py-4 bg-yellow-600 text-white">
            <h3 className="font-bold">🔥 پرطرفدارترین غذاها</h3>
            <p className="text-yellow-100 text-xs">Most Ordered Dishes</p>
          </div>
          <div className="divide-y">
            {most_ordered.map((d, i) => (
              <div key={d.id} className="px-6 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-gray-400">#{i + 1}</span>
                  <div>
                    <div className="font-medium">{d.name}</div>
                    <div className="text-xs text-gray-500">{d.menu_price?.toLocaleString('fa-IR')} ت</div>
                  </div>
                </div>
                <div className="text-left">
                  <div className="font-mono font-bold text-yellow-700">{d.order_count} سفارش</div>
                  <div className="text-xs text-gray-500">{Math.round(d.total_revenue).toLocaleString('fa-IR')} ت درآمد</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Full Dish Table */}
      <div className="mt-8 bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b">
          <h3 className="font-bold text-green-900">📋 جدول کامل تحلیل غذاها</h3>
          <p className="text-xs text-gray-500">Complete Dish Analysis Table</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-green-900 text-white">
              <tr>
                <th className="px-4 py-3 text-right">غذا</th>
                <th className="px-4 py-3 text-right">دسته</th>
                <th className="px-4 py-3 text-right">هزینه/porção</th>
                <th className="px-4 py-3 text-right">قیمت منو</th>
                <th className="px-4 py-3 text-right">حاشیه سود</th>
                <th className="px-4 py-3 text-right">درصد هزینه</th>
                <th className="px-4 py-3 text-right">سفارش</th>
                <th className="px-4 py-3 text-right">درآمد</th>
                <th className="px-4 py-3 text-right">سود</th>
              </tr>
            </thead>
            <tbody>
              {dishes.map(d => (
                <tr key={d.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{d.name}</td>
                  <td className="px-4 py-3">
                    <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-xs">{d.category}</span>
                  </td>
                  <td className="px-4 py-3 font-mono text-orange-700">{Math.round(d.cost_per_serving).toLocaleString('fa-IR')} ت</td>
                  <td className="px-4 py-3 font-mono text-green-700">{d.menu_price?.toLocaleString('fa-IR')} ت</td>
                  <td className="px-4 py-3 font-mono font-bold">{Math.round(d.profit_per_serving).toLocaleString('fa-IR')} ت</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                      d.food_cost_percent > 35 ? 'bg-red-100 text-red-700' :
                      d.food_cost_percent > 25 ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {d.food_cost_percent > 0 ? Math.round(d.food_cost_percent * 10) / 10 + '%' : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">{d.order_count}</td>
                  <td className="px-4 py-3 font-mono text-sm">{Math.round(d.total_revenue).toLocaleString('fa-IR')} ت</td>
                  <td className={`px-4 py-3 font-mono font-bold ${d.total_profit >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                    {Math.round(d.total_profit).toLocaleString('fa-IR')} ت
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function KPICard({ label, value, unit, color, icon }) {
  return (
    <div className="bg-white border rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className={`text-2xl font-bold ${color}`}>{value}</div>
          <div className="text-xs text-gray-500">{unit}</div>
          <div className="text-sm font-medium text-gray-700 mt-1">{label}</div>
        </div>
        <div className="text-3xl">{icon}</div>
      </div>
    </div>
  );
}

function ChartCard({ title, subtitle, children }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
      <div className="px-6 py-4 border-b bg-gray-50">
        <h3 className="font-bold text-sm text-gray-800">{title}</h3>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      <div className="p-4">
        {children}
      </div>
    </div>
  );
}
