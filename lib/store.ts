'use client';

import { initializeApp, getApps } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  setDoc,
  doc,
  deleteDoc,
  query,
  orderBy,
  updateDoc,
  addDoc,
} from 'firebase/firestore';

import { Product, Order, Session, Category } from './types';
import { seedProducts } from './seed';

export const defaultCategories: Category[] = [
  {
    id: 'skincare-beauty',
    name: 'Skincare & Beauty',
    slug: 'skincare-beauty',
    type: 'product',
    active: true,
  },
  {
    id: 'hair-care',
    name: 'Hair Care',
    slug: 'hair-care',
    type: 'product',
    active: true,
  },
  {
    id: 'cleaning-household',
    name: 'Cleaning & Household',
    slug: 'cleaning-household',
    type: 'product',
    active: true,
  },
  {
    id: 'perfumes-fragrances',
    name: 'Perfumes & Fragrances',
    slug: 'perfumes-fragrances',
    type: 'product',
    active: true,
  },
  {
    id: 'nail-care',
    name: 'Nail Care',
    slug: 'nail-care',
    type: 'product',
    active: true,
  },
  {
    id: 'wigs',
    name: 'Wigs',
    slug: 'wigs',
    type: 'product',
    active: true,
  },
  {
    id: 'fashion-accessories',
    name: 'Fashion Accessories',
    slug: 'fashion-accessories',
    type: 'product',
    active: true,
  },
  {
    id: 'kitchen-accessories',
    name: 'Kitchen Accessories',
    slug: 'kitchen-accessories',
    type: 'product',
    active: true,
  },
  {
    id: 'hair-services',
    name: 'Hair Services',
    slug: 'hair-services',
    type: 'service',
    active: true,
  },
  {
    id: 'makeup-gele',
    name: 'Makeup & Gele',
    slug: 'makeup-gele',
    type: 'service',
    active: true,
  },
  {
    id: 'beauty-spa',
    name: 'Beauty & Spa Services',
    slug: 'beauty-spa',
    type: 'service',
    active: true,
  },
];

const cfg = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const hasFirebase = !!cfg.apiKey && !!cfg.projectId;
const app = hasFirebase && !getApps().length ? initializeApp(cfg) : getApps()[0];
const db = app ? getFirestore(app) : null;

export const money = (n: number) => '₦' + Number(n || 0).toLocaleString('en-NG');

const ls = typeof window !== 'undefined' ? window.localStorage : null;

function createSlug(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replaceAll(' ', '-')
    .replace(/[^a-z0-9-]/g, '');
}

/* PRODUCTS */

export async function getProducts(): Promise<Product[]> {
  if (db) {
    const s = await getDocs(collection(db, 'products'));

    if (s.empty) return seedProducts;

    return s.docs.map((d) => d.data() as Product);
  }

  const saved = ls?.getItem('products');

  if (saved) return JSON.parse(saved);

  ls?.setItem('products', JSON.stringify(seedProducts));
  return seedProducts;
}

export async function saveProduct(p: Product) {
  if (db) return setDoc(doc(db, 'products', p.id), p);

  const all = await getProducts();
  const next = [...all.filter((x) => x.id !== p.id), p];

  ls?.setItem('products', JSON.stringify(next));
}

export async function removeProduct(id: string) {
  if (db) return deleteDoc(doc(db, 'products', id));

  const all = await getProducts();
  ls?.setItem('products', JSON.stringify(all.filter((x) => x.id !== id)));
}

/* CATEGORIES */

export async function getCategories(): Promise<Category[]> {
  if (db) {
    const s = await getDocs(collection(db, 'categories'));

    if (s.empty) return defaultCategories;

    return s.docs.map((d) => ({
      ...(d.data() as Category),
      id: d.id,
    }));
  }

  const saved = ls?.getItem('categories');

  if (saved) return JSON.parse(saved);

  ls?.setItem('categories', JSON.stringify(defaultCategories));
  return defaultCategories;
}

export async function saveCategory(category: Category) {
  const cleanCategory: Category = {
    ...category,
    id: category.id || createSlug(category.name) || Date.now().toString(),
    slug: category.slug || createSlug(category.name),
    active: Boolean(category.active),
    createdAt: category.createdAt || new Date().toISOString(),
  };

  if (db) {
    return setDoc(doc(db, 'categories', cleanCategory.id), cleanCategory);
  }

  const all = await getCategories();
  const next = [
    cleanCategory,
    ...all.filter((c) => c.id !== cleanCategory.id),
  ];

  ls?.setItem('categories', JSON.stringify(next));
}

export async function removeCategory(id: string) {
  if (db) return deleteDoc(doc(db, 'categories', id));

  const all = await getCategories();
  ls?.setItem('categories', JSON.stringify(all.filter((c) => c.id !== id)));
}

/* CART */

export function getCart() {
  return JSON.parse(ls?.getItem('cart') || '[]') as { id: string; qty: number }[];
}

export function setCart(c: { id: string; qty: number }[]) {
  ls?.setItem('cart', JSON.stringify(c));

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('cart'));
  }
}

export async function getUserSessions(): Promise<Session[]> {
  if (!db) return [];

  try {
    const s = await getDocs(
      query(collection(db, 'sessions'), orderBy('loginAt', 'desc'))
    );

    return s.docs.map((d) => ({
      ...d.data(),
      id: d.id,
    })) as Session[];
  } catch (error) {
    console.error('Failed to fetch user sessions:', error);
    return [];
  }
}

export function addToCart(id: string, quantity = 1) {
  const c = getCart();
  const found = c.find((i) => i.id === id);

  if (found) {
    found.qty += Math.max(1, quantity);
  } else {
    c.push({ id, qty: Math.max(1, quantity) });
  }

  setCart(c);
}

/* WISHLIST */

export function getWishlist() {
  try {
    return JSON.parse(ls?.getItem('wishlist') || '[]') as string[];
  } catch {
    return [];
  }
}

export function setWishlist(ids: string[]) {
  ls?.setItem('wishlist', JSON.stringify(ids));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('wishlist'));
  }
}

export function addToWishlist(id: string) {
  const w = getWishlist();
  if (!w.includes(id)) {
    w.push(id);
    setWishlist(w);
  }
}

export function removeFromWishlist(id: string) {
  const w = getWishlist().filter((x) => x !== id);
  setWishlist(w);
}

export function toggleWishlist(id: string) {
  const w = getWishlist();
  if (w.includes(id)) removeFromWishlist(id);
  else addToWishlist(id);
}

export function isInWishlist(id: string) {
  return getWishlist().includes(id);
}



/* RECENTLY VIEWED */

export function getRecentlyViewed() {
  try {
    return JSON.parse(ls?.getItem('recently-viewed') || '[]') as string[];
  } catch {
    return [];
  }
}

export function addRecentlyViewed(id: string) {
  const next = [id, ...getRecentlyViewed().filter((item) => item !== id)].slice(0, 12);
  ls?.setItem('recently-viewed', JSON.stringify(next));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('recently-viewed'));
  }
}

/* ORDERS */

export async function getOrders(): Promise<Order[]> {
  if (db) {
    const s = await getDocs(
      query(collection(db, 'orders'), orderBy('createdAt', 'desc'))
    );

    return s.docs.map((d) => ({
      ...d.data(),
      id: d.id,
    })) as Order[];
  }

  return JSON.parse(ls?.getItem('orders') || '[]');
}

export async function updateOrderStatus(id: string, status: string) {
  if (!db) return;

  await updateDoc(doc(db, 'orders', id), { status });
}

/* SESSIONS */

export async function logUserSession(userId: string, email: string | null) {
  if (!db) return;

  try {
    await addDoc(collection(db, 'sessions'), {
      userId,
      email: email || 'unknown',
      loginAt: new Date().toISOString(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown',
    });
  } catch (error) {
    console.error('Failed to log user session:', error);
  }
}