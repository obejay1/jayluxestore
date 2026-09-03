'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import ResponsiveImage from '@/components/ResponsiveImage';
import { onAuthStateChanged } from 'firebase/auth';
import { OFFICIAL_EMAIL } from '@/lib/contact';
import { auth } from '@/lib/firebase';
import { PRODUCTION_SITE_URL } from '@/lib/site';
import type { Order } from '@/lib/types';
import { buildPrivateOrderUrl, captureOrderAccessToken } from '@/lib/orderAccess';
import { QRCodeSVG } from 'qrcode.react';
import Barcode from 'react-barcode';
import { useParams, useRouter } from 'next/navigation';

const money = (amount: number) => `₦${Math.round(amount || 0).toLocaleString()}`;

type InvoiceOrder = Order & { discount?: number };
type InvoiceItem = Order['items'][number];

type InvoiceResponse = {
  order?: InvoiceOrder;
  message?: string;
};

async function readJsonResponse(response: Response): Promise<InvoiceResponse> {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text) as InvoiceResponse;
  } catch {
    throw new Error(
      `The invoice service returned an invalid response (${response.status}).`,
    );
  }
}

export default function InvoicePage() {
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<InvoiceOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [pdfError, setPdfError] = useState('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const router = useRouter();
  const [accessToken, setAccessToken] = useState('');

  useEffect(() => {
    let cancelled = false;
    const capturedToken = captureOrderAccessToken(String(params.id));
    setAccessToken(capturedToken);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        const idToken = user ? await user.getIdToken() : null;
        const response = await fetch(`/api/orders/${encodeURIComponent(params.id)}`, {
          headers: {
            ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
            ...(capturedToken ? { 'X-Order-Access-Token': capturedToken } : {}),
          },
          cache: 'no-store',
        });
        const data = await readJsonResponse(response);

        if (!response.ok || !data.order) {
          throw new Error(data.message || 'Invoice not found.');
        }

        if (!cancelled) {
          setOrder(data.order);
          setLoadError('');
        }
      } catch (error) {
        console.error('Error fetching order', error);
        if (!cancelled) {
          setOrder(null);
          setLoadError(error instanceof Error ? error.message : 'Invoice could not be loaded.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [params.id]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('print') === 'true' && order) {
      setTimeout(() => {
        window.print();
      }, 500);
    }
  }, [order]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    const element = document.getElementById('invoice-content');
    if (!element || !order) return;

    setPdfError('');
    setIsGeneratingPdf(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      const canvas = await html2canvas(element, { 
        scale: 2, 
        useCORS: true,
        logging: false 
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`invoice-${order.id}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      setPdfError('The PDF could not be generated. Please use Print Invoice or try again.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  if (loading) {
    return (
      <main role="status" aria-live="polite" style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#F8F6F2' }}>
        <p style={{ color: '#C8A24B', fontSize: 20, fontWeight: 800 }}>Loading invoice…</p>
      </main>
    );
  }

  if (!order) {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: '#F8F6F2', gap: 16, padding: 24, textAlign: 'center' }}>
        <h1 style={{ color: '#dc2626', fontSize: 24, fontWeight: 800, margin: 0 }}>Invoice unavailable</h1>
        <p role="alert" style={{ color: '#4b5563', margin: 0 }}>{loadError || 'This invoice was not found or you do not have permission to view it.'}</p>
        <button type="button" onClick={() => router.push('/account')} style={{ padding: '10px 20px', background: '#111111', color: '#fff', borderRadius: 8, cursor: 'pointer', border: 'none', fontWeight: 600 }}>Go to My Account</button>
      </main>
    );
  }

  const items = order.items || [];
  const subtotal = order.subtotal || order.total || 0;
  const shipping = order.shipping || 0;
  const tax = order.tax || 0;
  const discount = order.discount || 0;
  const total = order.total || 0;
  const appOrigin =
    process.env.NODE_ENV === 'production'
      ? PRODUCTION_SITE_URL
      : typeof window !== 'undefined'
        ? window.location.origin
        : process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || '';
  const invoiceUrl = `${appOrigin}${buildPrivateOrderUrl(`/invoice/${encodeURIComponent(order.id)}`, accessToken)}`;

  let watermarkText = 'JAYLUXE';
  let watermarkColor = 'rgba(0, 0, 0, 0.05)';

  if (order.paymentStatus === 'Paid') {
    watermarkText = 'PAID';
    watermarkColor = 'rgba(22, 163, 74, 0.05)'; // Green
  } else if (order.paymentStatus === 'Pending') {
    watermarkText = 'PENDING';
    watermarkColor = 'rgba(217, 119, 6, 0.05)'; // Amber
  } else if (order.paymentStatus === 'Failed') {
    watermarkText = 'FAILED';
    watermarkColor = 'rgba(220, 38, 38, 0.05)'; // Red
  }

  return (
    <main className="invoice-page" style={{ minHeight: '100vh', background: '#F2ECE3', padding: '40px 20px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 640px) {
          .invoice-page { padding: 14px 10px !important; }
          .invoice-toolbar { display: grid !important; grid-template-columns: 1fr 1fr; gap: 8px !important; }
          .invoice-toolbar button { width: 100% !important; min-width: 0 !important; padding: 10px 8px !important; }
          .invoice-toolbar button:last-child { grid-column: 1 / -1; }
          .invoice-container { padding: 20px 14px !important; border-radius: 12px !important; overflow: hidden !important; }
          .invoice-header-grid { display: grid !important; grid-template-columns: 1fr !important; gap: 16px !important; padding-bottom: 20px !important; margin-bottom: 20px !important; }
          .invoice-header-grid > div { min-width: 0 !important; text-align: left !important; align-items: flex-start !important; }
          .invoice-header-grid > div:nth-child(2) { display: none !important; }
          .invoice-status-grid { display: grid !important; grid-template-columns: repeat(2, minmax(0, 1fr)) !important; gap: 8px !important; margin-bottom: 22px !important; }
          .invoice-status-grid > div { min-width: 0 !important; padding: 10px !important; }
          .invoice-status-grid span:last-child { overflow-wrap: anywhere !important; font-size: 13px !important; }
          .invoice-customer-grid { grid-template-columns: 1fr !important; gap: 18px !important; margin-bottom: 24px !important; }
          .invoice-items-table { margin-inline: -2px !important; margin-bottom: 24px !important; border: 1px solid #eee8de; border-radius: 10px; }
          .invoice-items-table table { min-width: 520px !important; }
          .invoice-items-table th, .invoice-items-table td { padding: 12px 9px !important; font-size: 12px !important; }
          .invoice-summary-wrap { justify-content: stretch !important; }
          .invoice-summary-wrap > div { max-width: none !important; width: 100% !important; }
          .invoice-watermark { font-size: 72px !important; }
          .invoice-barcode { justify-content: flex-start !important; overflow-x: auto !important; }
        }
        @media (max-width: 380px) {
          .invoice-status-grid { grid-template-columns: 1fr !important; }
          .invoice-container { padding-inline: 11px !important; }
        }
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          .invoice-container { box-shadow: none !important; padding: 0 !important; max-width: 100% !important; margin: 0 !important; }
        }
      `}} />
      
      <div className="invoice-toolbar no-print" style={{ maxWidth: 850, margin: '0 auto 20px', display: 'flex', gap: 12, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
        <button onClick={() => router.push('/account')} style={{ padding: '10px 16px', background: '#fff', border: '1px solid #d1d5db', color: '#374151', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>My Account</button>
        <button onClick={handlePrint} style={{ padding: '10px 16px', background: '#fff', border: '1px solid #C8A24B', color: '#C8A24B', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>Print Invoice</button>
        <button 
          onClick={handleDownloadPDF} 
          disabled={isGeneratingPdf}
          style={{ padding: '10px 16px', background: '#111111', border: 'none', color: '#C8A24B', borderRadius: 8, cursor: isGeneratingPdf ? 'not-allowed' : 'pointer', fontWeight: 600, opacity: isGeneratingPdf ? 0.7 : 1 }}
        >
          {isGeneratingPdf ? 'Generating PDF...' : 'Download PDF'}
        </button>
      </div>
      {pdfError && (
        <p className="no-print" role="alert" style={{ maxWidth: 850, margin: '0 auto 16px', color: '#b91c1c', fontWeight: 700 }}>
          {pdfError}
        </p>
      )}

      <div className="invoice-container" id="invoice-content" style={{ position: 'relative', overflow: 'hidden', maxWidth: 850, margin: '0 auto', background: '#ffffff', borderRadius: 16, padding: '48px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}>
        
        <div className="invoice-watermark" style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%) rotate(-30deg)',
          fontSize: '150px',
          fontWeight: 900,
          color: watermarkColor,
          zIndex: 0,
          pointerEvents: 'none',
          userSelect: 'none',
          whiteSpace: 'nowrap'
        }}>
          {watermarkText}
        </div>

        <div style={{ position: 'relative', zIndex: 1 }}>
        
        {/* Header */}
        <div className="invoice-header-grid" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #F8F6F2', paddingBottom: 30, marginBottom: 30, flexWrap: 'wrap', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Image src="/logo.png" alt="JayLuxe logo" width={60} height={60} />
            <div>
              <h1 style={{ margin: 0, color: '#C8A24B', fontSize: 28, fontWeight: 900 }}>JayLuxe</h1>
              <p style={{ margin: '4px 0 0', color: '#777777', fontSize: 14 }}>Luxury Beauty, Fashion & Lifestyle</p>
            </div>
          </div>
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <QRCodeSVG 
              value={invoiceUrl} 
              size={80} 
              fgColor="#C8A24B" 
              bgColor="#ffffff" 
            />
            <p style={{ margin: '8px 0 0', color: '#777777', fontSize: 11, fontWeight: 500 }}>Scan to verify invoice</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <h2 style={{ margin: '0 0 10px', color: '#111111', fontSize: 24, textTransform: 'uppercase', letterSpacing: 1 }}>Invoice</h2>
            <p style={{ margin: '4px 0', color: '#444444', fontSize: 14 }}><strong>Invoice No:</strong> INV-{order.id.slice(0, 8).toUpperCase()}</p>
            <p style={{ margin: '4px 0', color: '#444444', fontSize: 14 }}><strong>Order ID:</strong> #{order.id}</p>
            <p style={{ margin: '4px 0', color: '#444444', fontSize: 14 }}><strong>Date:</strong> {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A'}</p>
            {order.deliveryDays && <p style={{ margin: '4px 0', color: '#444444', fontSize: 14 }}><strong>Estimated Delivery:</strong> {order.deliveryDays}</p>}
            {order.estimatedDeliveryDate && <p style={{ margin: '4px 0', color: '#444444', fontSize: 14 }}><strong>Est. Delivery Date:</strong> {new Date(order.estimatedDeliveryDate).toLocaleDateString()}</p>}
          </div>
        </div>

        <div className="invoice-barcode" aria-label="Invoice barcode">
          <Barcode
            value={`INV-${order.id.toUpperCase()}`}
            displayValue={false}
            height={38}
            width={1.15}
            margin={0}
            lineColor="#111111"
            background="#FFFFFF"
          />
        </div>

        {/* Status Section */}
        <div className="invoice-status-grid" style={{ display: 'flex', gap: 16, marginBottom: 30, flexWrap: 'wrap' }}>
          <div style={{ padding: '8px 16px', background: '#F8F6F2', borderRadius: 8, border: '1px solid #E5E5E5' }}>
            <span style={{ color: '#777777', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Payment Method</span>
            <span style={{ color: '#111111', fontSize: 15, fontWeight: 700 }}>{order.paymentMethod || 'Credit Card'}</span>
          </div>
          <div style={{ padding: '8px 16px', background: '#F8F6F2', borderRadius: 8, border: '1px solid #E5E5E5' }}>
            <span style={{ color: '#777777', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Payment Status</span>
            <span style={{ color: order.paymentStatus === 'Paid' ? '#16a34a' : '#b45309', fontSize: 15, fontWeight: 700 }}>{order.paymentStatus || 'Pending'}</span>
          </div>
          <div style={{ padding: '8px 16px', background: '#F8F6F2', borderRadius: 8, border: '1px solid #E5E5E5' }}>
            <span style={{ color: '#777777', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Order Status</span>
            <span style={{ color: '#C8A24B', fontSize: 15, fontWeight: 700 }}>{order.status || 'Processing'}</span>
          </div>
          <div style={{ padding: '8px 16px', background: '#F8F6F2', borderRadius: 8, border: '1px solid #E5E5E5' }}>
            <span style={{ color: '#777777', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Reference</span>
            <span style={{ color: '#111111', fontSize: 15, fontWeight: 700 }}>{order.paymentReference || 'N/A'}</span>
          </div>
        </div>

        {/* Customer Info */}
        <div className="invoice-customer-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 30, marginBottom: 40 }}>
          <div>
            <h3 style={{ margin: '0 0 12px', color: '#111111', fontSize: 16, borderBottom: '1px solid #F8F6F2', paddingBottom: 8 }}>Billed To</h3>
            <p style={{ margin: '4px 0', color: '#2B2B2B', fontWeight: 600 }}>{order.customerName || 'N/A'}</p>
            <p style={{ margin: '4px 0', color: '#444444', fontSize: 14 }}>{order.customerEmail || 'N/A'}</p>
            <p style={{ margin: '4px 0', color: '#444444', fontSize: 14 }}>{order.customerPhone || 'N/A'}</p>
          </div>
          <div>
            <h3 style={{ margin: '0 0 12px', color: '#111111', fontSize: 16, borderBottom: '1px solid #F8F6F2', paddingBottom: 8 }}>Shipped To</h3>
            <p style={{ margin: '4px 0', color: '#444444', fontSize: 14, lineHeight: 1.5 }}>{order.shippingAddress || order.address || order.customerAddress || 'N/A'}</p>
          </div>
        </div>

        {/* Products Table */}
        <div className="invoice-items-table" style={{ marginBottom: 40, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 600 }}>
            <thead>
              <tr>
                <th style={{ padding: '16px 12px', background: '#111111', color: '#fff', fontWeight: 600, fontSize: 14, borderRadius: '8px 0 0 8px' }}>Product</th>
                <th style={{ padding: '16px 12px', background: '#111111', color: '#fff', fontWeight: 600, fontSize: 14 }}>Qty</th>
                <th style={{ padding: '16px 12px', background: '#111111', color: '#fff', fontWeight: 600, fontSize: 14 }}>Price</th>
                <th style={{ padding: '16px 12px', background: '#111111', color: '#fff', fontWeight: 600, fontSize: 14, borderRadius: '0 8px 8px 0', textAlign: 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {items.length > 0 ? items.map((item: InvoiceItem, i: number) => (
                <tr key={i} style={{ borderBottom: '1px solid #F8F6F2' }}>
                  <td style={{ padding: '16px 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
                    {item.image ? (
                      <ResponsiveImage src={item.image} alt={item.name || 'JayLuxe product'} width={48} height={48} sizes="48px" style={{ objectFit: 'cover', borderRadius: 8, background: '#F8F6F2' }} />
                    ) : (
                      <div style={{ width: 48, height: 48, background: '#F8F6F2', borderRadius: 8 }} />
                    )}
                    <div>
                      <p style={{ margin: 0, color: '#111111', fontWeight: 600, fontSize: 14 }}>{item.name || 'Unknown Product'}</p>
                    </div>
                  </td>
                  <td style={{ padding: '16px 12px', color: '#444444', fontSize: 14 }}>{item.qty || item.quantity || 1}</td>
                  <td style={{ padding: '16px 12px', color: '#444444', fontSize: 14 }}>{money(Number(item.price || 0))}</td>
                  <td style={{ padding: '16px 12px', color: '#111111', fontWeight: 600, fontSize: 14, textAlign: 'right' }}>
                    {money(Number(item.price || 0) * Number(item.qty || item.quantity || 1))}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={4} style={{ padding: '24px 12px', textAlign: 'center', color: '#777777' }}>No items found in this order.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Payment Summary */}
        <div className="invoice-summary-wrap" style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: '100%', maxWidth: 350 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #F8F6F2', color: '#444444', fontSize: 14 }}>
              <span>Subtotal</span>
              <span style={{ fontWeight: 600, color: '#111111' }}>{money(Number(subtotal))}</span>
            </div>
            {discount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #F8F6F2', color: '#ef4444', fontSize: 14 }}>
                <span>Discount</span>
                <span style={{ fontWeight: 600 }}>-{money(Number(discount))}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #F8F6F2', color: '#444444', fontSize: 14 }}>
              <span>Shipping</span>
              <span style={{ fontWeight: 600, color: '#111111' }}>{money(Number(shipping))}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #F8F6F2', color: '#444444', fontSize: 14 }}>
              <span>Tax</span>
              <span style={{ fontWeight: 600, color: '#111111' }}>{money(Number(tax))}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '20px 0 0', marginTop: 8, fontSize: 18 }}>
              <span style={{ fontWeight: 800, color: '#111111' }}>Grand Total</span>
              <span style={{ fontWeight: 900, color: '#C8A24B' }}>{money(Number(total))}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 60, paddingTop: 30, borderTop: '2px solid #F8F6F2', textAlign: 'center' }}>
          <p style={{ margin: '0 0 8px', color: '#111111', fontWeight: 600 }}>Thank you for shopping with JayLuxe!</p>
          <p style={{ margin: 0, color: '#777777', fontSize: 13 }}>If you have any questions about this invoice, please contact {OFFICIAL_EMAIL}</p>
        </div>

        </div>
      </div>
    </main>
  );
}
