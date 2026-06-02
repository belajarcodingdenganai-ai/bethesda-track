'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { toast } from 'sonner';
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock,
  QrCode,
  RefreshCcw,
  ShieldCheck,
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import Image from 'next/image';

type ScanResult = {
  success: true;
  name: string;
  role?: 'TEACHER' | 'STUDENT';
  type?: 'CHECK_IN' | 'CHECK_OUT';
  time: Date | string;
  date?: Date | string;
  scheduledStart?: Date | string;
  used?: number;
  total?: number;
  isLate?: boolean;
  minutesLate?: number;
  duplicateScan?: boolean;
  notes?: string;
};

type FailedScanResult = {
  success: false;
  error: string;
};

export default function ScannerPage() {
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [errorResult, setErrorResult] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCameraStarting, setIsCameraStarting] = useState(true);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const processingRef = useRef(false);
  const lastScanTimeRef = useRef(0);

  const onScanSuccess = useCallback(
    async (decodedText: string) => {
      if (processingRef.current || scanResult || errorResult) return;

      const now = Date.now();
      if (now - lastScanTimeRef.current < 2500) return;

      processingRef.current = true;
      lastScanTimeRef.current = now;
      setIsProcessing(true);

      try {
        try {
          await new Audio('/beep.mp3').play();
        } catch {
          // Audio feedback is optional and may be blocked by the browser.
        }

        const response = await fetch('/api/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store',
          body: JSON.stringify({
            qrCode: decodedText.trim(),
            teacherId: 'teacher-id-placeholder',
            mode: 'all',
          }),
        });
        const result = await response.json();

        if (result.success) {
          const successfulResult = result as ScanResult;
          setScanResult(successfulResult);
          if (successfulResult.role === 'TEACHER' && successfulResult.isLate) {
            toast.warning(`Anda terlambat ${successfulResult.minutesLate || 0} menit.`);
          } else if (successfulResult.role === 'STUDENT' && successfulResult.duplicateScan) {
            toast.warning(successfulResult.notes || `${successfulResult.name} sudah scan hari ini.`);
          } else {
            toast.success(`Absensi berhasil: ${successfulResult.name}`);
          }
        } else {
          const failedResult = result as FailedScanResult;
          setErrorResult(failedResult.error || 'Gagal memproses QR Code');
        }
      } catch (error: any) {
        setErrorResult(error.message || 'QR Code tidak valid atau sudah kadaluwarsa');
      } finally {
        processingRef.current = false;
        setIsProcessing(false);
      }
    },
    [errorResult, scanResult],
  );

  const onScanFailure = useCallback(() => {
    // html5-qrcode emits frequent scan misses; keeping this quiet avoids console noise.
  }, []);

  useEffect(() => {
    if (scanResult || errorResult) return;

    let cancelled = false;
    let startTimer: ReturnType<typeof setTimeout>;

    const startScanner = async () => {
      const readerElement = document.getElementById('reader');
      if (!readerElement || cancelled) return;

      const scanner = new Html5Qrcode('reader');
      scannerRef.current = scanner;
      setIsCameraStarting(true);

      try {
        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          onScanSuccess,
          onScanFailure,
        );

        if (!cancelled) {
          setIsCameraStarting(false);
        }
      } catch (error) {
        console.error('Gagal memulai kamera:', error);
        if (!cancelled) {
          setErrorResult(
            'Kamera tidak dapat diakses. Pastikan izin kamera telah diberikan dan gunakan protokol HTTPS.',
          );
          setIsCameraStarting(false);
        }
      }
    };

    startTimer = setTimeout(startScanner, 300);

    return () => {
      cancelled = true;
      clearTimeout(startTimer);

      const scanner = scannerRef.current;
      scannerRef.current = null;

      if (!scanner) return;

      if (scanner.isScanning) {
        scanner
          .stop()
          .then(() => {
            scanner.clear();
          })
          .catch(() => {});
      } else {
        scanner.clear();
      }
    };
  }, [errorResult, onScanFailure, onScanSuccess, scanResult]);

  const resetScanner = () => {
    setScanResult(null);
    setErrorResult(null);
    setIsCameraStarting(true);
  };

  const isTeacherResult = scanResult?.role === 'TEACHER';
  const hasSessionInfo =
    typeof scanResult?.used === 'number' && typeof scanResult?.total === 'number';

  const sessionSummary = useMemo(() => {
    if (!hasSessionInfo || !scanResult) {
      return { remaining: null, progress: 0 };
    }

    const remaining = Math.max(scanResult.total! - scanResult.used!, 0);
    const progress =
      scanResult.total! > 0
        ? Math.min(Math.max((scanResult.used! / scanResult.total!) * 100, 0), 100)
        : 0;

    return { remaining, progress };
  }, [hasSessionInfo, scanResult]);

  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-start sm:justify-center p-4 relative">
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-indigo-500/5 blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-emerald-500/5 blur-[100px]" />
      </div>

      <div className="w-full max-w-lg space-y-6 animate-in fade-in zoom-in-95 duration-500">
        <div className="flex items-center justify-between px-2">
          <Link href="/" className="p-3 glass-card rounded-2xl hover-lift text-zinc-500">
            <ArrowLeft size={20} />
          </Link>
          <div className="text-center">
            <div className="mx-auto mb-2 h-12 w-12 overflow-hidden rounded-full bg-white shadow-lg ring-1 ring-blue-100">
              <Image src="/brand/rumah-bethesda-logo.png" alt="Rumah Bethesda" width={48} height={48} className="h-full w-full object-cover" priority />
            </div>
            <h1 className="text-2xl font-black tracking-tighter uppercase">Terminal Kehadiran</h1>
            <p className="text-zinc-400 text-[10px] font-bold tracking-[0.3em] uppercase">
              Rumah Bethesda
            </p>
          </div>
          <div className="w-12" />
        </div>

        {!scanResult && !errorResult ? (
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-[40px] blur opacity-25 group-hover:opacity-40 transition duration-1000" />
            <div className="relative glass-card rounded-[40px] overflow-hidden border-2 border-white/50 dark:border-zinc-800/50">
              <div id="reader" className="w-full min-h-[320px] bg-black" />
              <div className="p-6 text-center bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md border-t border-zinc-100 dark:border-zinc-800">
                <div
                  className={`flex items-center justify-center gap-3 mb-2 ${
                    isCameraStarting || isProcessing ? 'text-zinc-400' : 'text-indigo-600'
                  }`}
                >
                  {isCameraStarting || isProcessing ? (
                    <RefreshCcw size={20} className="animate-spin" />
                  ) : (
                    <QrCode size={20} className="animate-pulse" />
                  )}
                  <span className="text-sm font-black uppercase tracking-widest">
                    {isProcessing
                      ? 'Memproses QR Code...'
                      : isCameraStarting
                        ? 'Menyiapkan Kamera...'
                        : 'Menunggu Pemindaian...'}
                  </span>
                </div>
                <p className="text-zinc-400 text-xs font-medium">
                  Arahkan QR Code siswa atau guru ke arah kamera
                </p>
              </div>
            </div>
          </div>
        ) : errorResult ? (
          <div className="glass-card rounded-[40px] p-8 border-2 border-amber-500/20 bg-amber-50/30 dark:bg-amber-500/5 animate-in slide-in-from-bottom-8 duration-500 shadow-2xl shadow-amber-500/10">
            <div className="flex flex-col items-center text-center space-y-5">
              <div className="w-20 h-20 bg-amber-500 rounded-full flex items-center justify-center shadow-xl shadow-amber-500/30">
                <AlertCircle size={40} className="text-white" strokeWidth={3} />
              </div>

              <div className="space-y-1">
                <h2 className="text-sm font-black text-amber-600 uppercase tracking-[0.3em]">
                  Perhatian
                </h2>
                <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100 px-4">
                  {errorResult}
                </p>
              </div>

              <button
                onClick={resetScanner}
                className="w-full py-4 rounded-[20px] bg-zinc-900 text-white font-black uppercase tracking-widest text-xs shadow-2xl hover:bg-zinc-800 active:scale-95 transition-all"
              >
                Scan Selanjutnya
              </button>
            </div>
          </div>
        ) : (
          <div className="glass-card rounded-[40px] p-8 border-2 border-emerald-500/20 bg-emerald-50/30 dark:bg-emerald-500/5 animate-in slide-in-from-bottom-8 duration-500 shadow-2xl shadow-emerald-500/10">
            <div className="flex flex-col items-center text-center space-y-5">
              <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center shadow-2xl shadow-emerald-500/40">
                {isTeacherResult ? (
                  <ShieldCheck size={40} className="text-white" strokeWidth={3} />
                ) : (
                  <CheckCircle2 size={40} className="text-white" strokeWidth={3} />
                )}
              </div>

              <div className="space-y-1">
                <h2 className="text-sm font-black text-emerald-600 uppercase tracking-[0.3em]">
                  Berhasil Dicatat
                </h2>
                <p className="text-3xl font-black tracking-tighter text-zinc-900 dark:text-zinc-100">
                  {scanResult?.name}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 w-full pt-2">
                <div className="p-3 bg-white/50 dark:bg-zinc-800/50 rounded-3xl border border-white/50">
                  <CalendarDays size={14} className="text-indigo-500 mx-auto mb-1" />
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">
                    Tanggal
                  </p>
                  <p className="text-sm font-black tabular-nums">
                    {scanResult?.time ? format(new Date(scanResult.time), 'dd/MM') : '-'}
                  </p>
                </div>
                <div className="p-3 bg-white/50 dark:bg-zinc-800/50 rounded-3xl border border-white/50">
                  <Clock size={14} className="text-indigo-500 mx-auto mb-1" />
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">
                    Waktu
                  </p>
                  <p className="text-lg font-black tabular-nums">
                    {scanResult?.time ? format(new Date(scanResult.time), 'HH:mm') : '-'}
                  </p>
                </div>
                <div className="p-3 bg-white/50 dark:bg-zinc-800/50 rounded-3xl border border-white/50">
                  <RefreshCcw size={14} className="text-indigo-500 mx-auto mb-1" />
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">
                    {isTeacherResult ? 'Status' : 'Sisa Sesi'}
                  </p>
                  <p className="text-lg font-black tabular-nums">
                    {isTeacherResult
                      ? scanResult?.isLate
                        ? 'Terlambat'
                        : 'Tepat'
                      : sessionSummary.remaining ?? '-'}
                  </p>
                </div>
              </div>

              {hasSessionInfo ? (
                <div className={`w-full p-3.5 text-white rounded-3xl ${scanResult?.duplicateScan ? 'bg-amber-600' : 'bg-zinc-900'}`}>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50 mb-1">
                    {scanResult?.duplicateScan ? 'Scan Berulang' : 'Status Sesi'}
                  </p>
                  {scanResult?.duplicateScan ? (
                    <p className="font-bold text-xs">{scanResult.notes}</p>
                  ) : (
                    <div className="flex justify-between items-center gap-3 px-2">
                      <span className="font-bold text-xs">
                        {scanResult?.used} / {scanResult?.total} Terpakai
                      </span>
                      <div className="h-2 w-32 bg-white/20 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-400"
                          style={{ width: `${sessionSummary.progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className={`w-full p-3.5 text-white rounded-3xl ${scanResult?.isLate ? 'bg-amber-600' : 'bg-zinc-900'}`}>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50 mb-1">
                    {scanResult?.isLate ? 'Notifikasi Keterlambatan' : 'Keterangan'}
                  </p>
                  <p className="font-bold text-xs">{scanResult?.notes || 'Absensi staf tercatat'}</p>
                </div>
              )}

              <button
                onClick={resetScanner}
                className="w-full py-4 rounded-[20px] bg-indigo-600 text-white font-black uppercase tracking-widest text-xs shadow-2xl shadow-indigo-500/40 hover:bg-indigo-700 active:scale-95 transition-all"
              >
                Scan Selanjutnya
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
