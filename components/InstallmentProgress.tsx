'use client';

export default function InstallmentProgress({ paid = 0, total = 0 }: { paid?: number; total?: number }) {
  const percentage = total > 0 ? Math.min(100, Math.max(0, Math.round((paid / total) * 100))) : 0;
  return (
    <div className="jl-installment-progress" aria-label={`Payment progress ${percentage}%`}>
      <div className="jl-progress-header"><span>Payment Progress</span><strong>{percentage}%</strong></div>
      <div className="jl-progress-track"><div className="jl-progress-fill" style={{ width: `${percentage}%` }} /></div>
      <p>₦{paid.toLocaleString('en-NG')} paid of ₦{total.toLocaleString('en-NG')}</p>
    </div>
  );
}
