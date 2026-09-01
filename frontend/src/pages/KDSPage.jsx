import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../utils/api';
import { useToast } from '../contexts/ToastContext';

// Theme CSS custom properties - guaranteed to work with Tailwind v4
const THEME_VARS = {
  dark: {
    '--kds-bg': '#030712',
    '--kds-surface': '#111827',
    '--kds-surface-alt': '#1f2937',
    '--kds-border': '#374151',
    '--kds-text': '#f9fafb',
    '--kds-text-muted': '#9ca3af',
    '--kds-card-open': 'rgba(239,68,68,0.08)',
    '--kds-card-progress': 'rgba(234,179,8,0.08)',
    '--kds-card-ready': 'rgba(34,197,94,0.08)',
    '--kds-stat-pending-bg': 'rgba(239,68,68,0.1)',
    '--kds-stat-preparing-bg': 'rgba(234,179,8,0.1)',
    '--kds-stat-ready-bg': 'rgba(34,197,94,0.1)',
    '--kds-stat-total-bg': '#1f2937',
    '--kds-notes': '#facc15',
    '--kds-action-bg': 'rgba(0,0,0,0.15)',
  },
  light: {
    '--kds-bg': '#f3f4f6',
    '--kds-surface': '#ffffff',
    '--kds-surface-alt': '#f9fafb',
    '--kds-border': '#e5e7eb',
    '--kds-text': '#111827',
    '--kds-text-muted': '#6b7280',
    '--kds-card-open': 'rgba(239,68,68,0.06)',
    '--kds-card-progress': 'rgba(234,179,8,0.06)',
    '--kds-card-ready': 'rgba(34,197,94,0.06)',
    '--kds-stat-pending-bg': 'rgba(239,68,68,0.08)',
    '--kds-stat-preparing-bg': 'rgba(234,179,8,0.08)',
    '--kds-stat-ready-bg': 'rgba(34,197,94,0.08)',
    '--kds-stat-total-bg': '#f3f4f6',
    '--kds-notes': '#ca8a04',
    '--kds-action-bg': 'rgba(0,0,0,0.03)',
  },
  amber: {
    '--kds-bg': '#1a1200',
    '--kds-surface': '#2a1f00',
    '--kds-surface-alt': '#332800',
    '--kds-border': '#4a3800',
    '--kds-text': '#fef3c7',
    '--kds-text-muted': '#d4a843',
    '--kds-card-open': 'rgba(239,68,68,0.1)',
    '--kds-card-progress': 'rgba(217,119,6,0.12)',
    '--kds-card-ready': 'rgba(34,197,94,0.1)',
    '--kds-stat-pending-bg': 'rgba(239,68,68,0.12)',
    '--kds-stat-preparing-bg': 'rgba(217,119,6,0.12)',
    '--kds-stat-ready-bg': 'rgba(34,197,94,0.12)',
    '--kds-stat-total-bg': 'rgba(42,31,0,0.8)',
    '--kds-notes': '#fbbf24',
    '--kds-action-bg': 'rgba(0,0,0,0.2)',
  },
};

// Order card colors per theme
const ORDER_COLORS = {
  dark: {
    open: { card: 'border-l-red-500', cardBg: 'rgba(239,68,68,0.08)', badge: 'bg-red-900 text-red-300' },
    in_progress: { card: 'border-l-yellow-500', cardBg: 'rgba(234,179,8,0.08)', badge: 'bg-yellow-900 text-yellow-200' },
    ready: { card: 'border-l-green-500', cardBg: 'rgba(34,197,94,0.08)', badge: 'bg-green-900 text-green-300' },
  },
  light: {
    open: { card: 'border-l-red-500', cardBg: 'rgba(239,68,68,0.05)', badge: 'bg-red-100 text-red-700' },
    in_progress: { card: 'border-l-yellow-500', cardBg: 'rgba(234,179,8,0.05)', badge: 'bg-yellow-100 text-yellow-700' },
    ready: { card: 'border-l-green-500', cardBg: 'rgba(34,197,94,0.05)', badge: 'bg-green-100 text-green-700' },
  },
  amber: {
    open: { card: 'border-l-red-500', cardBg: 'rgba(239,68,68,0.1)', badge: 'bg-red-900 text-red-300' },
    in_progress: { card: 'border-l-amber-500', cardBg: 'rgba(217,119,6,0.12)', badge: 'bg-amber-900 text-amber-200' },
    ready: { card: 'border-l-green-500', cardBg: 'rgba(34,197,94,0.1)', badge: 'bg-green-900 text-green-300' },
  },
};

const ITEM_DOT_COLORS = {
  dark: { pending: 'bg-red-500', preparing: 'bg-yellow-500', ready: 'bg-green-500', delivered: 'bg-gray-500' },
  light: { pending: 'bg-red-500', preparing: 'bg-yellow-500', ready: 'bg-green-500', delivered: 'bg-gray-400' },
  amber: { pending: 'bg-red-500', preparing: 'bg-amber-500', ready: 'bg-green-500', delivered: 'bg-amber-700' },
};

const THEME_META = {
  dark: { icon: '🌙', label: 'تاریک', en: 'Dark', btnActive: 'bg-amber-500 text-gray-900 shadow-lg' },
  light: { icon: '☀️', label: 'روشن', en: 'Light', btnActive: 'bg-amber-500 text-gray-900 shadow-lg' },
  amber: { icon: '🟠', label: 'کهربایی', en: 'Amber', btnActive: 'bg-amber-500 text-gray-900 shadow-lg' },
};

// Live clock
function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="tabular-nums" style={{ color: 'var(--kds-text-muted)' }}>
      {time.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
    </span>
  );
}

export default function KDSPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  const [stats, setStats] = useState({ pending: 0, preparing: 0, ready: 0 });
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [theme, setTheme] = useState(() => localStorage.getItem('kds_theme') || 'dark');
  const wsRef = useRef(null);
  const toast = useToast();

  // Apply CSS variables to :root
  useEffect(() => {
    const vars = THEME_VARS[theme] || THEME_VARS.dark;
    Object.entries(vars).forEach(([key, val]) => {
      document.documentElement.style.setProperty(key, val);
    });
    localStorage.setItem('kds_theme', theme);
  }, [theme]);

  // Cleanup CSS vars on unmount
  useEffect(() => {
    return () => {
      Object.keys(THEME_VARS.dark).forEach(key => {
        document.documentElement.style.removeProperty(key);
      });
    };
  }, []);

  const playAlert = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 800;
      gain.gain.value = 0.3;
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {}
  }, [soundEnabled]);

  const loadOrders = useCallback(async () => {
    try {
      const data = await api.get('/orders?active=true');
      setOrders(data);
      let pending = 0, preparing = 0, ready = 0;
      data.forEach(o => {
        o.items?.forEach(item => {
          if (item.status === 'pending') pending++;
          else if (item.status === 'preparing') preparing++;
          else if (item.status === 'ready') ready++;
        });
      });
      setStats({ pending, preparing, ready });
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadOrders();
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.hostname}:3000/ws`);
    wsRef.current = ws;

    ws.onopen = () => { setWsConnected(true); toast.info('🔌 KDS متصل شد', 'صفحه آشپزخانه به سرور متصل شد'); };
    ws.onmessage = (event) => { try { handleWSMessage(JSON.parse(event.data)); } catch (e) {} };
    ws.onclose = () => setWsConnected(false);
    ws.onerror = () => setWsConnected(false);
    return () => ws.close();
  }, []);

  const handleWSMessage = useCallback((msg) => {
    switch (msg.type) {
      case 'NEW_ORDER':
        playAlert();
        toast.orderPlaced(msg.data.table_label, msg.data.items?.length || 0);
        setOrders(prev => prev.find(o => o.id === msg.data.id) ? prev : [msg.data, ...prev]);
        break;
      case 'NEW_ITEM':
        playAlert();
        setOrders(prev => prev.map(o => o.id === msg.data.order_id
          ? { ...o, items: [...(o.items || []).filter(i => i.id !== msg.data.id), msg.data] }
          : o));
        break;
      case 'ITEM_STATUS':
        setOrders(prev => prev.map(o => o.id === msg.data.order_id
          ? { ...o, status: msg.data.order_status || o.status, items: msg.data.items || o.items }
          : o));
        break;
      case 'ORDER_STATUS':
        if (msg.data.status === 'ready') toast.orderReady(msg.data.table_label || `#${msg.data.id}`);
        setOrders(prev => ['closed', 'served'].includes(msg.data.status)
          ? prev.filter(o => o.id !== msg.data.id)
          : prev.map(o => o.id === msg.data.id ? { ...o, status: msg.data.status } : o));
        break;
      default: break;
    }
  }, [playAlert]);

  const updateItemStatus = async (orderId, itemId, status) => {
    try { await api.put(`/orders/${orderId}/items/${itemId}/status`, { status }); } catch (e) {}
  };
  const updateOrderStatus = async (orderId, status) => {
    try { await api.put(`/orders/${orderId}/status`, { status }); } catch (e) {}
  };

  const statusOrder = { open: 0, in_progress: 1, ready: 2, served: 3, closed: 4 };
  const sortedOrders = [...orders].sort((a, b) => (statusOrder[a.status] || 0) - (statusOrder[b.status] || 0));
  const oc = ORDER_COLORS[theme] || ORDER_COLORS.dark;
  const idc = ITEM_DOT_COLORS[theme] || ITEM_DOT_COLORS.dark;

  return (
    <div
      className="min-h-screen p-4 transition-colors duration-300"
      style={{ background: 'var(--kds-bg)', color: 'var(--kds-text)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-3" style={{ borderBottom: '2px solid var(--kds-border)' }}>
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold">👨‍🍳 صفحه آشپزخانه | KDS</h1>
          <div className={`flex items-center gap-2 text-sm ${wsConnected ? 'text-green-400' : 'text-red-400'}`}>
            <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></span>
            {wsConnected ? 'متصل' : 'قطع'}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Theme Toggle */}
          <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: 'var(--kds-surface-alt)' }}>
            {Object.entries(THEME_META).map(([key, meta]) => (
              <button
                key={key}
                onClick={() => setTheme(key)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${theme === key ? meta.btnActive : ''}`}
                style={theme !== key ? { color: 'var(--kds-text-muted)' } : {}}
                title={`${meta.label} (${meta.en})`}
              >
                {meta.icon}
                <span className="mr-1 hidden md:inline">{meta.label}</span>
              </button>
            ))}
          </div>

          {/* Sound */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`px-3 py-1.5 rounded-lg text-sm transition ${soundEnabled ? 'bg-green-700 text-white' : ''}`}
            style={!soundEnabled ? { background: 'var(--kds-surface-alt)', color: 'var(--kds-text-muted)' } : {}}
          >
            {soundEnabled ? '🔔' : '🔕'}
          </button>

          {/* Refresh */}
          <button
            onClick={loadOrders}
            className="px-3 py-1.5 rounded-lg text-sm transition"
            style={{ background: 'var(--kds-surface-alt)', color: 'var(--kds-text-muted)' }}
          >
            🔄
          </button>

          <LiveClock />
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-3 mb-4 flex-wrap">
        {[
          { value: stats.pending, label: '🆕 در انتظار', bg: 'var(--kds-stat-pending-bg)', border: '#ef4444', color: '#fca5a5' },
          { value: stats.preparing, label: '🔥 در حال پخت', bg: 'var(--kds-stat-preparing-bg)', border: '#eab308', color: '#fde047' },
          { value: stats.ready, label: '✅ آماده', bg: 'var(--kds-stat-ready-bg)', border: '#22c55e', color: '#86efac' },
          { value: orders.length, label: '📋 فعال', bg: 'var(--kds-stat-total-bg)', border: 'var(--kds-border)', color: 'var(--kds-text-muted)' },
        ].map((s, i) => (
          <div
            key={i}
            className="rounded-lg px-4 py-2.5 flex items-center gap-2 border"
            style={{ background: s.bg, borderColor: s.border }}
          >
            <span className="text-2xl font-bold tabular-nums">{s.value}</span>
            <span className="text-sm" style={{ color: s.color }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Orders */}
      {loading ? (
        <div className="text-center py-20" style={{ color: 'var(--kds-text-muted)' }}>در حال بارگذاری...</div>
      ) : sortedOrders.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-4 opacity-30">👨‍🍳</div>
          <p style={{ color: 'var(--kds-text-muted)' }}>هنوز سفارشی نیست</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sortedOrders.map(order => {
            const st = oc[order.status] || oc.open;
            return (
              <div
                key={order.id}
                className={`rounded-xl border-l-4 shadow-lg overflow-hidden transition-colors duration-300 ${st.card}`}
                style={{ background: st.cardBg, borderRight: `1px solid var(--kds-border)`, borderTop: `1px solid var(--kds-border)`, borderBottom: `1px solid var(--kds-border)` }}
              >
                {/* Header */}
                <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: `1px solid var(--kds-border)` }}>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold font-mono">#{order.id}</span>
                    <span className="text-lg">🪑 {order.table_label}</span>
                  </div>
                  <span className={`${st.badge} px-2.5 py-1 rounded-full text-xs font-bold`}>{st.label}</span>
                </div>

                {/* Items */}
                <div className="px-4 pb-2">
                  {order.items?.map(item => (
                    <div key={item.id} className="flex items-center gap-2 py-2.5" style={{ borderTop: `1px solid var(--kds-border)` }}>
                      <span className={`w-3 h-3 rounded-full flex-shrink-0 ${idc[item.status] || idc.pending}`}></span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-lg tabular-nums">{item.quantity}×</span>
                          <span className="font-medium truncate">{item.recipe_name}</span>
                        </div>
                        {item.notes && <div className="text-xs truncate" style={{ color: 'var(--kds-notes)' }}>📝 {item.notes}</div>}
                      </div>
                      <div className="flex gap-1">
                        {item.status === 'pending' && (
                          <button onClick={() => updateItemStatus(order.id, item.id, 'preparing')} className="bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition">🔥 شروع</button>
                        )}
                        {item.status === 'preparing' && (
                          <button onClick={() => updateItemStatus(order.id, item.id, 'ready')} className="bg-yellow-600 hover:bg-yellow-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition">✅ آماده</button>
                        )}
                        {item.status === 'ready' && (
                          <button onClick={() => updateItemStatus(order.id, item.id, 'delivered')} className="bg-gray-600 hover:bg-gray-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition">📤 تحویل</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="px-4 py-3 flex gap-2" style={{ background: 'var(--kds-action-bg)', borderTop: `1px solid var(--kds-border)` }}>
                  {order.status === 'open' && (
                    <button onClick={() => updateOrderStatus(order.id, 'in_progress')} className="flex-1 bg-yellow-600 hover:bg-yellow-500 text-white py-2.5 rounded-lg text-sm font-bold transition">🔥 شروع آماده‌سازی</button>
                  )}
                  {order.status === 'in_progress' && (
                    <button onClick={() => updateOrderStatus(order.id, 'ready')} className="flex-1 bg-green-600 hover:bg-green-500 text-white py-2.5 rounded-lg text-sm font-bold transition">✅ همه آماده شد</button>
                  )}
                  {order.status === 'ready' && (
                    <button onClick={() => updateOrderStatus(order.id, 'closed')} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-lg text-sm font-bold transition">📤 تحویل و بستن</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
