import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { hasPageAccess, ROLE_LABELS, ROLE_COLORS } from '../utils/permissions';

const navItems = [
  { to: '/', label: 'داشبورد', en: 'Dashboard', icon: '📊', permission: [] },
  { to: '/ingredients', label: 'مواد اولیه', en: 'Ingredients', icon: '🥩', permission: ['ingredients:view'] },
  { to: '/recipes', label: 'دستور پخت', en: 'Recipes', icon: '🍳', permission: ['recipes:view'] },
  { to: '/inventory', label: 'انبار و دریافت', en: 'Inventory', icon: '📦', permission: ['inventory:view'] },
  { to: '/tables', label: 'میزها و سفارش', en: 'Tables & Orders', icon: '🍽️', permission: ['orders:view'] },
  { to: '/kds', label: 'صفحه آشپزخانه', en: 'KDS', icon: '👨‍🍳', permission: ['kds:view'], accent: true },
  { to: '/nutrition', label: 'تغذیه', en: 'Nutrition', icon: '🥗', permission: ['nutrition:view'] },
  { to: '/analytics', label: 'تحلیل‌ها', en: 'Analytics', icon: '📈', permission: ['analytics:view'] },
  { to: '/suppliers', label: 'تأمین‌کنندگان', en: 'Suppliers', icon: '🏪', permission: ['suppliers:view'] },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const visibleNavItems = navItems.filter(item => hasPageAccess(user?.permissions || [], item.to));
  const roleColor = ROLE_COLORS[user?.role] || 'bg-gray-500 text-white';
  const roleLabel = ROLE_LABELS[user?.role] || { fa: user?.role, en: user?.role };

  const handleLogout = () => {
    toast.systemEvent('خروج از سیستم', `${user?.name} با موفقیت خارج شد`);
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex bg-[#f7f9f6]">
      <aside className="w-64 bg-[#1e2b2a] text-white flex flex-col shadow-xl">
        <div className="p-5 border-b border-[#395044]">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-[#2d5016] border-2 border-[#c8a951] rounded-full flex items-center justify-center text-[#c8a951] font-bold">
              M
            </div>
            <div>
              <div className="font-bold text-sm">دهکده جنگلی <span className="text-[#c8a951]">ماکان</span></div>
              <div className="text-[#a9c19b] text-xs">🌿🌊 لالیم سر، مازندران</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 py-4">
          {visibleNavItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `flex items-center gap-3 px-5 py-3 text-sm transition-all ${
                isActive
                  ? 'bg-[#2d5016] border-r-4 border-[#c8a951] text-[#f0d785]'
                  : item.accent
                    ? 'text-[#e4c458] hover:bg-[#324a31]'
                    : 'text-[#c5d5c4] hover:bg-[#2a4031] hover:text-white'
              }`}
            >
              <span className="text-lg w-6 text-center">{item.icon}</span>
              <div>
                <div>{item.label}</div>
                <div className="text-[10px] opacity-60">{item.en}</div>
              </div>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-[#395044]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-[#2d5016] rounded-full flex items-center justify-center text-sm">
              {user?.name?.charAt(0) || '?'}
            </div>
            <div className="text-sm min-w-0">
              <div className="font-medium truncate">{user?.name}</div>
              <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full mt-0.5 ${roleColor}`}>
                {roleLabel.fa}
              </span>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full text-left text-sm text-red-300 hover:text-red-100 hover:bg-red-900/30 px-3 py-2 rounded transition">
            🚪 خروج | Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-[#dce5dc] px-6 py-3 flex items-center justify-between">
          <div className="text-sm text-[#5a6b68]">🌿🌊 جایی که جنگل به دریا می‌رسد · لالیم سر، مازندران</div>
          <div className="text-xs text-[#68776f]">
            {new Date().toLocaleDateString('fa-IR')} · {new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
        <div className="p-6"><Outlet /></div>
      </main>
    </div>
  );
}
