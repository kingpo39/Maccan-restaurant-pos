import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

const statusConfig = {
  OPEN: { variant: 'info', label: 'OPEN' },
  CONFIRMED: { variant: 'default', label: 'CONFIRMED' },
  PREPARING: { variant: 'warning', label: 'PREPARING' },
  READY: { variant: 'success', label: 'READY' },
  SERVED: { variant: 'secondary', label: 'SERVED' },
  CLOSED: { variant: 'secondary', label: 'CLOSED' },
};

export function RecentOrdersTable({ orders = [], onStatusChange }) {
  return (
    <div className="card">
      <div className="px-6 pt-5 pb-3">
        <h3 className="font-semibold text-foreground">Recent Orders</h3>
        <p className="text-sm text-muted-foreground">Live view of current active tickets</p>
      </div>
      <div className="px-6 pb-5">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Table</th>
                <th>Items</th>
                <th>Status</th>
                <th className="text-right">Amount</th>
                {onStatusChange && <th className="w-[80px]"></th>}
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={onStatusChange ? 6 : 5} className="text-center py-8 text-muted-foreground">
                    No active orders
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  const st = statusConfig[order.status] || statusConfig.OPEN;
                  return (
                    <tr key={order.id}>
                      <td className="font-medium">#{String(order.id).slice(-4)}</td>
                      <td>{order.table?.label || order.table_label || '—'}</td>
                      <td className="text-muted-foreground">
                        {(order.items || []).map(i => i.recipe?.name || i.recipe_name || '?').join(', ')}
                      </td>
                      <td><Badge variant={st.variant}>{st.label}</Badge></td>
                      <td className="text-right font-mono">
                        {order.totalAmount ? `${Number(order.totalAmount).toLocaleString()} T` : '—'}
                      </td>
                      {onStatusChange && (
                        <td>
                          {order.status === 'READY' && (
                            <Button variant="ghost" size="sm" onClick={() => onStatusChange(order.id, 'SERVED')}>
                              Serve
                            </Button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
