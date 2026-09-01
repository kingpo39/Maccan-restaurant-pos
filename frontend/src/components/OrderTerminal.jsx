import { useState, useEffect, useRef } from 'react';

const STATUS_CONFIG = {
  OPEN: { color: '#00f3ff', label: '>>> NEW', blink: false },
  CONFIRMED: { color: '#ffaa00', label: '>>> CONFIRMED', blink: false },
  PREPARING: { color: '#ffaa00', label: '>>> PREPARING', blink: true },
  READY: { color: '#00ff88', label: '>>> READY', blink: false },
  SERVED: { color: '#4a4a5a', label: '>>> SERVED', blink: false },
  CLOSED: { color: '#4a4a5a', label: '>>> CLOSED', blink: false },
};

export default function OrderTerminal({ orders = [], onStatusChange }) {
  const [time, setTime] = useState(new Date());
  const scrollRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="cyber-panel overflow-hidden">
      {/* Terminal Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-cyan-500/5 border-b border-cyan-500/10">
        <div className="flex items-center gap-2">
          <span className="status-dot status-online animate-pulse-glow" />
          <span className="text-[10px] font-mono text-cyan-400 tracking-[3px] text-glow-cyan">
            SYSTEM.LOG // ACTIVE ORDERS
          </span>
        </div>
        <span className="text-[9px] font-mono text-gray-600 tabular-nums">{formatTime(time)}</span>
      </div>

      {/* Terminal Body */}
      <div
        ref={scrollRef}
        className="max-h-[400px] overflow-y-auto p-3 font-mono text-[11px] leading-relaxed"
        style={{ background: 'rgba(5, 5, 10, 0.9)' }}
      >
        {/* System boot line */}
        <div className="text-gray-700 mb-2">
          <span className="text-cyan-500/40">$</span> ORDER_QUEUE initialized... {orders.length} active
        </div>

        {orders.length === 0 ? (
          <div className="text-gray-700 py-8 text-center">
            <div className="text-2xl mb-2 opacity-20">&#x25CC;</div>
            NO ACTIVE ORDERS
            <div className="text-[9px] mt-1 text-gray-800">Waiting for incoming orders...</div>
          </div>
        ) : (
          orders.map((order, idx) => {
            const st = STATUS_CONFIG[order.status] || STATUS_CONFIG.OPEN;
            return (
              <div key={order.id} className="flex items-center gap-3 py-1.5 hover:bg-white/[0.02] group">
                {/* Line number */}
                <span className="text-gray-800 w-4 text-right text-[9px]">{String(idx + 1).padStart(2, '0')}</span>

                {/* Timestamp */}
                <span className="text-gray-600 w-16 text-[9px]">
                  {order.createdAt ? new Date(order.createdAt).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }) : formatTime(time)}
                </span>

                {/* Table */}
                <span className="text-white font-bold w-8">#{order.id?.slice(-3) || '???'}</span>
                <span className="text-cyan-400/60 w-12">{order.table?.label || order.table_label || 'TAKE'}</span>

                {/* Status */}
                <span
                  className={`w-32 text-[10px] font-bold ${st.blink ? 'animate-blink' : ''}`}
                  style={{ color: st.color }}
                >
                  {st.label}
                </span>

                {/* Items */}
                <span className="flex-1 text-gray-400 truncate">
                  {(order.items || []).map(i => `${i.recipe?.name || i.recipe_name || '?'} x${i.quantity}`).join(', ')}
                </span>

                {/* Amount */}
                <span className="text-white/60 w-20 text-right tabular-nums">
                  {order.totalAmount ? `${order.totalAmount.toLocaleString()}` : ''}
                </span>

                {/* Action */}
                {order.status === 'READY' && onStatusChange && (
                  <button
                    onClick={() => onStatusChange(order.id, 'SERVED')}
                    className="cyber-btn-magenta cyber-btn text-[8px] px-2 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    SERVE
                  </button>
                )}

                {/* Blinking cursor for active orders */}
                {['OPEN', 'CONFIRMED', 'PREPARING'].includes(order.status) && (
                  <span className="text-cyan-400 animate-blink">_</span>
                )}
              </div>
            );
          })
        )}

        {/* Command prompt */}
        <div className="mt-2 text-gray-700 flex items-center gap-1">
          <span className="text-cyan-500/40">$</span>
          <span className="animate-blink text-cyan-400/60">_</span>
        </div>
      </div>
    </div>
  );
}
