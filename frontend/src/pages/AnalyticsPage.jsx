import React, { useEffect, useState } from 'react';
import { BarChart3, Clock, Zap, Loader2, AlertCircle, Award, Target } from 'lucide-react';
import { Panel, SectionLabel } from '../components/Layout';
import { StatCard } from '../components/Cards';
import { COLORS } from '../utils/constants';
import { getSessions, getGlobalSkills } from '../services/api';
import { SkillRadarChart, SkillHeatmap } from '../components/SkillRadar';

export function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [sessions, setSessions] = useState([]);
  const [skillsData, setSkillsData] = useState({
    skills: {}, best: null, weakest: null, average: 50, recommendations: [],
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [sessionsData, skillsSummary] = await Promise.all([getSessions(), getGlobalSkills()]);
        setSessions(sessionsData);
        setSkillsData(skillsSummary);
        setError(null);
      } catch (err) {
        console.error('[AnalyticsPage] Failed to fetch analytics:', err);
        setError(err.message || 'Failed to load analytics.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[400px] grid place-items-center">
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <Loader2 className="animate-spin mx-auto mb-3" size={22} style={{ color: 'var(--accent)' }} />
          <div style={{ fontSize: '0.82rem' }}>Compiling your skill profile…</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Panel className="p-6">
        <div style={{ textAlign: 'center' }}>
          <AlertCircle size={40} style={{ color: 'var(--alarm)', margin: '0 auto 12px' }} />
          <div style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 8 }}>Could not load analytics</div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{error}</p>
        </div>
      </Panel>
    );
  }

  const hasData = sessions.length > 0;

  if (!hasData) {
    return (
      <Panel className="p-6">
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <BarChart3 size={40} style={{ color: 'var(--text-faint)', margin: '0 auto 12px' }} />
          <div style={{ fontWeight: 600, marginBottom: 8 }}>No interviews yet</div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', maxWidth: 400, margin: '0 auto' }}>
            Complete at least one interview to unlock your skill radar, confidence tracker, and AI recommendations.
          </p>
        </div>
      </Panel>
    );
  }

  const lastSession = sessions[0];
  const lastScore   = lastSession ? (lastSession.average_score ?? lastSession.averageScore ?? 0) : 0;
  const overallAvg  = Math.round(
    sessions.reduce((acc, s) => acc + (s.average_score ?? s.averageScore ?? 0), 0) / sessions.length
  );

  return (
    <div className="space-y-4 iv-fade-in">
      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-4">
        <StatCard
          label="Overall Average" value={overallAvg} suffix="%"
          color={overallAvg >= 80 ? COLORS.signal : overallAvg >= 65 ? COLORS.amber : COLORS.alarm}
          icon={Zap} sub={`${sessions.length} sessions`}
        />
        <StatCard
          label="Last Interview" value={lastScore} suffix="%"
          color={lastScore >= 80 ? COLORS.signal : lastScore >= 65 ? COLORS.amber : COLORS.alarm}
          icon={Clock} sub={lastSession ? lastSession.type : '—'}
        />
        <StatCard
          label="Best Skill" value={skillsData.best ? Math.round(skillsData.best.score) : 0} suffix="%"
          color={COLORS.blue} icon={Award}
          sub={skillsData.best ? skillsData.best.skill.replace('_', ' ').toUpperCase() : 'N/A'}
        />
      </div>

      <div className="grid xl:grid-cols-[1.2fr_0.8fr] gap-4">
        {/* Radar Chart */}
        <Panel className="p-4">
          <SectionLabel>Skill Radar</SectionLabel>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 12 }}>
            Visual breakdown of your core competencies across all sessions.
          </p>
          <div style={{ minHeight: 260, display: 'grid', placeItems: 'center' }}>
            <SkillRadarChart skills={skillsData.skills} />
          </div>
        </Panel>

        {/* AI Recommendations */}
        <Panel className="p-4">
          <SectionLabel>AI Action Items</SectionLabel>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 12 }}>
            Focus areas based on your weakest skill scores.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 280, overflowY: 'auto' }}>
            {skillsData.recommendations && skillsData.recommendations.length > 0 ? (
              skillsData.recommendations.map((rec, index) => (
                <div key={index} style={{
                  padding: '10px 12px', borderRadius: 8,
                  background: 'var(--panel2)',
                  borderLeft: `3px solid ${rec.score < 60 ? COLORS.alarm : COLORS.amber}`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {rec.skill.replace('_', ' ')}
                    </span>
                    <span style={{
                      fontSize: '0.75rem', fontWeight: 700,
                      color: rec.score < 60 ? COLORS.alarm : COLORS.amber,
                    }}>
                      {Math.round(rec.score)}%
                    </span>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>{rec.recommendation}</p>
                </div>
              ))
            ) : (
              <div style={{
                display: 'grid', placeItems: 'center', textAlign: 'center',
                padding: 24, border: '1px dashed var(--border)', borderRadius: 8, background: 'var(--panel2)',
              }}>
                <div>
                  <Target size={24} style={{ color: 'var(--signal)', margin: '0 auto 8px' }} />
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--signal)' }}>All Clear</div>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>No critical weaknesses detected.</p>
                </div>
              </div>
            )}
          </div>
        </Panel>
      </div>

      {/* Heatmap */}
      <Panel className="p-4">
        <SectionLabel>Skill Heatmap</SectionLabel>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 12 }}>
          Full competency matrix across all 15 core disciplines.
        </p>
        <SkillHeatmap skills={skillsData.skills} />
      </Panel>
    </div>
  );
}
