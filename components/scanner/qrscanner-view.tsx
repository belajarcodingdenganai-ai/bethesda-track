"use client"
import { useEffect, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { processAttendance } from "@/app/actions/attendance";
import { toast } from "sonner";

export function QRScannerView({ teacherId }: { teacherId: string }) {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;

    const initScanner = () => {
      scanner = new Html5QrcodeScanner("reader", {
        fps: 10,
        qrbox: { width: 250, height: 250 },
      }, false);

      scanner.render(
        async (decodedText) => {
          if (loading) return;
          setLoading(true);
          try {
            const res = await processAttendance(decodedText, teacherId);
            if (res.success === true) {
              const successfulResult = res as any;
              if (successfulResult.role === 'TEACHER' && successfulResult.isLate) {
                toast.warning(`Anda terlambat ${successfulResult.minutesLate || 0} menit.`);
              } else if (successfulResult.role === 'TEACHER') {
                toast.success(`Absensi guru berhasil: ${successfulResult.name}. Tepat waktu.`);
              } else if (successfulResult.role === 'STUDENT' && successfulResult.duplicateScan) {
                toast.warning(successfulResult.notes || `${successfulResult.name} sudah scan hari ini.`);
              } else {
                toast.success(`Absensi Berhasil: ${successfulResult.name}. Sisa: ${successfulResult.total - successfulResult.used} sesi`);
              }
            } else {
              toast.error((res as any).error || 'Error during attendance');
            }
          } catch (err: any) {
            toast.error(err.message);
          } finally {
            setLoading(false);
          }
        },
        () => {}
      );
    };

    initScanner();

    return () => {
      if (scanner) {
        scanner.clear().catch((e) => console.error('Error clearing scanner:', e));
      }
    };
  }, [teacherId, loading]);

  return (
    <div className="flex flex-col items-center justify-center space-y-4 p-8">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 bg-card shadow-2xl">
        <div id="reader" className="w-full"></div>
      </div>
      <p className="text-muted-foreground animate-pulse text-sm">Menunggu pemindaian QR...</p>
    </div>
  );
}
