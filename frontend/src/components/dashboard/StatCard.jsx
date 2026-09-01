import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';

const trendColors = {
  positive: 'text-green-600',
  negative: 'text-red-600',
  neutral: 'text-muted-foreground',
};

const iconBg = {
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-green-50 text-green-600',
  amber: 'bg-amber-50 text-amber-600',
  red: 'bg-red-50 text-red-600',
  purple: 'bg-purple-50 text-purple-600',
};

export function StatCard({ title, value, change, icon, iconColor = 'blue', subtitle, className = '' }) {
  const trend = change !== undefined ? (change > 0 ? 'positive' : change < 0 ? 'negative' : 'neutral') : null;

  return (
    <Card hover className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${iconBg[iconColor] || iconBg.blue}`}>
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tracking-tight text-foreground">{value}</div>
        {change !== undefined && (
          <p className={`flex items-center gap-1 text-xs mt-1 ${trendColors[trend]}`}>
            {trend === 'positive' && <span>↑</span>}
            {trend === 'negative' && <span>↓</span>}
            {trend === 'neutral' && <span>→</span>}
            <span>{Math.abs(change)}%</span>
            <span className="text-muted-foreground ml-1">vs last week</span>
          </p>
        )}
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}
