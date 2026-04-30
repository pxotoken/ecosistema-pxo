import axios from 'axios';

const api = axios.create({
  baseURL: (import.meta.env.VITE_API_URL as string | undefined) ?? '',
  withCredentials: true,
});

export function getApiError(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    return (err.response?.data as { error?: string })?.error || fallback;
  }
  return err instanceof Error ? err.message : fallback;
}

export default api;
