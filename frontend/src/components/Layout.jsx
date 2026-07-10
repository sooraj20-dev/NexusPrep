import React from 'react';

export function Panel({ children, className = "" }) {
  return (
    <section className={`iv-panel ${className}`}>
      {children}
    </section>
  );
}

export function SectionLabel({ children, color }) {
  return (
    <div
      className="iv-label mb-3"
      style={color ? { color } : undefined}
    >
      {children}
    </div>
  );
}
