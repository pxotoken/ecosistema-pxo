import React, { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';

interface PinnedFadeSectionProps {
  children: React.ReactNode;
  /** Vertical scroll runway as a viewport-height multiplier. Higher = longer pin. */
  scrollMultiplier?: number;
  /** Bypass the effect entirely (renders children unchanged). */
  disabled?: boolean;
}

export const PinnedFadeSection: React.FC<PinnedFadeSectionProps> = ({
  children,
  scrollMultiplier = 1.4,
  disabled = false,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end end'],
  });

  // Visible from entry, fade only on exit. Avoids a blank gap between sections.
  const opacity = useTransform(scrollYProgress, [0, 0.7, 1], [1, 1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.7, 1], [1, 1, 0.98]);

  if (disabled || prefersReducedMotion || isMobile) {
    return <>{children}</>;
  }

  return (
    <div
      ref={ref}
      style={{ minHeight: `${scrollMultiplier * 100}vh` }}
      className="relative"
    >
      <div className="sticky top-0 min-h-screen w-full">
        <motion.div style={{ opacity, scale }} className="w-full min-h-screen">
          {children}
        </motion.div>
      </div>
    </div>
  );
};
