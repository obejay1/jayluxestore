import { requireInstallmentAdmin } from '@/lib/installments/adminSecurity';
import {NextResponse} from 'next/server';
import {adminDb} from '@/lib/firebaseAdmin';
export async function GET(){
 await requireInstallmentAdmin();const snap=await adminDb.collection('paymentTransactions').get();return NextResponse.json(snap.docs.map(d=>({id:d.id,...d.data()})));}
