// src/components/CarbonCard.jsx
import React from 'react';

export default function CarbonCard({ children, className = "", hoverEffect = true }) {
    return (
        <div className={`bg-[var(--fc-surface-1)] border border-[var(--fc-border-default)] rounded-3xl p-6 shadow-[var(--fc-shadow-md)] text-[var(--fc-text-primary)] transition-all duration-300 ${hoverEffect ? 'hover:-translate-y-0.5 hover:border-[var(--fc-accent)]/40' : ''} ${className}`}>
            {children}
        </div>
    );
}