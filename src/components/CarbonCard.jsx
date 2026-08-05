// src/components/CarbonCard.jsx
import React from 'react';

export default function CarbonCard({ children, className = "", hoverEffect = true }) {
    return (
        <div className={`bg-[#1A1A1A] border border-[#3A3A3A] rounded-3xl p-6 shadow-2xl transition-all duration-300 ${hoverEffect ? 'hover:-translate-y-1 hover:border-[#F2B705]/40' : ''} ${className}`}>
            {children}
        </div>
    );
}