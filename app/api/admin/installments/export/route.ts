import { requireInstallmentAdmin } from '@/lib/installments/adminSecurity';
import { NextResponse } from 'next/server';
import { getAdminInstallments } from '@/lib/installments/adminService';

export async function GET(){
 await requireInstallmentAdmin();
 const rows=await getAdminInstallments();
 const header=['ID','Customer','Order','Product','Total','Paid','Outstanding','Progress','Provider','Status','Next Payment'];
 const csv=[header,...rows.map(r=>[r.id,r.customerId||'',r.orderId||'',r.productName||'',r.totalAmount,r.paidAmount,r.outstanding,r.progress,r.provider||'',r.status,r.nextPaymentDate||''])]
 .map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(',')).join('\n');
 return new NextResponse(csv,{headers:{'Content-Type':'text/csv','Content-Disposition':'attachment; filename=jayluxe-installments.csv'}});
}
