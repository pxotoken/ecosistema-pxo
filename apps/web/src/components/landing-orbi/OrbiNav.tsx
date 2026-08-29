import React, { useEffect, useRef, useState } from 'react';
import { TermsViewerModal } from '../legal/TermsViewerModal';
import { StartNowButton } from './StartNowButton';
import { ChevronDownIcon } from './icons';
import { SECTIONS, handleAnchorClick } from './scroll';
import { useLocale, LOCALES, LOCALE_LABELS, type Locale } from '../../i18n';

type Dropdown = 'personal' | 'about' | 'lang' | null;

export const OrbiNav: React.FC = () => {
  const { locale, setLocale, messages } = useLocale();
  const { nav } = messages;
  const [openDropdown, setOpenDropdown] = useState<Dropdown>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  const personalItems = [
    { ...nav.items.buySell, href: `#${SECTIONS.useCases}`, icon: '⇄' },
    { ...nav.items.account, href: `#${SECTIONS.why}`, icon: '💳' },
    { ...nav.items.spei, href: `#${SECTIONS.spei}`, icon: '📤' },
    { ...nav.items.dollars, href: `#${SECTIONS.useCases}`, icon: '🌐' },
  ];

  // No dedicated pages exist yet — these keep the design's placeholders.
  const aboutItems = [
    { label: nav.about_items.privacy, href: '#' },
    { label: nav.about_items.blog, href: '#' },
    { label: nav.about_items.help, href: `#${SECTIONS.faq}` },
  ];

  // Close the dropdowns when clicking anywhere outside the nav.
  useEffect(() => {
    if (!openDropdown) return;
    const onDocClick = (event: MouseEvent) => {
      if (!navRef.current?.contains(event.target as Node)) setOpenDropdown(null);
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, [openDropdown]);

  const toggleDropdown = (name: Exclude<Dropdown, null>) =>
    setOpenDropdown((current) => (current === name ? null : name));

  const closeAll = () => {
    setOpenDropdown(null);
    setMobileOpen(false);
  };

  const onNavAnchorClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    handleAnchorClick(event);
    closeAll();
  };

  const openTerms = () => {
    closeAll();
    setTermsOpen(true);
  };

  const pickLocale = (next: Locale) => {
    setLocale(next);
    closeAll();
  };

  return (
    <>
      <nav className="orbi-nav" ref={navRef}>
        <a href={`#${SECTIONS.hero}`} className="logo" onClick={onNavAnchorClick}>
          <span className="logo-wordmark">PXO Token</span>
        </a>

        <div className="nav-center">
          {/* Individual mega dropdown */}
          <div className="nav-pill">
            <button
              type="button"
              className={`nav-pill-btn ${openDropdown === 'personal' ? 'active' : ''}`}
              onClick={() => toggleDropdown('personal')}
              aria-expanded={openDropdown === 'personal'}
            >
              {nav.individual}
              <ChevronDownIcon size={12} />
            </button>
            <div className={`nav-mega ${openDropdown === 'personal' ? 'open' : ''}`}>
              <div className="mega-items" style={{ gridColumn: '1/-1' }}>
                {personalItems.map((item) => (
                  <a
                    key={item.title}
                    href={item.href}
                    className="mega-item"
                    onClick={onNavAnchorClick}
                  >
                    <div className="mega-item-icon">{item.icon}</div>
                    <div>
                      <div className="mega-item-title">{item.title}</div>
                      <div className="mega-item-sub">{item.sub}</div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </div>

          <a
            href={`#${SECTIONS.spei}`}
            className="nav-simple-empresa"
            onClick={onNavAnchorClick}
          >
            {nav.company}
          </a>

          {/* About dropdown */}
          <div className="nav-pill" style={{ position: 'relative' }}>
            <button
              type="button"
              className={`nav-pill-btn ${openDropdown === 'about' ? 'active' : ''}`}
              onClick={() => toggleDropdown('about')}
              aria-expanded={openDropdown === 'about'}
              style={{ background: 'transparent', borderColor: 'transparent' }}
            >
              {nav.about}
              <ChevronDownIcon size={12} />
            </button>
            <div className={`nav-about-drop ${openDropdown === 'about' ? 'open' : ''}`}>
              <button type="button" className="about-item" onClick={openTerms}>
                {nav.about_items.terms}
              </button>
              {aboutItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="about-item"
                  onClick={onNavAnchorClick}
                >
                  {item.label}
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="nav-right">
          <div className="lang-pill">
            <button
              type="button"
              className="btn-lang"
              onClick={() => toggleDropdown('lang')}
              aria-expanded={openDropdown === 'lang'}
              aria-label={nav.language}
            >
              🌐 {LOCALE_LABELS[locale]}
              <ChevronDownIcon size={12} />
            </button>
            <div className={`lang-drop ${openDropdown === 'lang' ? 'open' : ''}`}>
              {LOCALES.map((code) => (
                <button
                  key={code}
                  type="button"
                  className={`about-item ${code === locale ? 'active' : ''}`}
                  onClick={() => pickLocale(code)}
                >
                  {LOCALE_LABELS[code]}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          type="button"
          className="hamburger"
          onClick={() => setMobileOpen((open) => !open)}
          aria-label={nav.openMenu}
          aria-expanded={mobileOpen}
        >
          <span />
          <span />
          <span />
        </button>
      </nav>

      {/* Mobile nav */}
      <div className={`mobile-nav ${mobileOpen ? 'open' : ''}`}>
        {personalItems.map((item) => (
          <a key={item.title} href={item.href} className="mnav-item" onClick={onNavAnchorClick}>
            {item.title}
          </a>
        ))}
        <div className="mnav-div" />
        <button type="button" className="mnav-item" onClick={openTerms}>
          {nav.about_items.terms}
        </button>
        {aboutItems.map((item) => (
          <a key={item.label} href={item.href} className="mnav-item" onClick={onNavAnchorClick}>
            {item.label}
          </a>
        ))}
        <div className="mnav-div" />
        {/* The desktop language pill is hidden below 900px, so repeat it here. */}
        <div className="mnav-langs" role="group" aria-label={nav.language}>
          {LOCALES.map((code) => (
            <button
              key={code}
              type="button"
              className={`mnav-lang ${code === locale ? 'active' : ''}`}
              onClick={() => pickLocale(code)}
            >
              🌐 {LOCALE_LABELS[code]}
            </button>
          ))}
        </div>
        <div className="mnav-cta">
          <StartNowButton
            label={messages.cta.openAccount}
            style={{ width: '100%', justifyContent: 'center' }}
          />
        </div>
      </div>

      <TermsViewerModal open={termsOpen} onClose={() => setTermsOpen(false)} />
    </>
  );
};
