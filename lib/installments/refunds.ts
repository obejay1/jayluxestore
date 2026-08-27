
import { adminDb } from '@/lib/firebaseAdmin';

export async function recordInstallmentRefund(data:any){
 return adminDb.collection('installmentRefunds').add({
  ...data,
  createdAt:new Date().toISOString()
 });
}
