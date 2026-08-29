import { es } from './es';
import { en } from './en';
import type { Locale } from '../types';
import type { Messages } from './schema';

export type { Messages } from './schema';

export const CATALOGUES: Record<Locale, Messages> = { es, en };

export { es, en };
