import { redirect } from 'next/navigation';

export default function BeautyServicesPage() {
  redirect('/services?category=Beauty%20%26%20Spa%20Services');
}
