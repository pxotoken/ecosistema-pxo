import { useEffect, useRef, useState } from 'react';

/**
 * Animation helpers for the October 2026 landing, ported from the inline script
 * in docs/looks/landing_last_version.html. Every one of them honours
 * prefers-reduced-motion the way the design did: draw the end state once and
 * skip the loop, rather than animating anyway.
 */

export const useReducedMotion = (): boolean => {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
};

export interface WaveOpts {
  base: number;
  amp: number;
  /** [from, to, lineWidth, alpha] per stroked line. */
  lines: [string, string, number, number][];
}

/** Animated brand waves on a <canvas>, paused while off-screen. */
export const useWaves = (
  ref: React.RefObject<HTMLCanvasElement>,
  opts: WaveOpts,
  reduced: boolean
): void => {
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let t = 0;
    let frame = 0;
    let visible = true;

    const size = () => {
      const r = canvas.getBoundingClientRect();
      const d = Math.min(window.devicePixelRatio || 1, 2);
      w = r.width;
      h = r.height;
      canvas.width = w * d;
      canvas.height = h * d;
      ctx.setTransform(d, 0, 0, d, 0, 0);
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      opts.lines.forEach((ln, k) => {
        const g = ctx.createLinearGradient(0, 0, w, 0);
        g.addColorStop(0, ln[0]);
        g.addColorStop(1, ln[1]);
        ctx.strokeStyle = g;
        ctx.lineWidth = ln[2];
        ctx.globalAlpha = ln[3];
        ctx.beginPath();
        for (let x = 0; x <= w; x += 6) {
          const y =
            h * opts.base +
            Math.sin(x / (180 + k * 40) + t * (0.6 + k * 0.15) + k) * (opts.amp + k * 8) +
            Math.sin(x / 70 + t * 1.3 + k * 2) * 6;
          if (x) ctx.lineTo(x, y);
          else ctx.moveTo(x, y);
        }
        ctx.stroke();
      });
      ctx.globalAlpha = 1;
    };

    const io = new IntersectionObserver((es) => {
      visible = es[0].isIntersecting;
    });
    io.observe(canvas);

    const onResize = () => {
      size();
      draw();
    };
    window.addEventListener('resize', onResize);

    size();
    if (reduced) {
      draw();
    } else {
      const loop = () => {
        if (visible) {
          t += 0.012;
          draw();
        }
        frame = requestAnimationFrame(loop);
      };
      frame = requestAnimationFrame(loop);
    }

    return () => {
      cancelAnimationFrame(frame);
      io.disconnect();
      window.removeEventListener('resize', onResize);
    };
    // `opts` is a module-level constant at every call site.
  }, [ref, opts, reduced]);
};

/**
 * Pointer parallax for the hero. Reads `data-depth` off each chip/coin, exactly
 * as the design did, so the markup stays the source of truth for the depths.
 */
export const useHeroParallax = (
  stageRef: React.RefObject<HTMLDivElement>,
  phoneRef: React.RefObject<HTMLDivElement>,
  reduced: boolean
): void => {
  useEffect(() => {
    if (reduced) return;
    const stage = stageRef.current;
    const phone = phoneRef.current;
    const host = stage?.parentElement;
    if (!stage || !phone || !host) return;

    const layers = Array.from(stage.querySelectorAll<HTMLElement>('.chip,.coin'));
    const onMove = (e: PointerEvent) => {
      const r = stage.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      phone.style.transform = `translate(calc(-50% + ${x * -16}px), calc(-50% + ${y * -12}px))`;
      layers.forEach((c) => {
        const d = Number(c.dataset.depth);
        c.style.transform = `translate(${x * d}px, ${y * d}px)`;
      });
    };

    host.addEventListener('pointermove', onMove);
    return () => host.removeEventListener('pointermove', onMove);
  }, [stageRef, phoneRef, reduced]);
};

/**
 * Scroll reveal for `.rv` elements. Visible by default — the design only hides
 * what starts below the fold, so the page is never blank if the observer or the
 * effect never runs.
 */
export const useReveal = (rootRef: React.RefObject<HTMLElement>, reduced: boolean): void => {
  useEffect(() => {
    const root = rootRef.current;
    if (!root || reduced || !('IntersectionObserver' in window)) return;

    const els = Array.from(root.querySelectorAll<HTMLElement>('.rv'));
    const vh = window.innerHeight;
    els.forEach((el) => {
      if (el.getBoundingClientRect().top > vh * 0.9) el.classList.add('pre');
    });

    const io = new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          if (!e.isIntersecting) return;
          const el = e.target as HTMLElement;
          const sib = Array.from(el.parentElement?.children ?? []).filter((c) =>
            c.classList.contains('rv')
          );
          el.style.transitionDelay = `${sib.indexOf(el) * 90}ms`;
          el.classList.remove('pre');
          io.unobserve(el);
        }),
      { threshold: 0.15 }
    );
    els.forEach((el) => io.observe(el));

    // Belt and braces: never leave content hidden if something goes wrong.
    const safety = setTimeout(() => els.forEach((el) => el.classList.remove('pre')), 6000);
    return () => {
      io.disconnect();
      clearTimeout(safety);
    };
  }, [rootRef, reduced]);
};

/** Draws the connecting line and lights each step once the block scrolls in. */
export const useStepsReveal = (
  sectionRef: React.RefObject<HTMLDivElement>,
  pathRef: React.RefObject<SVGPathElement>,
  reduced: boolean
): void => {
  useEffect(() => {
    const section = sectionRef.current;
    const path = pathRef.current;
    if (!section || !path) return;

    const steps = Array.from(section.querySelectorAll<HTMLElement>('.step'));
    const len = path.getTotalLength();
    path.style.strokeDasharray = String(len);

    if (reduced) {
      steps.forEach((s) => s.classList.add('on'));
      return;
    }

    path.style.strokeDashoffset = String(len);
    const timers: ReturnType<typeof setTimeout>[] = [];
    const io = new IntersectionObserver(
      (es, o) => {
        if (!es[0].isIntersecting) return;
        o.disconnect();
        path.style.transition = 'stroke-dashoffset 1.8s ease';
        path.style.strokeDashoffset = '0';
        steps.forEach((s, i) =>
          timers.push(setTimeout(() => s.classList.add('on'), 300 + i * 600))
        );
      },
      { threshold: 0.3 }
    );
    io.observe(section);

    return () => {
      io.disconnect();
      timers.forEach(clearTimeout);
    };
  }, [sectionRef, pathRef, reduced]);
};

/** Adds the nav's bottom border once the page is scrolled. */
export const useScrolled = (): boolean => {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return scrolled;
};

/** Smooth-scrolls to an in-page section, for the nav and footer anchors. */
export const useAnchorScroll = () => {
  const ref = useRef<(e: React.MouseEvent<HTMLAnchorElement>) => void>();
  ref.current = (e) => {
    const href = e.currentTarget.getAttribute('href');
    if (!href?.startsWith('#') || href.length < 2) return;
    const el = document.getElementById(href.slice(1));
    if (!el) return;
    e.preventDefault();
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  return (e: React.MouseEvent<HTMLAnchorElement>) => ref.current?.(e);
};
