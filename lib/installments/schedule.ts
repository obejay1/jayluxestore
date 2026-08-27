import { adminDb } from '@/lib/firebaseAdmin';

export async function getSchedule(planId:string){
 const snap=await adminDb.collection('installmentSchedules').where('planId','==',planId).get();
 return snap.docs.map(d=>({id:d.id,...d.data()}));
}

export function calculateScheduleStatus(d:any){
 if(d.status==='paid') return 'Paid';
 if(d.dueDate && new Date(d.dueDate)<new Date()) return 'Overdue';
 return 'Upcoming';
}
