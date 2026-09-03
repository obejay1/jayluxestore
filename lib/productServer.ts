import { adminDb } from '@/lib/firebaseAdmin';
import type { Product } from '@/lib/types';

export async function getProductServer(id: string): Promise<Product | null> {
  const productId = String(id || '').trim();
  if (!productId || productId.length > 120) return null;
  try {
    const snapshot = await adminDb.collection('products').doc(productId).get();
    if (!snapshot.exists) return null;
    const product = { ...(snapshot.data() as Product), id: snapshot.id };
    if (product.active === false || (product.type && product.type !== 'product')) return null;
    return product;
  } catch (error) {
    console.warn('PRODUCT_SERVER_LOOKUP_FAILED', error);
    return null;
  }
}

export async function getActiveProductsServer(limit = 500): Promise<Product[]> {
  try {
    const snapshot = await adminDb.collection('products').limit(limit).get();
    return snapshot.docs
      .map((entry) => ({ ...(entry.data() as Product), id: entry.id }))
      .filter((product) => product.active !== false && (!product.type || product.type === 'product'));
  } catch (error) {
    console.warn('PRODUCT_SITEMAP_LOOKUP_FAILED', error);
    return [];
  }
}
