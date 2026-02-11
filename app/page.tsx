import { redirect } from 'next/navigation';
import PublicLandingPage from '@/lib/components/PublicLandingPage';
import { auth } from '@/lib/nextAuth';

export default async function HomePage() {
  const session = await auth();

  if (session?.user?.id) {
    redirect('/dashboard');
  }

  return <PublicLandingPage />;
}
