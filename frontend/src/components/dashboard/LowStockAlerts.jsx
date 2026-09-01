import { Badge } from '../ui/Badge';

export function LowStockAlerts({ alerts = [] }) {
  if (alerts.length === 0) {
    return (
      <div className="card border-green-200 bg-green-50/50">
        <div className="px-6 py-5 flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-lg">
            ✓
          </div>
          <div>
            <p className="font-medium text-green-900">All Stock Levels Healthy</p>
            <p className="text-sm text-green-700">No immediate replenishment needed</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card border-red-200">
      <div className="px-6 pt-5 pb-3">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <span className="text-red-500">⚠</span>
          Low Stock Alerts
          <Badge variant="destructive">{alerts.length}</Badge>
        </h3>
      </div>
      <div className="px-6 pb-5">
        <ul className="space-y-3">
          {alerts.map((alert, idx) => (
            <li key={idx} className="flex items-center justify-between text-sm border-b border-border/50 pb-3 last:border-0 last:pb-0">
              <div>
                <p className="font-medium text-foreground">{alert.name || alert.ingredient}</p>
                <p className="text-xs text-muted-foreground">
                  {alert.currentStock ?? alert.quantity} {alert.baseUnit ?? alert.unit} available
                  {alert.threshold && ` / min: ${alert.threshold}`}
                </p>
              </div>
              <Badge variant="destructive">Low</Badge>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
