import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { hasPageAccess, ROLE_LABELS, ROLE_COLORS } from '../utils/permissions';

const navItems = [
  { to: '/',              label: 'Dashboard',     labelFa: 'داشبورد',       icon: '📊', permission: [] },
  { to: '/ingredients',   label: 'Ingredients',   labelFa: 'مواد اولیه',    icon: '🥩', permission: ['ingredients:view'] },
  { to: '/recipes',       label: 'Recipes',       labelFa: 'دستور پخت',     icon: '🍳', permission: ['recipes:view'] },
  { to: '/inventory',     label: 'Inventory',     labelFa: 'انبار',         icon: '📦', permission: ['inventory:view'] },
  { to: '/tables',        label: 'Tables',        labelFa: 'میزها',         icon: '🍽️', permission: ['orders:view'] },
  { to: '/kds',           label: 'KDS',           labelFa: 'آشپزخانه',      icon: '👨‍🍳', permission: ['kds:view'] },
  { to: '/nutrition',     label: 'Nutrition',     labelFa: 'تغذیه',         icon: '🥗', permission: ['nutrition:view'] },
  { to: '/analytics',     label: 'Analytics',     labelFa: 'تحلیل‌ها',      icon: '📈', permission: ['analytics:view'] },
  { to: '/suppliers',     label: 'Suppliers',     labelFa: 'تأمین‌کنندگان',  icon: '🏪', permission: ['suppliers:view'] },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const userPermissions = user?.permissions || [];

  const handleLogout = () => {
    toast.systemEvent('Signed out', `${user?.name} disconnected`);
    logout();
    navigate('/login');
  };

  const visibleNavItems = navItems.filter(item => hasPageAccess(userPermissions, item.to));
  const roleColor = ROLE_COLORS[user?.role] || 'bg-gray-500 text-white';

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className="w-60 bg-card border-r border-border flex flex-col">
        {/* Brand */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold text-sm">
              M
            </div>
            <div>
              <div className="font-semibold text-sm text-foreground">MACCAN RMS</div>
              <div className="text-xs text-muted-foreground">Restaurant Management</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-2 px-2">
          {visibleNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors mb-0.5 ${
                  isActive
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                }`
              }
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="p-3 border-t border-border">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium text-muted-foreground">
              {user?.name?.charAt(0) || '?'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-foreground truncate">{user?.name}</div>
              <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded-full ${roleColor}`}>
                {ROLE_LABELS[user?.role]?.en || user?.role}
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full text-left text-sm text-muted-foreground hover:text-destructive px-2 py-1.5 rounded hover:bg-accent transition-colors"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Top Bar */}
        <div className="sticky top-0 z-10 bg-card/80 backdrop-blur-sm border-b border-border px-6 py-2.5 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            🌿🌊 Laleh Sar, Mazandaran
          </div>
          <div className="text-xs text-muted-foreground font-mono">
            {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' })}
            {' · '}
            {new Date().toLocaleTimeString('en-US', { hour12: false })}
          </div>
        </div>

        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
