'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, LogIn } from 'lucide-react';

/**
 * AdminGuard component - melindungi halaman scanner dari akses tidak sah
 * Hanya admin yang terautentikasi yang dapat mengakses halaman
 */
export function AdminGuard({ children }: { children: React.ReactNode }) {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    const checkAdminAuth = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          cache: 'no-store',
        });
        const data = await response.json();

        if (data.authenticated) {
          setIsAuthorized(true);
        } else {
          setIsAuthorized(false);
          // Redirect ke login setelah delay kecil agar user bisa melihat pesan
          setTimeout(() => router.push('/login'), 2000);
        }
      } catch (error) {
        setIsAuthorized(false);
        setTimeout(() => router.push('/login'), 2000);
      }
    };

    checkAdminAuth();
  }, [router]);

  if (isAuthorized === null) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Memeriksa autentikasi...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mx-auto mb-4">
            <AlertCircle className="w-6 h-6 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-center mb-2">Akses Ditolak</h2>
          <p className="text-gray-600 text-center mb-6">
            Hanya admin yang dapat mengakses halaman scanning. Silakan login terlebih dahulu.
          </p>
          <div className="flex items-center justify-center">
            <LogIn className="w-4 h-4 mr-2" />
            <p className="text-sm text-gray-500">Redirecting ke login...</p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
