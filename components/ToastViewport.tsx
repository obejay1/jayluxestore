'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Info, X, XCircle } from 'lucide-react';

import styles from './ToastViewport.module.css';
import type { ToastKind } from '@/lib/toast';

type ToastItem = {
  id: string;
  message: string;
  type: ToastKind;
};

export default function ToastViewport() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handleToast = (event: Event) => {
      const detail = (event as CustomEvent<Omit<ToastItem, 'id'>>).detail;
      if (!detail?.message) return;

      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setItems((current) => [...current.slice(-3), { ...detail, id }]);

      window.setTimeout(() => {
        setItems((current) => current.filter((item) => item.id !== id));
      }, 3600);
    };

    window.addEventListener('jayluxe:toast', handleToast);
    return () => window.removeEventListener('jayluxe:toast', handleToast);
  }, []);

  if (!items.length) return null;

  return (
    <div className={styles.viewport} aria-live="polite" aria-atomic="false">
      {items.map((item) => {
        const Icon = item.type === 'success'
          ? CheckCircle2
          : item.type === 'error'
            ? XCircle
            : Info;

        return (
          <div key={item.id} className={`${styles.toast} ${styles[item.type]}`} role={item.type === 'error' ? 'alert' : 'status'}>
            <Icon size={19} aria-hidden="true" />
            <span>{item.message}</span>
            <button
              type="button"
              onClick={() => setItems((current) => current.filter((entry) => entry.id !== item.id))}
              aria-label="Dismiss notification"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
