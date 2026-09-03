import { NextResponse } from 'next/server';
import { adminAuthErrorResponse } from '@/lib/adminServerAuth';
import { hasTrustedRequestOrigin } from '@/lib/adminRequest';
import { requireInstallmentAdmin } from '@/lib/installments/adminSecurity';
import { processInstallmentReminders } from '@/lib/installments/reminderProcessor';

export async function POST(request: Request){
 try {
  if (!hasTrustedRequestOrigin(request)) return NextResponse.json({ error: 'Untrusted request origin' }, { status: 403 });
  await requireInstallmentAdmin();
  return NextResponse.json(await processInstallmentReminders());
 } catch (error) {
  const result=adminAuthErrorResponse(error);
  return NextResponse.json(result.body,{status:result.status});
 }
}
