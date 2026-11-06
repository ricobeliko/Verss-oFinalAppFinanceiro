// src/components/Sparkline.jsx
import React, { useId, useMemo } from 'react';
import usePrefersReducedMotion from '../hooks/usePrefersReducedMotion';

const COLOR_MAP = {
  accent: 'var(--fc-accent)',
  success: 'var(--fc-success)',
  warning: 'var(--fc-warning)',
  danger: 'var(--fc-danger)',
  info: 'var(--fc-info)',
  neutral: 'var(--fc-text-muted)'
};

const SOFT_COLOR_MAP = {
  accent: 'var(--fc-accent-soft)',
  success: 'var(--fc-success-soft)',
  warning: 'var(--fc-warning-soft)',
  danger: 'var(--fc-danger-soft)',
  info: 'var(--fc-info-soft)',
  neutral: 'rgba(140, 220, 225, 0.08)'
};

/**
 * Sparkline SVG ultraleve para tendências financeiras em KPIs.
 * Não utiliza bibliotecas externas, garantindo renderização ultra rápida em < 1ms.
 *
 * @param {Object} props
 * @param {Array<number>} [props.data=[]] - Sequência numérica cronológica
 * @param {number} [props.width=84] - Largura do SVG em pixels
 * @param {number} [props.height=28] - Altura do SVG em pixels
 * @param {string} [props.variant='accent'] - Tom semântico ('accent', 'success', 'warning', 'danger', 'info', 'neutral')
 * @param {boolean} [props.isDecorative=true] - Se true, oculta para leitores de tela
 * @param {string} [props.accessibleLabel=''] - Resumo textual quando informativo
 * @param {boolean} [props.showArea=true] - Se exibe preenchimento translúcido sob a linha
 * @param {string} [props.className=''] - Classes adicionais
 */
export default function Sparkline({
  data = [],
  width = 84,
  height = 28,
  variant = 'accent',
  isDecorative = true,
  accessibleLabel = '',
  showArea = true,
  className = ''
}) {
  const gradientId = useId();
  const prefersReducedMotion = usePrefersReducedMotion();

  const strokeColor = COLOR_MAP[variant] || COLOR_MAP.accent;
  const areaColor = SOFT_COLOR_MAP[variant] || SOFT_COLOR_MAP.accent;

  const { pathD, areaD, lastPoint } = useMemo(() => {
    const safeData = Array.isArray(data) ? data.filter((v) => typeof v === 'number' && !isNaN(v)) : [];

    if (safeData.length === 0) {
      const midY = height / 2;
      return {
        pathD: `M 4 ${midY} L ${width - 4} ${midY}`,
        areaD: '',
        lastPoint: null
      };
    }

    if (safeData.length === 1) {
      const midY = height / 2;
      const midX = width / 2;
      return {
        pathD: `M 4 ${midY} L ${width - 4} ${midY}`,
        areaD: '',
        lastPoint: { x: midX, y: midY }
      };
    }

    const min = Math.min(...safeData);
    const max = Math.max(...safeData);
    const paddingX = 4;
    const paddingTop = 4;
    const paddingBottom = 4;
    const innerWidth = width - 2 * paddingX;
    const innerHeight = height - paddingTop - paddingBottom;
    const range = max - min;

    const points = safeData.map((val, idx) => {
      const x = paddingX + (idx / (safeData.length - 1)) * innerWidth;
      const y = range === 0
        ? height / 2
        : height - paddingBottom - ((val - min) / range) * innerHeight;
      return { x: Number(x.toFixed(1)), y: Number(y.toFixed(1)) };
    });

    const pathD = points.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`, '');
    const first = points[0];
    const last = points[points.length - 1];
    const areaD = `${pathD} L ${last.x} ${height} L ${first.x} ${height} Z`;

    return {
      pathD,
      areaD,
      lastPoint: last
    };
  }, [data, width, height]);

  return (
    <div className={`relative inline-flex items-center shrink-0 ${className}`}>
      {!isDecorative && accessibleLabel && (
        <span className="sr-only">{accessibleLabel}</span>
      )}
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        aria-hidden={isDecorative ? 'true' : undefined}
        role={isDecorative ? 'presentation' : 'img'}
        aria-label={!isDecorative ? (accessibleLabel || 'Tendência dos últimos meses') : undefined}
        className="overflow-visible select-none"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={areaColor} stopOpacity="0.45" />
            <stop offset="100%" stopColor={areaColor} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {showArea && areaD && (
          <path
            d={areaD}
            fill={`url(#${gradientId})`}
            className={prefersReducedMotion ? '' : 'transition-opacity duration-300'}
          />
        )}

        <path
          d={pathD}
          fill="none"
          stroke={strokeColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={prefersReducedMotion ? '' : 'fc-sparkline-path'}
        />

        {lastPoint && (
          <g>
            <circle
              cx={lastPoint.x}
              cy={lastPoint.y}
              r="3.5"
              fill={strokeColor}
            />
            <circle
              cx={lastPoint.x}
              cy={lastPoint.y}
              r="1.5"
              fill="var(--fc-surface-1)"
            />
          </g>
        )}
      </svg>
    </div>
  );
}
