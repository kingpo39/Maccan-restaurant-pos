import { useState, useEffect } from 'react';
import { api } from '../utils/api';

export function useDashboardData() {
  const [data, setData] = useState({
    metrics: {
      totalRevenue: 0,
      revenueChange: 0,
      foodCostPercentage: 0,
      costChange: 0,
      activeOrders: 0,
      totalIngredients: 0,
      totalRecipes: 0,
      lowStockCount: 0,
    },
    orders: [],
    lowStock: [],
    costAnalysis: [],
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function fetchDashboard() {
      try {
        // Fetch all data in parallel
        const [analytics, activeOrders, stock, alerts] = await Promise.allSettled([
          api.get('/analytics/overview'),
          api.get('/orders?active=true'),
          api.get('/inventory/stock'),
          api.get('/inventory/alerts'),
        ]);

        if (cancelled) return;

        const analyticsData = analytics.status === 'fulfilled' ? analytics.value : null;
        const ordersData = activeOrders.status === 'fulfilled' ? activeOrders.value : [];
        const stockData = stock.status === 'fulfilled' ? stock.value : [];
        const alertsData = alerts.status === 'fulfilled' ? alerts.value : {};

        const summary = analyticsData?.summary || analyticsData || {};
        const counts = analyticsData?.counts || {};

        // Calculate low stock items
        const lowStockItems = stockData.filter(item =>
          item.currentStock <= 0 || item.status === 'OUT_OF_STOCK' || item.status === 'out_of_stock'
        ).slice(0, 5);

        setData({
          metrics: {
            totalRevenue: summary.revenue || summary.totalRevenue || 0,
            revenueChange: 5.2,
            foodCostPercentage: summary.avgFoodCostPercent || summary.avg_food_cost_percent || 0,
            costChange: -1.2,
            activeOrders: ordersData.length,
            totalIngredients: counts.ingredients || summary.recipeCount || stockData.length,
            totalRecipes: counts.recipes || summary.recipeCount || 0,
            lowStockCount: lowStockItems.length,
          },
          orders: ordersData,
          lowStock: lowStockItems,
          costAnalysis: analyticsData?.costAnalysis || analyticsData?.dishes || [],
          isLoading: false,
          error: null,
        });
      } catch (err) {
        if (!cancelled) {
          setData(prev => ({ ...prev, isLoading: false, error: err.message }));
        }
      }
    }

    fetchDashboard();
    return () => { cancelled = true; };
  }, []);

  return data;
}
