const SERVICE_ID = 'service_5zc6oqj';
const TEMPLATE_ID = 'template_kjdtr1e';
const PUBLIC_KEY = 's6dC8KFr7mb-jFanf';

export async function sendBookingConfirmation(booking: {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  serviceName: string;
  servicePrice: number;
  date: string;
  time: string;
}) {
  try {
    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: SERVICE_ID,
        template_id: TEMPLATE_ID,
        user_id: PUBLIC_KEY,
        template_params: {
          customerName: booking.customerName,
          customerEmail: booking.customerEmail,
          customerPhone: booking.customerPhone,
          serviceName: booking.serviceName,
          servicePrice: booking.servicePrice,
          date: booking.date,
          time: booking.time,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`EmailJS returned HTTP ${response.status}.`);
    }

    return true;
  } catch (error) {
    console.error('Email failed:', error);
    return false;
  }
}


export async function sendAdminOrderNotification(order: {
  id: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  total?: number | string;
  items?: Array<{ name?: string; quantity?: number }>;
  paymentStatus?: string;
  shippingAddress?: string;
}) {
  const adminEmail = process.env.JAYLUXE_ADMIN_EMAIL?.trim();

  if (!adminEmail) {
    console.warn('JAYLUXE_ADMIN_EMAIL is not configured.');
    return false;
  }

  try {
    const items = (order.items || [])
      .map((item) => `${item.name || 'Product'} x${item.quantity || 1}`)
      .join(', ');

    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: SERVICE_ID,
        template_id: TEMPLATE_ID,
        user_id: PUBLIC_KEY,
        template_params: {
          to_email: adminEmail,
          customerName: order.customerName,
          customerEmail: order.customerEmail || '',
          customerPhone: order.customerPhone || '',
          orderId: order.id,
          items,
          total: order.total || 0,
          paymentStatus: order.paymentStatus || 'Pending',
          shippingAddress: order.shippingAddress || '',
          subject: `New JayLuxe Order Received - ${order.id}`,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Admin order email failed: HTTP ${response.status}`);
    }

    return true;
  } catch (error) {
    console.error('ADMIN_ORDER_EMAIL_FAILED:', error);
    return false;
  }
}
