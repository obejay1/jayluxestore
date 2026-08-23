export type InstallmentStatus =
  | 'active'
  | 'completed'
  | 'overdue'
  | 'cancelled'
  | 'failed';

export type InstallmentPlan = {
  id: string;
  userId: string;
  orderId: string;
  totalAmount: number;
  paidAmount: number;
  remainingBalance: number;
  status: InstallmentStatus;
  installmentCount: number;
  nextPaymentDate?: string;
};
