// src/features/landing/LandingPage.jsx
import React, { useEffect } from 'react';
import { useLandingMotion } from './hooks/useLandingMotion';
import LandingHeader from './components/LandingHeader';
import LandingHero from './components/LandingHero';
import ProductProofStrip from './components/ProductProofStrip';
import HowItWorksSection from './components/HowItWorksSection';
import FinancialControlSection from './components/FinancialControlSection';
import SharedPurchaseSection from './components/SharedPurchaseSection';
import InvoiceTimelineSection from './components/InvoiceTimelineSection';
import FeatureGridSection from './components/FeatureGridSection';
import PricingPlansSection from './components/PricingPlansSection';
import FinalCtaSection from './components/FinalCtaSection';
import LandingFooter from './components/LandingFooter';

/**
 * FinControl Official Landing Page
 * Promoted from approved Visual Lab with Obsidian + Champagne Gold identity,
 * 5-plane depth system, Living Ledger protagonist, and factual product proof.
 */
export default function LandingPage() {
  const { prefersReducedMotion, containerRef } = useLandingMotion();

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-[#0D0E11] text-[#F9FAFB] antialiased selection:bg-[#E5B842]/30 selection:text-[#F5D580] overflow-x-hidden font-sans"
    >
      {/* Top Header */}
      <LandingHeader />

      {/* Main Content Sections */}
      <main>
        {/* 1. Hero Experience (Full Scene with Living Ledger & Ambient Aura) */}
        <LandingHero prefersReducedMotion={prefersReducedMotion} />

        {/* 2. Product Proof Strip */}
        <ProductProofStrip />

        {/* 3. How It Works (3 Clear Steps) */}
        <HowItWorksSection />

        {/* 4. Financial Control Experience (Invoices, Installments, Subscriptions Tabs) */}
        <FinancialControlSection />

        {/* 5. Shared Purchase Experience (Mathematical Split Engine) */}
        <SharedPurchaseSection />

        {/* 6. Invoice Timeline & Residual Cent Domain Rule */}
        <InvoiceTimelineSection />

        {/* 7. Product Feature Grid (Living Cards with Dynamic Lighting) */}
        <FeatureGridSection />

        {/* 8. Pricing & Transparent Plans (Canonical Free + Pro Lifetime) */}
        <PricingPlansSection />

        {/* 9. Final High-Impact CTA */}
        <FinalCtaSection />
      </main>

      {/* 10. Footer */}
      <LandingFooter />
    </div>
  );
}