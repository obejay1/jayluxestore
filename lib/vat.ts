const VAT_KEY = 'site_vat_rate';

export function getVatRate(): number {
  if (typeof window === 'undefined') return 0.075; // default SSR
  const raw = localStorage.getItem(VAT_KEY);
  return raw ? parseFloat(raw) : 0.075;
}

export function setVatRate(rate: number): void {
  localStorage.setItem(VAT_KEY, String(rate));
}

export function formatVat(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}