import type { Order } from '../types.ts';

export type AdminOrder = Omit<Order, 'items'> & {
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  shippingAddress?: string;
  customerAddress?: string;
  address?: string;
  deliveryDays?: string;
  deliveryDaysText?: string;
  estimatedDeliveryDate?: string;
  paymentMethod?: string;
  paymentReference?: string;
  subtotal?: number;
  shipping?: number;
  tax?: number;
  total?: number;
  createdAt?: string;
  status?: string;
  confirmationEmailStatus?: string;
  confirmationEmailError?: string | null;
  paymentEmailStatus?: string;
  paymentEmailError?: string | null;
  statusEmailStatus?: string;
  statusEmailError?: string | null;
  statusEmailLastStatus?: string;
  lastEmailType?: string;
  lastEmailStatus?: string;
  lastEmailSentAt?: string;
  lastEmailDeliveryStatus?: string;
  lastEmailProviderEvent?: string;
  lastEmailProviderEventAt?: string;
  items?: Array<{
    id?: string;
    name?: string;
    category?: string;
    price?: number;
    qty?: number;
    quantity?: number;
    image?: string;
    description?: string;
    stock?: number;
  }>;
};

export type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  address?: string;
  orderCount: number;
  totalSpent: number;
  lastOrderDate?: string;
  orders: AdminOrder[];
};
