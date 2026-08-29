import React from 'react';
import '../styles/landing-orbi.css';
import {
  OrbiNav,
  OrbiHero,
  OrbiStatStrip,
  OrbiUseCases,
  OrbiHowItWorks,
  OrbiWhy,
  OrbiSpei,
  OrbiFaq,
  OrbiFinalCta,
  OrbiFooter,
} from './landing-orbi';

/**
 * Public landing page (Orbi design — see docs/looks/pxo-landing-orbi.html).
 * Every style lives under the `.orbi-landing` scope in styles/landing-orbi.css.
 */
export const LandingPage: React.FC = () => {
  return (
    <div className="orbi-landing">
      <OrbiNav />
      <OrbiHero />
      <OrbiStatStrip />
      <OrbiUseCases />
      <OrbiHowItWorks />
      <OrbiWhy />
      <OrbiSpei />
      <OrbiFaq />
      <OrbiFinalCta />
      <OrbiFooter />
    </div>
  );
};
