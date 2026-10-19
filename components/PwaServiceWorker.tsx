'use client';

import { useEffect, useState } from 'react';

export default function PwaServiceWorker() {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [applyingUpdate, setApplyingUpdate] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !window.isSecureContext) return;

    let disposed = false;
    let updateTimer: number | undefined;
    let activeRegistration: ServiceWorkerRegistration | null = null;

    const checkForUpdates = () => {
      if (document.visibilityState === 'visible' && activeRegistration) {
        void activeRegistration.update().catch((error: unknown) => {
          console.error('JayLuxe service-worker update check failed:', error);
        });
      }
    };

    const handleControllerChange = () => {
      if (disposed || !activeRegistration) return;
      setUpdateAvailable(Boolean(activeRegistration.waiting));
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    void navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: '/',
      updateViaCache: 'none',
    }).then((workerRegistration) => {
      if (disposed) return;
      activeRegistration = workerRegistration;
      setRegistration(workerRegistration);
      setUpdateAvailable(Boolean(workerRegistration.waiting && navigator.serviceWorker.controller));

      workerRegistration.addEventListener('updatefound', () => {
        const installingWorker = workerRegistration.installing;
        if (!installingWorker) return;
        installingWorker.addEventListener('statechange', () => {
          if (
            installingWorker.state === 'installed' &&
            navigator.serviceWorker.controller
          ) {
            setUpdateAvailable(true);
          }
        });
      });

      checkForUpdates();
      updateTimer = window.setInterval(checkForUpdates, 30 * 60 * 1000);
      document.addEventListener('visibilitychange', checkForUpdates);
    }).catch((error: unknown) => {
      console.error('JayLuxe service-worker registration failed:', error);
    });

    return () => {
      disposed = true;
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      document.removeEventListener('visibilitychange', checkForUpdates);
      if (updateTimer !== undefined) window.clearInterval(updateTimer);
    };
  }, []);

  const applyUpdate = () => {
    const waitingWorker = registration?.waiting;
    if (!waitingWorker) {
      setUpdateAvailable(false);
      return;
    }
    setApplyingUpdate(true);
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    }, { once: true });
    waitingWorker.postMessage({ type: 'SKIP_WAITING' });
  };

  if (!updateAvailable) return null;

  return (
    <aside
      aria-live="polite"
      style={{
        position: 'fixed',
        zIndex: 1000,
        right: 'max(1rem, env(safe-area-inset-right))',
        bottom: 'max(1rem, env(safe-area-inset-bottom))',
        left: 'max(1rem, env(safe-area-inset-left))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        maxWidth: '34rem',
        marginInline: 'auto',
        padding: '0.9rem 1rem',
        border: '1px solid #c8a24b',
        borderRadius: '0.75rem',
        background: '#111111',
        color: '#faf8f4',
        boxShadow: '0 0.5rem 2rem rgb(0 0 0 / 24%)',
      }}
    >
      <span>A JayLuxe update is ready.</span>
      <button
        type="button"
        onClick={applyUpdate}
        disabled={applyingUpdate}
        style={{
          flexShrink: 0,
          border: 0,
          borderRadius: '0.4rem',
          padding: '0.65rem 0.85rem',
          background: '#c8a24b',
          color: '#111111',
          font: 'inherit',
          fontWeight: 600,
          cursor: applyingUpdate ? 'wait' : 'pointer',
        }}
      >
        {applyingUpdate ? 'Updating…' : 'Refresh now'}
      </button>
    </aside>
  );
}
