'use client';

import { useEffect, useState } from 'react';
import { Download, QrCode } from 'lucide-react';
import { generateQRCode } from '@/lib/qr-utils';

interface MemberQrCardProps {
  name: string;
  registrationNo: string;
  qrCode: string;
  roleLabel: string;
}

function sanitizeFilename(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'qr-code';
}

export default function MemberQrCard({ name, registrationNo, qrCode, roleLabel }: MemberQrCardProps) {
  const [qrDataUrl, setQrDataUrl] = useState('');

  useEffect(() => {
    let isMounted = true;

    generateQRCode(qrCode, { width: 420, margin: 2 })
      .then((dataUrl) => {
        if (isMounted) setQrDataUrl(dataUrl);
      })
      .catch(() => {
        if (isMounted) setQrDataUrl('');
      });

    return () => {
      isMounted = false;
    };
  }, [qrCode]);

  const downloadQrCard = async () => {
    const dataUrl = qrDataUrl || await generateQRCode(qrCode, { width: 420, margin: 2 });
    const qrImage = new Image();

    qrImage.onload = () => {
      const canvas = document.createElement('canvas');
      const width = 800;
      const height = 1040;
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = '#e4e4e7';
      ctx.lineWidth = 4;
      ctx.strokeRect(32, 32, width - 64, height - 64);

      ctx.fillStyle = '#4f46e5';
      ctx.font = '700 28px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(roleLabel.toUpperCase(), width / 2, 112);

      ctx.fillStyle = '#18181b';
      ctx.font = '800 44px Arial';
      ctx.fillText(name, width / 2, 178);

      ctx.fillStyle = '#71717a';
      ctx.font = '700 24px Arial';
      ctx.fillText(registrationNo, width / 2, 224);

      ctx.drawImage(qrImage, 190, 290, 420, 420);

      ctx.fillStyle = '#18181b';
      ctx.font = '700 24px Arial';
      ctx.fillText(qrCode, width / 2, 770);

      ctx.fillStyle = '#a1a1aa';
      ctx.font = '600 18px Arial';
      ctx.fillText('Bethesda Track', width / 2, 926);

      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `${sanitizeFilename(roleLabel)}-${sanitizeFilename(registrationNo)}-${sanitizeFilename(name)}.png`;
      link.click();
    };

    qrImage.src = dataUrl;
  };

  return (
    <div className="rounded-[24px] border-2 border-dashed border-indigo-500/20 bg-indigo-50/40 p-5 dark:bg-indigo-500/5">
      <div className="flex flex-col items-center text-center">
        <div className="mb-4 flex items-center gap-2 text-indigo-600">
          <QrCode size={18} />
          <span className="text-[10px] font-black uppercase tracking-[0.22em]">QR Code</span>
        </div>
        <div className="rounded-3xl bg-white p-4 shadow-xl">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt={`QR Code ${name}`} className="h-40 w-40" />
          ) : (
            <div className="flex h-40 w-40 items-center justify-center text-xs font-bold text-zinc-400">Memuat QR</div>
          )}
        </div>
        <p className="mt-4 text-base font-black text-zinc-950 dark:text-zinc-100">{name}</p>
        <p className="mt-1 font-mono text-xs font-bold text-zinc-500">{registrationNo}</p>
        <p className="mt-1 max-w-full break-all font-mono text-[10px] font-bold text-zinc-400">{qrCode}</p>
        <button
          type="button"
          onClick={downloadQrCard}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-xl shadow-indigo-500/25 transition-all hover:bg-indigo-700 active:scale-[0.99]"
        >
          <Download size={14} />
          Download QR
        </button>
      </div>
    </div>
  );
}
