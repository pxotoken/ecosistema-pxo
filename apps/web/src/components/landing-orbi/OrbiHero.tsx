import React from 'react';
import { StartNowButton } from './StartNowButton';
import { SECTIONS } from './scroll';
import { useMessages } from '../../i18n';

export const OrbiHero: React.FC = () => {
  const { hero } = useMessages();

  return (
    <section className="hero" id={SECTIONS.hero}>
      <div className="hero-inner">
        <div>
          <h1 className="hero-title">
            {hero.titleLead} <span className="hero-title-accent">{hero.titleAccent}</span>
          </h1>
          <p className="hero-sub">{hero.sub}</p>
          <StartNowButton variant="hero" />
          <div className="hero-trust-strip">
            <span>{hero.trust.backed}</span>
            <span className="trust-sep">|</span>
            <span>{hero.trust.audits}</span>
            <span className="trust-sep">|</span>
            <span>{hero.trust.always}</span>
          </div>
        </div>
      </div>
    </section>
  );
};
