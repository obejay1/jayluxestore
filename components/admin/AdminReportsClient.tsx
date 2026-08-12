'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import styles from '@/components/admin/AdminReportsClient.module.css';

interface OrderItem {
  id?: string;
  name?: string;
  category?: string;
  price?: number;
  qty?: number;
  quantity?: number;
}
interface OrderData {
  id?: string;
  total?: number;
  subtotal?: number;
  shipping?: number;
  tax?: number;
  status?: string;
  createdAt?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  paymentMethod?: string;
  items?: OrderItem[];
}
interface ProductData { id?: string; name?: string; category?: string; price?: number; stock?: number; type?: string; }
interface UserData { id?: string; name?: string; fullName?: string; email?: string; createdAt?: string; joined?: string; }
interface TopProduct { name: string; category: string; qtySold: number; revenue: number; }
interface TopCustomer { email: string; name: string; totalSpent: number; orderCount: number; }
interface CategoryData { name: string; revenue: number; qtySold: number; }
type DateFilter = 'all' | 'today' | 'week' | 'month' | 'year' | 'custom';

const money = (amount: number) => `₦${Math.round(amount || 0).toLocaleString('en-NG')}`;
const getOrderTotal = (order: OrderData) => Number(order.total ?? order.subtotal ?? 0);
const toDateInput = (date: Date) => date.toISOString().slice(0, 10);

function normaliseStatus(status?: string) {
  const value = (status || 'Processing').toLowerCase();
  if (value.includes('deliver')) return 'Delivered';
  if (value.includes('ship')) return 'Shipped';
  if (value.includes('refund')) return 'Refunded';
  if (value.includes('cancel')) return 'Cancelled';
  if (value.includes('pending')) return 'Pending';
  if (value.includes('confirm')) return 'Confirmed';
  if (value.includes('process')) return 'Processing';
  return status || 'Processing';
}

type ReportsResponse = {
  ok?: boolean;
  message?: string;
  code?: string;
  orders?: OrderData[];
  products?: ProductData[];
  users?: UserData[];
};

async function readReportsResponse(response: Response): Promise<ReportsResponse> {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as ReportsResponse;
  } catch {
    throw new Error('The reports service returned an invalid response.');
  }
}

export default function AdminReportsClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [products, setProducts] = useState<ProductData[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);
  const [dateFilter, setDateFilter] = useState<DateFilter>('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [exporting, setExporting] = useState('');

  const fetchReportsData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/reports', {
        method: 'GET',
        cache: 'no-store',
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
      });
      const data = await readReportsResponse(response);

      if (response.status === 401) {
        router.replace('/admin/login?error=expired');
        router.refresh();
        return;
      }
      if (response.status === 403) {
        router.replace('/admin/access-denied');
        router.refresh();
        return;
      }
      if (!response.ok || data.ok !== true) {
        throw new Error(data.message || 'Unable to load financial reports.');
      }

      setOrders(Array.isArray(data.orders) ? data.orders : []);
      setUsers(Array.isArray(data.users) ? data.users : []);
      setProducts(Array.isArray(data.products) ? data.products : []);
    } catch (loadError) {
      console.error('Error loading financial reports:', loadError);
      setError(
        loadError instanceof Error && loadError.message
          ? loadError.message
          : 'Unable to load financial reports. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void fetchReportsData();
  }, [fetchReportsData]);

  const filteredOrders = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    let filterStart: Date | null = null;
    let filterEnd: Date | null = null;

    if (dateFilter === 'today') {
      filterStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      filterEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    } else if (dateFilter === 'week') {
      start.setDate(now.getDate() - 7);
      filterStart = start;
      filterEnd = now;
    } else if (dateFilter === 'month') {
      filterStart = new Date(now.getFullYear(), now.getMonth(), 1);
      filterEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    } else if (dateFilter === 'year') {
      filterStart = new Date(now.getFullYear(), 0, 1);
      filterEnd = new Date(now.getFullYear() + 1, 0, 1);
    } else if (dateFilter === 'custom') {
      filterStart = startDate ? new Date(`${startDate}T00:00:00`) : null;
      filterEnd = endDate ? new Date(`${endDate}T23:59:59`) : null;
    }

    if (!filterStart && !filterEnd) return orders;
    return orders.filter((order) => {
      const date = new Date(order.createdAt || 0);
      if (Number.isNaN(date.getTime())) return false;
      if (filterStart && date < filterStart) return false;
      if (filterEnd && date > filterEnd) return false;
      return true;
    });
  }, [orders, dateFilter, startDate, endDate]);

  const analytics = useMemo(() => {
    const monthlyMap: Record<string, { revenue: number; orders: number }> = {};
    const dailyMap: Record<string, { revenue: number; orders: number }> = {};
    const productsMap: Record<string, TopProduct> = {};
    const customersMap: Record<string, TopCustomer> = {};
    const categoryMap: Record<string, CategoryData> = {};
    const statusMap: Record<string, number> = {};
    let totalRevenue = 0;
    let deliveredRevenue = 0;
    let cancelledRevenue = 0;
    let pendingRevenue = 0;

    filteredOrders.forEach((order) => {
      const orderTotal = getOrderTotal(order);
      const status = normaliseStatus(order.status);
      const dateObj = new Date(order.createdAt || 0);
      if (Number.isNaN(dateObj.getTime())) return;
      const monthKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
      const dayKey = `${monthKey}-${String(dateObj.getDate()).padStart(2, '0')}`;
      const countsAsRevenue = status !== 'Cancelled' && status !== 'Refunded';

      if (countsAsRevenue) totalRevenue += orderTotal;
      if (status === 'Delivered') deliveredRevenue += orderTotal;
      if (status === 'Cancelled' || status === 'Refunded') cancelledRevenue += orderTotal;
      if (status === 'Pending' || status === 'Processing' || status === 'Confirmed') pendingRevenue += orderTotal;

      monthlyMap[monthKey] ||= { revenue: 0, orders: 0 };
      monthlyMap[monthKey].revenue += countsAsRevenue ? orderTotal : 0;
      monthlyMap[monthKey].orders += 1;
      dailyMap[dayKey] ||= { revenue: 0, orders: 0 };
      dailyMap[dayKey].revenue += countsAsRevenue ? orderTotal : 0;
      dailyMap[dayKey].orders += 1;
      statusMap[status] = (statusMap[status] || 0) + 1;

      order.items?.forEach((item) => {
        const qty = Number(item.qty ?? item.quantity ?? 1);
        const price = Number(item.price ?? 0);
        const itemRevenue = price * qty;
        const name = item.name || 'Unknown Product';
        const category = item.category || 'Uncategorised';
        productsMap[name] ||= { name, category, qtySold: 0, revenue: 0 };
        productsMap[name].qtySold += qty;
        productsMap[name].revenue += itemRevenue;
        categoryMap[category] ||= { name: category, revenue: 0, qtySold: 0 };
        categoryMap[category].revenue += itemRevenue;
        categoryMap[category].qtySold += qty;
      });

      const email = order.customerEmail || 'Not provided';
      const name = order.customerName || 'Unknown Customer';
      customersMap[email] ||= { email, name, totalSpent: 0, orderCount: 0 };
      customersMap[email].totalSpent += countsAsRevenue ? orderTotal : 0;
      customersMap[email].orderCount += 1;
    });

    return {
      totalRevenue,
      deliveredRevenue,
      cancelledRevenue,
      pendingRevenue,
      averageOrderValue: filteredOrders.length ? totalRevenue / filteredOrders.length : 0,
      monthlyData: Object.entries(monthlyMap).sort(([a], [b]) => a.localeCompare(b)).map(([name, value]) => ({ name, ...value })),
      dailyData: Object.entries(dailyMap).sort(([a], [b]) => a.localeCompare(b)).slice(-14).map(([name, value]) => ({ name, ...value })),
      topProducts: Object.values(productsMap).sort((a, b) => b.revenue - a.revenue).slice(0, 8),
      topCustomers: Object.values(customersMap).sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 8),
      statusData: Object.entries(statusMap).map(([name, value]) => ({ name, value })),
      categoryData: Object.values(categoryMap).sort((a, b) => b.revenue - a.revenue).slice(0, 8),
      lowStockProducts: products.filter((product) => Number(product.stock ?? 0) <= 5).sort((a, b) => Number(a.stock ?? 0) - Number(b.stock ?? 0)).slice(0, 8),
    };
  }, [filteredOrders, products]);

  function exportCSV() {
    setExporting('csv');
    try {
      const headers = ['Order ID', 'Date', 'Customer Name', 'Customer Email', 'Status', 'Payment Method', 'Total Amount'];
      const escapeCsv = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;
      const rows = filteredOrders.map((order) => [
        order.id || '',
        new Date(order.createdAt || 0).toLocaleString(),
        order.customerName || '',
        order.customerEmail || '',
        normaliseStatus(order.status),
        order.paymentMethod || '',
        getOrderTotal(order),
      ].map(escapeCsv));
      const content = [headers.map(escapeCsv).join(','), ...rows.map((row) => row.join(','))].join('\n');
      const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `jayluxe-financial-report-${toDateInput(new Date())}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting('');
    }
  }

  async function exportExcel() {
    setExporting('excel');
    try {
      const XLSX = await import('xlsx');
      const rows = filteredOrders.map((order) => ({
        'Order ID': order.id || '',
        Date: new Date(order.createdAt || 0).toLocaleString(),
        Customer: order.customerName || '',
        Email: order.customerEmail || '',
        Status: normaliseStatus(order.status),
        'Payment Method': order.paymentMethod || '',
        Total: getOrderTotal(order),
      }));
      const summary = [
        { Metric: 'Total Revenue', Value: analytics.totalRevenue },
        { Metric: 'Total Orders', Value: filteredOrders.length },
        { Metric: 'Total Customers', Value: users.length },
        { Metric: 'Total Products', Value: products.length },
        { Metric: 'Average Order Value', Value: analytics.averageOrderValue },
        { Metric: 'Delivered Revenue', Value: analytics.deliveredRevenue },
        { Metric: 'Pending/Processing Revenue', Value: analytics.pendingRevenue },
      ];
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summary), 'Summary');
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), 'Orders');
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(analytics.topProducts), 'Top Products');
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(analytics.topCustomers), 'Top Customers');
      XLSX.writeFile(workbook, `jayluxe-financial-report-${toDateInput(new Date())}.xlsx`);
    } finally {
      setExporting('');
    }
  }

  async function exportPDF() {
    setExporting('pdf');
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let y = 18;
      doc.setFontSize(18);
      doc.text('JayLuxe Financial Report', pageWidth / 2, y, { align: 'center' });
      y += 10;
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, y, { align: 'center' });
      y += 14;
      [
        `Total Revenue: ${money(analytics.totalRevenue)}`,
        `Total Orders: ${filteredOrders.length}`,
        `Total Customers: ${users.length}`,
        `Total Products: ${products.length}`,
        `Average Order Value: ${money(analytics.averageOrderValue)}`,
        `Delivered Revenue: ${money(analytics.deliveredRevenue)}`,
        `Pending/Processing Revenue: ${money(analytics.pendingRevenue)}`,
      ].forEach((line) => { doc.text(line, 14, y); y += 8; });
      y += 6;
      doc.setFontSize(13); doc.text('Top Products', 14, y); y += 8; doc.setFontSize(10);
      analytics.topProducts.slice(0, 6).forEach((product, index) => { doc.text(`${index + 1}. ${product.name} - Qty ${product.qtySold} - ${money(product.revenue)}`, 14, y); y += 7; });
      y += 6;
      doc.setFontSize(13); doc.text('Top Customers', 14, y); y += 8; doc.setFontSize(10);
      analytics.topCustomers.slice(0, 6).forEach((customer, index) => { doc.text(`${index + 1}. ${customer.name} - ${customer.orderCount} orders - ${money(customer.totalSpent)}`, 14, y); y += 7; });
      doc.save(`jayluxe-financial-report-${toDateInput(new Date())}.pdf`);
    } finally {
      setExporting('');
    }
  }

  const statusColours = ['#211b15', '#c39731', '#2f855a', '#b83232', '#2b6cb0', '#7b4bb7', '#64748b'];
  const statItems = [
    ['Total Revenue', money(analytics.totalRevenue), 'gold'],
    ['Total Orders', filteredOrders.length.toLocaleString(), ''],
    ['Customers', users.length.toLocaleString(), ''],
    ['Products', products.length.toLocaleString(), ''],
    ['Average Order', money(analytics.averageOrderValue), ''],
    ['Pending Revenue', money(analytics.pendingRevenue), ''],
    ['Delivered Revenue', money(analytics.deliveredRevenue), ''],
    ['Low Stock Items', analytics.lowStockProducts.length.toLocaleString(), ''],
  ];

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.headerCopy}><h1>Financial Reports</h1><p>Sales, customers, products and inventory performance.</p></div>
        <Link href="/admin" className={styles.backLink}>Back to Dashboard</Link>
      </header>

      <main className={styles.main}>
        {loading ? (
          <section className={styles.state} aria-live="polite">
            <div className={styles.stateCard}>
              <div className={styles.loadingBar} aria-hidden="true" />
              <h2>Loading financial reports…</h2>
              <p>Preparing the latest JayLuxe sales, customer and inventory data.</p>
            </div>
          </section>
        ) : error ? (
          <section className={styles.state}>
            <div className={styles.stateCard} role="alert">
              <h2>Unable to load financial reports</h2>
              <p>{error}</p>
              <button type="button" onClick={() => void fetchReportsData()}>Try again</button>
            </div>
          </section>
        ) : (
          <>
        {orders.length === 0 && products.length === 0 && users.length === 0 ? (
          <section className={styles.emptyNotice} role="status">
            <strong>No report data available yet.</strong>
            <span>Sales, customer and inventory summaries will appear here as JayLuxe data is created.</span>
          </section>
        ) : null}

        <section className={styles.toolbar} aria-label="Report filters and exports">
          <div className={styles.filters}>
            <div className={styles.field}>
              <label htmlFor="report-period">Period</label>
              <select id="report-period" value={dateFilter} onChange={(event) => setDateFilter(event.target.value as DateFilter)}>
                <option value="all">All time</option><option value="today">Today</option><option value="week">Last 7 days</option><option value="month">This month</option><option value="year">This year</option><option value="custom">Custom range</option>
              </select>
            </div>
            {dateFilter === 'custom' && <>
              <div className={styles.field}><label htmlFor="report-start">Start</label><input id="report-start" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></div>
              <div className={styles.field}><label htmlFor="report-end">End</label><input id="report-end" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></div>
            </>}
          </div>
          <div className={styles.exports}>
            <button type="button" className={`${styles.exportButton} ${styles.secondary}`} onClick={exportCSV} disabled={Boolean(exporting)}>{exporting === 'csv' ? 'Exporting…' : 'CSV'}</button>
            <button type="button" className={`${styles.exportButton} ${styles.secondary}`} onClick={() => void exportExcel()} disabled={Boolean(exporting)}>{exporting === 'excel' ? 'Exporting…' : 'Excel'}</button>
            <button type="button" className={styles.exportButton} onClick={() => void exportPDF()} disabled={Boolean(exporting)}>{exporting === 'pdf' ? 'Exporting…' : 'PDF'}</button>
          </div>
        </section>

        <section className={styles.statsGrid} aria-label="Report summary">
          {statItems.map(([label, value, accent]) => <article key={label} className={styles.statCard} data-accent={accent || undefined}><p>{label}</p><strong>{value}</strong></article>)}
        </section>

        <section className={styles.twoColumn}>
          <article className={styles.card}><div className={styles.cardHeader}><h2>Monthly Revenue Trend</h2></div><div className={styles.chart}>{analytics.monthlyData.length ? <ResponsiveContainer width="100%" height="100%"><LineChart data={analytics.monthlyData} margin={{ top: 8, right: 10, left: -16, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e9e4dc" /><XAxis dataKey="name" tick={{ fontSize: 11, fill: '#766d61' }} /><YAxis tick={{ fontSize: 11, fill: '#766d61' }} tickFormatter={(value) => `₦${Number(value) / 1000}k`} /><Tooltip formatter={(value) => money(Number(value))} /><Line type="monotone" dataKey="revenue" stroke="#b88823" strokeWidth={3} dot={false} name="Revenue" /></LineChart></ResponsiveContainer> : <div className={styles.state}><p>No revenue data in this period.</p></div>}</div></article>
          <article className={styles.card}><div className={styles.cardHeader}><h2>Order Status</h2></div><div className={styles.chart}>{analytics.statusData.length ? <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={analytics.statusData} dataKey="value" nameKey="name" outerRadius="68%" innerRadius="38%" paddingAngle={2}>{analytics.statusData.map((entry, index) => <Cell key={entry.name} fill={statusColours[index % statusColours.length]} />)}</Pie><Tooltip /><Legend wrapperStyle={{ fontSize: 11 }} /></PieChart></ResponsiveContainer> : <div className={styles.state}><p>No order status data yet.</p></div>}</div></article>
        </section>

        <section className={styles.twoColumnEqual}>
          <article className={styles.card}><div className={styles.cardHeader}><h2>Daily Orders</h2><small>Last 14 active days</small></div><div className={styles.chart}>{analytics.dailyData.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={analytics.dailyData} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e9e4dc" /><XAxis dataKey="name" tick={{ fontSize: 10, fill: '#766d61' }} tickFormatter={(value) => String(value).slice(5)} /><YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#766d61' }} /><Tooltip /><Bar dataKey="orders" fill="#2c251e" name="Orders" radius={[7, 7, 0, 0]} /></BarChart></ResponsiveContainer> : <div className={styles.state}><p>No order activity yet.</p></div>}</div></article>
          <article className={styles.card}><div className={styles.cardHeader}><h2>Category Revenue</h2></div><div className={styles.chart}>{analytics.categoryData.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={analytics.categoryData} layout="vertical" margin={{ top: 8, right: 8, left: 6, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e9e4dc" /><XAxis type="number" tick={{ fontSize: 10, fill: '#766d61' }} tickFormatter={(value) => `₦${Number(value) / 1000}k`} /><YAxis type="category" dataKey="name" width={82} tick={{ fontSize: 10, fill: '#766d61' }} /><Tooltip formatter={(value) => money(Number(value))} /><Bar dataKey="revenue" fill="#b88823" name="Revenue" radius={[0, 7, 7, 0]} /></BarChart></ResponsiveContainer> : <div className={styles.state}><p>No category revenue data yet.</p></div>}</div></article>
        </section>

        <section className={styles.twoColumnEqual}>
          <article className={styles.card}><div className={styles.cardHeader}><h2>Best Selling Products</h2></div><div className={styles.tableViewport}><table className={styles.table}><thead><tr><th>Product</th><th>Category</th><th>Qty</th><th>Revenue</th></tr></thead><tbody>{analytics.topProducts.length ? analytics.topProducts.map((product) => <tr key={product.name}><td>{product.name}</td><td>{product.category}</td><td>{product.qtySold}</td><td>{money(product.revenue)}</td></tr>) : <tr><td colSpan={4} className={styles.emptyCell}>No product sales yet.</td></tr>}</tbody></table></div></article>
          <article className={styles.card}><div className={styles.cardHeader}><h2>Top Customers</h2></div><div className={styles.tableViewport}><table className={styles.table}><thead><tr><th>Customer</th><th>Email</th><th>Orders</th><th>Spent</th></tr></thead><tbody>{analytics.topCustomers.length ? analytics.topCustomers.map((customer) => <tr key={customer.email}><td>{customer.name}</td><td>{customer.email}</td><td>{customer.orderCount}</td><td>{money(customer.totalSpent)}</td></tr>) : <tr><td colSpan={4} className={styles.emptyCell}>No customer data yet.</td></tr>}</tbody></table></div></article>
        </section>

        <section className={styles.card}><div className={styles.cardHeader}><h2>Low Stock Products</h2></div><div className={styles.tableViewport}><table className={`${styles.table} ${styles.tableWide}`}><thead><tr><th>Product</th><th>Category</th><th>Type</th><th>Price</th><th>Stock</th></tr></thead><tbody>{analytics.lowStockProducts.length ? analytics.lowStockProducts.map((product) => <tr key={product.id || product.name}><td>{product.name || 'Unnamed Product'}</td><td>{product.category || 'N/A'}</td><td>{product.type || 'product'}</td><td>{money(Number(product.price || 0))}</td><td>{Number(product.stock || 0)}</td></tr>) : <tr><td colSpan={5} className={`${styles.emptyCell} ${styles.goodCell}`}>No low stock products. Inventory looks good.</td></tr>}</tbody></table></div></section>
          </>
        )}
      </main>
    </div>
  );
}
