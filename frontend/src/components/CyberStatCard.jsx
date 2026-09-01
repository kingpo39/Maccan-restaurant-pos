// Cyberpunk stat card with holographic display aesthetic
export default function CyberStatCard({ title, value, subtitle, icon, color = '#00f3ff', trend, trendLabel }) {
  return (
    <div className="cyber-panel p-4 relative overflow-hidden group hover:border-cyan-500/30 transition-all duration-300">
      {/* Background watermark icon */}
      <div
        className="absolute -right-2 -bottom-2 text-6xl opacity-[0.03] select-none pointer-events-none group-hover:opacity-[0.06] transition-opacity"
        style={{ color }}
      >
        {icon}
      </div>

      {/* Scanline accent */}
      <div
        className="absolute top-0 left-0 w-full h-[1px] opacity-40"
        style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }}
      />

      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[9px] font-mono tracking-[2px] uppercase" style={{ color: color + '80' }}>
            {title}
          </span>
          <span className="text-lg opacity-30" style={{ color }}>{icon}</span>
        </div>

        <div className="flex items-baseline gap-1 mb-1">
          <span className="text-2xl font-bold text-white" style={{ fontFamily: 'Orbitron' }}>
            {value}
          </span>
        </div>

        {subtitle && (
          <div className="text-[10px] text-gray-500 font-mono">{subtitle}</div>
        )}

        {trend !== undefined && (
          <div className="mt-2 flex items-center gap-1.5">
            <span className={`text-[10px] font-mono font-bold ${trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}%
            </span>
            {trendLabel && (
              <span className="text-[9px] text-gray-600 font-mono">{trendLabel}</span>
            )}
          </div>
        )}
      </div>

      {/* Bottom accent line */}
      <div
        className="absolute bottom-0 left-0 w-full h-[1px] opacity-20"
        style={{ background: color }}
      />
    </div>
  );
}
