import React, { useId } from 'react';

/**
 * FinControlMark — Marca e Ícone Identitário do FinControl (Abyss Teal).
 * 
 * Renderiza o ícone canônico das três ondas sobre superfície azul-abissal com
 * cantos arredondados, idêntico ao favicon oficial do sistema.
 * 
 * Modos de Animação:
 * - `animated={true}`: Ondas deslizam lateralmente de forma contínua e suave (8 a 12s),
 *   recortadas pelo clipPath da marca, operando 100% via GPU (transform translate3d).
 * - `hoverAnimated={true}`: Ondas permanecem estáticas e deslizam suavemente sob hover.
 * - `prefers-reduced-motion: reduce`: Todas as animações são estritamente desabilitadas.
 * 
 * @param {Object} props
 * @param {number|string} [props.size=36] - Largura e altura do ícone em px ou string CSS.
 * @param {boolean} [props.animated=false] - Ativa animação contínua das ondas.
 * @param {boolean} [props.hoverAnimated=false] - Ativa animação das ondas no hover.
 * @param {string} [props.className=''] - Classes adicionais para o container SVG.
 * @param {string} [props.title] - Título acessível alternativo.
 * @param {string} [props.ariaLabel] - aria-label para leitores de tela.
 * @param {boolean} [props.ariaHidden] - Esconde de leitores de tela (ex: ao lado de texto).
 */
export default function FinControlMark({
  size = 36,
  animated = false,
  hoverAnimated = false,
  className = '',
  title,
  ariaLabel,
  ariaHidden,
  ...rest
}) {
  const rawId = useId();
  const id = rawId.replace(/[^a-zA-Z0-9_-]/g, '');
  const bgId = `fc-mark-bg-${id}`;
  const strokeId = `fc-mark-w-${id}`;
  const clipId = `fc-mark-clip-${id}`;

  const isHidden = ariaHidden ?? (!ariaLabel && !title ? undefined : false);
  const effectiveLabel = ariaLabel || title || 'FinControl';

  // Classes de animação contínua ou no hover
  const wave1Class = animated
    ? 'fc-mark-wave-anim-1'
    : hoverAnimated
    ? 'fc-mark-wave-hover-1'
    : '';
  const wave2Class = animated
    ? 'fc-mark-wave-anim-2'
    : hoverAnimated
    ? 'fc-mark-wave-hover-2'
    : '';
  const wave3Class = animated
    ? 'fc-mark-wave-anim-3'
    : hoverAnimated
    ? 'fc-mark-wave-hover-3'
    : '';

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      width={size}
      height={size}
      className={`fc-mark select-none shrink-0 overflow-hidden ${className}`}
      role={isHidden ? undefined : 'img'}
      aria-label={isHidden ? undefined : effectiveLabel}
      aria-hidden={isHidden ? 'true' : undefined}
      {...rest}
    >
      {!isHidden && <title>{effectiveLabel}</title>}
      <defs>
        <linearGradient id={bgId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0E2B35" />
          <stop offset="1" stopColor="#04171F" />
        </linearGradient>
        <linearGradient id={strokeId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#5CCCCC" />
          <stop offset="1" stopColor="#7FE0DC" />
        </linearGradient>
        <clipPath id={clipId}>
          <rect width="512" height="512" rx="116" />
        </clipPath>
      </defs>

      {/* Fundo Arredondado Abyss Teal */}
      <rect width="512" height="512" rx="116" fill={`url(#${bgId})`} />

      {/* Três Ondas Contínuas Recortadas pelo Card */}
      <g
        clipPath={`url(#${clipId})`}
        fill="none"
        stroke={`url(#${strokeId})`}
        strokeWidth="42"
        strokeLinecap="round"
      >
        {/* Onda 1 (Superior, Opacidade 1.0, Período 352px) */}
        <path
          className={`fc-mark-wave ${wave1Class}`}
          d="M-272 190C-212 120 -152 120 -96 190S20 260 80 190S200 120 256 190S372 260 432 190S548 120 608 190S724 260 784 190"
        />

        {/* Onda 2 (Intermediária, Opacidade 0.7, Período 352px) */}
        <path
          opacity=".7"
          className={`fc-mark-wave ${wave2Class}`}
          d="M-272 285C-212 215 -152 215 -96 285S20 355 80 285S200 215 256 285S372 355 432 285S548 215 608 285S724 355 784 285"
        />

        {/* Onda 3 (Inferior, Opacidade 0.4, Período 352px) */}
        <path
          opacity=".4"
          className={`fc-mark-wave ${wave3Class}`}
          d="M-272 380C-212 310 -152 310 -96 380S20 450 80 380S200 310 256 380S372 450 432 380S548 310 608 380S724 450 784 380"
        />
      </g>
    </svg>
  );
}
