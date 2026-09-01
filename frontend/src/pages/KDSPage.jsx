import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../utils/api';
import { useToast } from '../contexts/ToastContext';

// Theme CSS custom properties
const THEME_VARS = {
  dark: {
    '--kds-bg': '#050505',
    '--kds-surface': '#0a0a0f',
    '--kds-surface-alt': '#12121a',
    '--kds-border': '#1a1a2e',
    '--kds-text': '#e0e0e8',
    '--kds-text-muted': '#4a4a5a',
    '--kds-cyan': '#00f3ff',
    '--kds-magenta': '#ff00ff',
    '--kds-green': '#00ff88',
    '--kds-amber': '#ffaa00',
    '--kds-red': '#ff3333',
  },
  light: {
    '--kds-bg': '#f0f0f5',
    '--kds-surface': '#ffffff',
    '--kds-surface-alt': '#f5f5fa',
    '--kds-border': '#d0d0e0',
    '--kds-text': '#1a1a2e',
    '--kds-text-muted': '#6a6a7a',
    '--kds-cyan': '#0088aa',
    '--kds-magenta': '#aa00aa',
    '--kds-green': '#00aa55',
    '--kds-amber': '#aa7700',
    '--kds-red': '#aa2222',
  },
  neon: {
    '--kds-bg': '#050510',
    '--kds-surface': '#0a0a1a',
    '--kds-surface-alt': '#10102a',
    '--kds-border': '#2a2a5e',
    '--kds-text': '#e0e0ff',
    '--kds-text-muted': '#6a6a9a',
    '--kds-cyan': '#00f3ff',
    '--kds-magenta': '#ff00ff',
    '--kds-green': '#00ff88',
    '--kds-amber': '#ffcc00',
    '--kds-red': '#ff3366',
  },
};

const ORDER_STYLES = {
  OPEN: { border: 'var(--kds-cyan)', bg: 'rgba(0,243,255,0.05)', badge: 'bg-cyan-500/20 text-cyan-400', label: 'NEW' },
  CONFIRMED: { border: 'var(--kds-amber)', bg: 'rgba(255,170,0,0.05)', badge: 'bg-amber-500/20 text-amber-400', label: 'CONFIRMED' },
  PREPARING: { border: 'var(--kds-amber)', bg: 'rgba(255,170,0,0.08)', badge: 'bg-amber-500/20 text-amber-400', label: 'COOKING' },
  READY: { border: 'var(--kds-green)', bg: 'rgba(0,255,136,0.05)', badge: 'bg-green-500/20 text-green-400', label: 'READY' },
};

const ITEM_STYLES = {
  pending: { dot: 'bg-cyan-500', glow: '0 0 6px rgba(0,243,255,0.5)' },
  PENDING: { dot: 'bg-cyan-500', glow: '0 0 6px rgba(0,243,255,0.5)' },
  preparing: { dot: 'bg-amber-500', glow: '0 0 6px rgba(255,170,0,0.5)' },
  PREPARING: { dot: 'bg-amber-500', glow: '0 0 6px rgba(255,170,0,0.5)' },
  ready: { dot: 'bg-green-500', glow: '0 0 6px rgba(0,255,136,0.5)' },
  READY: { dot: 'bg-green-500', glow: '0 0 6px rgba(0,255,136,0.5)' },
  delivered: { dot: 'bg-gray-600', glow: 'none' },
  DELIVERED: { dot: 'bg-gray-600', glow: 'none' },
};

function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(t); }, []);
  return (
    <span className="tabular-nums text-sm font-mono" style={{ color: 'var(--kds-text-muted)' }}>
      {time.toLocaleTimeString('en-US', { hour12: false })}
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

  useEffect(() => {
    const vars = THEME_VARS[theme] || THEME_VARS.dark;
    Object.entries(vars).forEach(([key, val]) => document.documentElement.style.setProperty(key, val));
    localStorage.setItem('kds_theme', theme);
  }, [theme]);

  useEffect(() => {
    return () => { Object.keys(THEME_VARS.dark).forEach(key => document.documentElement.style.removeProperty(key)); };
  }, []);

  const playAlert = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = 880; gain.gain.value = 0.2;
      osc.start(); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.stop(ctx.currentTime + 0.2);
    } catch (e) {}
  }, [soundEnabled]);

  const loadOrders = useCallback(async () => {
    try {
      const data = await api.get('/orders?active=true');
      setOrders(data);
      let pending = 0, preparing = 0, ready = 0;
      data.forEach(o => o.items?.forEach(item => {
        if (item.status === 'pending' || item.status === 'PENDING') pending++;
        else if (item.status === 'preparing' || item.status === 'PREPARING') preparing++;
        else if (item.status === 'ready' || item.status === 'READY') ready++;
      }));
      setStats({ pending, preparing, ready });
    } catch (e) {}
    setLoading(false);
  }, []);

  useEffect(() => {
    loadOrders();
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.hostname}:3000/ws`);
    wsRef.current = ws;
    ws.onopen = () => { setWsConnected(true); toast.info('LINK.ESTABLISHED', 'KDS connected to server'); };
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
      case 'ORDER_STATUS':
        if (msg.data.status === 'ready') toast.orderReady(msg.data.table_label || `#${msg.data.id}`);
        setOrders(prev => ['closed', 'served', 'CLOSED', 'SERVED'].includes(msg.data.status)
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

  const statusOrder = { OPEN: 0, CONFIRMED: 1, PREPARING: 2, READY: 3, SERVED: 4, CLOSED: 5 };
  const sortedOrders = [...orders].sort((a, b) => (statusOrder[a.status] || 0) - (statusOrder[b.status] || 0));

  return (
    <div className="min-h-screen p-4 transition-colors duration-300" style={{ background: 'var(--kds-bg)', color: 'var(--kds-text)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-3" style={{ borderBottom: '1px solid var(--kds-border)' }}>
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold tracking-wider" style={{ fontFamily: 'Orbitron', color: 'var(--kds-cyan)' }}>
            KDS<span className="text-glow-cyan">.TERM</span>
          </h1>
          <div className="flex items-center gap-2 text-[10px] font-mono">
            <span className={`status-dot ${wsConnected ? 'status-online' : 'status-error'}`} />
            <span style={{ color: wsConnected ? 'var(--kds-green)' : 'var(--kds-red)' }}>
              {wsConnected ? 'LINK.UP' : 'LINK.DOWN'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Theme Toggle */}
          <div className="flex items-center gap-1 p-0.5" style={{ background: 'var(--kds-surface-alt)', border: '1px solid var(--kds-border)' }}>
            {[['dark', '🌙'], ['light', '☀️'], ['neon', '⚡']].map(([key, icon]) => (
              <button
                key={key}
                onClick={() => setTheme(key)}
                className="w-8 h-8 flex items-center justify-center text-sm transition-all"
                style={theme === key
                  ? { background: 'var(--kds-cyan)', color: '#050505' }
                  : { color: 'var(--kds-text-muted)' }
                }
              >
                {icon}
              </button>
            ))}
          </div>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="w-8 h-8 flex items-center justify-center text-sm"
            style={{ background: soundEnabled ? 'var(--kds-surface-alt)' : 'transparent', border: '1px solid var(--kds-border)', color: soundEnabled ? 'var(--kds-green)' : 'var(--kds-text-muted)' }}
          >
            {soundEnabled ? '🔔' : '🔕'}
          </button>

          <button onClick={loadOrders} className="w-8 h-8 flex items-center justify-center text-sm" style={{ background: 'var(--kds-surface-alt)', border: '1px solid var(--kds-border)', color: 'var(--kds-text-muted)' }}>
            🔄
          </button>

          <LiveClock />
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-3 mb-4">
        {[
          { value: stats.pending, label: 'PENDING', color: 'var(--kds-cyan)' },
          { value: stats.preparing, label: 'COOKING', color: 'var(--kds-amber)' },
          { value: stats.ready, label: 'READY', color: 'var(--kds-green)' },
          { value: orders.length, label: 'ACTIVE', color: 'var(--kds-text-muted)' },
        ].map((s, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-2" style={{ background: 'var(--kds-surface)', border: `1px solid ${s.color}33` }}>
            <span className="text-2xl font-bold tabular-nums" style={{ fontFamily: 'Orbitron', color: s.color }}>{s.value}</span>
            <span className="text-[9px] font-mono tracking-widest" style={{ color: s.color + '99' }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Orders Grid */}
      {loading ? (
        <div className="text-center py-20" style={{ color: 'var(--kds-text-muted)' }}>
          <div className="text-3xl mb-3 animate-pulse-glow" style={{ color: 'var(--kds-cyan)' }}>&#x25CC;</div>
          <div className="text-[10px] font-mono tracking-[3px]">LOADING QUEUE...</div>
        </div>
      ) : sortedOrders.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-4 opacity-10">⚡</div>
          <p className="text-[11px] font-mono" style={{ color: 'var(--kds-text-muted)' }}>NO ACTIVE ORDERS</p>
          <p className="text-[9px] font-mono mt-1" style={{ color: 'var(--kds-text-muted)', opacity: 0.5 }}>Waiting for incoming transmissions...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {sortedOrders.map(order => {
            const st = ORDER_STYLES[order.status] || ORDER_STYLES.OPEN;
            return (
              <div
                key={order.id}
                className="cyber-panel overflow-hidden transition-all duration-300"
                style={{ borderLeft: `3px solid ${st.border}`, background: st.bg }}
              >
                {/* Order Header */}
                <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--kds-border)' }}>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold tabular-nums" style={{ fontFamily: 'Orbitron', color: 'var(--kds-cyan)' }}>
                      #{order.id?.slice(-3) || '???'}
                    </span>
                    <span className="text-sm">{order.table?.label || order.table_label || 'TAKE'}</span>
                  </div>
                  <span className={`text-[9px] font-mono font-bold px-2 py-0.5 ${st.badge}`}>
                    {st.label}
                  </span>
                </div>

                {/* Items */}
                <div className="px-4 py-2">
                  {order.items?.map(item => {
                    const ist = ITEM_STYLES[item.status] || ITEM_STYLES.pending;
                    return (
                      <div key={item.id} className="flex items-center gap-2 py-2" style={{ borderBottom: '1px solid var(--kds-border)' }}>
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${ist.dot}`} style={{ boxShadow: ist.glow }}></span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-sm tabular-nums">{item.quantity}×</span>
                            <span className="font-medium text-sm truncate">{item.recipe?.name || item.recipe_name}</span>
                          </div>
                          {item.notes && (
                            <div className="text-[9px] font-mono truncate" style={{ color: 'var(--kds-amber)' }}>&#x25B8; {item.notes}</div>
                          )}
                        </div>
                        <div className="flex gap-1">
                          {(item.status === 'pending' || item.status === 'PENDING') && (
                            <button onClick={() => updateItemStatus(order.id, item.id, 'preparing')}
                              className="cyber-btn text-[8px] px-2 py-0.5 border-amber-500/50 text-amber-400 hover:bg-amber-500/10">
                              FIRE
                            </button>
                          )}
                          {(item.status === 'preparing' || item.status === 'PREPARING') && (
                            <button onClick={() => updateItemStatus(order.id, item.id, 'ready')}
                              className="cyber-btn text-[8px] px-2 py-0.5 border-green-500/50 text-green-400 hover:bg-green-500/10">
                              DONE
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Actions */}
                <div className="px-4 py-2 flex gap-2" style={{ background: 'var(--kds-surface)', borderTop: '1px solid var(--kds-border)' }}>
                  {order.status === 'OPEN' && (
                    <button onClick={() => updateOrderStatus(order.id, 'in_progress')}
                      className="flex-1 cyber-btn text-[9px] border-amber-500/50 text-amber-400">
                      &#x25B6; START COOKING
                    </button>
                  )}
                  {order.status === 'in_progress' && (
                    <button onClick={() => updateOrderStatus(order.id, 'ready')}
                      className="flex-1 cyber-btn-green cyber-btn text-[9px]">
                      &#x2713; ALL READY
                    </button>
                  )}
                  {order.status === 'ready' && (
                    <button onClick={() => updateOrderStatus(order.id, 'closed')}
                      className="flex-1 cyber-btn-magenta cyber-btn text-[9px]">
                      &#x25B6; SERVE & CLOSE
                    </button>
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
