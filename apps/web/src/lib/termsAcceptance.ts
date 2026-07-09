const STORAGE_KEY = 'pxo:tnc:accepted';
const CURRENT_VERSION = 'v1';

export function hasAcceptedTerms(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === CURRENT_VERSION;
  } catch {
    return false;
  }
}

export function markTermsAccepted(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, CURRENT_VERSION);
  } catch {
    // localStorage unavailable (private mode etc) — silently no-op.
  }
}
