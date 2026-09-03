import { NextResponse } from 'next/server';
import { adminAuthErrorResponse } from '@/lib/adminServerAuth';
import { requireInstallmentAdmin } from '@/lib/installments/adminSecurity';
import { getAdminInstallments } from '@/lib/installments/adminService';

export async function GET(){
 try {
  await requireInstallmentAdmin();
  const rows=await getAdminInstallments();
  const header=['ID','Customer','Email','Order','Product','Total','Paid','Outstanding','Progress','Provider','Status','Next Payment'];
  const csv=[header,...rows.map(r=>[r.id,r.customerName||r.customerId||'',r.customerEmail||'',r.orderId||'',r.productName||'',r.totalAmount,r.paidAmount,r.outstanding,r.progress,r.provider||'',r.status,r.nextPaymentDate||''])]
   .map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(',')).join('\n');
  return new NextResponse(csv,{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename=jayluxe-installments.csv'}});
 } catch(error){
  const result=adminAuthErrorResponse(error);
  return NextResponse.json(result.body,{status:result.status});
 }
}
