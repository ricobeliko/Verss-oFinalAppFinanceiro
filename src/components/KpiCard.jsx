// src/components/KpiCard.jsx
import React, { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import AnimatedCurrency from './AnimatedCurrency';
import Sparkline from './Sparkline';
import Badge from '../design-system/primitives/Badge';
import Surface from '../design-system/primitives/Surface';
import usePrefersReducedMotion from '../hooks/usePrefersReducedMotion';

const TONE_CLASSES = {
  accent: {
    iconBg: 'bg-[var(--fc-accent-soft)] text-[var(--fc-accent)] border-[var(--fc-accent)]/20',
    glow: 'var(--fc-glow-cool)',
    borderHover: 'hover:border-[var(--fc-accent)]/40',
  },
  success: {
    iconBg: 'bg-[var(--fc-success-soft)] text-[var(--fc-success)] border-[var(--fc-success)]/20',
    glow: 'rgba(74, 222, 128, 0.15)',
    borderHover: 'hover:border-[var(--fc-success)]/40',
  },
  warning: {
    iconBg: 'bg-[var(--fc-warning-soft)] text-[var(--fc-warning)] border-[var(--fc-warning)]/20',
    glow: 'rgba(251, 191, 36, 0.15)',
    borderHover: 'hover:border-[var(--fc-warning)]/40',
  },
  info: {
    iconBg: 'bg-[var(--fc-info-soft)] text-[var(--fc-info)] border-[var(--fc-info)]/20',
    glow: 'rgba(96, 165, 250, 0.15)',
    borderHover: 'hover:border-[var(--fc-info)]/40',
  },
};

/**
 * Card de KPI Vivo e Cinematográfico para o FinControl.
 *
 * Características:
 * - Contagem numérica fluida com AnimatedCurrency.
 * - Tom semântico com contraste e identificação textual (nunca apenas cor).
 * - Comparativo MoM com seta, percentual e valor absoluto.
 * - Sparkline integrado com revelação suave.
 * - Brilho ambiente interativo (Spotlight) controlado via requestAnimationFrame (sem loop ocioso).
 * - Elevação suave ao passar o cursor (translateY).
 * - Integração nativa com useEnterStagger via data-enter="item".
 *
 * @param {Object} props
 * @param {string} props.title - Rótulo do KPI
 * @param {number} props.value - Valor monetário atual em reais
 * @param {React.ReactNode} [props.icon] - Ícone ilustrativo no cabeçalho
 * @param {'accent' | 'success' | 'warning' | 'info'} [props.variant='accent'] - Tom semântico
 * @param {Object} [props.delta] - Variação em relação ao período anterior
 * @param {number} [props.delta.value] - Valor monetário da variação
 * @param {number|null} [props.delta.percentage] - Percentual da variação
 * @param {'up' | 'down' | 'neutral'} [props.delta.direction] - Direção da variação
 * @param {string} [props.delta.label] - Texto formatado do percentual (ex: '+12,5%')
 * @param {string} [props.deltaSubtitle='vs. mês anterior'] - Subtítulo do delta
 * @param {boolean} [props.invertDeltaSemantics=false] - Se true, aumento é sucesso (receitas). Se false, aumento é atenção (despesas).
 * @param {Array<number>} [props.sparklineData=[]] - Série cronológica para o mini-gráfico
 * @param {string} [props.sparklineLabel] - Descrição acessível para o Sparkline
 * @param {React.ReactNode} [props.secondaryContent] - Conteúdo complementar (ex: barra de progresso)
 * @param {React.ReactNode} [props.footer] - Rodapé adicional
 * @param {string} [props.dataEnter='item'] - Atributo de entrada em cascata
 * @param {string} [props.className=''] - Classes adicionais
 */
export default function KpiCard({
  title,
  value = 0,
  icon,
  variant = 'accent',
  delta,
  deltaSubtitle = 'vs. mês anterior',
  invertDeltaSemantics = false,
  sparklineData = [],
  sparklineLabel = '',
  secondaryContent,
  footer,
  dataEnter = 'item',
  className = '',
}) {
  const cardRef = useRef(null);
  const rAFRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();

  const toneConfig = TONE_CLASSES[variant] || TONE_CLASSES.accent;

  // Atualização do Spotlight via requestAnimationFrame (máximo 1 chamada por frame do compositor)
  const handlePointerMove = useCallback(
    (e) => {
      if (prefersReducedMotion) return;
      if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(pointer: coarse)').matches) {
        return;
      }

      if (rAFRef.current) return;

      const rect = cardRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      rAFRef.current = requestAnimationFrame(() => {
        if (cardRef.current) {
          cardRef.current.style.setProperty('--fc-mx', `${x}px`);
          cardRef.current.style.setProperty('--fc-my', `${y}px`);
        }
        rAFRef.current = null;
      });
    },
    [prefersReducedMotion]
  );

  const handlePointerEnter = useCallback(() => {
    if (!prefersReducedMotion) setIsHovered(true);
  }, [prefersReducedMotion]);

  const handlePointerLeave = useCallback(() => {
    setIsHovered(false);
    if (rAFRef.current) {
      cancelAnimationFrame(rAFRef.current);
      rAFRef.current = null;
    }
    if (cardRef.current) {
      cardRef.current.style.removeProperty('--fc-mx');
      cardRef.current.style.removeProperty('--fc-my');
    }
  }, []);

  useEffect(() => {
    return () => {
      if (rAFRef.current) {
        cancelAnimationFrame(rAFRef.current);
      }
    };
  }, []);

  // Lógica de cores do delta: para despesas/faturas, aumento é atenção ('warning'); queda é economia ('success').
  const deltaBadgeConfig = useMemo(() => {
    if (!delta || delta.direction === 'neutral') {
      return {
        variant: 'neutral',
        icon: '•',
        label: delta?.label || '0,0%',
        ariaText: 'Estável em relação ao mês anterior',
      };
    }

    const isUp = delta.direction === 'up';
    const isSuccess = invertDeltaSemantics ? isUp : !isUp;
    const badgeVariant = isSuccess ? 'success' : 'warning';
    const arrowIcon = isUp ? '▲' : '▼';
    const directionWord = isUp ? 'Aumento de' : 'Queda de';

    return {
      variant: badgeVariant,
      icon: arrowIcon,
      label: delta.label || (isUp ? '+100,0%' : '-100,0%'),
      ariaText: `${directionWord} ${delta.label} ${deltaSubtitle}`,
    };
  }, [delta, invertDeltaSemantics, deltaSubtitle]);

  return (
    <div
      ref={cardRef}
      data-enter={dataEnter}
      onPointerMove={handlePointerMove}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      className={`relative rounded-3xl fc-kpi-card transition-transform duration-200 ease-out hover:-translate-y-1 ${className}`}
    >
      <Surface
        variant="elevated"
        padding="md"
        className={`relative overflow-hidden transition-all duration-200 border border-[var(--fc-border-default)] ${toneConfig.borderHover} shadow-[var(--fc-shadow-md)] h-full flex flex-col justify-between`}
      >
        {/* Camada de Brilho Dinâmico (Spotlight Cursor Glow) */}
        <div
          aria-hidden="true"
          className={`absolute inset-0 rounded-3xl fc-kpi-spotlight pointer-events-none transition-opacity duration-300 ${
            isHovered && !prefersReducedMotion ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            background: `radial-gradient(350px circle at var(--fc-mx, -9999px) var(--fc-my, -9999px), ${toneConfig.glow}, transparent 70%)`,
          }}
        />

        {/* Topo do Card: Rótulo e Ícone */}
        <div className="relative z-10 flex items-center justify-between gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--fc-text-secondary)] select-none">
            {title}
          </h3>
          {icon && (
            <div
              aria-hidden="true"
              className={`w-8 h-8 rounded-xl flex items-center justify-center border text-sm font-bold shrink-0 ${toneConfig.iconBg}`}
            >
              {icon}
            </div>
          )}
        </div>

        {/* Centro do Card: Valor com AnimatedCurrency e Sparkline */}
        <div className="relative z-10 mt-3 flex items-baseline justify-between gap-4">
          <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--fc-text-primary)]">
            <AnimatedCurrency value={value} />
          </p>

          {Array.isArray(sparklineData) && sparklineData.length > 0 && (
            <Sparkline
              data={sparklineData}
              variant={variant}
              width={76}
              height={26}
              isDecorative={!sparklineLabel}
              accessibleLabel={sparklineLabel}
            />
          )}
        </div>

        {/* Conteúdo Secundário (ex: Barra de Progresso) se fornecido */}
        {secondaryContent && (
          <div className="relative z-10 mt-3">
            {secondaryContent}
          </div>
        )}

        {/* Variação MoM (Delta) */}
        {delta && !secondaryContent && (
          <div className="relative z-10 mt-3 flex items-center gap-2 text-xs">
            <Badge variant={deltaBadgeConfig.variant}>
              <span aria-hidden="true">{deltaBadgeConfig.icon}</span>
              <span>{deltaBadgeConfig.label}</span>
            </Badge>
            <span className="text-[11px] text-[var(--fc-text-muted)]">
              {delta.label === '—' && delta.absoluteText ? delta.absoluteText : deltaSubtitle}
            </span>
            <span className="sr-only">{deltaBadgeConfig.ariaText}</span>
          </div>
        )}

        {/* Rodapé Opcional */}
        {footer && (
          <div className="relative z-10 mt-3 pt-2 border-t border-[var(--fc-border-subtle)] text-xs text-[var(--fc-text-muted)]">
            {footer}
          </div>
        )}
      </Surface>
    </div>
  );
}
