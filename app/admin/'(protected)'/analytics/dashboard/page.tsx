import { calculateSalesMetrics } from '@/lib/analytics/dashboard';

export default async function AnalyticsDashboardPage() {
  const metrics = calculateSalesMetrics([]);

  return (
    <main>
      <h1>Executive Analytics</h1>
      <section>
        <p>Revenue: {metrics.totalRevenue}</p>
        <p>Orders: {metrics.totalOrders}</p>
        <p>Average Order Value: {metrics.averageOrderValue}</p>
      </section>
    </main>
  );
}
