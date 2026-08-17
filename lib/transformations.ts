import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  updateDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { uploadAdminImage } from '@/lib/imageUpload';
import { Transformation } from '@/lib/types';
export type { Transformation } from '@/lib/types';

const TRANSFORMATIONS_COLLECTION = 'transformations';

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

export type TransformationFormData = {
  title: string;
  category: string;
  beforeImage: string;
  beforeImagePublicId?: string;
  afterImage: string;
  afterImagePublicId?: string;
  description: string;
  featured: boolean;
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
