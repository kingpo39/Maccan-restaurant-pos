import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const navItems = [
  { to: '/', label: 'داشبورد', icon: '📊', en: 'Dashboard' },
  { to: '/ingredients', label: 'مواد اولیه', icon: '🥩', en: 'Ingredients' },
  { to: '/recipes', label: 'دستور پخت', icon: '🍳', en: 'Recipes' },
  { to: '/inventory', label: 'انبار و دریافت', icon: '📦', en: 'Inventory' },
  { to: '/tables', label: 'میزها و سفارش', icon: '🍽️', en: 'Tables & Orders' },
  { to: '/kds', label: 'صفحه آشپزخانه', icon: '👨‍🍳', en: 'KDS', accent: true },
  { to: '/nutrition', label: 'تغذیه', icon: '🥗', en: 'Nutrition' },
  { to: '/analytics', label: 'تحلیل‌ها', icon: '📈', en: 'Analytics' },
  { to: '/suppliers', label: 'تأمین‌کنندگان', icon: '🏪', en: 'Suppliers' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 bg-green-900 text-white flex flex-col shadow-xl">
        {/* Brand */}
        <div className="p-5 border-b border-green-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center">
              <span className="text-green-900 font-bold text-xs">M</span>
            </div>
            <div>
              <div className="font-bold text-sm">MACCAN RMS</div>
              <div className="text-green-300 text-xs">🌿 Forest Dining</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-5 py-3 text-sm transition ${
                  isActive
                    ? 'bg-green-700 border-r-4 border-yellow-400 text-yellow-300'
                    : item.accent
                      ? 'text-yellow-300 hover:bg-yellow-900/30 hover:text-yellow-100'
                      : 'text-green-200 hover:bg-green-800 hover:text-white'
                }`
              }
            >
              <span className="text-lg">{item.icon}</span>
              <div>
                <div>{item.label}</div>
                <div className="text-xs opacity-60">{item.en}</div>
              </div>
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="p-4 border-t border-green-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-green-700 rounded-full flex items-center justify-center text-sm">
              {user?.name?.charAt(0) || '?'}
            </div>
            <div className="text-sm">
              <div className="font-medium">{user?.name}</div>
              <div className="text-green-400 text-xs">{user?.role}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full text-left text-sm text-red-300 hover:text-red-100 hover:bg-red-900/30 px-3 py-2 rounded transition"
          >
            🚪 خروج | Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 bg-gray-50 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
