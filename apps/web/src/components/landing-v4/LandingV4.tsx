import React, { useCallback, useEffect, useRef, useState } from 'react';
import '../../styles/landing-v4.css';
import { useLocale, useMessages } from '../../i18n';
import { TermsViewerModal } from '../legal/TermsViewerModal';
import { AccountCta } from './AccountCta';
import { Coin } from './Coin';
import { Wordmark } from './Wordmark';
import { AccountScreen, Phone } from './PhoneScreens';
import { ProductsCarousel } from './ProductsCarousel';
import {
  useAnchorScroll,
  useHeroParallax,
  useReducedMotion,
  useReveal,
  useScrolled,
  useStepsReveal,
  useWaves,
  type WaveOpts,
} from './hooks';

/* Wave presets, verbatim from the design. Module-level so the effect's
   dependency array stays stable across renders. */
const HERO_WAVES: WaveOpts = {
  base: 0.78,
  amp: 34,
  lines: [['#00bed6', '#2f48c1', 2.5, 0.9], ['#007481', '#00bed6', 1.5, 0.45], ['#2f48c1', '#00bed6', 1, 0.3]],
};
const PARITY_WAVES: WaveOpts = {
  base: 0.62,
  amp: 46,
  lines: [['#00bed6', '#ffffff', 2.5, 0.8], ['#ffffff', '#00bed6', 1.5, 0.4], ['#00bed6', '#ffffff', 1, 0.3]],
};
const CTA_WAVES: WaveOpts = {
  base: 0.9,
  amp: 26,
  lines: [['#00bed6', '#2f48c1', 2.5, 0.9], ['#2f48c1', '#00bed6', 1.5, 0.5], ['#00bed6', '#ffffff', 1, 0.35]],
};

const SECTIONS = { products: 'productos', how: 'como', benefits: 'beneficios', trust: 'transparencia' };

/** The floating coins behind the hero phone, with the design's depths. */
const COINS: { cls: string; depth: number }[] = [
  { cls: 'k1', depth: -26 },
  { cls: 'k2', depth: 22 },
  { cls: 'k3', depth: 30 },
  { cls: 'k4', depth: -18 },
  { cls: 'k5', depth: 12 },
];

const fmtMxn = (n: number) => n.toLocaleString('es-MX', { maximumFractionDigits: 2 });

/** 1:1 converter. PXO tracks MXN exactly, so the "rate" is identity by design. */
const ParityConverter: React.FC = () => {
  const { landingV4: t } = useMessages();
  const reduced = useReducedMotion();
  const [raw, setRaw] = useState('5,000');
  const [shown, setShown] = useState(5000);
  const frame = useRef(0);

  const onChange = (value: string) => {
    setRaw(value);
    const target = Math.min(parseFloat(value.replace(/[^0-9.]/g, '')) || 0, 1e12);
    cancelAnimationFrame(frame.current);
    if (reduced) {
      setShown(target);
      return;
    }
    const from = shown;
    const t0 = performance.now();
    const step = (now: number) => {
      const k = Math.min((now - t0) / 350, 1);
      setShown(from + (target - from) * (1 - Math.pow(1 - k, 3)));
      if (k < 1) frame.current = requestAnimationFrame(step);
      else setShown(target);
    };
    frame.current = requestAnimationFrame(step);
  };

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  return (
    <div className="conv rv">
      <label htmlFor="mxn">
        <small>{t.parity.convIn}</small>
        <input
          id="mxn"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={raw}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => setRaw(fmtMxn(parseFloat(raw.replace(/[^0-9.]/g, '')) || 0))}
        />
      </label>
      <span className="eq" aria-hidden="true">→</span>
      <label className="out" htmlFor="mxn">
        <small>{t.parity.convOut}</small>
        <output>{fmtMxn(Math.round(shown * 100) / 100)}</output>
      </label>
    </div>
  );
};

export const LandingV4: React.FC = () => {
  const { landingV4: t } = useMessages();
  const { locale, setLocale } = useLocale();
  const reduced = useReducedMotion();
  const scrolled = useScrolled();
  const onAnchor = useAnchorScroll();
  const [termsOpen, setTermsOpen] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const phoneRef = useRef<HTMLDivElement>(null);
  const stepsRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const heroCanvas = useRef<HTMLCanvasElement>(null);
  const parityCanvas = useRef<HTMLCanvasElement>(null);
  const ctaCanvas = useRef<HTMLCanvasElement>(null);

  useWaves(heroCanvas, HERO_WAVES, reduced);
  useWaves(parityCanvas, PARITY_WAVES, reduced);
  useWaves(ctaCanvas, CTA_WAVES, reduced);
  useHeroParallax(stageRef, phoneRef, reduced);
  useReveal(rootRef, reduced);
  useStepsReveal(stepsRef, pathRef, reduced);

  const openTerms = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setTermsOpen(true);
  }, []);

  const navLinks = [
    { href: `#${SECTIONS.products}`, label: t.nav.products },
    { href: `#${SECTIONS.how}`, label: t.nav.how },
    { href: `#${SECTIONS.benefits}`, label: t.nav.benefits },
    { href: `#${SECTIONS.trust}`, label: t.nav.trust },
  ];

  return (
    <div className="pxo-landing-v4" ref={rootRef}>
      <header className={`nav${scrolled ? ' scrolled' : ''}`}>
        <div className="wrap">
          <a className="logo" href="#top" aria-label="PXO Token" onClick={onAnchor}>
            <Wordmark />
          </a>
          <nav className="links" aria-label={t.nav.products}>
            {navLinks.map((l) => (
              <a key={l.href} href={l.href} onClick={onAnchor}>
                {l.label}
              </a>
            ))}
          </nav>
          {/* The design replaced the old locale dropdown with two buttons; they
              drive the app-wide LocaleContext, not a landing-local flag. */}
          <div className="lang" role="group" aria-label="Idioma">
            <button type="button" aria-pressed={locale === 'es'} onClick={() => setLocale('es')}>
              ES
            </button>
            <button type="button" aria-pressed={locale === 'en'} onClick={() => setLocale('en')}>
              EN
            </button>
          </div>
          <AccountCta label={t.openAccount} withArrow={false} />
        </div>
      </header>

      <main id="top">
        <section className="hero">
          <canvas ref={heroCanvas} aria-hidden="true" />
          <div className="wrap">
            <span className="eyebrow pill">
              <span className="dot" />
              <span>{t.hero.eyebrow}</span>
            </span>
            <h1>
              <span className="line">{t.hero.line1}</span>
              <span className="line grad-text">{t.hero.line2}</span>
            </h1>
            <p className="lead">{t.hero.lead}</p>
            <div className="ctas">
              <AccountCta label={t.hero.cta} />
              <a className="btn ghost" href={`#${SECTIONS.products}`} onClick={onAnchor}>
                {t.hero.cta2}
              </a>
            </div>
            <div className="stage" ref={stageRef}>
              <div className="hp" ref={phoneRef} aria-hidden="true">
                <Phone>
                  <AccountScreen />
                </Phone>
              </div>
              {COINS.map((c) => (
                <span key={c.cls} className={`coin ${c.cls}`} data-depth={c.depth}>
                  <Coin id={c.cls} />
                </span>
              ))}
              <div className="chip c1" data-depth="18">
                <i>=</i>
                <div>
                  <span>1 PXO = 1 MXN</span>
                  <small>{t.chips.always}</small>
                </div>
              </div>
              <div className="chip c2" data-depth="-14">
                <i>↗</i>
                <div>
                  <span>{t.chips.send}</span>
                </div>
              </div>
              <div className="chip c3" data-depth="-20">
                <i>⇄</i>
                <div>
                  <span>USDT · USDC</span>
                  <small>{t.chips.swap}</small>
                </div>
              </div>
              <div className="chip c4" data-depth="14">
                <i>24</i>
                <div>
                  <span>24/7</span>
                  <small>{t.chips.hours}</small>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="marquee" aria-hidden="true">
          <div className="track">
            {/* Four copies so the -50% keyframe always has track to spare. */}
            {[0, 1, 2, 3].map((copy) => (
              <React.Fragment key={copy}>
                <span>{t.marquee.buy}</span>
                <span>{t.marquee.send}</span>
                <span>{t.marquee.swap}</span>
                <span>
                  <b>{t.marquee.parity}</b>
                </span>
                <span>{t.marquee.always}</span>
                <span>{t.marquee.borderless}</span>
                <span>{t.marquee.tokens}</span>
              </React.Fragment>
            ))}
          </div>
        </div>

        <section id={SECTIONS.products}>
          <div className="wrap">
            <div className="center rv">
              <p className="eyebrow">{t.products.eyebrow}</p>
              <h2 className="sec-h" style={{ marginTop: 14 }}>
                {t.products.heading}
              </h2>
            </div>
            <ProductsCarousel />
          </div>
        </section>

        <section id={SECTIONS.how} style={{ paddingTop: 20 }}>
          <div className="wrap">
            <div className="center rv">
              <p className="eyebrow">{t.how.eyebrow}</p>
              <h2 className="sec-h" style={{ marginTop: 14 }}>
                {t.how.heading}
              </h2>
            </div>
            <div className="steps" ref={stepsRef}>
              <svg className="path" viewBox="0 0 600 40" preserveAspectRatio="none" aria-hidden="true">
                <defs>
                  <linearGradient id="v4-pg" x1="0" x2="1">
                    <stop offset="0" stopColor="#00bed6" />
                    <stop offset="1" stopColor="#2f48c1" />
                  </linearGradient>
                </defs>
                <path
                  ref={pathRef}
                  d="M0 20 C 100 -10, 200 50, 300 20 S 500 -10, 600 20"
                  fill="none"
                  stroke="url(#v4-pg)"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
              {([
                ['1', t.how.s1, t.how.s1p],
                ['2', t.how.s2, t.how.s2p],
                ['3', t.how.s3, t.how.s3p],
              ] as const).map(([n, title, text]) => (
                <div className="step rv" key={n}>
                  <div className="n">{n}</div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="parity">
          <canvas ref={parityCanvas} aria-hidden="true" />
          <div className="wrap">
            <p className="eyebrow">{t.parity.eyebrow}</p>
            <h2 className="rv">1 PXO = {t.parity.unit}</h2>
            <p className="rv">{t.parity.text}</p>
            <ParityConverter />
          </div>
        </section>

        <section id={SECTIONS.benefits}>
          <div className="wrap">
            <div className="center rv">
              <p className="eyebrow">{t.benefits.eyebrow}</p>
              <h2 className="sec-h" style={{ marginTop: 14 }}>
                {t.benefits.heading}
              </h2>
              <p className="sec-p">{t.benefits.text}</p>
            </div>
            <div className="flow rv">
              {([
                [
                  t.benefits.s1,
                  <>
                    <rect x="3" y="6" width="18" height="13" rx="2" />
                    <path d="M16 12.5h2M3 9h15" />
                  </>,
                ],
                [
                  t.benefits.s2,
                  <>
                    <path d="M22 2 11 13" />
                    <path d="M22 2 15 22l-4-9-9-4z" />
                  </>,
                ],
                [t.benefits.s3, <path d="M7 4v16M7 4 3 8M7 4l4 4M17 20V4M17 20l-4-4M17 20l4-4" />],
                [
                  t.benefits.s4,
                  <>
                    <rect x="3" y="9" width="18" height="12" rx="2" />
                    <path d="M12 9v12M3 13h18M12 9C10 5 6 5 6.5 7.5S12 9 12 9zM12 9c2-4 6-4 5.5-1.5S12 9 12 9z" />
                  </>,
                ],
              ] as [string, React.ReactNode][]).map(([label, icon], i, arr) => (
                <React.Fragment key={label}>
                  <div className="fl">
                    <span className="ic">
                      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        {icon}
                      </svg>
                    </span>
                    <b>{label}</b>
                  </div>
                  {i < arr.length - 1 && <span className="arrow" />}
                </React.Fragment>
              ))}
            </div>
          </div>
        </section>

        <section className="trust" id={SECTIONS.trust} style={{ paddingTop: 20 }}>
          <div className="wrap center">
            <div className="stats">
              <div className="stat rv">
                <b className="grad-text">1:1</b>
                <span>{t.trust.backing}</span>
              </div>
              <div className="stat rv">
                <b className="grad-text">24/7</b>
                <span>{t.trust.hours}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="cta">
          <div className="wrap">
            <div className="box rv zoom">
              <canvas ref={ctaCanvas} aria-hidden="true" />
              <p className="eyebrow">{t.cta.eyebrow}</p>
              <h2>{t.cta.heading}</h2>
              <p>{t.cta.text}</p>
              <AccountCta variant="light" label={t.hero.cta} />
            </div>
          </div>
        </section>
      </main>

      <footer>
        <div className="wrap">
          <div className="fgrid">
            <div>
              <h4>{t.footer.menu}</h4>
              <ul>
                {navLinks.map((l) => (
                  <li key={l.href}>
                    <a href={l.href} onClick={onAnchor}>
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4>{t.footer.legal}</h4>
              <ul>
                {/* Both open the in-app legal viewer; the design had them as
                    placeholder anchors back to #top. */}
                <li>
                  <a href="#top" onClick={openTerms}>
                    {t.footer.privacy}
                  </a>
                </li>
                <li>
                  <a href="#top" onClick={openTerms}>
                    {t.footer.terms}
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="legal">
            <p>{t.footer.disclaimer}</p>
            <div className="row">
              <span>© 2026 PXO. {t.footer.rights}</span>
              <span>pxotoken.com</span>
            </div>
          </div>
        </div>
      </footer>

      <TermsViewerModal open={termsOpen} onClose={() => setTermsOpen(false)} />
    </div>
  );
};
