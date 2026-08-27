import { requireInstallmentAdmin } from '@/lib/installments/adminSecurity';

import { NextResponse } from 'next/server';
import { processInstallmentReminders } from '@/lib/installments/reminderProcessor';

export async function POST(){
 await requireInstallmentAdmin();
 const result = await processInstallmentReminders();
 return NextResponse.json(result);
}
