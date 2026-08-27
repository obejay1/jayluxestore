import { adminDb } from '@/lib/firebaseAdmin';

export async function createReminder(data:{planId:string;type:string;status?:string}){
 return adminDb.collection('installmentReminders').add({
  ...data,
  status:data.status || 'pending',
  createdAt:new Date().toISOString()
 });
}
