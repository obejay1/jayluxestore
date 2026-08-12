export type ToastKind = 'success' | 'error' | 'info';

export function showToast(message: string, type: ToastKind = 'info') {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(
    new CustomEvent('jayluxe:toast', {
      detail: { message: String(message || '').trim(), type },
    }),
  );
}
