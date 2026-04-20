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

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="h-24"></div> {/* Relleno para el header fijo */}
      <HeroSection />
      <WhatIsPXOSection />
      <StablecoinNetworkVisualization />
      <HowItWorksSection />
      <BenefitsSection />
      <TrustSection />
      <CTASection />
      <ContactFormSection />
      <Footer />
    </div>
  );
};

export default LandingPage;
