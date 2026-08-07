import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';

export async function getTaxRate(): Promise<number> {
  try {
    const db = getFirestore();
    const taxDoc = await getDoc(doc(db, 'settings', 'tax'));
    if (taxDoc.exists()) {
      return taxDoc.data().taxRate;
    }
  } catch (e) {
    console.warn('Firebase not available, falling back to localStorage', e);
  }
  
  if (typeof window !== 'undefined') {
    const localRate = localStorage.getItem('taxRate');
    if (localRate !== null) return parseFloat(localRate);
  }
  
  return 7.5; // Default tax rate
}

export async function saveTaxRate(rate: number): Promise<void> {
  try {
    const db = getFirestore();
    await setDoc(doc(db, 'settings', 'tax'), { taxRate: rate, updatedAt: new Date().toISOString() });
  } catch (e) {
    console.warn('Firebase not available, falling back to localStorage', e);
    if (typeof window !== 'undefined') localStorage.setItem('taxRate', rate.toString());
  }
}