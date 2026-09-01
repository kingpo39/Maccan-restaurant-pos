import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import CyberStatCard from '../components/CyberStatCard';
import HoloChart from '../components/HoloChart';
import OrderTerminal from '../components/OrderTerminal';

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/analytics/overview').catch(() => null),
      api.get('/orders?active=true').catch(() => []),
    ]).then(([analytics, activeOrders]) => {
      setData(analytics);
      setOrders(activeOrders || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <div className="text-cyan-400 text-4xl mb-4 animate-pulse-glow">&#x25CC;</div>
          <div className="text-[10px] font-mono text-cyan-500/60 tracking-[4px]">INITIALIZING COMMAND CENTER...</div>
        </div>
      </div>
    );
  }

  const summary = data?.summary || {};
  const costAnalysis = data?.costAnalysis || [];
  const topProfit = data?.costAnalysis
    ?.filter(r => r.profit > 0)
    ?.sort((a, b) => b.profit - a.profit)
    ?.slice(0, 5) || [];

  // Chart data from cost analysis
  const chartData = costAnalysis
    .filter(r => r.menuPrice > 0)
    .sort((a, b) => a.foodCostPercent - b.foodCostPercent)
    .map(r => ({
      name: r.name?.length > 12 ? r.name.slice(0, 12) + '...' : r.name,
      'Food Cost %': r.foodCostPercent,
      Profit: r.profit,
    }));

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white tracking-wider" style={{ fontFamily: 'Orbitron' }}>
            COMMAND <span className="text-cyan-400 text-glow-cyan">CENTER</span>
          </h1>
          <div className="text-[10px] font-mono text-gray-600 mt-1">
            &#x1F33F;&#x1F30A; Laleh Sar, Mazandaran — Restaurant Operations Overview
          </div>
        </div>
        <div className="text-[9px] font-mono text-gray-700 text-right">
          <div>UPTIME: {Math.floor((Date.now() % 86400000) / 3600000)}h {Math.floor((Date.now() % 3600000) / 60000)}m</div>
          <div className="text-cyan-500/40">NODE: LOCAL-3001</div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <CyberStatCard
          title="Ingredients"
          value={summary.ingredientCount || data?.counts?.ingredients || 0}
          subtitle="Active items"
          icon="◈"
          color="#00f3ff"
        />
        <CyberStatCard
          title="Recipes"
          value={summary.recipeCount || data?.counts?.recipes || 0}
          subtitle="Menu items"
          icon="◇"
          color="#ff00ff"
        />
        <CyberStatCard
          title="Active Orders"
          value={orders.length}
          subtitle="In service"
          icon="◉"
          color={orders.length > 0 ? '#ffaa00' : '#00ff88'}
        />
        <CyberStatCard
          title="Food Cost"
          value={`${summary.avgFoodCostPercent || data?.avgFoodCostPercent || 0}%`}
          subtitle="Average ratio"
          icon="◧"
          color={summary.avgFoodCostPercent < 30 ? '#00ff88' : '#ff3333'}
          trend={summary.avgFoodCostPercent < 30 ? 5.2 : -3.1}
          trendLabel="vs target"
        />
      </div>

      {/* Charts & Terminal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Holographic Chart */}
        <HoloChart
          data={chartData}
          title="REVENUE.STREAM // FOOD COST ANALYSIS"
          dataKey="Food Cost %"
          color="#00f3ff"
          height={250}
        />

        {/* Live Order Terminal */}
        <OrderTerminal
          orders={orders}
          onStatusChange={async (orderId, status) => {
            try {
              await api.put(`/orders/${orderId}/status`, { status });
              setOrders(prev => prev.filter(o => o.id !== orderId));
            } catch (e) { console.error(e); }
          }}
        />
      </div>

      {/* Recipe Cost Table */}
      {costAnalysis.length > 0 && (
        <div className="cyber-panel overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 bg-cyan-500/5 border-b border-cyan-500/10">
            <span className="text-[10px] font-mono text-cyan-400 tracking-[2px]">
              RECIPE.COST.DB // {costAnalysis.length} RECORDS
            </span>
            <span className="text-[9px] font-mono text-gray-600">SORTED BY FOOD COST %</span>
          </div>

          <div className="overflow-x-auto">
            <table className="cyber-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Recipe</th>
                  <th>Category</th>
                  <th>Raw Cost</th>
                  <th>Cost/Serving</th>
                  <th>Menu Price</th>
                  <th>Food Cost %</th>
                  <th>Profit</th>
                </tr>
              </thead>
              <tbody>
                {costAnalysis
                  .sort((a, b) => a.foodCostPercent - b.foodCostPercent)
                  .map((recipe, idx) => (
                  <tr key={recipe.id}>
                    <td className="text-gray-600">{String(idx + 1).padStart(2, '0')}</td>
                    <td className="text-white font-medium">{recipe.name}</td>
                    <td>
                      <span className="px-1.5 py-0.5 text-[9px] font-mono uppercase border border-white/10">
                        {recipe.category}
                      </span>
                    </td>
                    <td className="tabular-nums text-gray-400">{recipe.rawCost?.toLocaleString()} T</td>
                    <td className="tabular-nums text-white font-bold">{recipe.costPerServing?.toLocaleString()} T</td>
                    <td className="tabular-nums text-cyan-400">{recipe.menuPrice?.toLocaleString()} T</td>
                    <td>
                      <span
                        className="font-bold tabular-nums"
                        style={{
                          color: recipe.foodCostPercent < 25 ? '#00ff88' :
                                 recipe.foodCostPercent < 35 ? '#ffaa00' : '#ff3333'
                        }}
                      >
                        {recipe.foodCostPercent}%
                      </span>
                    </td>
                    <td>
                      <span className={`font-bold tabular-nums ${recipe.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {recipe.profit >= 0 ? '+' : ''}{recipe.profit?.toLocaleString()} T
                      </span>
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
