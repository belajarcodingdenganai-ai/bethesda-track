'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { toast } from 'sonner';
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  Clock,
  QrCode,
  RefreshCcw,
  ShieldCheck,
} from 'lucide-react';
import { format } from 'date-fns';
import Image from 'next/image';

type TeacherScanResult = {
  success: true;
  name: string;
  role: 'TEACHER';
  time: Date | string;
  isLate: boolean;
  minutesLate: number;
  notes?: string;
};

type FailedTeacherScanResult = {
  success: false;
  error: string;
};

const SCAN_API_URL = 'https://rumahbethesda.com/api/scan';

export default function TeacherScannerPage() {
  const [scanResult, setScanResult] = useState<TeacherScanResult | null>(null);
  const [errorResult, setErrorResult] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCameraStarting, setIsCameraStarting] = useState(true);
  const cameraScannerRef = useRef<Html5Qrcode | null>(null);
  const processingRef = useRef(false);
  const lastScanTimeRef = useRef(0);

  const processTeacherQr = useCallback(async (decodedText: string) => {
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
        // Browser may block audio until user interaction.
      }

      const response = await fetch(SCAN_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({
          qrCode: decodedText.trim(),
          mode: 'teacher',
        }),
      });
      const responseText = await response.text();
      if (!responseText) {
        throw new Error('Server tidak mengirim jawaban. Pastikan aplikasi Scan Guru sudah versi terbaru.');
      }

      const result = JSON.parse(responseText);
      if (!result.success) {
        const failedResult = result as FailedTeacherScanResult;
        setErrorResult(failedResult.error || 'QR guru tidak valid');
        return;
      }

      const successfulResult = result as TeacherScanResult;
      setScanResult(successfulResult);

      if (successfulResult.isLate) {
        toast.warning(`Anda terlambat ${successfulResult.minutesLate || 0} menit.`);
      } else {
        toast.success(`Kedatangan guru tercatat: ${successfulResult.name}`);
      }
    } catch (error: any) {
      setErrorResult(error.message || 'QR guru tidak valid');
    } finally {
      processingRef.current = false;
      setIsProcessing(false);
    }
  }, [errorResult, scanResult]);

  const onScanFailure = useCallback(() => {
    // html5-qrcode reports frequent misses; no need to surface them.
  }, []);

  useEffect(() => {
    if (scanResult || errorResult) return;

    let cancelled = false;
    let startTimer: ReturnType<typeof setTimeout>;

    const startCamera = async () => {
      const readerElement = document.getElementById('teacher-reader');
      if (!readerElement || cancelled) return;

      const scanner = new Html5Qrcode('teacher-reader');
      cameraScannerRef.current = scanner;
      setIsCameraStarting(true);

      try {
        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1,
          },
          processTeacherQr,
          onScanFailure,
        );

        if (!cancelled) setIsCameraStarting(false);
      } catch (error) {
        console.error('Gagal memulai kamera guru:', error);
        if (!cancelled) {
          setErrorResult('Kamera tidak dapat diakses. Berikan izin kamera atau gunakan tombol foto QR.');
          setIsCameraStarting(false);
        }
      }
    };

    startTimer = setTimeout(startCamera, 300);

    return () => {
      cancelled = true;
      clearTimeout(startTimer);

      const scanner = cameraScannerRef.current;
      cameraScannerRef.current = null;
      if (!scanner) return;

      if (scanner.isScanning) {
        scanner.stop().then(() => scanner.clear()).catch(() => {});
      } else {
        scanner.clear();
      }
    };
  }, [errorResult, onScanFailure, processTeacherQr, scanResult]);

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-6 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-xl flex-col justify-center space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center overflow-hidden rounded-3xl bg-sky-100 shadow-lg shadow-indigo-500/20 ring-1 ring-sky-200">
            <Image src="/brand/rumah-bethesda-logo.png" alt="Rumah Bethesda" width={80} height={80} className="h-full w-full object-cover" priority />
          </div>
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Scan Guru</h1>
          <p className="mt-2 text-sm font-semibold text-zinc-500 dark:text-zinc-400">
            Arahkan kamera ke QR guru untuk mencatat jam kedatangan.
          </p>
        </div>

        {!scanResult && !errorResult ? (
          <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-xl shadow-zinc-200/60 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/20">
            <div id="teacher-reader" className="w-full min-h-[320px] bg-black" />
            <div className="space-y-4 border-t border-zinc-100 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
              <div className={`flex items-center justify-center gap-3 ${isCameraStarting || isProcessing ? 'text-zinc-400' : 'text-indigo-600'}`}>
                {isCameraStarting || isProcessing ? (
                  <RefreshCcw size={20} className="animate-spin" />
                ) : (
                  <QrCode size={20} className="animate-pulse" />
                )}
                <span className="text-sm font-black uppercase tracking-widest">
                  {isProcessing ? 'Memproses QR Guru...' : isCameraStarting ? 'Menyiapkan Kamera...' : 'Arahkan QR Guru'}
                </span>
              </div>

              <div className="flex items-center justify-center gap-2 text-xs font-medium text-zinc-400">
                <Camera size={14} />
                Hanya QR guru yang dapat diproses.
              </div>
            </div>
          </div>
        ) : errorResult ? (
          <div className="animate-in slide-in-from-bottom-8 rounded-3xl border border-amber-200 bg-white p-8 shadow-xl shadow-amber-100 duration-500 dark:border-amber-900/40 dark:bg-zinc-900 dark:shadow-black/20">
            <div className="flex flex-col items-center text-center space-y-5">
              <div className="w-20 h-20 bg-amber-500 rounded-full flex items-center justify-center shadow-xl shadow-amber-500/30">
                <AlertCircle size={40} className="text-white" strokeWidth={3} />
              </div>
              <div className="space-y-1">
                <h2 className="text-sm font-black text-amber-600 uppercase tracking-[0.3em]">Perhatian</h2>
                <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100 px-4">{errorResult}</p>
              </div>
              <div className="w-full rounded-[20px] bg-zinc-100 px-4 py-3 text-xs font-black uppercase tracking-widest text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                Scanner dihentikan
              </div>
            </div>
          </div>
        ) : (
          <div className="animate-in slide-in-from-bottom-8 rounded-3xl border border-emerald-200 bg-white p-8 shadow-xl shadow-emerald-100 duration-500 dark:border-emerald-900/40 dark:bg-zinc-900 dark:shadow-black/20">
            <div className="flex flex-col items-center text-center space-y-5">
              <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center shadow-2xl shadow-emerald-500/40">
                <ShieldCheck size={40} className="text-white" strokeWidth={3} />
              </div>

              <div className="space-y-1">
                <h2 className="text-sm font-black text-emerald-600 uppercase tracking-[0.3em]">Scan Berhasil</h2>
                <p className="text-3xl font-black tracking-tighter text-zinc-900 dark:text-zinc-100">{scanResult?.name}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 w-full pt-2">
                <div className="p-3 bg-white/50 dark:bg-zinc-800/50 rounded-3xl border border-white/50">
                  <Clock size={14} className="text-indigo-500 mx-auto mb-1" />
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">Jam Datang</p>
                  <p className="text-lg font-black tabular-nums">
                    {scanResult?.time ? format(new Date(scanResult.time), 'HH:mm') : '-'}
                  </p>
                </div>
                <div className="p-3 bg-white/50 dark:bg-zinc-800/50 rounded-3xl border border-white/50">
                  <CheckCircle2 size={14} className="text-indigo-500 mx-auto mb-1" />
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">Status</p>
                  <p className="text-lg font-black tabular-nums">
                    {scanResult?.isLate ? 'Terlambat' : 'Tepat'}
                  </p>
                </div>
              </div>

              <div className={`w-full p-3.5 text-white rounded-3xl ${scanResult?.isLate ? 'bg-amber-600' : 'bg-zinc-900'}`}>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50 mb-1">
                  {scanResult?.isLate ? 'Notifikasi Keterlambatan' : 'Keterangan'}
                </p>
                <p className="font-bold text-xs">{scanResult?.notes || 'Tepat waktu.'}</p>
              </div>

              <div className="w-full rounded-[20px] bg-emerald-50 px-4 py-3 text-xs font-black uppercase tracking-widest text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
                Absensi hari ini sudah tercatat
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
