import React from 'react';
import { LandingV4 } from './landing-v4';

/**
 * Public landing page (October 2026 design — see
 * docs/looks/landing_last_version.html). Every style lives under the
 * `.pxo-landing-v4` scope in styles/landing-v4.css.
 *
 * The previous "Orbi" landing is still in components/landing-orbi with its own
 * stylesheet; nothing imports it now, but it is kept so the earlier look can be
 * restored without reconstructing it.
 */
export const LandingPage: React.FC = () => <LandingV4 />;
