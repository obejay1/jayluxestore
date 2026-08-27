export function calculateEffectivePaid(payments:any[], refunds:any[] = []) {
  const paid = payments.filter(p=>p.status==='successful').reduce((s,p)=>s+Number(p.amount||0),0);
  const refunded = refunds.reduce((s,r)=>s+Number(r.amount||0),0);
  return Math.max(0, paid - refunded);
}

export function validateBalance(total:number, paid:number){
  if (paid > total) return {valid:false, reason:'Payment exceeds installment total'};
  return {valid:true};
}

export function isCompleted(total:number, paid:number){
 return paid >= total;
}
