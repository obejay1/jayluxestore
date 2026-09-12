import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  updateDoc,
  setDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { uploadAdminImage } from '@/lib/imageUpload';
import { Transformation } from '@/lib/types';
export type { Transformation } from '@/lib/types';

const TRANSFORMATIONS_COLLECTION = 'transformations';
const TRANSFORMATION_CATEGORIES_COLLECTION = 'transformationCategories';

export const TRANSFORMATION_CATEGORIES = [
  'Wig Installation',
  'Wig Revamp',
  'Wig Styling',
  'Dreadlock Making',
  'Dreadlock Relocking',
  'Bridal Makeup',
  'Event Makeup',
  'Gele Styling',
  'Pedicure',
];


export type TransformationCategory = {
  id: string;
  name: string;
  createdAt?: string;
};

export async function getTransformationCategories(): Promise<TransformationCategory[]> {
  const snap = await getDocs(collection(db, TRANSFORMATION_CATEGORIES_COLLECTION));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<TransformationCategory, 'id'>) }))
    .sort((a,b) => a.name.localeCompare(b.name));
}

export async function addTransformationCategory(name: string): Promise<string> {
  const clean = name.trim();
  if (!clean) throw new Error('Category name is required');
  const existing = await getTransformationCategories();
  if (existing.some((c) => c.name.toLowerCase() === clean.toLowerCase())) {
    throw new Error('Category already exists');
  }
  const ref = doc(collection(db, TRANSFORMATION_CATEGORIES_COLLECTION));
  await setDoc(ref, { name: clean, createdAt: new Date().toISOString() });
  return ref.id;
}

export async function removeTransformationCategory(id: string): Promise<void> {
  await deleteDoc(doc(db, TRANSFORMATION_CATEGORIES_COLLECTION, id));
}

export type TransformationFormData = {
  title: string;
  category: string;
  beforeImage: string;
  beforeImagePublicId?: string;
  afterImage: string;
  afterImagePublicId?: string;
  description: string;
  featured: boolean;
  published?: boolean;
  displayOrder?: number;
};

function formatTransformation(
  id: string,
  data: Partial<Transformation>
): Transformation {
  return {
    id,
    title: data.title || '',
    category: data.category || '',
    beforeImage: data.beforeImage || '',
    beforeImagePublicId: data.beforeImagePublicId || '',
    afterImage: data.afterImage || '',
    afterImagePublicId: data.afterImagePublicId || '',
    description: data.description || '',
    featured: Boolean(data.featured),
    published: data.published !== false,
    displayOrder: Number(data.displayOrder || 0),
    createdAt: data.createdAt || new Date().toISOString(),
  };
}

export async function uploadTransformationImage(
  file: File,
  side: 'before' | 'after'
): Promise<string> {
  const result = await uploadAdminImage(file, {
    folder: side === 'before' ? 'jayluxe/transformations/before' : 'jayluxe/transformations/after',
  });
  return result.url;
}

export async function getTransformations(): Promise<Transformation[]> {
  const snap = await getDocs(collection(db, TRANSFORMATIONS_COLLECTION));

  return snap.docs
    .map((d) =>
      formatTransformation(d.id, d.data() as Partial<Transformation>)
    )
    .sort(
      (a, b) =>
        new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
}

export async function getFeaturedTransformations(
  limitCount = 6
): Promise<Transformation[]> {
  const transformations = await getTransformations();

  return transformations
    .filter((item) => item.featured)
    .slice(0, limitCount);
}

export async function addTransformation(
  data: TransformationFormData
): Promise<string> {
  const payload = {
    title: data.title.trim(),
    category: data.category.trim(),
    beforeImage: data.beforeImage,
    beforeImagePublicId: data.beforeImagePublicId || '',
    afterImage: data.afterImage,
    afterImagePublicId: data.afterImagePublicId || '',
    description: data.description.trim(),
    featured: Boolean(data.featured),
    published: data.published !== false,
    displayOrder: Number(data.displayOrder || 0),
    createdAt: new Date().toISOString(),
  };

  const docRef = await addDoc(
    collection(db, TRANSFORMATIONS_COLLECTION),
    payload
  );

  return docRef.id;
}

export async function updateTransformation(
  id: string,
  data: Partial<TransformationFormData>
): Promise<void> {
  await updateDoc(doc(db, TRANSFORMATIONS_COLLECTION, id), data);
}

export async function deleteTransformation(id: string): Promise<void> {
  await deleteDoc(doc(db, TRANSFORMATIONS_COLLECTION, id));
}

export async function toggleTransformationFeatured(
  id: string,
  featured: boolean
): Promise<void> {
  await updateDoc(doc(db, TRANSFORMATIONS_COLLECTION, id), {
    featured,
  });
}

export async function saveTransformation(
  item: Transformation,
  beforeImageFile?: string | null,
  afterImageFile?: string | null
): Promise<void> {
  const payload = {
    title: item.title || '',
    category: item.category || '',
    beforeImage: beforeImageFile ?? item.beforeImage ?? '',
    beforeImagePublicId: item.beforeImagePublicId || '',
    afterImage: afterImageFile ?? item.afterImage ?? '',
    afterImagePublicId: item.afterImagePublicId || '',
    description: item.description || '',
    featured: Boolean(item.featured),
    createdAt: item.createdAt || new Date().toISOString(),
  };
  if (item.id) await updateDoc(doc(db, TRANSFORMATIONS_COLLECTION, item.id), payload);
  else await addDoc(collection(db, TRANSFORMATIONS_COLLECTION), payload);
}

export async function removeTransformation(item: string | Transformation): Promise<void> {
  await deleteTransformation(typeof item === 'string' ? item : item.id);
}

export async function deleteTransformationCategorySafely(id: string): Promise<void> {
  const transformations = await getTransformations();
  const category = (await getTransformationCategories()).find((c) => c.id === id);
  if (category && transformations.some((t) => t.category === category.name)) {
    throw new Error('Category is currently used by transformations. Reassign items before deleting.');
  }
  await deleteDoc(doc(db, TRANSFORMATION_CATEGORIES_COLLECTION, id));
}
