import { NextResponse } from 'next/server';
import { adminAuthErrorResponse } from '@/lib/adminServerAuth';
import { hasTrustedRequestOrigin } from '@/lib/adminRequest';
import { requireInstallmentAdmin } from '@/lib/installments/adminSecurity';
import { adminDb } from '@/lib/firebaseAdmin';

export async function POST(req:Request){
 try {
  if (!hasTrustedRequestOrigin(req)) return NextResponse.json({ error: 'Untrusted request origin' }, { status: 403 });
  const session=await requireInstallmentAdmin();
  const body=await req.json();
  if(!body.id || !body.dueDate) return NextResponse.json({error:'Invalid data'},{status:400});
  const parsed=new Date(body.dueDate);
  if(Number.isNaN(parsed.getTime())) return NextResponse.json({error:'Invalid due date'},{status:400});
  await adminDb.collection('installmentSchedules').doc(String(body.id)).update({dueDate:parsed.toISOString(),updatedAt:new Date().toISOString()});
  await adminDb.collection('installmentAuditLogs').add({action:'schedule_updated',scheduleId:String(body.id),newValue:parsed.toISOString(),adminId:session.user.uid,createdAt:new Date().toISOString()});
  return NextResponse.json({success:true});
 } catch(error){
  const result=adminAuthErrorResponse(error);
  return NextResponse.json(result.body,{status:result.status});
 }
}
