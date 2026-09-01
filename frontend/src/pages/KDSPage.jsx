import { useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';
import { useToast } from '../contexts/ToastContext';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

const STATUS_STYLES = {
  OPEN: { badge: 'info', label: 'New' },
  CONFIRMED: { badge: 'default', label: 'Confirmed' },
  PREPARING: { badge: 'warning', label: 'Cooking' },
  READY: { badge: 'success', label: 'Ready' },
  SERVED: { badge: 'secondary', label: 'Served' },
  CLOSED: { badge: 'secondary', label: 'Closed' },
};

const ITEM_DOT = {
  pending: 'bg-blue-500', PENDING: 'bg-blue-500',
  preparing: 'bg-amber-500', PREPARING: 'bg-amber-500',
  ready: 'bg-green-500', READY: 'bg-green-500',
  delivered: 'bg-gray-400', DELIVERED: 'bg-gray-400',
};

function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(t); }, []);
  return (
    <span className="text-sm text-muted-foreground font-mono tabular-nums">
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
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('kds_dark') === 'true');
  const toast = useToast();

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('kds_dark', darkMode);
  }, [darkMode]);

  useEffect(() => {
    return () => { document.documentElement.classList.remove('dark'); };
  }, []);

  const playAlert = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = 880; gain.gain.value = 0.15;
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
        const s = (item.status || '').toLowerCase();
        if (s === 'pending') pending++;
        else if (s === 'preparing') preparing++;
        else if (s === 'ready') ready++;
      }));
      setStats({ pending, preparing, ready });
    } catch (e) {}
    setLoading(false);
  }, []);

  useEffect(() => {
    loadOrders();
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.hostname}:3000/ws`);
    ws.onopen = () => { setWsConnected(true); toast.info('Connected', 'KDS linked to server'); };
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'NEW_ORDER') {
          playAlert();
          toast.orderPlaced(msg.data.table_label, msg.data.items?.length || 0);
          setOrders(prev => prev.find(o => o.id === msg.data.id) ? prev : [msg.data, ...prev]);
        }
      } catch (e) {}
    };
    ws.onclose = () => setWsConnected(false);
    ws.onerror = () => setWsConnected(false);
    return () => ws.close();
  }, []);

  const updateItemStatus = async (orderId, itemId, status) => {
    try { await api.put(`/orders/${orderId}/items/${itemId}/status`, { status }); } catch (e) {}
  };
  const updateOrderStatus = async (orderId, status) => {
    try { await api.put(`/orders/${orderId}/status`, { status }); } catch (e) {}
  };

  const statusOrder = { OPEN: 0, CONFIRMED: 1, PREPARING: 2, READY: 3, SERVED: 4, CLOSED: 5 };
  const sorted = [...orders].sort((a, b) => (statusOrder[a.status] || 0) - (statusOrder[b.status] || 0));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Kitchen Display</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-muted-foreground">{wsConnected ? 'Connected' : 'Disconnected'}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="btn btn-outline btn-sm"
          >
            {darkMode ? '☀️ Light' : '🌙 Dark'}
          </button>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="btn btn-outline btn-sm"
          >
            {soundEnabled ? '🔔' : '🔕'}
          </button>
          <Button variant="outline" size="sm" onClick={loadOrders}>Refresh</Button>
          <LiveClock />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { value: stats.pending, label: 'Pending', color: 'text-blue-600 bg-blue-50 border-blue-200' },
          { value: stats.preparing, label: 'Cooking', color: 'text-amber-600 bg-amber-50 border-amber-200' },
          { value: stats.ready, label: 'Ready', color: 'text-green-600 bg-green-50 border-green-200' },
          { value: orders.length, label: 'Total', color: 'text-muted-foreground bg-muted border-border' },
        ].map((s, i) => (
          <div key={i} className={`rounded-lg border px-4 py-3 ${s.color}`}>
            <div className="text-2xl font-bold tabular-nums">{s.value}</div>
            <div className="text-xs opacity-75">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Orders Grid */}
      {loading ? (
        <div className="text-center py-16 text-muted-foreground">Loading orders...</div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3 opacity-20">👨‍🍳</div>
          <p className="text-muted-foreground">No active orders</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sorted.map(order => {
            const st = STATUS_STYLES[order.status] || STATUS_STYLES.OPEN;
            return (
              <div key={order.id} className="card overflow-hidden">
                {/* Header */}
                <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground">#{String(order.id).slice(-3)}</span>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-sm">{order.table?.label || order.table_label || 'Take'}</span>
                  </div>
                  <Badge variant={st.badge}>{st.label}</Badge>
                </div>

                {/* Items */}
                <div className="px-4 py-2">
                  {order.items?.map(item => (
                    <div key={item.id} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${ITEM_DOT[item.status] || ITEM_DOT.pending}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-medium">{item.quantity}×</span>
                          <span className="text-sm truncate">{item.recipe?.name || item.recipe_name}</span>
                        </div>
                        {item.notes && (
                          <p className="text-xs text-amber-600 truncate mt-0.5">📝 {item.notes}</p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        {(item.status === 'pending' || item.status === 'PENDING') && (
                          <Button variant="outline" size="sm" onClick={() => updateItemStatus(order.id, item.id, 'preparing')}>
                            Start
                          </Button>
                        )}
                        {(item.status === 'preparing' || item.status === 'PREPARING') && (
                          <Button variant="outline" size="sm" className="border-green-300 text-green-700 hover:bg-green-50" onClick={() => updateItemStatus(order.id, item.id, 'ready')}>
                            Done
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="px-4 py-3 border-t border-border bg-muted/30 flex gap-2">
                  {order.status === 'OPEN' && (
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => updateOrderStatus(order.id, 'in_progress')}>
                      Start Cooking
                    </Button>
                  )}
                  {order.status === 'in_progress' && (
                    <Button variant="default" size="sm" className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => updateOrderStatus(order.id, 'ready')}>
                      All Ready
                    </Button>
                  )}
                  {order.status === 'ready' && (
                    <Button variant="default" size="sm" className="flex-1" onClick={() => updateOrderStatus(order.id, 'closed')}>
                      Serve & Close
                    </Button>
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
