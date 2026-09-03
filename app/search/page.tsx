import { redirect } from 'next/navigation';

type SearchPageProps = {
  searchParams?: Promise<{ q?: string | string[] }>;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const rawQuery = resolvedSearchParams?.q;
  const query = Array.isArray(rawQuery) ? rawQuery[0] : rawQuery;
  redirect(query?.trim() ? `/shop?q=${encodeURIComponent(query.trim())}` : '/shop');
}
