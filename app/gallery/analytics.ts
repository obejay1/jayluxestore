// Extend the Window interface to include gtag
declare global {
  interface Window {
    gtag?: (
      command: 'event',
      action: string,
      params: { [key: string]: any }
    ) => void;
  }
}

// Function to log a specific event
export const trackEvent = (action: string, params: { [key: string]: any }) => {
  if (typeof window.gtag === 'function') {
    window.gtag('event', action, params);
  }
};