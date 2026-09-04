import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';

export type StoreMode = 'Live' | 'Maintenance';

export type CheckoutSettings = {
  taxRate: number;
  shippingFee: number;

  deliveryDaysText: string;
  deliveryDaysCount: number;

  storeMode: StoreMode;
  maintenanceEndDate: string;

  updatedAt?: string;
};

const DEFAULTS: CheckoutSettings = {
  taxRate: 7.5,
  shippingFee: 1500,

  deliveryDaysText: '2–5 business days',
  deliveryDaysCount: 5,

  storeMode: 'Live',
  maintenanceEndDate: '',
};

function normalizeSettings(data: Partial<CheckoutSettings>): CheckoutSettings {
  return {
    taxRate:
      typeof data.taxRate === 'number'
        ? data.taxRate
        : DEFAULTS.taxRate,

    shippingFee:
      typeof data.shippingFee === 'number'
        ? data.shippingFee
        : DEFAULTS.shippingFee,

    deliveryDaysText:
      typeof data.deliveryDaysText === 'string' && data.deliveryDaysText.trim()
        ? data.deliveryDaysText
        : DEFAULTS.deliveryDaysText,

    deliveryDaysCount:
      typeof data.deliveryDaysCount === 'number'
        ? data.deliveryDaysCount
        : DEFAULTS.deliveryDaysCount,

    storeMode:
      data.storeMode === 'Maintenance' || data.storeMode === 'Live'
        ? data.storeMode
        : DEFAULTS.storeMode,

    maintenanceEndDate:
      typeof data.maintenanceEndDate === 'string'
        ? data.maintenanceEndDate
        : DEFAULTS.maintenanceEndDate,

    updatedAt: data.updatedAt,
  };
}

export async function getCheckoutSettings(): Promise<CheckoutSettings> {
  try {
    const db = getFirestore();
    const ref = doc(db, 'settings', 'checkout');
    const snap = await getDoc(ref);

    if (snap.exists()) {
      const data = snap.data() as Partial<CheckoutSettings>;
      const settings = normalizeSettings(data);

      const maintenanceHasEnded =
        settings.storeMode === 'Maintenance' &&
        !!settings.maintenanceEndDate &&
        new Date(settings.maintenanceEndDate).getTime() <= Date.now();

      if (maintenanceHasEnded) {
        const liveSettings: CheckoutSettings = {
          ...settings,
          storeMode: 'Live',
          maintenanceEndDate: '',
          updatedAt: new Date().toISOString(),
        };

        await setDoc(ref, liveSettings, { merge: true });

        if (typeof window !== 'undefined') {
          localStorage.setItem(
            'jj-checkout-settings',
            JSON.stringify(liveSettings)
          );
        }

        return liveSettings;
      }

      return settings;
    }
  } catch (error) {
    console.warn('Firebase not available, falling back to localStorage', error);
  }

  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('jj-checkout-settings');

      if (saved) {
        return normalizeSettings(JSON.parse(saved) as Partial<CheckoutSettings>);
      }
    } catch {
      /* ignore */
    }
  }

  return DEFAULTS;
}

export async function saveCheckoutSettings(
  settings: Partial<CheckoutSettings>
): Promise<void> {
  const current = await getCheckoutSettings();

  const payload: CheckoutSettings = {
    ...current,
    ...settings,
    taxRate:
      typeof settings.taxRate === 'number'
        ? settings.taxRate
        : current.taxRate,
    shippingFee:
      typeof settings.shippingFee === 'number'
        ? settings.shippingFee
        : current.shippingFee,
    deliveryDaysText:
      typeof settings.deliveryDaysText === 'string' &&
      settings.deliveryDaysText.trim()
        ? settings.deliveryDaysText
        : current.deliveryDaysText,
    deliveryDaysCount:
      typeof settings.deliveryDaysCount === 'number'
        ? settings.deliveryDaysCount
        : current.deliveryDaysCount,
    storeMode:
      settings.storeMode === 'Maintenance' || settings.storeMode === 'Live'
        ? settings.storeMode
        : current.storeMode,
    maintenanceEndDate:
      typeof settings.maintenanceEndDate === 'string'
        ? settings.maintenanceEndDate
        : current.maintenanceEndDate,
    updatedAt: new Date().toISOString(),
  };

  try {
    const db = getFirestore();

    await setDoc(
      doc(db, 'settings', 'checkout'),
      payload,
      { merge: true }
    );
  } catch (error) {
    console.warn('Firebase not available, falling back to localStorage', error);
  }

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('jj-checkout-settings', JSON.stringify(payload));
    } catch {
      /* ignore */
    }
  }
}

export function isMaintenanceModeActive(settings: CheckoutSettings): boolean {
  if (settings.storeMode !== 'Maintenance') {
    return false;
  }

  if (!settings.maintenanceEndDate) {
    return true;
  }

  return new Date(settings.maintenanceEndDate).getTime() > Date.now();
}

export function getEstimatedDeliveryDate(
  createdAt: string | Date,
  deliveryDaysCount: number
): Date | null {
  const createdDate = new Date(createdAt);

  if (Number.isNaN(createdDate.getTime())) {
    return null;
  }

  const estimatedDate = new Date(createdDate);
  estimatedDate.setDate(
    estimatedDate.getDate() + Number(deliveryDaysCount || 0)
  );

  return estimatedDate;
}