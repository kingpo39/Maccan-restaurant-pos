import { useNavigate } from 'react-router-dom';
import { StatCard } from '../components/dashboard/StatCard';
import { RecentOrdersTable } from '../components/dashboard/RecentOrdersTable';
import { LowStockAlerts } from '../components/dashboard/LowStockAlerts';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { useDashboardData } from '../hooks/useDashboardData';

const quickLinks = [
  { to: '/ingredients', icon: '🥩', label: 'مواد اولیه', en: 'Ingredients', color: 'bg-green-50 hover:bg-green-100 text-green-800 border-green-200' },
  { to: '/recipes', icon: '🍳', label: 'دستورهای پخت', en: 'Recipes', color: 'bg-purple-50 hover:bg-purple-100 text-purple-800 border-purple-200' },
  { to: '/inventory', icon: '📦', label: 'انبار و دریافت', en: 'Inventory', color: 'bg-blue-50 hover:bg-blue-100 text-blue-800 border-blue-200' },
  { to: '/tables', icon: '🪑', label: 'میزها و سفارشات', en: 'Tables & Orders', color: 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200' },
  { to: '/kds', icon: '👨‍🍳', label: 'صفحه آشپزخانه', en: 'KDS', color: 'bg-red-50 hover:bg-red-100 text-red-800 border-red-200' },
  { to: '/nutrition', icon: '🥗', label: 'تعذیه', en: 'Nutrition', color: 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200' },
  { to: '/analytics', icon: '📊', label: 'تحلیل‌ها', en: 'Analytics', color: 'bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border-indigo-200' },
  { to: '/suppliers', icon: '🏭', label: 'تأمین‌کنندگان', en: 'Suppliers', color: 'bg-orange-50 hover:bg-orange-100 text-orange-800 border-orange-200' },
];

export default function DashboardPage() {
  const { metrics, orders, lowStock, costAnalysis, isLoading } = useDashboardData();
  const navigate = useNavigate();
  if (isLoading) return <div className="space-y-6"><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">{[1,2,3,4].map(i => <div key={i} className="card p-6"><div className="skeleton h-4 w-24 mb-3"/><div className="skeleton h-8 w-20"/></div>)}</div></div>;
  return <div dir="rtl" className="space-y-6">
    <div className="flex justify-between items-center border-b-2 border-[#c8a951] pb-3"><div><h1 className="text-2xl font-light text-[#1e2b2a]">داشبورد <span className="font-bold text-[#2d5016]">مدیریت رستوران</span></h1><p className="text-sm text-[#5a6b68]">نمای کلی عملکرد روزانه دهکده جنگلی ماکان</p></div><button className="btn btn-primary btn-sm no-print">📊 خروجی گزارش</button></div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard title="مواد اولیه" value={metrics.totalIngredients.toString()} subtitle="اقلام فعال" icon={<span>🥩</span>} iconColor="green" change={3.1} link="/ingredients"/>
      <StatCard title="دستورهای پخت" value={metrics.totalRecipes.toString()} subtitle="آیتم‌های منو" icon={<span>🍳</span>} iconColor="purple" link="/recipes"/>
      <StatCard title="سفارش‌های فعال" value={metrics.activeOrders.toString()} subtitle="در حال سرویس" icon={<span>📋</span>} iconColor={metrics.activeOrders > 0 ? 'amber' : 'green'} link="/tables"/>
      <StatCard title="درصد هزینه غذا" value={`${metrics.foodCostPercentage}%`} subtitle="میانگین نسبت هزینه" icon={<span>📊</span>} iconColor={metrics.foodCostPercentage < 35 ? 'green' : 'red'} change={metrics.costChange} link="/analytics"/>
    </div>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {quickLinks.map(q => (
        <button key={q.to} onClick={() => navigate(q.to)}
          className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200 hover:shadow-md hover:scale-[1.02] ${q.color}`}>
          <span className="text-2xl">{q.icon}</span>
          <div className="text-right">
            <div className="text-sm font-bold">{q.label}</div>
            <div className="text-xs opacity-70">{q.en}</div>
          </div>
        </button>
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6"><div className="lg:col-span-2"><RecentOrdersTable orders={orders} onStatusChange={async (orderId,status)=>{try{const {api}=await import('../utils/api');await api.put(`/orders/${orderId}/status`,{status});window.location.reload();}catch(e){console.error(e);}}}/></div><div className="space-y-4"><LowStockAlerts alerts={lowStock}/>{costAnalysis.length>0&&<Card><CardHeader><CardTitle>غذاهای برتر | Top Dishes</CardTitle></CardHeader><CardContent><div className="space-y-3">{costAnalysis.filter(r=>r.profit>0||r.total_profit>0).sort((a,b)=>(b.profit||b.total_profit||0)-(a.profit||a.total_profit||0)).slice(0,5).map((dish,idx)=><div key={dish.id||idx} className="flex items-center justify-between"><span className="text-sm"><b className="text-[#2d5016] ml-2">{idx+1}.</b>{dish.name}</span><span className="text-sm font-mono text-[#2d5016]">{dish.foodCostPercent||dish.food_cost_percent}%</span></div>)}</div></CardContent></Card>}</div></div>
  </div>;
}
