export function showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
    if (typeof window === 'undefined') return;
  
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.position = 'fixed';
    toast.style.bottom = '20px';
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%)';
    toast.style.padding = '12px 24px';
    toast.style.borderRadius = '8px';
    toast.style.color = 'white';
    toast.style.zIndex = '10000';
    toast.style.background = type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8';
    toast.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
    toast.style.transition = 'opacity 0.3s';
  
    document.body.appendChild(toast);
  
    setTimeout(() => {
      toast.remove();
    }, 3000);
  }