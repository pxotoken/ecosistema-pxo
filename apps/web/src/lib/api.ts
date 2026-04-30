import axios from 'axios';

const api = axios.create({
  baseURL: (import.meta.env.VITE_API_URL as string | undefined) ?? '',
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const jwt = localStorage.getItem('pxo_jwt');
  if (jwt) {
    config.headers.Authorization = `Bearer ${jwt}`;
  }
  return config;
});

export function getApiError(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    return (err.response?.data as { error?: string })?.error || fallback;
  }
  return err instanceof Error ? err.message : fallback;
}

export default api;
