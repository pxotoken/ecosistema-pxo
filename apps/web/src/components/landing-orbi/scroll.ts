import type React from 'react';

/** Height of the fixed landing nav. */
const NAV_HEIGHT = 64;

/** Section ids that exist on the landing, in document order. */
export const SECTIONS = {
  hero: 'hero',
  useCases: 'lo-que-hacemos',
  howItWorks: 'como-funciona',
  why: 'por-que-pxo',
  spei: 'spei',
  faq: 'faq',
} as const;

export const scrollToSection = (sectionId: string): void => {
  const element = document.getElementById(sectionId);
  if (!element) return;
  window.scrollTo({ top: element.offsetTop - NAV_HEIGHT, behavior: 'smooth' });
};

/** Anchor handler for in-page links; ignores anchors without a target section. */
export const handleAnchorClick = (event: React.MouseEvent<HTMLAnchorElement>): void => {
  event.preventDefault();
  const href = event.currentTarget.getAttribute('href');
  if (href?.startsWith('#') && href.length > 1) {
    scrollToSection(href.substring(1));
  }
};
