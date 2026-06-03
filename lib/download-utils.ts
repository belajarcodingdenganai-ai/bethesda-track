type AndroidDownloader = {
  saveBase64?: (mimeType: string, filename: string, base64: string) => string;
};

declare global {
  interface Window {
    BethesdaDownloader?: AndroidDownloader;
  }
}

const isAndroidNativeDownloadAvailable = () =>
  typeof window !== 'undefined' && typeof window.BethesdaDownloader?.saveBase64 === 'function';

const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

export async function downloadBlobFile(blob: Blob, filename: string) {
  if (isAndroidNativeDownloadAvailable()) {
    const dataUrl = await blobToDataUrl(blob);
    const base64 = dataUrl.split(',')[1] || '';
    const result = window.BethesdaDownloader?.saveBase64?.(blob.type || 'application/octet-stream', filename, base64);
    if (result && result.startsWith('error:')) {
      throw new Error(result.replace(/^error:\s*/, '') || 'Gagal menyimpan file');
    }
    return;
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function downloadDataUrlFile(dataUrl: string, filename: string) {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  await downloadBlobFile(blob, filename);
}

export async function downloadTextFile(content: string, filename: string, type: string) {
  await downloadBlobFile(new Blob([content], { type }), filename);
}
