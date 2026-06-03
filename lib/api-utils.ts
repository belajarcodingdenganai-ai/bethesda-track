export function getBaseUrl() {
  // Use relative URLs in browser context (works for web and Capacitor with proper config)
  // Only use absolute URL if NEXT_PUBLIC_APP_URL is explicitly set (for mobile/external access)
  if (typeof window !== 'undefined') {
    // In browser: use relative URL to avoid CORS issues
    // In Capacitor: if needed, set NEXT_PUBLIC_APP_URL environment variable
    return process.env.NEXT_PUBLIC_APP_URL || '';
  }
  // Server-side
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}

export async function fetchApi(path: string, options?: RequestInit) {
  const baseUrl = getBaseUrl();
  const url = path.startsWith('http') ? path : `${baseUrl}${path}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'An unknown error occurred' }));
    throw new Error(error.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}
