import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export type GalleryImage = {
  id: string;
  title?: string;
  image?: string;
  imageUrl?: string;
  publicId?: string;
  category?: string;
  description?: string;
  caption?: string;
  featured?: boolean;
  createdAt?: string;
};

const COLLECTION_NAME = 'bridalGallery';

function cleanGalleryImage(
  id: string,
  data: Partial<GalleryImage>
): GalleryImage {
  return {
    id,
    title: data.title || '',
    image: data.image || data.imageUrl || '',
    imageUrl: data.imageUrl || data.image || '',
    publicId: data.publicId || '',
    category: data.category || '',
    description: data.description || data.caption || '',
    caption: data.caption || data.description || '',
    featured: Boolean(data.featured),
    createdAt: data.createdAt || new Date().toISOString(),
  };
}

export async function getBridalGalleryImages(): Promise<GalleryImage[]> {
  const snap = await getDocs(collection(db, COLLECTION_NAME));

  return snap.docs
    .map((item) =>
      cleanGalleryImage(item.id, item.data() as Partial<GalleryImage>)
    )
    .sort(
      (a, b) =>
        new Date(b.createdAt || '').getTime() -
        new Date(a.createdAt || '').getTime()
    );
}

export async function addBridalGalleryImage(
  itemOrImage: Partial<GalleryImage> | string,
  caption = ''
): Promise<void> {
  const item: Partial<GalleryImage> = typeof itemOrImage === 'string'
    ? { image: itemOrImage, imageUrl: itemOrImage, caption, description: caption }
    : itemOrImage;
  await addDoc(collection(db, COLLECTION_NAME), {
    title: item.title || item.caption || '',
    image: item.image || item.imageUrl || '',
    imageUrl: item.imageUrl || item.image || '',
    publicId: item.publicId || '',
    category: item.category || '',
    description: item.description || item.caption || '',
    caption: item.caption || item.description || '',
    featured: Boolean(item.featured),
    createdAt: new Date().toISOString(),
  });
}

export async function removeBridalGalleryImage(item: string | GalleryImage): Promise<void> {
  await deleteDoc(doc(db, COLLECTION_NAME, typeof item === 'string' ? item : item.id));
}