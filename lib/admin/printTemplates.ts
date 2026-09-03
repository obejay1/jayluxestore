import { escapeHtml } from '../security/output.ts';
import type { AdminOrder, Customer } from './types.ts';

type MoneyFormatter = (value: number) => string;

export function buildCustomerPrintHtml(customer: Customer, formatMoney: MoneyFormatter) {
  const orderRows = customer.orders.length === 0
    ? '<p>No orders yet.</p>'
    : `<table><thead><tr><th>Order ID</th><th>Date</th><th>Status</th><th>Total</th></tr></thead><tbody>${customer.orders.map((order) => `<tr><td>#${escapeHtml(order.id)}</td><td>${escapeHtml(order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A')}</td><td>${escapeHtml(order.status || 'Processing')}</td><td>${escapeHtml(formatMoney(Number(order.total || 0)))}</td></tr>`).join('')}</tbody></table>`;

  return `<!doctype html><html><head><meta charset="utf-8"><title>Customer Details - ${escapeHtml(customer.name)}</title><style>
    body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; color: #1a1a1a; }
    h2 { border-bottom: 2px solid #eaeaea; padding-bottom: 10px; }
    .details-grid { display: flex; gap: 40px; margin-bottom: 40px; background: #f8fafc; padding: 20px; border-radius: 8px; }
    .details-grid p { margin: 8px 0; } table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { border: 1px solid #e2e8f0; padding: 12px; text-align: left; } th { background-color: #f1f5f9; font-weight: 600; }
  </style></head><body>
    <h2>Customer Details</h2><div class="details-grid"><div>
    <p><strong>Name:</strong> ${escapeHtml(customer.name)}</p>
    <p><strong>Email:</strong> ${escapeHtml(customer.email)}</p>
    <p><strong>Phone:</strong> ${escapeHtml(customer.phone)}</p>
    <p><strong>Address:</strong> ${escapeHtml(customer.address)}</p></div><div>
    <p><strong>Total Orders:</strong> ${escapeHtml(customer.orderCount)}</p>
    <p><strong>Total Spent:</strong> ${escapeHtml(formatMoney(customer.totalSpent))}</p>
    <p><strong>Last Order:</strong> ${escapeHtml(customer.lastOrderDate ? new Date(customer.lastOrderDate).toLocaleString() : 'N/A')}</p>
    </div></div><h3>Order History</h3>${orderRows}
    <script>window.onload=()=>setTimeout(()=>{window.print();window.close();},250);<\/script></body></html>`;
}

export function buildOrderInvoicePrintHtml(order: AdminOrder, deliveryLabel: string, formatMoney: MoneyFormatter) {
  const items = order.items || [];
  const subtotal = order.subtotal || order.total || 0;
  const shipping = order.shipping || 0;
  const tax = order.tax || 0;
  const total = order.total || 0;
  const itemRows = items.length > 0
    ? items.map((item) => {
        const quantity = Number(item.qty || item.quantity || 1);
        const price = Number(item.price || 0);
        return `<tr><td><div style="font-weight:500">${escapeHtml(item.name || 'Product')}</div><div style="font-size:.9em;color:#666">${escapeHtml(item.category || '')}</div></td><td>${escapeHtml(formatMoney(price))}</td><td>${escapeHtml(quantity)}</td><td style="text-align:right">${escapeHtml(formatMoney(price * quantity))}</td></tr>`;
      }).join('')
    : '<tr><td colspan="4" style="text-align:center">No items found.</td></tr>';
  const status = order.status || 'Processing';

  return `<!doctype html><html><head><meta charset="utf-8"><title>Invoice - Order #${escapeHtml(order.id)}</title><style>
    body{font-family:system-ui,-apple-system,sans-serif;padding:40px;color:#1a1a1a;max-width:800px;margin:0 auto}.header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #eaeaea;padding-bottom:20px;margin-bottom:30px}.header h1{margin:0;color:#d4af37}.header p{margin:4px 0;color:#666}.invoice-details{display:flex;gap:40px;margin-bottom:40px}.invoice-details div{flex:1}h3{border-bottom:1px solid #eaeaea;padding-bottom:8px;margin-bottom:16px;font-size:16px}table{width:100%;border-collapse:collapse;margin-bottom:30px}th,td{border-bottom:1px solid #e2e8f0;padding:12px 8px;text-align:left}th{background:#f8fafc;font-weight:600;color:#333}.totals{width:300px;margin-left:auto}.totals-row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f8fafc}.grand-total{font-weight:bold;font-size:1.1em;border-top:2px solid #eaeaea;padding-top:12px;margin-top:8px}.badge{display:inline-block;padding:4px 8px;border-radius:4px;font-size:12px;font-weight:600}.green{background:#dcfce7;color:#166534}.gold{background:#fef08a;color:#92400e}
  </style></head><body>
    <div class="header"><div><h1>JayLuxe</h1><p>Luxury Beauty, Fashion &amp; Lifestyle Store</p></div><div style="text-align:right"><h2 style="margin:0 0 8px">INVOICE</h2><p><strong>Order ID:</strong> #${escapeHtml(order.id)}</p><p><strong>Date:</strong> ${escapeHtml(order.createdAt ? new Date(order.createdAt).toLocaleString() : 'N/A')}</p>${deliveryLabel !== 'N/A' ? `<p><strong>Estimated Delivery:</strong> ${escapeHtml(deliveryLabel)}</p>` : ''}<p><strong>Status:</strong> <span class="badge ${status === 'Delivered' ? 'green' : 'gold'}">${escapeHtml(status)}</span></p></div></div>
    <div class="invoice-details"><div><h3>Bill To:</h3><p><strong>${escapeHtml(order.customerName || 'N/A')}</strong></p><p>${escapeHtml(order.customerEmail || 'N/A')}</p><p>${escapeHtml(order.customerPhone || 'N/A')}</p></div><div><h3>Ship To:</h3><p>${escapeHtml(order.shippingAddress || order.customerAddress || order.address || 'N/A')}</p></div><div><h3>Payment Info:</h3><p><strong>Method:</strong> ${escapeHtml(order.paymentMethod || 'Paystack')}</p><p><strong>Reference:</strong> ${escapeHtml(order.paymentReference || 'N/A')}</p></div></div>
    <table><thead><tr><th>Item</th><th>Price</th><th>Qty</th><th style="text-align:right">Total</th></tr></thead><tbody>${itemRows}</tbody></table>
    <div class="totals"><div class="totals-row"><span>Subtotal:</span><span>${escapeHtml(formatMoney(Number(subtotal)))}</span></div><div class="totals-row"><span>Shipping:</span><span>${escapeHtml(formatMoney(Number(shipping)))}</span></div><div class="totals-row"><span>Tax:</span><span>${escapeHtml(formatMoney(Number(tax)))}</span></div><div class="totals-row grand-total"><span>Total:</span><span>${escapeHtml(formatMoney(Number(total)))}</span></div></div>
    <script>window.onload=()=>setTimeout(()=>{window.print();window.close();},250);<\/script></body></html>`;
}
