/**
 * ConfidenceDashboard — real-time confidence analytics panel.
 * Modern redesign: rounded cards, Inter font, clean metric rows.
 */

import React from 'react';
import { Activity, Eye, MessageCircle, AlarmClock, Mic } from 'lucide-react';
import { COLORS } from '../utils/constants';

function scoreColor(v) {
  if (v >= 80) return COLORS.signal;
  if (v >= 60) return COLORS.amber;
  return COLORS.alarm;
}

function MiniRing({ value, color, size = 50 }) {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (Math.min(100, Math.max(0, value)) / 100) * circ;
  const cx = size / 2;
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="var(--panel2)" strokeWidth={4} />
        <circle
          cx={cx} cy={cx} r={r} fill="none" stroke={color} strokeWidth={4}
          strokeDasharray={`${dash} ${circ}`}
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        fontSize: '0.65rem', fontWeight: 700,
        fontFamily: "'JetBrains Mono', monospace", color,
      }}>
        {Math.round(value)}%
      </div>
    </div>
  );
}

function MetricRow({ icon: Icon, label, value, sub, color }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '7px 0',
      borderBottom: '1px solid var(--border)',
    }}>
      <Icon size={13} style={{ color: 'var(--text-faint)', flexShrink: 0 }} />
      <span style={{
        fontSize: '0.68rem', fontWeight: 600,
        textTransform: 'uppercase', letterSpacing: '0.06em',
        color: 'var(--text-muted)', flex: 1,
      }}>
        {label}
      </span>
      <div style={{ textAlign: 'right' }}>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '0.72rem', fontWeight: 700, color,
        }}>
          {value}
        </div>
        {sub && (
          <div style={{ fontSize: '0.58rem', color: 'var(--text-faint)' }}>{sub}</div>
        )}
      </div>
    </div>
  );
}

export function ConfidenceDashboard({ metrics, active }) {
  const {
    confidence = 75,
    eyeContact = 80,
    wpm = 0,
    wpmLabel = 'No data',
    fillerCount = 0,
    pauseCount = 0,
    stability = 80,
    confidenceLabel = '—',
  } = metrics || {};

  const confColor   = scoreColor(confidence);
  const ecColor     = scoreColor(eyeContact);
  const wpmColor    = wpmLabel === 'Ideal pace' ? COLORS.signal : wpmLabel === 'No data' ? 'var(--text-faint)' : COLORS.amber;
  const fillerColor = fillerCount === 0 ? COLORS.signal : fillerCount < 5 ? COLORS.amber : COLORS.alarm;
  const pauseColor  = pauseCount === 0  ? COLORS.signal : pauseCount < 3  ? COLORS.amber : COLORS.alarm;

  return (
    <div style={{
      background: 'var(--panel)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      padding: '12px 14px',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 12,
      }}>
        <div style={{
          fontSize: '0.65rem', fontWeight: 600,
          textTransform: 'uppercase', letterSpacing: '0.08em',
          color: 'var(--text-muted)',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <Activity size={12} style={{ color: active ? COLORS.signal : 'var(--text-faint)' }} />
          Confidence
          {active && (
            <span style={{
              display: 'inline-block', width: 6, height: 6,
              borderRadius: '50%', background: COLORS.signal,
              animation: 'iv-pulse 1.5s ease-in-out infinite',
            }} />
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.6rem', fontWeight: 700,
            color: confColor, textAlign: 'right',
          }}>
            {confidenceLabel.toUpperCase()}
          </div>
          <MiniRing value={confidence} color={confColor} />
        </div>
      </div>

      <MetricRow icon={Eye}           label="Eye Contact"  value={`${eyeContact}%`}         color={ecColor}     />
      <MetricRow icon={Mic}           label="Speech Pace"  value={wpm > 0 ? `${wpm} wpm` : '—'} sub={wpmLabel} color={wpmColor}    />
      <MetricRow icon={MessageCircle} label="Filler Words" value={fillerCount}               sub={fillerCount === 0 ? 'Clean' : fillerCount < 5 ? 'Minor' : 'Frequent'} color={fillerColor} />
      <MetricRow icon={AlarmClock}    label="Pauses"       value={pauseCount}               sub={pauseCount === 0 ? 'Fluent' : 'Detected'} color={pauseColor}  />

      {/* Stability bar */}
      <div style={{ marginTop: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
            Stability
          </span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.65rem', fontWeight: 700, color: scoreColor(stability) }}>
            {stability}%
          </span>
        </div>
        <div style={{ height: 3, background: 'var(--panel2)', borderRadius: 99 }}>
          <div style={{
            height: '100%',
            width: `${Math.min(100, stability)}%`,
            background: scoreColor(stability),
            borderRadius: 99,
            transition: 'width 0.6s ease, background 0.4s ease',
          }} />
        </div>
      </div>

      {!active && (
        <div style={{
          marginTop: 10, textAlign: 'center',
          fontSize: '0.62rem', color: 'var(--text-faint)',
          textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>
          Activates when answering
        </div>
      )}
    </div>
  );
}
