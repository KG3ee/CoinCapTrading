'use client';

import { useSession } from 'next-auth/react';
import AuthenticatedHome from '@/lib/components/AuthenticatedHome';
import PublicLandingPage from '@/lib/components/PublicLandingPage';

export default function HomePage() {
  const { status } = useSession();

  if (status !== 'authenticated') {
    return <PublicLandingPage />;
  }

  return <AuthenticatedHome />;
}
