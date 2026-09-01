import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { hasPageAccess, ROLE_LABELS } from '../utils/permissions';

const navItems = [
  { to: '/',              label: 'Dashboard',     icon: '⬡', permission: [] },
  { to: '/ingredients',   label: 'Ingredients',   icon: '◈', permission: ['ingredients:view'] },
  { to: '/recipes',       label: 'Recipes',       icon: '◇', permission: ['recipes:view'] },
  { to: '/inventory',     label: 'Inventory',     icon: '▣', permission: ['inventory:view'] },
  { to: '/tables',        label: 'Tables',        icon: '◉', permission: ['orders:view'] },
  { to: '/kds',           label: 'KDS',           icon: '⚡', permission: ['kds:view'], accent: true },
  { to: '/nutrition',     label: 'Nutrition',     icon: '△', permission: ['nutrition:view'] },
  { to: '/analytics',     label: 'Analytics',     icon: '◧', permission: ['analytics:view'] },
  { to: '/suppliers',     label: 'Suppliers',     icon: '⬢', permission: ['suppliers:view'] },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const userPermissions = user?.permissions || [];

  const handleLogout = () => {
    toast.systemEvent('SESSION.TERMINATED', `${user?.name} disconnected`);
    logout();
    navigate('/login');
  };

  const visibleNavItems = navItems.filter(item => hasPageAccess(userPermissions, item.to));

  const roleColor = {
    OWNER: '#00f3ff',
    MANAGER: '#ff00ff',
    HEAD_CHEF: '#ffaa00',
    SERVER: '#00ff88',
    INVENTORY: '#3366ff',
  }[user?.role] || '#00f3ff';

  return (
    <div className="min-h-screen flex bg-[#050505] cyber-scanlines">
      {/* Sidebar */}
      <aside className="w-16 hover:w-56 bg-[#08080d] border-r border-cyan-500/10 flex flex-col transition-all duration-300 group/sidebar overflow-hidden z-20">
        {/* Brand */}
        <div className="p-3 border-b border-cyan-500/10 flex items-center gap-3 min-h-[60px]">
          <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center border border-cyan-500/30 glow-cyan text-cyan-400 text-sm font-bold"
               style={{ fontFamily: 'Orbitron' }}>
            M
          </div>
          <div className="opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-300 whitespace-nowrap">
            <div className="text-xs font-bold text-white tracking-wider" style={{ fontFamily: 'Orbitron' }}>MACCAN</div>
            <div className="text-[9px] text-cyan-500/50 font-mono">COMMAND CENTER</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3">
          {visibleNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 mx-1 transition-all duration-200 group/nav ${
                  isActive
                    ? 'bg-cyan-500/10 border-l-2 border-cyan-400 text-cyan-400 text-glow-cyan'
                    : item.accent
                      ? 'border-l-2 border-transparent text-amber-400/70 hover:text-amber-400 hover:bg-amber-500/5 hover:border-amber-500/30'
                      : 'border-l-2 border-transparent text-gray-500 hover:text-cyan-400 hover:bg-cyan-500/5 hover:border-cyan-500/20'
                }`
              }
            >
              <span className="text-lg w-8 text-center flex-shrink-0">{item.icon}</span>
              <span className="text-[11px] font-mono tracking-wider opacity-0 group-hover/sidebar:opacity-100 transition-opacity whitespace-nowrap">
                {item.label.toUpperCase()}
              </span>
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="p-3 border-t border-cyan-500/10 min-h-[60px]">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 flex-shrink-0 flex items-center justify-center text-[10px] font-bold border"
              style={{ borderColor: roleColor + '40', color: roleColor }}
            >
              {user?.name?.charAt(0) || '?'}
            </div>
            <div className="opacity-0 group-hover/sidebar:opacity-100 transition-opacity min-w-0">
              <div className="text-[10px] text-white font-mono truncate">{user?.name}</div>
              <div className="text-[9px] font-mono" style={{ color: roleColor }}>
                {ROLE_LABELS[user?.role]?.en || user?.role}
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full mt-2 text-left text-[10px] text-red-500/50 hover:text-red-400 font-mono tracking-wider opacity-0 group-hover/sidebar:opacity-100 transition-all px-1"
          >
            &#x25B6; DISCONNECT
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Top Bar */}
        <div className="sticky top-0 z-10 bg-[#050505]/90 backdrop-blur-md border-b border-cyan-500/10 px-6 py-2 flex items-center justify-between">
          <div className="flex items-center gap-4 text-[10px] font-mono text-gray-600">
            <span className="flex items-center gap-1.5">
              <span className="status-dot status-online" />
              SYS.ONLINE
            </span>
            <span className="text-gray-800">|</span>
            <span>NET: 127.0.0.1:3001</span>
            <span className="text-gray-800">|</span>
            <span className="text-cyan-500/40">MACCAN.RMS.v2</span>
          </div>
          <div className="flex items-center gap-4 text-[10px] font-mono">
            <span className="text-gray-600">
              {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' })}
            </span>
            <span className="text-cyan-500/60 font-bold tabular-nums">
              {new Date().toLocaleTimeString('en-US', { hour12: false })}
            </span>
          </div>
        </div>

        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
