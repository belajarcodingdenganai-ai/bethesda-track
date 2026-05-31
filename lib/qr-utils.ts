import QRCode from 'qrcode';

export async function generateQRCode(text: string, options?: any) {
  try {
    const qrCodeDataUrl = await QRCode.toDataURL(text, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
      ...options,
    });
    return qrCodeDataUrl;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw error;
  }
}

export async function generateQRCodeCanvas(text: string, canvas: HTMLCanvasElement) {
  try {
    await QRCode.toCanvas(canvas, text, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });
  } catch (error) {
    console.error('Error generating QR code on canvas:', error);
    throw error;
  }
}

export async function downloadQRCodePDF(qrCodeDataUrl: string, filename: string) {
  const link = document.createElement('a');
  link.href = qrCodeDataUrl;
  link.download = filename;
  link.click();
}

export function calculateSessionsRemaining(totalSessions: number, usedSessions: number): number {
  return Math.max(0, totalSessions - usedSessions);
}

export function calculateSessionsPercentage(totalSessions: number, usedSessions: number): number {
  if (totalSessions === 0) return 0;
  return Math.round((usedSessions / totalSessions) * 100);
}

export function getPackageStatus(usedSessions: number, totalSessions: number, warningThreshold: number = 1) {
  const remaining = calculateSessionsRemaining(totalSessions, usedSessions);
  
  if (remaining === 0) {
    return 'COMPLETED';
  }
  if (remaining <= warningThreshold) {
    return 'WARNING';
  }
  return 'ACTIVE';
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

export function calculateWorkedHours(checkIn: Date, checkOut: Date | null): number {
  if (!checkOut) return 0;
  const diffMs = checkOut.getTime() - checkIn.getTime();
  return diffMs / (1000 * 60); // Convert to minutes
}

export function isLate(checkInTime: Date, expectedTime: Date = new Date('2000-01-01T08:00:00')): boolean {
  const checkInHour = checkInTime.getHours();
  const checkInMinute = checkInTime.getMinutes();
  const expectedHour = expectedTime.getHours();
  const expectedMinute = expectedTime.getMinutes();
  
  return checkInHour > expectedHour || (checkInHour === expectedHour && checkInMinute > expectedMinute);
}
