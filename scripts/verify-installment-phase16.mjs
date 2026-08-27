// JayLuxe Installment Phase 16 validation helper
import fs from 'fs';

const required = [
 'lib/installments/adminService.ts',
 'lib/installments/paymentOrchestrator.ts',
 'lib/installments/ledger.ts',
 'lib/installments/audit.ts',
 'lib/installments/refunds.ts',
 'app/admin/(protected)/installments/page.tsx'
];

let failed=false;
for (const file of required){
 if(!fs.existsSync(file)){
   console.error(`Missing: ${file}`);
   failed=true;
 }
}
if(failed) process.exit(1);
console.log('Installment architecture files verified.');
