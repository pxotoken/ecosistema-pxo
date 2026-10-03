import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useMessages } from '../../i18n';
import { useReducedMotion } from './hooks';
import { AccountScreen, PayLinkScreen, SendScreen, SwapScreen, Phone } from './PhoneScreens';

/** Autoplay dwell per slide, and the duration the dot's progress fill runs for. */
const DUR = 4500;

const ICON: Record<string, React.ReactNode> = {
  buy: <path d="M12 3v18M17 7.5c0-1.9-2.2-3-5-3s-5 1.1-5 3 2 2.8 5 3.5 5 1.6 5 3.5-2.2 3-5 3-5-1.1-5-3" />,
  transfer: (
    <>
      <path d="M22 2 11 13" />
      <path d="M22 2 15 22l-4-9-9-4z" />
    </>
  ),
  exchange: <path d="M7 4v16M7 4 3 8M7 4l4 4M17 20V4M17 20l-4-4M17 20l4-4" />,
  payLink: (
    <>
      <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" />
      <path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
    </>
  ),
};

const SCREEN: Record<string, React.FC> = {
  buy: AccountScreen,
  transfer: SendScreen,
  exchange: SwapScreen,
  payLink: PayLinkScreen,
};

/** Slide order and which one is still unreleased, per the design. */
const ORDER = ['buy', 'transfer', 'exchange', 'payLink'] as const;
const SOON = new Set<string>(['payLink']);

export const ProductsCarousel: React.FC = () => {
  const { landingV4: t } = useMessages();
  const reduced = useReducedMotion();
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [narrow, setNarrow] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 640
  );
  const dragX = useRef<number | null>(null);

  useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth < 640);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const go = useCallback((i: number) => setCurrent((i + ORDER.length) % ORDER.length), []);

  // Autoplay. Re-armed by `current` changing, so a manual move resets the dwell.
  useEffect(() => {
    if (reduced || paused) return;
    const id = setTimeout(() => go(current + 1), DUR);
    return () => clearTimeout(id);
  }, [current, paused, reduced, go]);

  const gap = narrow ? 200 : 330;

  return (
    <div
      className={`car rv${paused ? ' paused' : ''}`}
      aria-roledescription="carrusel"
      onPointerEnter={(e) => e.pointerType === 'mouse' && setPaused(true)}
      onPointerLeave={(e) => e.pointerType === 'mouse' && setPaused(false)}
      onPointerDown={(e) => {
        dragX.current = e.clientX;
      }}
      onPointerUp={(e) => {
        if (dragX.current === null) return;
        const dx = e.clientX - dragX.current;
        dragX.current = null;
        if (Math.abs(dx) > 50) go(current + (dx < 0 ? 1 : -1));
      }}
    >
      <div className="car-stage">
        {ORDER.map((id, i) => {
          // Shortest signed distance from the active slide, so the ring wraps.
          let o = (i - current + ORDER.length) % ORDER.length;
          if (o > ORDER.length / 2) o -= ORDER.length;
          const a = Math.abs(o);
          const active = a === 0;
          const Screen = SCREEN[id];
          const copy = t.products[id];
          return (
            <article
              key={id}
              className={`slide${active ? ' on' : ''}`}
              onClick={() => !active && go(i)}
              style={{
                transform: `translateX(${o * gap}px) scale(${1 - a * 0.2}) rotateY(${o * -8}deg)`,
                opacity: a > 1 ? 0 : a ? 0.55 : 1,
                zIndex: 10 - a,
                pointerEvents: a > 1 ? 'none' : undefined,
              }}
            >
              {/* Keyed by `current` so the staggered screen animation replays. */}
              <Phone
                key={active && !reduced ? `on-${current}` : 'off'}
                screenClassName={active && !reduced ? 'swap-in' : ''}
              >
                <Screen />
              </Phone>
              <div className="cap">
                <h3>
                  <i>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      {ICON[id]}
                    </svg>
                  </i>
                  {copy.title}
                  {SOON.has(id) && <span className="soon">{t.products.soon}</span>}
                </h3>
                <p>{copy.text}</p>
              </div>
            </article>
          );
        })}
      </div>

      <div className="car-nav">
        <button type="button" className="arr" onClick={() => go(current - 1)} aria-label="Anterior">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M11 6l-6 6 6 6" />
          </svg>
        </button>
        {/* Keyed by `current` so the active dot's progress fill restarts. */}
        <div className="dots" key={current}>
          {ORDER.map((id, i) => (
            <button
              key={id}
              type="button"
              aria-label={t.products[id].title}
              aria-current={i === current ? 'true' : 'false'}
              style={{ ['--dur' as string]: `${DUR}ms` }}
              onClick={() => go(i)}
            />
          ))}
        </div>
        <button type="button" className="arr" onClick={() => go(current + 1)} aria-label="Siguiente">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </button>
      </div>
    </div>
  );
};
