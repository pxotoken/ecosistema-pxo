import React from 'react';
import { Header } from './landing/Header';
import { HeroSection } from './landing/HeroSection';
import { WhatIsPXOSection } from './landing/WhatIsPXOSection';
import { StablecoinNetworkVisualization } from './landing/StablecoinNetworkVisualization';
import { HowItWorksSection } from './landing/HowItWorksSection';
import { BenefitsSection } from './landing/BenefitsSection';
import { TrustSection } from './landing/TrustSection';
import { CTASection } from './landing/CTASection';
import { ContactFormSection } from './landing/ContactFormSection';
import { Footer } from './landing/Footer';
import { PinnedFadeSection } from './landing/PinnedFadeSection';

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="h-24"></div>
      <PinnedFadeSection>
        <HeroSection />
      </PinnedFadeSection>
      <PinnedFadeSection>
        <WhatIsPXOSection />
      </PinnedFadeSection>
      <PinnedFadeSection>
        <StablecoinNetworkVisualization />
      </PinnedFadeSection>
      <PinnedFadeSection>
        <HowItWorksSection />
      </PinnedFadeSection>
      <PinnedFadeSection>
        <BenefitsSection />
      </PinnedFadeSection>
      <PinnedFadeSection>
        <TrustSection />
      </PinnedFadeSection>
      <PinnedFadeSection>
        <CTASection />
      </PinnedFadeSection>
      <ContactFormSection />
      <Footer />
    </div>
  );
};
