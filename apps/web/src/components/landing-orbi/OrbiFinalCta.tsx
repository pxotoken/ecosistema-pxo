import React from 'react';
import { StartNowButton } from './StartNowButton';
import { useMessages } from '../../i18n';

export const OrbiFinalCta: React.FC = () => {
  const { finalCta } = useMessages();

  return (
    <section className="cta-section">
      <div className="cta-card">
        <div className="cta-card-glow" />
        <div className="cta-visual">
          <div className="cta-clouds" />
        </div>
        <div className="cta-content">
          <h2>{finalCta.title}</h2>
          <p>{finalCta.sub}</p>
          <StartNowButton variant="hero" />
        </div>
      </div>
    </section>
  );
};
