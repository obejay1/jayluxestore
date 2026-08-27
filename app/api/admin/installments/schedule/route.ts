import { requireInstallmentAdmin } from '@/lib/installments/adminSecurity';
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export async function POST(req:Request){
 await requireInstallmentAdmin();
 const body=await req.json();
 if(!body.id || !body.dueDate) return NextResponse.json({error:'Invalid data'},{status:400});
 await adminDb.collection('installmentSchedules').doc(body.id).update({dueDate:body.dueDate,updatedAt:new Date().toISOString()});
 await adminDb.collection('installmentAuditLogs').add({action:'schedule_updated',scheduleId:body.id,newValue:body.dueDate,createdAt:new Date().toISOString()});
 return NextResponse.json({success:true});
}
