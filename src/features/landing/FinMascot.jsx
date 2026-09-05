// src/features/landing/FinMascot.jsx
import React from 'react';

/**
 * Fin — Mascote Oficial do Produto FinControl
 *
 * Papel de Marca: BRAND_VISUAL_ASSISTANT
 * Storytelling e guia visual do software financeiro.
 * NÃO é chatbot, NÃO é IA financeira, NÃO é assistente bancário e NÃO tem custo.
 */
export default function FinMascot({
  pointerRef,
  className = '',
  speech = 'Veja sua fatura organizada no FinControl.',
  isLight = false,
}) {
  return (
    <div
      ref={pointerRef}
      className={`relative inline-flex flex-col items-center select-none pointer-events-none ${className}`}
      style={{
        transform: 'translate3d(var(--fin-x, 0px), var(--fin-y, 0px), 0) rotate(var(--fin-rot, 0deg))',
        transition: 'transform 0.2s cubic-bezier(0.2, 0, 0.2, 1)',
        willChange: 'transform',
      }}
      aria-hidden="true"
    >
      {/* Micro-bubble de fala factual contextual */}
      {speech && (
        <div
          className={`mb-2.5 px-3 py-1.5 rounded-full text-[11px] font-semibold tracking-tight border flex items-center gap-1.5 backdrop-blur-md transition-colors duration-300 ${
            isLight
              ? 'bg-white/95 text-[#15171B] border-black/10 shadow-lg shadow-black/5'
              : 'bg-[#1A1D24]/95 text-[#F9FAFB] border-white/10 shadow-xl shadow-black/40'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#E5B842] shrink-0" />
          <span className="whitespace-nowrap">{speech}</span>
        </div>
      )}

      {/* Robô Fin (Renderizado 100% em SVG e CSS de alta precisão) */}
      <div className="relative animate-fin-float motion-reduce:animate-none">
        {/* Halo de luz ambiente sutil */}
        <div
          className="absolute -inset-2 rounded-full blur-md opacity-25 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #E5B842 0%, transparent 70%)' }}
        />

        <svg
          width="82"
          height="90"
          viewBox="0 0 88 96"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="relative drop-shadow-xl"
        >
          {/* Antena / Sensor Superior */}
          <circle cx="44" cy="7" r="3.5" fill="#E5B842" />
          <path d="M44 10.5V17" stroke="#E5B842" strokeWidth="2" strokeLinecap="round" />
          <circle cx="44" cy="7" r="1.5" fill="#FFF8E7" />

          {/* Orelhas / Sensores Laterais */}
          <rect x="12" y="31" width="4" height="12" rx="2" fill="#E5B842" opacity="0.85" />
          <rect x="72" y="31" width="4" height="12" rx="2" fill="#E5B842" opacity="0.85" />

          {/* Cabeça / Capacete Obsidian */}
          <rect
            x="17"
            y="17"
            width="54"
            height="40"
            rx="16"
            fill={isLight ? '#1F242D' : '#14171E'}
            stroke="#E5B842"
            strokeWidth="1.8"
          />

          {/* Viseira de Vidro Translúcido */}
          <rect
            x="22"
            y="22"
            width="44"
            height="28"
            rx="11"
            fill="#0D0E11"
            stroke="rgba(229, 184, 66, 0.25)"
            strokeWidth="1"
          />

          {/* Olhos Luminous / Expressão Focada e Simpática */}
          {/* Olho Esquerdo */}
          <circle cx="34" cy="35" r="4" fill="#E5B842" />
          <circle cx="33" cy="34" r="1.5" fill="#FFFFFF" />
          {/* Olho Direito */}
          <circle cx="54" cy="35" r="4" fill="#E5B842" />
          <circle cx="53" cy="34" r="1.5" fill="#FFFFFF" />

          {/* Reflexo de Vidro Superior */}
          <path
            d="M26 26C31 24.5 40 24.5 48 25"
            stroke="rgba(255, 255, 255, 0.25)"
            strokeWidth="1.2"
            strokeLinecap="round"
          />

          {/* Pescoço Conector */}
          <rect x="38" y="57" width="12" height="4" rx="1.5" fill="#E5B842" opacity="0.6" />

          {/* Tronco / Corpo Compacto */}
          <path
            d="M26 62C26 61.4477 26.4477 61 27 61H61C61.5523 61 62 61.4477 62 62L60 78C60 82.4183 56.4183 86 52 86H36C31.5817 86 28 82.4183 28 78L26 62Z"
            fill={isLight ? '#1F242D' : '#14171E'}
            stroke="#E5B842"
            strokeWidth="1.6"
          />

          {/* Monograma FinControl "F" Discreto no Peito */}
          <path
            d="M41 68H47M41 71.5H45M41 68V76"
            stroke="#E5B842"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Base / Propulsor Magnético com Anel de Luz */}
          <ellipse cx="44" cy="87" rx="9" ry="2.5" fill="rgba(229, 184, 66, 0.2)" />
          <ellipse cx="44" cy="89" rx="6" ry="1.5" fill="#E5B842" opacity="0.7" />
        </svg>
      </div>
    </div>
  );
}
