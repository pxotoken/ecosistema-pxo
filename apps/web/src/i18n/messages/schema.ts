import type { es } from './es';

/**
 * Widens the reference catalogue's literal types so other locales are checked
 * for completeness (a missing or misspelled key is a compile error) without
 * having to repeat the Spanish strings.
 *
 * This lives in its own module on purpose: if `Messages` were declared in the
 * barrel that also imports the locale catalogues, the import cycle would make
 * TypeScript fall back to `any` and silently skip the check.
 */
type Widen<T> = T extends string
  ? string
  : T extends (...args: infer A) => infer R
    ? (...args: A) => R
    : { [K in keyof T]: Widen<T[K]> };

export type Messages = Widen<typeof es>;
