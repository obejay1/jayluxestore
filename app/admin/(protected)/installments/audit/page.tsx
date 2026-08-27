
import { getInstallmentAuditLogs } from '@/lib/installments/auditViewer';

export default async function AuditPage(){
 const logs:any[] = await getInstallmentAuditLogs();
 return <div className="amu-page-content space-y-6">
  <section className="amu-card"><h1 className="font-serif text-3xl">Installment Audit Log</h1></section>
  <section className="amu-card overflow-auto">
   <table className="w-full text-sm">
    <thead><tr><th>Action</th><th>Installment</th><th>Admin</th><th>Date</th></tr></thead>
    <tbody>{logs.map(l=><tr key={l.id}><td>{l.action}</td><td>{l.planId||l.installmentId}</td><td>{l.adminName||l.adminId}</td><td>{l.createdAt}</td></tr>)}</tbody>
   </table>
  </section>
 </div>
}
