import React from 'react';

export default function ShaanCarsLogo({ size = 32, className = "", color = "#dc2626" }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className={className}
      style={{ display: 'inline-block', verticalAlign: 'middle' }}
    >
      {/* Outer Hex Shield representing durability and protection */}
      <path 
        d="M50 8 L88 28 L88 72 L50 92 L12 72 L12 28 Z" 
        stroke={color} 
        strokeWidth="6" 
        strokeLinejoin="round" 
        fill="rgba(220, 38, 38, 0.05)" 
      />
      {/* Central Stylized "S" curve representing sleekness and curves of a vehicle */}
      <path 
        d="M35 32 C35 24, 65 24, 65 36 C65 48, 35 46, 35 58 C35 70, 65 70, 65 62" 
        stroke="#1e293b" 
        strokeWidth="8" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
      {/* Sleek center line representing road and performance */}
      <path 
        d="M20 50 H80" 
        stroke={color} 
        strokeWidth="4" 
        strokeLinecap="round" 
        opacity="0.8"
      />
      {/* Bottom speed/aerodynamic accents */}
      <path d="M40 76 H60" stroke="#1e293b" strokeWidth="4" strokeLinecap="round" />
      <path d="M45 82 H55" stroke={color} strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
