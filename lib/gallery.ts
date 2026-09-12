import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  updateDoc,
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



const GALLERY_CATEGORY_COLLECTION = 'bridalGalleryCategories';

export async function getBridalGalleryCategories(): Promise<string[]> {
  const snap = await getDocs(collection(db, GALLERY_CATEGORY_COLLECTION));
  return snap.docs
    .map((item) => String(item.data().name || '').trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
}

export async function addBridalGalleryCategory(name: string): Promise<void> {
  const cleanName = String(name || '').trim();
  if (!cleanName) throw new Error('Category name is required.');

  const existing = await getBridalGalleryCategories();
  if (existing.some((item) => item.toLowerCase() === cleanName.toLowerCase())) {
    throw new Error('Category already exists.');
  }

  await addDoc(collection(db, GALLERY_CATEGORY_COLLECTION), {
    name: cleanName,
    createdAt: new Date().toISOString(),
  });
}


export async function updateBridalGalleryCategory(
  oldName: string,
  newName: string
): Promise<void> {
  const cleanOld = String(oldName || '').trim();
  const cleanNew = String(newName || '').trim();

  if (!cleanOld || !cleanNew) {
    throw new Error('Category name is required.');
  }

  const existing = await getBridalGalleryCategories();
  if (existing.some(
    (item) => item.toLowerCase() === cleanNew.toLowerCase() && item.toLowerCase() !== cleanOld.toLowerCase()
  )) {
    throw new Error('Category already exists.');
  }

  const snap = await getDocs(collection(db, GALLERY_CATEGORY_COLLECTION));
  const match = snap.docs.find(
    (item) => String(item.data().name || '').trim().toLowerCase() === cleanOld.toLowerCase()
  );

  if (!match) throw new Error('Category not found.');

  await updateDoc(doc(db, GALLERY_CATEGORY_COLLECTION, match.id), {
    name: cleanNew,
    updatedAt: new Date().toISOString(),
  });

  const images = await getBridalGalleryImages();
  await Promise.all(
    images
      .filter((image) => String(image.category || '').toLowerCase() === cleanOld.toLowerCase())
      .map((image) =>
        updateDoc(doc(db, COLLECTION_NAME, image.id), { category: cleanNew })
      )
  );
}

export async function removeBridalGalleryCategory(name: string): Promise<void> {
  const images = await getBridalGalleryImages();
  const inUse = images.some(
    (image) => String(image.category || '').toLowerCase() === String(name || '').toLowerCase()
  );

  if (inUse) {
    throw new Error('Category is assigned to gallery images. Reassign images before deleting.');
  }

  const snap = await getDocs(collection(db, GALLERY_CATEGORY_COLLECTION));
  const match = snap.docs.find(
    (item) => String(item.data().name || '').toLowerCase() === String(name || '').toLowerCase()
  );

  if (match) {
    await deleteDoc(doc(db, GALLERY_CATEGORY_COLLECTION, match.id));
  }
}

export async function removeBridalGalleryImage(item: string | GalleryImage): Promise<void> {
  await deleteDoc(doc(db, COLLECTION_NAME, typeof item === 'string' ? item : item.id));
}

export async function updateBridalGalleryImage(
  id: string,
  data: Partial<GalleryImage>
): Promise<void> {
  await updateDoc(doc(db, COLLECTION_NAME, id), {
    title: data.title || data.caption || '',
    image: data.image || data.imageUrl || '',
    imageUrl: data.imageUrl || data.image || '',
    publicId: data.publicId || '',
    category: data.category || '',
    description: data.description || data.caption || '',
    caption: data.caption || data.description || '',
    featured: Boolean(data.featured),
    updatedAt: new Date().toISOString(),
  });
}
