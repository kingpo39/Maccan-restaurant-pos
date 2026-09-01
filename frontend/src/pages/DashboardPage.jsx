import { StatCard } from '../components/dashboard/StatCard';
import { RecentOrdersTable } from '../components/dashboard/RecentOrdersTable';
import { LowStockAlerts } from '../components/dashboard/LowStockAlerts';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { useDashboardData } from '../hooks/useDashboardData';

export default function DashboardPage() {
  const { metrics, orders, lowStock, costAnalysis, isLoading } = useDashboardData();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="card p-6">
              <div className="skeleton h-4 w-24 mb-3" />
              <div className="skeleton h-8 w-20" />
            </div>
          ))}
        </div>
        <div className="skeleton h-64 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Executive Overview</h1>
          <p className="text-muted-foreground">Real-time performance for MACCAN Group</p>
        </div>
        <button className="btn btn-primary btn-sm no-print">
          Export Report
        </button>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Ingredients"
          value={metrics.totalIngredients.toString()}
          subtitle="Active items"
          icon={<span className="text-lg">🥩</span>}
          iconColor="blue"
          change={3.1}
        />
        <StatCard
          title="Recipes"
          value={metrics.totalRecipes.toString()}
          subtitle="Menu items"
          icon={<span className="text-lg">🍳</span>}
          iconColor="purple"
        />
        <StatCard
          title="Active Orders"
          value={metrics.activeOrders.toString()}
          subtitle="Currently in service"
          icon={<span className="text-lg">📋</span>}
          iconColor={metrics.activeOrders > 0 ? 'amber' : 'green'}
        />
        <StatCard
          title="Food Cost %"
          value={`${metrics.foodCostPercentage}%`}
          subtitle="Average ratio"
          icon={<span className="text-lg">📊</span>}
          iconColor={metrics.foodCostPercentage < 35 ? 'green' : 'red'}
          change={metrics.costChange}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentOrdersTable
            orders={orders}
            onStatusChange={async (orderId, status) => {
              try {
                const { api } = await import('../utils/api');
                await api.put(`/orders/${orderId}/status`, { status });
                window.location.reload();
              } catch (e) { console.error(e); }
            }}
          />
        </div>
        <div className="lg:col-span-1 space-y-4">
          <LowStockAlerts alerts={lowStock} />

          {/* Top Dishes */}
          {costAnalysis.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Top Performing Dishes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {costAnalysis
                    .filter(r => r.profit > 0 || r.total_profit > 0)
                    .sort((a, b) => (b.profit || b.total_profit || 0) - (a.profit || a.total_profit || 0))
                    .slice(0, 5)
                    .map((dish, idx) => (
                    <div key={dish.id || idx} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono text-muted-foreground w-5">{idx + 1}.</span>
                        <span className="text-sm font-medium">{dish.name}</span>
                      </div>
                      <span className={`text-sm font-mono ${dish.foodCostPercent < 30 ? 'text-green-600' : 'text-amber-600'}`}>
                        {dish.foodCostPercent || dish.food_cost_percent}%
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
