import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  updateDoc,
} from 'firebase/firestore';
import {
  getDownloadURL,
  getStorage,
  ref,
  uploadBytes,
} from 'firebase/storage';
import { db } from '@/lib/firebase';
import { BridalPackage } from '@/lib/types';
export type { BridalPackage } from '@/lib/types';

const BRIDAL_COLLECTION = 'bridalPackages';

export type BridalPackageFormData = {
  title: string;
  description: string;
  image: string;
  price: number;
  features: string[];
  duration?: string;
  active: boolean;
  featured: boolean;
};

function formatBridalPackage(
  id: string,
  data: Partial<BridalPackage>
): BridalPackage {
  return {
    id,
    title: data.title || data.name || '',
    name: data.name || data.title || '',
    description: data.description || '',
    image: data.image || '',
    price: Number(data.price || 0),
    features: Array.isArray(data.features) ? data.features : [],
    duration: data.duration || '',
    active: data.active !== false,
    featured: Boolean(data.featured),
    createdAt: data.createdAt || new Date().toISOString(),
  };
}

export async function uploadBridalPackageImage(file: File): Promise<string> {
  const storage = getStorage();

  const safeName = file.name
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, '-');

  const filePath = `bridal-packages/${Date.now()}-${safeName}`;
  const imageRef = ref(storage, filePath);

  const snapshot = await uploadBytes(imageRef, file);
  return getDownloadURL(snapshot.ref);
}

export async function getBridalPackages(): Promise<BridalPackage[]> {
  const snap = await getDocs(collection(db, BRIDAL_COLLECTION));

  return snap.docs
    .map((d) => formatBridalPackage(d.id, d.data() as Partial<BridalPackage>))
    .filter((item) => item.active)
    .sort(
      (a, b) =>
        new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
}

export async function addBridalPackage(
  data: BridalPackageFormData
): Promise<string> {
  const payload = {
    title: data.title.trim(),
    description: data.description.trim(),
    image: data.image,
    price: Number(data.price || 0),
    features: data.features || [],
    duration: data.duration?.trim() || '',
    active: Boolean(data.active),
    featured: Boolean(data.featured),
    createdAt: new Date().toISOString(),
  };

  const docRef = await addDoc(collection(db, BRIDAL_COLLECTION), payload);
  return docRef.id;
}

export async function updateBridalPackage(
  id: string,
  data: Partial<BridalPackageFormData>
): Promise<void> {
  await updateDoc(doc(db, BRIDAL_COLLECTION, id), data);
}

export async function deleteBridalPackage(id: string): Promise<void> {
  await deleteDoc(doc(db, BRIDAL_COLLECTION, id));
}

export async function saveBridalPackage(item: BridalPackage): Promise<void> {
  const title = item.title || item.name || 'Bridal Package';
  const payload = {
    ...item,
    title,
    name: item.name || title,
    price: Number(item.price || 0),
    features: Array.isArray(item.features) ? item.features : [],
    active: item.active !== false,
    featured: Boolean(item.featured),
    popular: Boolean(item.popular),
    createdAt: item.createdAt || new Date().toISOString(),
  };
  if (item.id) await updateDoc(doc(db, BRIDAL_COLLECTION, item.id), payload);
  else await addDoc(collection(db, BRIDAL_COLLECTION), payload);
}

export async function removeBridalPackage(id: string): Promise<void> {
  await deleteBridalPackage(id);
}
