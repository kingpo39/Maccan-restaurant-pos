import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const CyberTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="cyber-panel px-3 py-2 text-xs font-mono" style={{ minWidth: 120 }}>
      <div className="text-gray-500 text-[9px] mb-1">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="text-white font-bold tabular-nums">
            {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

export default function HoloChart({ data = [], title, dataKey = 'value', color = '#00f3ff', height = 200 }) {
  return (
    <div className="cyber-panel overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-cyan-500/5 border-b border-cyan-500/10">
        <span className="text-[10px] font-mono text-cyan-400 tracking-[2px]">{title || 'DATA.STREAM'}</span>
        <span className="text-[9px] font-mono text-gray-600">{data.length} POINTS</span>
      </div>

      {/* Chart */}
      <div className="p-4">
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`gradient-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.4} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2e" />
            <XAxis
              dataKey="name"
              stroke="#333"
              tick={{ fill: '#4a4a5a', fontSize: 10, fontFamily: 'JetBrains Mono' }}
              axisLine={{ stroke: '#1a1a2e' }}
            />
            <YAxis
              stroke="#333"
              tick={{ fill: '#4a4a5a', fontSize: 10, fontFamily: 'JetBrains Mono' }}
              axisLine={{ stroke: '#1a1a2e' }}
            />
            <Tooltip content={<CyberTooltip />} />
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={2}
              fill={`url(#gradient-${color.replace('#', '')})`}
              dot={false}
              activeDot={{ r: 4, fill: color, stroke: '#050505', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
