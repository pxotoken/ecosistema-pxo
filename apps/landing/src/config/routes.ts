// Landing page route configuration

export const LANDING_SECTIONS = [
  'hero',
  'que-es-pxo',
  'como-funciona',
  'beneficios',
  'contacto'
] as const;

export type LandingSection = typeof LANDING_SECTIONS[number];

export const isValidLandingSection = (section: string): section is LandingSection => {
  return LANDING_SECTIONS.includes(section as LandingSection);
};

export const getLandingRoute = (section: LandingSection): string => {
  return `/#${section}`;
};
