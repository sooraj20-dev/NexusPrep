/**
 * SkillRadar — displays skill profile using a radar/spider chart.
 *
 * Uses Recharts RadarChart (already installed with the project).
 * Shows up to 8 key skills in a radar shape.
 * Also includes a horizontal heatmap of all 15 skills below.
 */

import React from 'react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  ResponsiveContainer, Tooltip,
} from 'recharts';
import { COLORS } from '../utils/constants';

// The 8 primary skills shown in the radar
const RADAR_SKILLS = [
  { key: 'communication',      label: 'Comms' },
  { key: 'technical_accuracy', label: 'Technical' },
  { key: 'problem_solving',    label: 'Problem Solving' },
  { key: 'critical_thinking',  label: 'Critical Thinking' },
  { key: 'system_design',      label: 'System Design' },
  { key: 'behavioral',         label: 'Behavioral' },
  { key: 'confidence',         label: 'Confidence' },
  { key: 'api_design',         label: 'API Design' },
];

// All 15 skills for the heatmap
const ALL_SKILL_KEYS = [
  'communication', 'confidence', 'technical_accuracy', 'problem_solving',
  'sql', 'python', 'java', 'react', 'system_design', 'leadership',
  'behavioral', 'database_design', 'api_design', 'debugging', 'critical_thinking',
];

const SKILL_LABELS = {
  communication:    'Communication',
  confidence:       'Confidence',
  technical_accuracy:'Technical',
  problem_solving:  'Problem Solving',
  sql:              'SQL',
  python:           'Python',
  java:             'Java',
  react:            'React',
  system_design:    'System Design',
  leadership:       'Leadership',
  behavioral:       'Behavioral',
  database_design:  'DB Design',
  api_design:       'API Design',
  debugging:        'Debugging',
  critical_thinking:'Critical Thinking',
};

function skillColor(v) {
  if (v >= 80) return COLORS.signal;
  if (v >= 65) return COLORS.amber;
  if (v >= 50) return COLORS.blue;
  return COLORS.alarm;
}

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{
      background: 'var(--panel)', border: '1px solid var(--border)',
      borderRadius: 8, padding: '8px 12px',
      fontSize: '0.78rem',
    }}>
      <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{d.subject}</div>
      <div style={{ color: skillColor(d.value), fontWeight: 700 }}>{d.value}/100</div>
    </div>
  );
};

// ── Radar Chart ─────────────────────────────────────────────────────────────
export function SkillRadarChart({ skills = {} }) {
  const data = RADAR_SKILLS.map(({ key, label }) => ({
    subject: label,
    value:   Math.round(skills[key] ?? 50),
    fullMark: 100,
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
        <PolarGrid stroke="rgba(255,255,255,0.06)" />
        <PolarAngleAxis
          dataKey="subject"
          tick={{ fill: '#666', fontSize: 11, fontFamily: 'Inter, sans-serif' }}
        />
        <Radar
          name="Skills"
          dataKey="value"
          stroke={COLORS.accent}
          fill={COLORS.accent}
          fillOpacity={0.15}
          strokeWidth={2}
        />
        <Tooltip content={<CustomTooltip />} />
      </RadarChart>
    </ResponsiveContainer>
  );
}

// ── Heatmap Grid ─────────────────────────────────────────────────────────────
export function SkillHeatmap({ skills = {} }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
      gap: 8,
    }}>
      {ALL_SKILL_KEYS.map(key => {
        const value = Math.round(skills[key] ?? 50);
        const color = skillColor(value);
        return (
          <div
            key={key}
            style={{
              background: 'var(--panel2)',
              border: `1px solid var(--border)`,
              borderRadius: 8,
              padding: '10px 12px',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Bottom fill indicator */}
            <div style={{
              position: 'absolute', bottom: 0, left: 0,
              width: `${value}%`, height: '3px',
              background: color, borderRadius: '0 2px 0 0',
              transition: 'width 0.8s ease',
            }} />

            <div style={{
              fontSize: '0.68rem', fontWeight: 600, textTransform: 'uppercase',
              letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 6,
            }}>
              {SKILL_LABELS[key] || key}
            </div>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '1.3rem', lineHeight: 1, fontWeight: 700,
              color,
            }}>
              {value}
            </div>
          </div>
        );
      })}
    </div>
  );
}
