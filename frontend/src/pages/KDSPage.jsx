import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../utils/api';

export default function KDSPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  const [stats, setStats] = useState({ pending: 0, preparing: 0, ready: 0 });
  const [soundEnabled, setSoundEnabled] = useState(true);
  const wsRef = useRef(null);
  const audioRef = useRef(null);

  // Play alert sound
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

  // Load active orders
  const loadOrders = useCallback(async () => {
    try {
      const data = await api.get('/orders?active=true');
      setOrders(data);
      // Compute stats
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

  // WebSocket connection
  useEffect(() => {
    loadOrders();

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.hostname}:3000/ws`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsConnected(true);
      console.log('🔌 KDS WebSocket connected');
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        handleWSMessage(msg);
      } catch (e) { console.error('WS parse error:', e); }
    };

    ws.onclose = () => {
      setWsConnected(false);
      console.log('🔌 KDS WebSocket disconnected, reconnecting in 3s...');
      setTimeout(() => {
        // Trigger re-render to reconnect
        setWsConnected(false);
      }, 3000);
    };

    ws.onerror = () => {
      setWsConnected(false);
    };

    return () => {
      ws.close();
    };
  }, []);

  const handleWSMessage = useCallback((msg) => {
    switch (msg.type) {
      case 'NEW_ORDER':
        playAlert();
        setOrders(prev => {
          const exists = prev.find(o => o.id === msg.data.id);
          if (exists) return prev;
          return [msg.data, ...prev];
        });
        break;

      case 'NEW_ITEM':
        playAlert();
        setOrders(prev => prev.map(o => {
          if (o.id === msg.data.order_id) {
            const exists = o.items?.find(i => i.id === msg.data.id);
            if (exists) return o;
            return { ...o, items: [...(o.items || []), msg.data] };
          }
          return o;
        }));
        break;

      case 'ITEM_STATUS':
        setOrders(prev => prev.map(o => {
          if (o.id === msg.data.order_id) {
            return {
              ...o,
              status: msg.data.order_status || o.status,
              items: msg.data.items || o.items,
            };
          }
          return o;
        }));
        break;

      case 'ORDER_STATUS':
        setOrders(prev => {
          if (['closed', 'served'].includes(msg.data.status)) {
            return prev.filter(o => o.id !== msg.data.id);
          }
          return prev.map(o => o.id === msg.data.id ? { ...o, status: msg.data.status } : o);
        });
        break;

      default:
        break;
    }
  }, [playAlert]);

  const updateItemStatus = async (orderId, itemId, status) => {
    try {
      await api.put(`/orders/${orderId}/items/${itemId}/status`, { status });
      // WebSocket will update the UI
    } catch (e) { console.error(e); }
  };

  const updateOrderStatus = async (orderId, status) => {
    try {
      await api.put(`/orders/${orderId}/status`, { status });
    } catch (e) { console.error(e); }
  };

  // Sort orders: open first, then in_progress, then ready
  const statusOrder = { open: 0, in_progress: 1, ready: 2, served: 3, closed: 4 };
  const sortedOrders = [...orders].sort((a, b) => (statusOrder[a.status] || 0) - (statusOrder[b.status] || 0));

  const orderStatusConfig = {
    open: { color: 'border-l-red-500 bg-red-50', badge: 'bg-red-100 text-red-700', label: '🆕 جدید' },
    in_progress: { color: 'border-l-yellow-500 bg-yellow-50', badge: 'bg-yellow-100 text-yellow-700', label: '🔥 در حال آماده‌سازی' },
    ready: { color: 'border-l-green-500 bg-green-50', badge: 'bg-green-100 text-green-700', label: '✅ آماده' },
  };

  const itemStatusConfig = {
    pending: { color: 'bg-red-500', label: 'در انتظار' },
    preparing: { color: 'bg-yellow-500', label: 'در حال پخت' },
    ready: { color: 'bg-green-500', label: 'آماده' },
    delivered: { color: 'bg-gray-400', label: 'تحویل شده' },
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      {/* KDS Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold">👨‍🍳 صفحه آشپزخانه | KDS</h1>
          <div className={`flex items-center gap-2 text-sm ${wsConnected ? 'text-green-400' : 'text-red-400'}`}>
            <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></span>
            {wsConnected ? 'متصل' : 'قطع'}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`px-3 py-1 rounded text-sm transition ${soundEnabled ? 'bg-green-700 text-white' : 'bg-gray-700 text-gray-400'}`}
          >
            {soundEnabled ? '🔔 صدا روشن' : '🔕 صدا خاموش'}
          </button>
          <button onClick={loadOrders} className="bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded text-sm transition">
            🔄 بروزرسانی
          </button>
          <div className="text-sm text-gray-400">
            {new Date().toLocaleTimeString('fa-IR')}
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="flex gap-4 mb-4">
        <div className="bg-red-900/50 border border-red-700 rounded-lg px-4 py-2 flex items-center gap-2">
          <span className="text-2xl font-bold">{stats.pending}</span>
          <span className="text-sm text-red-300">🆕 در انتظار</span>
        </div>
        <div className="bg-yellow-900/50 border border-yellow-700 rounded-lg px-4 py-2 flex items-center gap-2">
          <span className="text-2xl font-bold">{stats.preparing}</span>
          <span className="text-sm text-yellow-300">🔥 در حال پخت</span>
        </div>
        <div className="bg-green-900/50 border border-green-700 rounded-lg px-4 py-2 flex items-center gap-2">
          <span className="text-2xl font-bold">{stats.ready}</span>
          <span className="text-sm text-green-300">✅ آماده</span>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 flex items-center gap-2">
          <span className="text-2xl font-bold">{orders.length}</span>
          <span className="text-sm text-gray-400">📋 سفارش فعال</span>
        </div>
      </div>

      {/* Orders Grid */}
      {loading ? (
        <div className="text-center py-20 text-gray-500">در حال بارگذاری...</div>
      ) : sortedOrders.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">👨‍🍳</div>
          <p className="text-gray-400 text-lg">هنوز سفارشی نیست</p>
          <p className="text-gray-600 text-sm mt-2">سفارشات جدید از طرف سرور اینجا ظاهر می‌شوند</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sortedOrders.map(order => {
            const st = orderStatusConfig[order.status] || orderStatusConfig.open;
            return (
              <div key={order.id} className={`rounded-xl border-l-4 shadow-lg ${st.color} overflow-hidden`}>
                {/* Order Header */}
                <div className="px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold">#{order.id}</span>
                    <span className="text-lg">🪑 {order.table_label}</span>
                  </div>
                  <span className={`${st.badge} px-2 py-1 rounded-full text-xs font-bold`}>{st.label}</span>
                </div>

                {/* Items */}
                <div className="px-4 pb-2">
                  {order.items?.map(item => {
                    const ist = itemStatusConfig[item.status] || itemStatusConfig.pending;
                    return (
                      <div key={item.id} className="flex items-center gap-2 py-2 border-t border-gray-200/20">
                        <span className={`w-3 h-3 rounded-full ${ist.color} flex-shrink-0`}></span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-lg">{item.quantity}×</span>
                            <span className="font-medium truncate">{item.recipe_name}</span>
                          </div>
                          {item.notes && (
                            <div className="text-xs text-yellow-300 truncate">📝 {item.notes}</div>
                          )}
                        </div>
                        <div className="flex gap-1">
                          {item.status === 'pending' && (
                            <button
                              onClick={() => updateItemStatus(order.id, item.id, 'preparing')}
                              className="bg-yellow-600 hover:bg-yellow-500 text-white px-2 py-1 rounded text-xs transition"
                            >
                              🔥 شروع
                            </button>
                          )}
                          {item.status === 'preparing' && (
                            <button
                              onClick={() => updateItemStatus(order.id, item.id, 'ready')}
                              className="bg-green-600 hover:bg-green-500 text-white px-2 py-1 rounded text-xs transition"
                            >
                              ✅ آماده
                            </button>
                          )}
                          {item.status === 'ready' && (
                            <button
                              onClick={() => updateItemStatus(order.id, item.id, 'delivered')}
                              className="bg-gray-600 hover:bg-gray-500 text-white px-2 py-1 rounded text-xs transition"
                            >
                              📤 تحویل
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Order Actions */}
                <div className="px-4 py-3 bg-black/10 flex gap-2">
                  {order.status === 'open' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'in_progress')}
                      className="flex-1 bg-yellow-600 hover:bg-yellow-500 text-white py-2 rounded-lg text-sm font-medium transition"
                    >
                      🔥 شروع آماده‌سازی
                    </button>
                  )}
                  {order.status === 'in_progress' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'ready')}
                      className="flex-1 bg-green-600 hover:bg-green-500 text-white py-2 rounded-lg text-sm font-medium transition"
                    >
                      ✅ همه آماده شد
                    </button>
                  )}
                  {order.status === 'ready' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'closed')}
                      className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg text-sm font-medium transition"
                    >
                      📤 تحویل و بستن
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
