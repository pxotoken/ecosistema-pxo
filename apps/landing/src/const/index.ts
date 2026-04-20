import { Sun, Moon, Monitor } from 'lucide-react';

export const THEMES = [
  { value: 'light' as const, icon: Sun, label: 'Light' },
  { value: 'dark' as const, icon: Moon, label: 'Dark' },
  { value: 'system' as const, icon: Monitor, label: 'System' },
] as const;

export type ThemeValue = typeof THEMES[number]['value'];
