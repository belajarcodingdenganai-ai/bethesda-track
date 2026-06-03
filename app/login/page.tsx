'use client';

import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { LockKeyhole, LogIn, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Login gagal.');
      }

      toast.success('Login admin berhasil');
      const next = searchParams.get('next') || '/';
      router.replace(next.startsWith('/') && !next.startsWith('//') ? next : '/');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Login gagal.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen safe-area-y bg-zinc-50 px-5 py-8 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center">
        <div className="rounded-[32px] border border-zinc-200 bg-white p-7 shadow-2xl shadow-zinc-200/60 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/20">
          <div className="text-center">
            <div className="mx-auto mb-5 flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-white shadow-lg ring-1 ring-blue-100">
              <Image src="/brand/rumah-bethesda-logo.png" alt="Rumah Bethesda" width={96} height={96} className="h-full w-full object-cover" priority />
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
              <ShieldCheck size={13} />
              Admin Access
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight">Login Admin</h1>
            <p className="mt-2 text-sm font-medium text-zinc-500">
              Masuk untuk mengakses dashboard, data siswa, scan, dan pengaturan.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-zinc-500">
                <LockKeyhole size={14} />
                Password Admin
              </span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                autoFocus
                className="block w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-4 text-base font-bold outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-zinc-800 dark:bg-zinc-950"
                placeholder="Masukkan password"
              />
            </label>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-4 text-sm font-black uppercase tracking-widest text-white shadow-xl shadow-indigo-500/25 transition-all hover:bg-indigo-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LogIn size={18} />
              {isSubmitting ? 'Masuk...' : 'Masuk'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
