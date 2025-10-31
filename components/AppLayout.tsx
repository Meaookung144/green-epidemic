'use client';

import { useSession } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import ResponsiveNavigation from './ResponsiveNavigation';

interface AppLayoutProps {
  children: React.ReactNode;
}

const publicPaths = ['/auth/signin', '/auth/signup', '/'];

export default function AppLayout({ children }: AppLayoutProps) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  // Check if current path is public
  const isPublicPath = publicPaths.includes(pathname);

  // Redirect unauthenticated users to sign in (except for public paths)
  useEffect(() => {
    if (status === 'loading') return; // Still loading

    if (!session && !isPublicPath) {
      router.push('/auth/signin');
      return;
    }

    // Redirect authenticated users away from auth pages
    if (session && (pathname === '/auth/signin' || pathname === '/auth/signup')) {
      router.push('/dashboard');
      return;
    }
  }, [session, status, pathname, router, isPublicPath]);

  // Don't render navigation for public paths
  if (isPublicPath) {
    return <>{children}</>;
  }

  // Don't render anything while checking authentication
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render navigation if not authenticated
  if (!session) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ResponsiveNavigation />
      <main className="pb-16 md:pb-0 pt-16">
        {children}
      </main>
    </div>
  );
}