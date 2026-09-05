// src/features/landing/components/LandingHero.jsx
import React, { useRef, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { FiArrowRight, FiPlay, FiCheck, FiShield } from 'react-icons/fi';
import LivingLedgerStage from './LivingLedgerStage';

export default function LandingHero({ prefersReducedMotion }) {
  const heroRef = useRef(null);
  const deepAtmosphereRef = useRef(null);
  const structuralLinesRef = useRef(null);
  const lightHazeRef = useRef(null);
  const auraRef = useRef(null);
  const badgeRef = useRef(null);
  const headlineRef = useRef(null);
  const supportRef = useRef(null);
  const ctaGroupRef = useRef(null);
  const productContainerRef = useRef(null);

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // 5-Plane Depth Pointer Tracking via gsap.quickTo
  useEffect(() => {
    if (prefersReducedMotion || !heroRef.current) return;

    const hero = heroRef.current;
    let auraQuickX = null;
    let auraQuickY = null;

    if (auraRef.current) {
      auraQuickX = gsap.quickTo(auraRef.current, 'x', { duration: 0.45, ease: 'power2.out' });
      auraQuickY = gsap.quickTo(auraRef.current, 'y', { duration: 0.45, ease: 'power2.out' });
    }

    const handleMouseMove = (e) => {
      const rect = hero.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      const clientY = e.clientY - rect.top;

      // Normalized coordinates from -1 to 1
      const normX = (clientX / rect.width) * 2 - 1;
      const normY = (clientY / rect.height) * 2 - 1;

      setMousePos({ x: normX, y: normY });

      // Cursor aura movement
      if (auraQuickX && auraQuickY) {
        auraQuickX(clientX);
        auraQuickY(clientY);
      }

      // PLANE 1: Deep Atmosphere (1-2px)
      if (deepAtmosphereRef.current) {
        gsap.to(deepAtmosphereRef.current, {
          x: normX * 2,
          y: normY * 2,
          duration: 1.2,
          ease: 'power1.out',
          overwrite: 'auto',
        });
      }

      // PLANE 2: Structural Lines (2-4px)
      if (structuralLinesRef.current) {
        gsap.to(structuralLinesRef.current, {
          x: normX * 3.5,
          y: normY * 3.5,
          duration: 0.9,
          ease: 'power1.out',
          overwrite: 'auto',
        });
      }

      // PLANE 3: Light Haze behind Product (3-5px)
      if (lightHazeRef.current) {
        gsap.to(lightHazeRef.current, {
          x: normX * 4.5,
          y: normY * 4,
          duration: 0.7,
          ease: 'power1.out',
          overwrite: 'auto',
        });
      }
    };

    hero.addEventListener('mousemove', handleMouseMove);
    return () => hero.removeEventListener('mousemove', handleMouseMove);
  }, [prefersReducedMotion]);

  // Hero Entrance Choreography (Fluid Staggered Entrance)
  useEffect(() => {
    if (prefersReducedMotion || !heroRef.current) return;

    const ctx = gsap.context(() => {
      const elements = [
        badgeRef.current,
        headlineRef.current,
        supportRef.current,
        ctaGroupRef.current,
        productContainerRef.current,
      ].filter(Boolean);

      gsap.from(elements, {
        opacity: 0,
        y: 16,
        duration: 0.55,
        stagger: 0.08,
        ease: 'power3.out',
      });
    }, heroRef);

    return () => ctx.revert();
  }, [prefersReducedMotion]);

  return (
    <section
      id="hero"
      ref={heroRef}
      className="relative min-h-[92vh] lg:min-h-screen pt-24 pb-12 md:pt-28 md:pb-16 flex items-center justify-center overflow-hidden bg-gradient-to-b from-[#0D0E11] via-[#0E1015] to-[#0A0B0E]"
    >
      {/* ========================================================================= */}
      {/* 5-PLANE DEPTH SYSTEM                                                      */}
      {/* ========================================================================= */}

      {/* PLANE 1 — DEEP ATMOSPHERE (Giant, Ultra-smooth Radial Gradients) */}
      <div
        ref={deepAtmosphereRef}
        className="absolute inset-0 pointer-events-none -z-40 overflow-hidden"
      >
        {/* Cold neutral graphite haze in upper-left */}
        <div className="absolute -top-32 -left-32 w-[650px] h-[550px] rounded-full bg-gradient-to-br from-slate-600/[0.04] to-transparent blur-[140px]" />
        
        {/* Warm gold ambient presence in bottom center */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1100px] h-[700px] rounded-full bg-gradient-to-b from-[#E5B842]/[0.05] via-transparent to-transparent blur-[160px]" />
      </div>

      {/* PLANE 2 — STRUCTURAL LINES (Subtle Procedural Architectural Vectors) */}
      <svg
        ref={structuralLinesRef}
        className="absolute inset-0 w-full h-full pointer-events-none -z-30 opacity-20"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="plane2Grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#E5B842" stopOpacity="0.25" />
            <stop offset="60%" stopColor="#1A1D24" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#0D0E11" stopOpacity="0" />
          </linearGradient>
          <pattern id="plane2Dots" width="48" height="48" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="#E5B842" fillOpacity="0.12" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#plane2Dots)" />
        <path
          d="M-150 180 C300 80, 700 320, 1200 130 C1500 40, 1800 240, 2200 160"
          stroke="url(#plane2Grad)"
          strokeWidth="1.2"
          fill="none"
        />
        <path
          d="M-150 480 C400 400, 850 560, 1350 410 C1650 320, 1900 500, 2300 440"
          stroke="url(#plane2Grad)"
          strokeWidth="1"
          fill="none"
        />
      </svg>

      {/* PLANE 3 — LIGHT HAZE (Diffuse Light Source Exists Behind the Product) */}
      <div
        ref={lightHazeRef}
        className="absolute top-1/2 right-1/4 -translate-y-1/2 w-[700px] h-[550px] pointer-events-none -z-20 overflow-hidden"
      >
        {/* Core diffuse warm glow */}
        <div className="w-full h-full rounded-full bg-radial from-[#E5B842]/[0.10] via-[#F5D580]/[0.04] to-transparent blur-[100px]" />
      </div>

      {/* CURSOR AURA (Smooth Low-Opacity Gold Aura) */}
      <div
        ref={auraRef}
        className="pointer-events-none absolute -top-[160px] -left-[160px] w-[320px] h-[320px] rounded-full bg-gradient-to-tr from-[#E5B842]/14 to-[#F5D580]/6 blur-3xl -z-10 transition-opacity duration-300 hidden md:block"
        style={{ transform: 'translate3d(50vw, 40vh, 0)' }}
      />

      {/* PLANE 4 — FOREGROUND VIGNETTE (Gentle Edge Shading to Bring Content Forward) */}
      <div className="absolute inset-0 pointer-events-none -z-10 bg-[radial-gradient(ellipse_at_center,transparent_60%,rgba(13,14,17,0.7)_100%)]" />

      {/* ========================================================================= */}
      {/* MAIN CONTENT STAGE                                                        */}
      {/* ========================================================================= */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
          
          {/* Left Column: Typography & Action (Cols 1-6) */}
          <div className="lg:col-span-6 flex flex-col items-center lg:items-start text-center lg:text-left">
            
            {/* Badge */}
            <div
              ref={badgeRef}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#161920] border border-[#E5B842]/25 text-xs font-semibold text-[#F5D580] mb-6 shadow-md shadow-black/60"
            >
              <span className="w-2 h-2 rounded-full bg-[#34D399] animate-ping" />
              <span className="tracking-wide uppercase">Controle Financeiro Inteligente</span>
            </div>

            {/* Headline */}
            <h1
              ref={headlineRef}
              className="text-4xl sm:text-5xl lg:text-[54px] font-extrabold tracking-tight text-[#F9FAFB] leading-[1.12] mb-6"
            >
              Suas faturas sob controle.{' '}
              <span className="bg-gradient-to-r from-[#F5D580] via-[#E5B842] to-[#C99116] bg-clip-text text-transparent block mt-1">
                Suas compras compartilhadas resolvidas.
              </span>
            </h1>

            {/* Supporting Copy (Clean Product Copy) */}
            <p
              ref={supportRef}
              className="text-base sm:text-lg text-[#9CA3AF] max-w-xl mb-8 leading-relaxed"
            >
              Organize faturas, parcelas, assinaturas e compras compartilhadas com precisão em cada centavo. Sem conexão bancária necessária e sem resíduos de arredondamento.
            </p>

            {/* CTA Strip */}
            <div
              ref={ctaGroupRef}
              className="flex flex-col sm:flex-row items-center gap-3.5 w-full sm:w-auto mb-10"
            >
              <Link
                to="/login?mode=register"
                className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-gradient-to-r from-[#E5B842] via-[#F5D580] to-[#E5B842] text-[#0D0E11] font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-lg shadow-[#E5B842]/20 hover:shadow-[#E5B842]/40 hover:scale-[1.02] transition-all duration-300"
              >
                <span>Criar conta gratuita</span>
                <FiArrowRight className="w-4 h-4" />
              </Link>

              <a
                href="#how-it-works"
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-[#161920] hover:bg-[#1E232D] border border-white/10 text-[#F9FAFB] font-medium text-sm sm:text-base flex items-center justify-center gap-2 transition-all duration-300"
              >
                <FiPlay className="w-3.5 h-3.5 text-[#E5B842]" />
                <span>Ver como funciona</span>
              </a>
            </div>

            {/* Micro Product Proof Tags */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 text-xs text-[#9CA3AF]">
              <span className="flex items-center gap-1.5">
                <FiCheck className="text-[#34D399] w-3.5 h-3.5" />
                Precisão em cada centavo
              </span>
              <span className="flex items-center gap-1.5">
                <FiShield className="text-[#E5B842] w-3.5 h-3.5" />
                Sem senhas de banco
              </span>
              <span className="flex items-center gap-1.5">
                <FiCheck className="text-[#34D399] w-3.5 h-3.5" />
                Acesso gratuito disponível
              </span>
            </div>
          </div>

          {/* Right Column: Central Product Visual (Living Ledger is Primary) */}
          <div className="lg:col-span-6 relative flex flex-col items-center mt-6 lg:mt-0">
            <div ref={productContainerRef} className="w-full">
              <LivingLedgerStage
                mousePos={mousePos}
                prefersReducedMotion={prefersReducedMotion}
              />
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
