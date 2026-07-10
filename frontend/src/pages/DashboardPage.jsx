import React, { useEffect, useState } from 'react';
import { Radio, FileText, Mic, Trophy, Sparkles, Loader2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Panel, SectionLabel } from '../components/Layout';
import { BrutalButton, StatCard } from '../components/Cards';
import { COLORS } from '../utils/constants';
import { getSessions } from '../services/api';

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const score = payload[0].value;
    const color = score >= 80 ? COLORS.signal : score >= 60 ? COLORS.amber : COLORS.alarm;
    return (
      <div style={{
        background: 'var(--panel2)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: '8px 12px',
        fontSize: '0.78rem',
      }}>
        <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
          {payload[0].payload.type}
        </div>
        <div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>{payload[0].payload.date}</div>
        <div style={{ color, fontWeight: 600 }}>{score}%</div>
      </div>
    );
  }
  return null;
};

export function DashboardPage({ go }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const data = await getSessions();
        setSessions(data);
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };
    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[400px] grid place-items-center">
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <Loader2 className="animate-spin mx-auto mb-3" size={22} style={{ color: 'var(--accent)' }} />
          <div style={{ fontSize: '0.82rem' }}>Loading dashboard…</div>
        </div>
      </div>
    );
  }

  const total = sessions.length;

  let totalAnswers = 0;
  sessions.forEach(s => { if (s.answers) totalAnswers += s.answers.length; });
  const xp = totalAnswers * 15;

  let streak = 0;
  const dates = sessions
    .map(s => new Date(s.started_at).toDateString())
    .filter((v, i, a) => a.indexOf(v) === i);
  const today     = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  if (dates.includes(today) || dates.includes(yesterday)) {
    let current = dates.includes(today) ? new Date() : new Date(Date.now() - 86400000);
    while (dates.includes(current.toDateString())) {
      streak += 1;
      current.setDate(current.getDate() - 1);
    }
  }

  const chartData = [...sessions].reverse().map(s => ({
    date:  new Date(s.started_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    score: s.average_score || 0,
    type:  s.type,
  }));

  return (
    <div className="space-y-5 iv-fade-in">

      {/* ── Hero ── */}
      <Panel className="p-5 md:p-6">
        <div className="grid lg:grid-cols-[1fr_auto] gap-5 items-center">
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--accent)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              AI Interview Coach
            </div>
            <h1 className="iv-display" style={{ fontSize: 'clamp(1.6rem, 4vw, 2.6rem)', lineHeight: 1.15, color: 'var(--text-primary)' }}>
              Welcome back
            </h1>
            <p style={{ maxWidth: 480, marginTop: 8, fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Resume your practice, review recent scores, or start a fresh interview session.
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 180 }}>
            <BrutalButton icon={Radio} onClick={() => go("setup")} className="w-full">
              Start Interview
            </BrutalButton>
            <BrutalButton icon={FileText} variant="outline" onClick={() => go("history")} className="w-full">
              View History
            </BrutalButton>
          </div>
        </div>
      </Panel>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Interviews"    value={total} icon={Mic}      color="var(--accent)" />
        <StatCard label="XP Earned"     value={xp}    icon={Trophy}   color={COLORS.amber}  sub="TOTAL XP" />
        <StatCard label="Day Streak"    value={streak} icon={Sparkles} color={COLORS.signal} sub="DAYS" />
      </div>

      {/* ── Charts Row ── */}
      <div className="grid xl:grid-cols-[1.3fr_0.7fr] gap-4">

        {/* Progress Chart */}
        <Panel className="p-4">
          <SectionLabel>Score Progress</SectionLabel>
          {total === 0 ? (
            <div style={{
              minHeight: 240, display: 'grid', placeItems: 'center', textAlign: 'center',
              border: '1px dashed var(--border)', borderRadius: 8, background: 'var(--panel2)', marginTop: 8
            }}>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>No data yet</div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-faint)' }}>Run an interview to see your score trend.</p>
              </div>
            </div>
          ) : (
            <div style={{ width: '100%', height: 240, marginTop: 8 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -28, bottom: 0 }}>
                  <defs>
                    <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={COLORS.accent} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={COLORS.accent} stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" stroke="var(--border)" tick={{ fill: '#666', fontSize: 11, fontFamily: 'Inter' }} />
                  <YAxis domain={[0, 100]} stroke="var(--border)" tick={{ fill: '#666', fontSize: 11, fontFamily: 'Inter' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone" dataKey="score"
                    stroke={COLORS.accent} strokeWidth={2}
                    fillOpacity={1} fill="url(#scoreGrad)"
                    dot={{ fill: COLORS.accent, strokeWidth: 0, r: 3 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>

        {/* Recent Activity */}
        <Panel className="p-4">
          <SectionLabel>Recent Activity</SectionLabel>
          {total === 0 ? (
            <div style={{
              minHeight: 240, display: 'grid', placeItems: 'center', textAlign: 'center',
              border: '1px dashed var(--border)', borderRadius: 8, background: 'var(--panel2)', marginTop: 8
            }}>
              <div>
                <FileText size={28} style={{ color: 'var(--text-faint)', margin: '0 auto 8px' }} />
                <p style={{ fontSize: '0.78rem', color: 'var(--text-faint)' }}>No interviews yet</p>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8, maxHeight: 260, overflowY: 'auto' }}>
              {sessions.slice(0, 5).map(s => {
                const avgScore  = s.average_score !== undefined ? s.average_score : s.averageScore || 0;
                const scoreCol  = avgScore >= 80 ? COLORS.signal : avgScore >= 60 ? COLORS.amber : COLORS.alarm;
                return (
                  <div
                    key={s.id}
                    onClick={() => go("history")}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '10px 12px',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      background: 'var(--panel2)',
                      cursor: 'pointer',
                      transition: 'border-color 0.15s, background 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#3a3a3a'; e.currentTarget.style.background = '#1c1c1c'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--panel2)'; }}
                  >
                    <div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {s.type} · {s.difficulty}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                        {new Date(s.started_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <span style={{
                      fontSize: '0.82rem', fontWeight: 700, color: scoreCol,
                      background: `${scoreCol}18`, padding: '3px 8px', borderRadius: 20,
                    }}>
                      {avgScore}%
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}