export type SalesMetric = {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
};

export function calculateSalesMetrics(orders: Array<{ total?: number; status?: string }>): SalesMetric {
  const completed = orders.filter((o) => o.status === 'paid' || o.status === 'completed');
  const revenue = completed.reduce((sum, order) => sum + Number(order.total || 0), 0);
  return {
    totalRevenue: revenue,
    totalOrders: completed.length,
    averageOrderValue: completed.length ? revenue / completed.length : 0,
  };
}
