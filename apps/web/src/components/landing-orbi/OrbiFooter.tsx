import React, { useState } from 'react';
import { TermsViewerModal } from '../legal/TermsViewerModal';
import { SECTIONS, handleAnchorClick } from './scroll';
import { useMessages } from '../../i18n';

const SOCIAL = [
  { label: '𝕏', title: 'X / Twitter' },
  { label: 'in', title: 'LinkedIn' },
  { label: '✈', title: 'Telegram' },
];

export const OrbiFooter: React.FC = () => {
  const { footer, nav } = useMessages();
  const [termsOpen, setTermsOpen] = useState(false);

  const personalLinks = [
    { label: footer.links.home, href: `#${SECTIONS.hero}` },
    { label: footer.links.buySell, href: `#${SECTIONS.useCases}` },
    { label: footer.links.account, href: `#${SECTIONS.why}` },
    { label: footer.links.spei, href: `#${SECTIONS.spei}` },
    { label: footer.links.dollars, href: `#${SECTIONS.useCases}` },
  ];

  // No dedicated pages exist yet — these keep the design's placeholders.
  const aboutLinks = [
    { label: nav.about_items.privacy, href: '#' },
    { label: nav.about_items.blog, href: '#' },
    { label: nav.about_items.help, href: `#${SECTIONS.faq}` },
  ];

  // The legal paragraph names the company inline; split so it can stay bold.
  const [legalBefore, legalAfter] = footer.legal.split(footer.legalCompany);

  return (
    <footer className="orbi-footer">
      <div className="footer-inner">
        <div className="footer-top">
          <div>
            <div className="footer-logo">
              <span className="footer-logo-name">PXO Token</span>
              <span className="footer-logo-sub">{footer.logoSub}</span>
            </div>
            <p className="footer-tagline">{footer.tagline}</p>
            <div className="footer-social">
              {SOCIAL.map((item) => (
                <a
                  key={item.title}
                  href="#"
                  title={item.title}
                  onClick={(e) => e.preventDefault()}
                >
                  {item.label}
                </a>
              ))}
            </div>
          </div>

          <div>
            <div className="footer-col-head">{footer.colIndividual}</div>
            <ul className="footer-col-links">
              {personalLinks.map((link) => (
                <li key={link.label}>
                  <a href={link.href} onClick={handleAnchorClick}>
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="footer-col-head">{footer.colAbout}</div>
            <ul className="footer-col-links">
              <li>
                <button type="button" onClick={() => setTermsOpen(true)}>
                  {nav.about_items.terms}
                </button>
              </li>
              {aboutLinks.map((link) => (
                <li key={link.label}>
                  <a href={link.href} onClick={handleAnchorClick}>
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="footer-divider" />
        <p className="footer-legal">
          {legalBefore}
          <strong>{footer.legalCompany}</strong>
          {legalAfter}
        </p>

        <TermsViewerModal open={termsOpen} onClose={() => setTermsOpen(false)} />
      </div>
    </footer>
  );
};
