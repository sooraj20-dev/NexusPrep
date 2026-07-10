import React from 'react';
import { ArrowRight } from 'lucide-react';
import { COLORS } from '../utils/constants';

export function BrutalButton({
  children,
  onClick,
  active = false,
  disabled = false,
  icon: Icon = ArrowRight,
  variant = "primary",
  className = "",
}) {
  const cls =
    variant === "outline"
      ? "iv-btn iv-btn-secondary"
      : variant === "danger"
      ? "iv-btn iv-btn-danger"
      : "iv-btn iv-btn-primary";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${cls} ${className}`}
      style={active ? { boxShadow: `0 0 0 2px var(--accent)` } : undefined}
    >
      <Icon size={15} />
      {children}
    </button>
  );
}

export function StatCard({ label, value, suffix = "", sub, icon: Icon, color = COLORS.paper }) {
  return (
    <div className="iv-panel p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="iv-label">{label}</span>
        {Icon && <Icon size={16} style={{ color }} />}
      </div>
      <div
        className="iv-mono text-3xl font-semibold leading-none"
        style={{ color }}
      >
        {value}{suffix}
      </div>
      {sub && (
        <div className="iv-label" style={{ color: 'var(--text-faint)' }}>
          {sub}
        </div>
      )}
    </div>
  );
}

export function Meter({ label, value, suffix = "%", color }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="iv-label">{label}</span>
        <span className="iv-mono text-xs font-semibold" style={{ color }}>
          {value}{suffix}
        </span>
      </div>
      <div className="iv-meter-track">
        <div
          className="iv-meter-fill"
          style={{ width: `${Math.min(value, 100)}%`, background: color }}
        />
      </div>
    </div>
  );
}
