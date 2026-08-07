declare global {
  interface Window {
    gtag?: (
      command: 'event',
      action: string,
      params: { [key: string]: any }
    ) => void;
  }
}

export const trackEvent = (
  eventName: string,
  params: { [key: string]: any } = {}
) => {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', eventName, params);
  }
};
