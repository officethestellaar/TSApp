'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export const dynamic = 'force-dynamic';

export default function RootPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const redirected = useRef(false);

  useEffect(() => {
    if (redirected.current) return;
    if (!loading) {
      redirected.current = true;
      if (user) {
        if (user.role === 'HOUSEKEEPING_EXECUTIVE') {
          router.push('/dashboard/housekeeping');
        } else {
          router.push('/dashboard');
        }
      } else {
        router.push('/login');
      }
    }
  }, [user, loading, router]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!redirected.current) {
        redirected.current = true;
        router.push('/login');
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );
}
