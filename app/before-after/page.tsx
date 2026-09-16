import { getTransformations, getTransformationCategories } from '@/lib/transformations';
import BeforeAfterClient from './BeforeAfterClient';
import styles from '@/components/transformations/transformations.module.css';

export const dynamic = 'force-dynamic';

export default async function BeforeAfterPage() {
  const [items, categories] = await Promise.all([
    getTransformations().catch(() => []),
    getTransformationCategories().catch(() => []),
  ]);

  const published = items.filter((item) => item.published !== false);

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <span className={styles.heroKicker}>JayLuxe Transformations</span>
        <h1 className={styles.heroTitle}>Before &amp; After</h1>
        <p className={styles.heroSubtitle}>Real Customer Transformations — see the complete before and after results created by JayLuxe professionals.</p>
      </section>
      <BeforeAfterClient items={published} categories={categories} />
    </main>
  );
}
