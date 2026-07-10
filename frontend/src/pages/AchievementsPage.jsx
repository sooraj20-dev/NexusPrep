import React from 'react';
import { Trophy } from 'lucide-react';
import { Panel } from '../components/Layout';

export function AchievementsPage() {
  return (
    <Panel className="p-5">
      <div style={{
        minHeight: 360, display: 'grid', placeItems: 'center', textAlign: 'center',
        border: '1px dashed var(--border)', borderRadius: 8, background: 'var(--panel2)',
      }}>
        <div>
          <div style={{
            width: 64, height: 64, borderRadius: 16,
            background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
          }}>
            <Trophy size={28} style={{ color: 'var(--amber)' }} />
          </div>
          <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 8 }}>No Achievements Yet</div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', maxWidth: 340, margin: '0 auto' }}>
            Complete interview sessions to unlock achievements and track your milestones.
          </p>
        </div>
      </div>
    </Panel>
  );
}
