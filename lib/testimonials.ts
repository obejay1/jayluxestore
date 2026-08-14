import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export type Testimonial = {
  id: string;
  customerName: string;
  customerPhoto?: string;
  image?: string;
  rating: number;
  review?: string;
  testimonial?: string;
  productOrService?: string;
  createdAt: string;
  featured: boolean;
};

export type TestimonialFormData = {
  customerName: string;
  customerPhoto?: string;
  image?: string;
  rating: number;
  review?: string;
  testimonial?: string;
  productOrService?: string;
  featured: boolean;
};

const COLLECTION_NAME = 'testimonials';

function cleanRating(rating: number) {
  if (!rating || rating < 1) return 1;
  if (rating > 5) return 5;
  return rating;
}

function cleanTestimonial(id: string, data: Partial<Testimonial>): Testimonial {
  return {
    id,
    customerName: data.customerName || '',
    customerPhoto: data.customerPhoto || data.image || '',
    image: data.image || data.customerPhoto || '',
    rating: cleanRating(Number(data.rating || 5)),
    review: data.review || data.testimonial || '',
    testimonial: data.testimonial || data.review || '',
    productOrService: data.productOrService || '',
    createdAt: data.createdAt || new Date().toISOString(),
    featured: Boolean(data.featured),
  };
}

export async function getTestimonials(): Promise<Testimonial[]> {
  const snap = await getDocs(collection(db, COLLECTION_NAME));

  return snap.docs
    .map((item) =>
      cleanTestimonial(item.id, item.data() as Partial<Testimonial>)
    )
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
}

export async function getFeaturedTestimonials(
  limitCount = 6
): Promise<Testimonial[]> {
  const testimonials = await getTestimonials();

  return testimonials
    .filter((item) => item.featured)
    .slice(0, limitCount);
}

export async function addTestimonial(
  data: TestimonialFormData
): Promise<string> {
  const payload = {
    customerName: data.customerName.trim(),
    customerPhoto: data.customerPhoto || data.image || '',
    image: data.image || data.customerPhoto || '',
    rating: cleanRating(Number(data.rating || 5)),
    review: (data.review || data.testimonial || '').trim(),
    testimonial: (data.testimonial || data.review || '').trim(),
    productOrService: (data.productOrService || '').trim(),
    featured: Boolean(data.featured),
    createdAt: new Date().toISOString(),
  };

  const docRef = await addDoc(collection(db, COLLECTION_NAME), payload);
  return docRef.id;
}

export async function updateTestimonial(
  id: string,
  data: Partial<TestimonialFormData>
): Promise<void> {
  await updateDoc(doc(db, COLLECTION_NAME, id), {
    ...data,
    rating:
      typeof data.rating === 'number'
        ? cleanRating(data.rating)
        : data.rating,
  });
}

export async function deleteTestimonial(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION_NAME, id));
}

export async function toggleTestimonialFeatured(
  id: string,
  featured: boolean
): Promise<void> {
  await updateDoc(doc(db, COLLECTION_NAME, id), {
    featured,
  });
}

/* Extra aliases in case your admin page uses these names */
export async function saveTestimonial(
  item: Partial<Testimonial>
): Promise<void> {
  const image = item.image || item.customerPhoto || '';
  const review = item.review || item.testimonial || '';
  const payload = {
    customerName: item.customerName || '',
    customerPhoto: image,
    image,
    rating: cleanRating(Number(item.rating || 5)),
    review,
    testimonial: review,
    productOrService: item.productOrService || '',
    featured: Boolean(item.featured),
    createdAt: item.createdAt || new Date().toISOString(),
  };
  if (item.id) await setDoc(doc(db, COLLECTION_NAME, item.id), payload, { merge: true });
  else await addDoc(collection(db, COLLECTION_NAME), payload);
}

export async function removeTestimonial(item: string | Testimonial): Promise<void> {
  await deleteTestimonial(typeof item === 'string' ? item : item.id);
}
