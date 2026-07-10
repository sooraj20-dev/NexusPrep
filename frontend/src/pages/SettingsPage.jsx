import React from 'react';
import { Panel, SectionLabel } from '../components/Layout';

const SETTINGS = [
  { title: "Camera analysis",    sub: "Face visibility, eye contact, camera angle" },
  { title: "Microphone analysis", sub: "Speech rate, pauses, volume consistency" },
  { title: "Local reports",       sub: "Store transcripts and feedback on this device" },
];

export function SettingsPage() {
  return (
    <Panel className="p-5" style={{ maxWidth: 640 }}>
      <SectionLabel>Preferences</SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {SETTINGS.map(({ title, sub }) => (
          <label
            key={title}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              gap: 16, padding: '14px 0',
              borderBottom: '1px solid var(--border)',
              cursor: 'pointer',
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)', marginBottom: 2 }}>{title}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{sub}</div>
            </div>
            <input type="checkbox" defaultChecked className="iv-toggle" />
          </label>
        ))}
      </div>
    </Panel>
  );
}
