import { StatCard } from '../components/dashboard/StatCard';
import { RecentOrdersTable } from '../components/dashboard/RecentOrdersTable';
import { LowStockAlerts } from '../components/dashboard/LowStockAlerts';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { useDashboardData } from '../hooks/useDashboardData';

export default function DashboardPage() {
  const { metrics, orders, lowStock, costAnalysis, isLoading } = useDashboardData();
  if (isLoading) return <div className="space-y-6"><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">{[1,2,3,4].map(i => <div key={i} className="card p-6"><div className="skeleton h-4 w-24 mb-3"/><div className="skeleton h-8 w-20"/></div>)}</div></div>;
  return <div dir="rtl" className="space-y-6">
    <div className="flex justify-between items-center border-b-2 border-[#c8a951] pb-3"><div><h1 className="text-2xl font-light text-[#1e2b2a]">داشبورد <span className="font-bold text-[#2d5016]">مدیریت رستوران</span></h1><p className="text-sm text-[#5a6b68]">نمای کلی عملکرد روزانه دهکده جنگلی ماکان</p></div><button className="btn btn-primary btn-sm no-print">📊 خروجی گزارش</button></div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard title="مواد اولیه" value={metrics.totalIngredients.toString()} subtitle="اقلام فعال" icon={<span>🥩</span>} iconColor="green" change={3.1}/>
      <StatCard title="دستورهای پخت" value={metrics.totalRecipes.toString()} subtitle="آیتم‌های منو" icon={<span>🍳</span>} iconColor="purple"/>
      <StatCard title="سفارش‌های فعال" value={metrics.activeOrders.toString()} subtitle="در حال سرویس" icon={<span>📋</span>} iconColor={metrics.activeOrders > 0 ? 'amber' : 'green'}/>
      <StatCard title="درصد هزینه غذا" value={`${metrics.foodCostPercentage}%`} subtitle="میانگین نسبت هزینه" icon={<span>📊</span>} iconColor={metrics.foodCostPercentage < 35 ? 'green' : 'red'} change={metrics.costChange}/>
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6"><div className="lg:col-span-2"><RecentOrdersTable orders={orders} onStatusChange={async (orderId,status)=>{try{const {api}=await import('../utils/api');await api.put(`/orders/${orderId}/status`,{status});window.location.reload();}catch(e){console.error(e);}}}/></div><div className="space-y-4"><LowStockAlerts alerts={lowStock}/>{costAnalysis.length>0&&<Card><CardHeader><CardTitle>غذاهای برتر | Top Dishes</CardTitle></CardHeader><CardContent><div className="space-y-3">{costAnalysis.filter(r=>r.profit>0||r.total_profit>0).sort((a,b)=>(b.profit||b.total_profit||0)-(a.profit||a.total_profit||0)).slice(0,5).map((dish,idx)=><div key={dish.id||idx} className="flex items-center justify-between"><span className="text-sm"><b className="text-[#2d5016] ml-2">{idx+1}.</b>{dish.name}</span><span className="text-sm font-mono text-[#2d5016]">{dish.foodCostPercent||dish.food_cost_percent}%</span></div>)}</div></CardContent></Card>}</div></div>
  </div>;
}
