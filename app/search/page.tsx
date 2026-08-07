import { redirect } from 'next/navigation';

type SearchPageProps = {
  searchParams?: { q?: string | string[] };
};

export default function SearchPage({ searchParams }: SearchPageProps) {
  const rawQuery = searchParams?.q;
  const query = Array.isArray(rawQuery) ? rawQuery[0] : rawQuery;
  redirect(query?.trim() ? `/shop?q=${encodeURIComponent(query.trim())}` : '/shop');
}
