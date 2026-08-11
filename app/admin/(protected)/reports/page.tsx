'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAdminAuth } from '@/lib/useAdminAuth';
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

interface ProductData {
  id?: string;
  name?: string;
  category?: string;
  price?: number;
  stock?: number;
  type?: string;
}

interface UserData {
  id?: string;
  name?: string;
  fullName?: string;
  email?: string;
  createdAt?: string;
  joined?: string;
}

interface ChartData {
  name: string;
  revenue: number;
  orders: number;
}

interface TopProduct {
  name: string;
  category: string;
  qtySold: number;
  revenue: number;
}

interface TopCustomer {
  email: string;
  name: string;
  totalSpent: number;
  orderCount: number;
}

interface StatusData {
  name: string;
  value: number;
}

interface CategoryData {
  name: string;
  revenue: number;
  qtySold: number;
}

type DateFilter = 'all' | 'today' | 'week' | 'month' | 'year' | 'custom';

const money = (amount: number) => `₦${Math.round(amount || 0).toLocaleString()}`;

const getOrderTotal = (order: OrderData) => Number(order.total ?? order.subtotal ?? 0);

const normaliseStatus = (status?: string) => {
  const value = (status || 'Processing').toLowerCase();
  if (value.includes('deliver')) return 'Delivered';
  if (value.includes('ship')) return 'Shipped';
  if (value.includes('cancel')) return 'Cancelled';
  if (value.includes('pending')) return 'Pending';
  if (value.includes('process')) return 'Processing';
  return status || 'Processing';
};

const toDateInput = (date: Date) => date.toISOString().slice(0, 10);

export default function AdminReports() {
  const { ready: adminReady } = useAdminAuth();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [products, setProducts] = useState<ProductData[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);
  const [dateFilter, setDateFilter] = useState<DateFilter>('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    async function fetchReportsData() {
      try {
        const [ordersSnap, usersSnap, productsSnap] = await Promise.all([
          getDocs(collection(db, 'orders')),
          getDocs(collection(db, 'users')),
          getDocs(collection(db, 'products')),
        ]);

        setOrders(ordersSnap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as OrderData) })));
        setUsers(usersSnap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as UserData) })));
        setProducts(productsSnap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as ProductData) })));
      } catch (error) {
        console.error('Error loading financial reports:', error);
      } finally {
        setLoading(false);
      }
    }

    if (adminReady) void fetchReportsData();
  }, [adminReady]);

  const filteredOrders = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    let filterStart: Date | null = null;
    let filterEnd: Date | null = null;

    if (dateFilter === 'today') {
      filterStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      filterEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    }

    if (dateFilter === 'week') {
      start.setDate(now.getDate() - 7);
      filterStart = start;
      filterEnd = now;
    }

    if (dateFilter === 'month') {
      filterStart = new Date(now.getFullYear(), now.getMonth(), 1);
      filterEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    }

    if (dateFilter === 'year') {
      filterStart = new Date(now.getFullYear(), 0, 1);
      filterEnd = new Date(now.getFullYear() + 1, 0, 1);
    }

    if (dateFilter === 'custom') {
      filterStart = startDate ? new Date(`${startDate}T00:00:00`) : null;
      filterEnd = endDate ? new Date(`${endDate}T23:59:59`) : null;
    }

    if (!filterStart && !filterEnd) return orders;

    return orders.filter((order) => {
      const orderDate = new Date(order.createdAt || Date.now());
      if (filterStart && orderDate < filterStart) return false;
      if (filterEnd && orderDate > filterEnd) return false;
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
      const dateObj = new Date(order.createdAt || Date.now());
      const monthKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
      const dayKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;

      totalRevenue += status === 'Cancelled' ? 0 : orderTotal;
      if (status === 'Delivered') deliveredRevenue += orderTotal;
      if (status === 'Cancelled') cancelledRevenue += orderTotal;
      if (status === 'Pending' || status === 'Processing') pendingRevenue += orderTotal;

      monthlyMap[monthKey] = monthlyMap[monthKey] || { revenue: 0, orders: 0 };
      monthlyMap[monthKey].revenue += status === 'Cancelled' ? 0 : orderTotal;
      monthlyMap[monthKey].orders += 1;

      dailyMap[dayKey] = dailyMap[dayKey] || { revenue: 0, orders: 0 };
      dailyMap[dayKey].revenue += status === 'Cancelled' ? 0 : orderTotal;
      dailyMap[dayKey].orders += 1;

      statusMap[status] = (statusMap[status] || 0) + 1;

      order.items?.forEach((item) => {
        const qty = Number(item.qty ?? item.quantity ?? 1);
        const price = Number(item.price ?? 0);
        const itemRevenue = price * qty;
        const productName = item.name || 'Unknown Product';
        const category = item.category || 'Uncategorised';

        productsMap[productName] = productsMap[productName] || {
          name: productName,
          category,
          qtySold: 0,
          revenue: 0,
        };
        productsMap[productName].qtySold += qty;
        productsMap[productName].revenue += itemRevenue;

        categoryMap[category] = categoryMap[category] || { name: category, revenue: 0, qtySold: 0 };
        categoryMap[category].revenue += itemRevenue;
        categoryMap[category].qtySold += qty;
      });

      const customerEmail = order.customerEmail || 'Not provided';
      const customerName = order.customerName || 'Unknown Customer';
      customersMap[customerEmail] = customersMap[customerEmail] || {
        email: customerEmail,
        name: customerName,
        totalSpent: 0,
        orderCount: 0,
      };
      customersMap[customerEmail].totalSpent += status === 'Cancelled' ? 0 : orderTotal;
      customersMap[customerEmail].orderCount += 1;
    });

    const monthlyData = Object.keys(monthlyMap)
      .sort()
      .map((key) => ({ name: key, ...monthlyMap[key] }));

    const dailyData = Object.keys(dailyMap)
      .sort()
      .slice(-14)
      .map((key) => ({ name: key, ...dailyMap[key] }));

    const topProducts = Object.values(productsMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);

    const topCustomers = Object.values(customersMap)
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 8);

    const statusData = Object.keys(statusMap).map((key) => ({ name: key, value: statusMap[key] }));

    const categoryData = Object.values(categoryMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);

    const lowStockProducts = products
      .filter((product) => Number(product.stock ?? 0) <= 5)
      .sort((a, b) => Number(a.stock ?? 0) - Number(b.stock ?? 0))
      .slice(0, 8);

    const averageOrderValue = filteredOrders.length ? totalRevenue / filteredOrders.length : 0;
    const conversionRevenue = totalRevenue - cancelledRevenue;

    return {
      totalRevenue,
      deliveredRevenue,
      cancelledRevenue,
      pendingRevenue,
      conversionRevenue,
      averageOrderValue,
      monthlyData,
      dailyData,
      topProducts,
      topCustomers,
      statusData,
      categoryData,
      lowStockProducts,
    };
  }, [filteredOrders, products]);

  const exportCSV = () => {
    const headers = ['Order ID', 'Date', 'Customer Name', 'Customer Email', 'Status', 'Payment Method', 'Total Amount'];
    const rows = filteredOrders.map((order) => [
      order.id || '',
      new Date(order.createdAt || Date.now()).toLocaleString(),
      `"${order.customerName || ''}"`,
      `"${order.customerEmail || ''}"`,
      normaliseStatus(order.status),
      order.paymentMethod || '',
      getOrderTotal(order),
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `jaylux-financial-report-${toDateInput(new Date())}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportExcel = async () => {
    const XLSX = await import('xlsx');
    const rows = filteredOrders.map((order) => ({
      'Order ID': order.id || '',
      Date: new Date(order.createdAt || Date.now()).toLocaleString(),
      Customer: order.customerName || '',
      Email: order.customerEmail || '',
      Status: normaliseStatus(order.status),
      'Payment Method': order.paymentMethod || '',
      Total: getOrderTotal(order),
    }));

    const workbook = XLSX.utils.book_new();
    const summary = [
      { Metric: 'Total Revenue', Value: analytics.totalRevenue },
      { Metric: 'Total Orders', Value: filteredOrders.length },
      { Metric: 'Total Customers', Value: users.length },
      { Metric: 'Total Products', Value: products.length },
      { Metric: 'Average Order Value', Value: analytics.averageOrderValue },
      { Metric: 'Delivered Revenue', Value: analytics.deliveredRevenue },
      { Metric: 'Pending/Processing Revenue', Value: analytics.pendingRevenue },
    ];

    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summary), 'Summary');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), 'Orders');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(analytics.topProducts), 'Top Products');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(analytics.topCustomers), 'Top Customers');
    XLSX.writeFile(workbook, `jaylux-financial-report-${toDateInput(new Date())}.xlsx`);
  };

  const exportPDF = async () => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 18;

    doc.setFontSize(18);
    doc.text('JayLux Financial Report', pageWidth / 2, y, { align: 'center' });
    y += 10;

    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, y, { align: 'center' });
    y += 14;

    const lines = [
      `Total Revenue: ${money(analytics.totalRevenue)}`,
      `Total Orders: ${filteredOrders.length}`,
      `Total Customers: ${users.length}`,
      `Total Products: ${products.length}`,
      `Average Order Value: ${money(analytics.averageOrderValue)}`,
      `Delivered Revenue: ${money(analytics.deliveredRevenue)}`,
      `Pending/Processing Revenue: ${money(analytics.pendingRevenue)}`,
    ];

    lines.forEach((line) => {
      doc.text(line, 14, y);
      y += 8;
    });

    y += 6;
    doc.setFontSize(13);
    doc.text('Top Products', 14, y);
    y += 8;
    doc.setFontSize(10);

    analytics.topProducts.slice(0, 6).forEach((product, index) => {
      doc.text(`${index + 1}. ${product.name} - Qty ${product.qtySold} - ${money(product.revenue)}`, 14, y);
      y += 7;
    });

    y += 6;
    doc.setFontSize(13);
    doc.text('Top Customers', 14, y);
    y += 8;
    doc.setFontSize(10);

    analytics.topCustomers.slice(0, 6).forEach((customer, index) => {
      doc.text(`${index + 1}. ${customer.name} - ${customer.orderCount} orders - ${money(customer.totalSpent)}`, 14, y);
      y += 7;
    });

    doc.save(`jaylux-financial-report-${toDateInput(new Date())}.pdf`);
  };

  if (!adminReady || loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#f8fafc' }}>
        <p style={{ color: '#d4af37', fontSize: 20, fontWeight: 800 }}>Loading Financial Reports...</p>
      </div>
    );
  }

  const cardStyle = {
    background: '#ffffff',
    padding: 24,
    borderRadius: 18,
    boxShadow: '0 12px 30px rgba(15, 23, 42, 0.06)',
    border: '1px solid #eef2f7',
  };

  const tableHeaderStyle = {
    textAlign: 'left' as const,
    padding: '12px 10px',
    borderBottom: '1px solid #e5e7eb',
    color: '#6b7280',
    fontSize: 12,
    fontWeight: 800,
    textTransform: 'uppercase' as const,
  };

  const tableCellStyle = {
    padding: '14px 10px',
    borderBottom: '1px solid #f3f4f6',
    color: '#111827',
    fontSize: 14,
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          .no-print { display: none !important; }
          .print-full-width { width: 100% !important; padding: 0 !important; }
          .report-card { box-shadow: none !important; border: 1px solid #e5e7eb !important; break-inside: avoid; }
          body { background: #ffffff !important; }
        }
        @media (max-width: 900px) {
          .reports-shell { flex-direction: column !important; }
          .reports-sidebar { width: 100% !important; }
          .reports-main { padding: 20px !important; }
          .reports-grid-2 { grid-template-columns: 1fr !important; }
        }
      ` }} />

      <aside className="no-print reports-sidebar" style={{ width: 270, background: '#111827', color: '#ffffff', flexShrink: 0 }}>
        <div style={{ padding: 24, borderBottom: '1px solid #1f2937' }}>
          <h1 style={{ color: '#d4af37', fontSize: 23, margin: 0, fontWeight: 900 }}>JayLux</h1>
          <p style={{ color: '#9ca3af', margin: '6px 0 0', fontSize: 12 }}>Admin Portal</p>
        </div>

        <nav style={{ padding: 18 }}>
          <Link href="/admin" style={{ display: 'block', padding: '13px 14px', color: '#d1d5db', textDecoration: 'none', borderRadius: 12 }}>Dashboard</Link>
          <Link href="/admin/reports" style={{ display: 'block', padding: '13px 14px', color: '#111827', background: '#d4af37', textDecoration: 'none', borderRadius: 12, fontWeight: 900 }}>Financial Reports</Link>
        </nav>

        <div style={{ padding: 24, borderTop: '1px solid #1f2937' }}>
          <Link href="/admin" style={{ color: '#9ca3af', textDecoration: 'none', fontSize: 14 }}>← Back to Dashboard</Link>
        </div>
      </aside>

      <main className="print-full-width reports-main" style={{ flex: 1, padding: 36, overflowX: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
          <div>
            <h2 style={{ fontSize: 30, color: '#111827', margin: 0, fontWeight: 900 }}>Financial Reports</h2>
            <p style={{ margin: '6px 0 0', color: '#6b7280' }}>Revenue, customers, products, orders, stock and export tools.</p>
          </div>

          <div className="no-print" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button onClick={exportCSV} style={{ padding: '11px 14px', border: '1px solid #d1d5db', borderRadius: 10, background: '#fff', fontWeight: 800, cursor: 'pointer' }}>CSV</button>
            <button onClick={exportExcel} style={{ padding: '11px 14px', border: '1px solid #d1d5db', borderRadius: 10, background: '#fff', fontWeight: 800, cursor: 'pointer' }}>Excel</button>
            <button onClick={exportPDF} style={{ padding: '11px 14px', border: '1px solid #111827', borderRadius: 10, background: '#111827', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>PDF</button>
            <button onClick={() => window.print()} style={{ padding: '11px 14px', border: '1px solid #d4af37', borderRadius: 10, background: '#d4af37', color: '#111827', fontWeight: 900, cursor: 'pointer' }}>Print</button>
          </div>
        </div>

        <div className="no-print" style={{ ...cardStyle, marginBottom: 24 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'end' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 800, color: '#374151', marginBottom: 6 }}>Date Range</label>
              <select value={dateFilter} onChange={(event) => setDateFilter(event.target.value as DateFilter)} style={{ padding: '12px 14px', borderRadius: 10, border: '1px solid #d1d5db' }}>
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">Last 7 Days</option>
                <option value="month">This Month</option>
                <option value="year">This Year</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            {dateFilter === 'custom' && (
              <>
                <div>
                  <label style={{ display: 'block', fontWeight: 800, color: '#374151', marginBottom: 6 }}>Start</label>
                  <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} style={{ padding: '12px 14px', borderRadius: 10, border: '1px solid #d1d5db' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 800, color: '#374151', marginBottom: 6 }}>End</label>
                  <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} style={{ padding: '12px 14px', borderRadius: 10, border: '1px solid #d1d5db' }} />
                </div>
              </>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 18, marginBottom: 24 }}>
          <div className="report-card" style={cardStyle}><p style={{ margin: 0, color: '#6b7280', fontWeight: 800 }}>Total Revenue</p><h3 style={{ margin: '8px 0 0', fontSize: 28, color: '#d4af37' }}>{money(analytics.totalRevenue)}</h3></div>
          <div className="report-card" style={cardStyle}><p style={{ margin: 0, color: '#6b7280', fontWeight: 800 }}>Total Orders</p><h3 style={{ margin: '8px 0 0', fontSize: 28 }}>{filteredOrders.length}</h3></div>
          <div className="report-card" style={cardStyle}><p style={{ margin: 0, color: '#6b7280', fontWeight: 800 }}>Customers</p><h3 style={{ margin: '8px 0 0', fontSize: 28 }}>{users.length}</h3></div>
          <div className="report-card" style={cardStyle}><p style={{ margin: 0, color: '#6b7280', fontWeight: 800 }}>Products</p><h3 style={{ margin: '8px 0 0', fontSize: 28 }}>{products.length}</h3></div>
          <div className="report-card" style={cardStyle}><p style={{ margin: 0, color: '#6b7280', fontWeight: 800 }}>Average Order</p><h3 style={{ margin: '8px 0 0', fontSize: 28 }}>{money(analytics.averageOrderValue)}</h3></div>
          <div className="report-card" style={cardStyle}><p style={{ margin: 0, color: '#6b7280', fontWeight: 800 }}>Pending Revenue</p><h3 style={{ margin: '8px 0 0', fontSize: 28 }}>{money(analytics.pendingRevenue)}</h3></div>
          <div className="report-card" style={cardStyle}><p style={{ margin: 0, color: '#6b7280', fontWeight: 800 }}>Delivered Revenue</p><h3 style={{ margin: '8px 0 0', fontSize: 28 }}>{money(analytics.deliveredRevenue)}</h3></div>
          <div className="report-card" style={cardStyle}><p style={{ margin: 0, color: '#6b7280', fontWeight: 800 }}>Low Stock Items</p><h3 style={{ margin: '8px 0 0', fontSize: 28 }}>{analytics.lowStockProducts.length}</h3></div>
        </div>

        <div className="reports-grid-2" style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 18, marginBottom: 24 }}>
          <div className="report-card" style={cardStyle}>
            <h3 style={{ margin: '0 0 18px', color: '#111827' }}>Monthly Revenue Trend</h3>
            <div style={{ width: '100%', height: 320 }}>
              <ResponsiveContainer>
                <LineChart data={analytics.monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} tickFormatter={(value) => `₦${Number(value) / 1000}k`} />
                  <Tooltip formatter={(value) => money(Number(value))} />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="#d4af37" strokeWidth={3} name="Revenue" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="report-card" style={cardStyle}>
            <h3 style={{ margin: '0 0 18px', color: '#111827' }}>Order Status</h3>
            <div style={{ width: '100%', height: 320 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={analytics.statusData} dataKey="value" nameKey="name" outerRadius={105} label>
                    {analytics.statusData.map((entry, index) => (
                      <Cell key={entry.name} fill={['#111827', '#d4af37', '#16a34a', '#dc2626', '#2563eb', '#7c3aed'][index % 6]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="reports-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 24 }}>
          <div className="report-card" style={cardStyle}>
            <h3 style={{ margin: '0 0 18px', color: '#111827' }}>Daily Orders - Last 14 Days</h3>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <BarChart data={analytics.dailyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} tickFormatter={(value) => String(value).split('-').slice(1).join('/')} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                  <Tooltip />
                  <Bar dataKey="orders" fill="#111827" name="Orders" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="report-card" style={cardStyle}>
            <h3 style={{ margin: '0 0 18px', color: '#111827' }}>Category Revenue</h3>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <BarChart data={analytics.categoryData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                  <XAxis type="number" tick={{ fontSize: 12, fill: '#6b7280' }} tickFormatter={(value) => `₦${Number(value) / 1000}k`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} width={100} />
                  <Tooltip formatter={(value) => money(Number(value))} />
                  <Bar dataKey="revenue" fill="#d4af37" name="Revenue" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="reports-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 24 }}>
          <div className="report-card" style={{ ...cardStyle, overflowX: 'auto' }}>
            <h3 style={{ margin: '0 0 16px' }}>Best Selling Products</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 520 }}>
              <thead><tr><th style={tableHeaderStyle}>Product</th><th style={tableHeaderStyle}>Category</th><th style={tableHeaderStyle}>Qty</th><th style={tableHeaderStyle}>Revenue</th></tr></thead>
              <tbody>
                {analytics.topProducts.length ? analytics.topProducts.map((product) => (
                  <tr key={product.name}><td style={tableCellStyle}>{product.name}</td><td style={tableCellStyle}>{product.category}</td><td style={tableCellStyle}>{product.qtySold}</td><td style={tableCellStyle}>{money(product.revenue)}</td></tr>
                )) : <tr><td colSpan={4} style={{ ...tableCellStyle, textAlign: 'center', color: '#9ca3af' }}>No product sales yet.</td></tr>}
              </tbody>
            </table>
          </div>

          <div className="report-card" style={{ ...cardStyle, overflowX: 'auto' }}>
            <h3 style={{ margin: '0 0 16px' }}>Top Customers</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 520 }}>
              <thead><tr><th style={tableHeaderStyle}>Customer</th><th style={tableHeaderStyle}>Email</th><th style={tableHeaderStyle}>Orders</th><th style={tableHeaderStyle}>Spent</th></tr></thead>
              <tbody>
                {analytics.topCustomers.length ? analytics.topCustomers.map((customer) => (
                  <tr key={customer.email}><td style={tableCellStyle}>{customer.name}</td><td style={tableCellStyle}>{customer.email}</td><td style={tableCellStyle}>{customer.orderCount}</td><td style={tableCellStyle}>{money(customer.totalSpent)}</td></tr>
                )) : <tr><td colSpan={4} style={{ ...tableCellStyle, textAlign: 'center', color: '#9ca3af' }}>No customer data yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="report-card" style={{ ...cardStyle, overflowX: 'auto' }}>
          <h3 style={{ margin: '0 0 16px' }}>Low Stock Products</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 650 }}>
            <thead><tr><th style={tableHeaderStyle}>Product</th><th style={tableHeaderStyle}>Category</th><th style={tableHeaderStyle}>Type</th><th style={tableHeaderStyle}>Price</th><th style={tableHeaderStyle}>Stock</th></tr></thead>
            <tbody>
              {analytics.lowStockProducts.length ? analytics.lowStockProducts.map((product) => (
                <tr key={product.id || product.name}><td style={tableCellStyle}>{product.name || 'Unnamed Product'}</td><td style={tableCellStyle}>{product.category || 'N/A'}</td><td style={tableCellStyle}>{product.type || 'product'}</td><td style={tableCellStyle}>{money(Number(product.price || 0))}</td><td style={{ ...tableCellStyle, color: Number(product.stock || 0) === 0 ? '#dc2626' : '#d97706', fontWeight: 900 }}>{Number(product.stock || 0)}</td></tr>
              )) : <tr><td colSpan={5} style={{ ...tableCellStyle, textAlign: 'center', color: '#16a34a', fontWeight: 800 }}>No low stock products. Inventory looks good.</td></tr>}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
