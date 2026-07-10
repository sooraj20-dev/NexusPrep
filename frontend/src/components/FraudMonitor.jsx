/**
 * FraudMonitor — live integrity status panel for the interview sidebar.
 * Modern redesign: rounded cards, clean tokens, no brutalist borders.
 */

import React, { useMemo } from 'react';
import { ShieldCheck, ShieldAlert, ShieldX, Eye, EyeOff, Camera, CameraOff } from 'lucide-react';
import { COLORS } from '../utils/constants';

const RISK_CONFIG = {
  LOW:    { color: COLORS.signal, icon: ShieldCheck, label: 'Clear',       bg: 'rgba(34,197,94,0.08)'   },
  MEDIUM: { color: COLORS.amber,  icon: ShieldAlert,  label: 'Warning',     bg: 'rgba(245,158,11,0.08)'  },
  HIGH:   { color: COLORS.alarm,  icon: ShieldX,      label: 'Compromised', bg: 'rgba(239,68,68,0.08)'   },
};

const EVENT_LABELS = {
  tab_switch:        'Tab switch',
  focus_loss:        'Focus lost',
  fullscreen_exit:   'Fullscreen exit',
  page_exit_attempt: 'Exit attempt',
  no_face:           'No face',
  multiple_faces:    'Multiple faces',
  look_away:         'Looking away',
  camera_disabled:   'Camera off',
  mic_disabled:      'Mic off',
};

const SEVERITY_COLORS = {
  high:   COLORS.alarm,
  medium: COLORS.amber,
  low:    'var(--text-faint)',
};

function ScoreRing({ score, color }) {
  const r = 26;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <div style={{ position: 'relative', width: 62, height: 62, flexShrink: 0 }}>
      <svg width="62" height="62" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="31" cy="31" r={r} fill="none" stroke="var(--panel2)" strokeWidth="4" />
        <circle
          cx="31" cy="31" r={r} fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={`${dash} ${circ}`}
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: '0.8rem', fontWeight: 700, color,
      }}>
        {score}
      </div>
    </div>
  );
}

function Card({ children, style }) {
  return (
    <div style={{
      background: 'var(--panel2)',
      border: '1px solid var(--border)',
      borderRadius: 8,
      padding: '10px 12px',
      ...style,
    }}>
      {children}
    </div>
  );
}

function CardLabel({ children }) {
  return (
    <div style={{
      fontSize: '0.62rem', fontWeight: 600,
      textTransform: 'uppercase', letterSpacing: '0.08em',
      color: 'var(--text-muted)', marginBottom: 8,
    }}>
      {children}
    </div>
  );
}

export function FraudMonitor({
  fraudScore,
  fraudRisk,
  events,
  isMonitoring,
  faceApiReady,
  cameraDisabled,
  micDisabled,
  warningCounts = {},
  cameraOff = false,
}) {
  const cfg  = RISK_CONFIG[fraudRisk] || RISK_CONFIG.LOW;
  const Icon = cfg.icon;

  const counts = useMemo(() => {
    const c = {};
    events.forEach(e => { c[e.type] = (c[e.type] || 0) + 1; });
    return c;
  }, [events]);

  const recentEvents = useMemo(() =>
    [...events].reverse().slice(0, 6),
    [events]
  );

  const fmt = (iso) => {
    try {
      const d = new Date(iso);
      return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}:${d.getSeconds().toString().padStart(2,'0')}`;
    } catch { return '--:--:--'; }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

      {/* ── Score + risk badge ── */}
      <div style={{
        border: `1px solid ${cfg.color}44`,
        background: cfg.bg,
        borderRadius: 8,
        padding: '12px',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <ScoreRing score={fraudScore} color={cfg.color} />
        <div>
          <div style={{ fontSize: '0.62rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Integrity
          </div>
          <div style={{
            fontSize: '0.85rem', fontWeight: 700,
            color: cfg.color, display: 'flex', alignItems: 'center', gap: 5, marginTop: 3,
          }}>
            <Icon size={13} />
            {cfg.label}
          </div>
          <div style={{ fontSize: '0.62rem', color: 'var(--text-faint)', marginTop: 4 }}>
            {isMonitoring
              ? (cameraOff ? '● Events only' : faceApiReady ? '● Face + events' : '● Events only')
              : '○ Standby'}
          </div>
        </div>
      </div>

      <Card>
        <div style={{ display: 'grid', gridTemplateColumns: cameraOff ? '1fr' : '1fr 1fr', gap: 8 }}>
          {!cameraOff && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', fontWeight: 600, color: cameraDisabled ? COLORS.alarm : COLORS.signal }}>
              {cameraDisabled ? <CameraOff size={12} /> : <Camera size={12} />}
              {cameraDisabled ? 'Cam off' : 'Cam on'}
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', fontWeight: 600, color: micDisabled ? COLORS.alarm : COLORS.signal }}>
            {micDisabled ? <EyeOff size={12} /> : <Eye size={12} />}
            {micDisabled ? 'Mic off' : 'Mic on'}
          </div>
        </div>
      </Card>

      {/* ── Event counters ── */}
      {Object.keys(counts).length > 0 && (
        <Card>
          <CardLabel>Event Counts</CardLabel>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {Object.entries(counts).map(([type, count]) => {
              const sev = events.find(e => e.type === type)?.severity;
              const col = SEVERITY_COLORS[sev] || 'var(--text-faint)';
              return (
                <span key={type} style={{
                  fontSize: '0.62rem', fontWeight: 600,
                  padding: '2px 7px', borderRadius: 20,
                  border: `1px solid ${col}44`,
                  color: col, background: `${col}10`,
                }}>
                  {EVENT_LABELS[type] || type} ×{count}
                </span>
              );
            })}
          </div>
        </Card>
      )}

      {/* ── Warning progress ── */}
      {!cameraOff && (
        <Card>
          <CardLabel>Ejection Warnings</CardLabel>
          {[
            { key: 'no_face',        label: 'No Face'    },
            { key: 'multiple_faces', label: 'Multi-Face' },
            { key: 'camera_disabled',label: 'Camera Off' },
          ].map(({ key, label }) => {
            const count     = warningCounts[key] || 0;
            const isEjected = count > 2;
            const barColor  = count === 0 ? 'var(--text-faint)' : count === 1 ? COLORS.amber : COLORS.alarm;
            return (
              <div key={key} style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontSize: '0.65rem', fontWeight: 600, color: barColor }}>{label}</span>
                  <span style={{ fontSize: '0.65rem', fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", color: barColor }}>
                    {isEjected ? 'EJECTED' : count === 0 ? '—' : `${count}/2`}
                  </span>
                </div>
                <div style={{ height: 3, background: 'var(--panel)', borderRadius: 99 }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min((count / 3) * 100, 100)}%`,
                    background: barColor, borderRadius: 99,
                    transition: 'width 0.4s ease, background 0.3s ease',
                  }} />
                </div>
              </div>
            );
          })}
          <div style={{ fontSize: '0.6rem', color: 'var(--text-faint)', borderTop: '1px solid var(--border)', paddingTop: 6, marginTop: 4 }}>
            Tab switch → instant removal
          </div>
        </Card>
      )}

      {/* ── Live feed ── */}
      <Card>
        <CardLabel>Live Feed {events.length > 0 && `(${events.length})`}</CardLabel>
        {recentEvents.length === 0 ? (
          <div style={{ fontSize: '0.68rem', color: 'var(--text-faint)' }}>No events yet</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {recentEvents.map(ev => (
              <div key={ev.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                fontSize: '0.62rem',
                borderBottom: '1px solid var(--border)', paddingBottom: 4,
              }}>
                <span style={{ color: SEVERITY_COLORS[ev.severity] || 'var(--text-faint)', flex: 1 }}>
                  {EVENT_LABELS[ev.type] || ev.type}
                  {ev.durationMs > 0 && (
                    <span style={{ color: 'var(--text-faint)' }}> ({Math.round(ev.durationMs / 1000)}s)</span>
                  )}
                </span>
                <span style={{ color: 'var(--text-faint)', marginLeft: 6, flexShrink: 0, fontFamily: "'JetBrains Mono', monospace" }}>
                  {fmt(ev.timestamp)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
