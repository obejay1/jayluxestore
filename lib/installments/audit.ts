import { adminDb } from '@/lib/firebaseAdmin';

export async function createInstallmentAudit(data:{adminId?:string;action:string;installmentId:string;customerId?:string;previous?:unknown;next?:unknown;reason?:string}){
 await adminDb.collection('installmentAuditLogs').add({
   ...data,
   createdAt:new Date().toISOString()
 });
}
