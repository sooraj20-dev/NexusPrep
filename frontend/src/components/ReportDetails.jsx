import { Calendar, Clock, BarChart2, CheckCircle2, AlertTriangle, Lightbulb, Trash2 } from 'lucide-react';
import { COLORS } from '../utils/constants';

const GRADE_COLORS = {
  Excellent: COLORS.signal,
  Good:      '#3b82f6',
  Fair:      COLORS.amber,
  'Needs Work': COLORS.alarm,
};

function ScoreRing({ score }) {
  const color = score >= 80 ? COLORS.signal : score >= 60 ? COLORS.amber : COLORS.alarm;
  const circumference = 2 * Math.PI * 28;
  const dash = (score / 100) * circumference;
  return (
    <div style={{ position: 'relative', width: 72, height: 72, flexShrink: 0 }}>
      <svg width="72" height="72" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="36" cy="36" r="28" fill="none" stroke="var(--panel2)" strokeWidth="5" />
        <circle
          cx="36" cy="36" r="28" fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={`${dash} ${circumference}`}
          style={{ transition: 'stroke-dasharray 0.8s ease' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontFamily: "'JetBrains Mono', monospace",
        fontSize: '0.88rem', fontWeight: 700, color,
      }}>
        {score}%
      </div>
    </div>
  );
}

export function ReportDetails({ session, onDelete }) {
  if (!session) return null;

  const formatDate = (isoString) => {
    if (!isoString) return '—';
    try {
      return new Date(isoString).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
    } catch { return isoString; }
  };

  const avgScore   = session.average_score !== undefined ? session.average_score : session.averageScore || 0;
  const scoreColor = avgScore >= 80 ? COLORS.signal : avgScore >= 60 ? COLORS.amber : COLORS.alarm;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* ── Summary Card ── */}
      <div style={{ padding: '16px', border: '1px solid var(--border)', borderRadius: 12, background: 'var(--panel2)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{
                fontSize: '0.72rem', fontWeight: 700, padding: '3px 8px',
                borderRadius: 20, background: `${scoreColor}20`, color: scoreColor,
              }}>
                {session.difficulty}
              </span>
              {onDelete && (
                <button
                  onClick={() => {
                    if (window.confirm("Delete this report? This cannot be undone.")) {
                      onDelete(session.id || session.sessionId);
                    }
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    fontSize: '0.72rem', fontWeight: 600, padding: '3px 8px',
                    borderRadius: 20, border: '1px solid rgba(239,68,68,0.3)',
                    background: 'var(--error-glow)', color: 'var(--alarm)',
                    cursor: 'pointer',
                  }}
                >
                  <Trash2 size={11} /> Delete
                </button>
              )}
            </div>
            <h2 style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--text-primary)', marginBottom: 8 }}>
              {session.type} Session
            </h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <Calendar size={13} /> {formatDate(session.started_at)}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <Clock size={13} /> {session.duration}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <BarChart2 size={13} /> {session.answers?.length || 0} / {session.max_questions} Answered
              </span>
            </div>
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px',
            background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10,
          }}>
            <ScoreRing score={avgScore} />
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                Average Score
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: scoreColor }}>
                {avgScore >= 80 ? 'Excellent' : avgScore >= 60 ? 'Passing' : 'Needs Work'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Q&A Breakdown ── */}
      <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: -8 }}>
        Question & Evaluation Log
      </div>

      {(!session.answers || session.answers.length === 0) ? (
        <div style={{
          padding: 24, textAlign: 'center',
          border: '1px dashed var(--border)', borderRadius: 8, background: 'var(--panel2)',
        }}>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>No answers were submitted during this session.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {session.answers.map((item, index) => {
            const gradeColor = GRADE_COLORS[item.evaluation?.grade] || COLORS.steel;
            return (
              <div key={index} style={{
                padding: '16px', border: '1px solid var(--border)',
                borderRadius: 12, background: 'var(--panel2)',
              }}>
                {/* Question header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Q{index + 1}
                    </span>
                    <h4 style={{ fontWeight: 600, fontSize: '0.9rem', marginTop: 4, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                      {item.question}
                    </h4>
                  </div>
                  {item.evaluation && (
                    <span style={{
                      flexShrink: 0, fontSize: '0.72rem', fontWeight: 700,
                      padding: '4px 10px', borderRadius: 20,
                      background: `${gradeColor}20`, color: gradeColor,
                      whiteSpace: 'nowrap',
                    }}>
                      {item.evaluation.score}% · {item.evaluation.grade}
                    </span>
                  )}
                </div>

                {/* Answer */}
                <div style={{ marginBottom: item.evaluation ? 12 : 0 }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                    Your Answer
                  </div>
                  <p style={{
                    padding: '10px 12px', borderRadius: 8, fontSize: '0.82rem',
                    background: 'var(--panel)', border: '1px solid var(--border-muted)',
                    color: 'var(--text-primary)', whiteSpace: 'pre-wrap', lineHeight: 1.6,
                  }}>
                    {item.answer || '—'}
                  </p>
                </div>

                {/* AI Evaluation */}
                {item.evaluation && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                    {item.evaluation.strengths && (
                      <div style={{ fontSize: '0.78rem' }}>
                        <div style={{ fontWeight: 600, color: COLORS.signal, display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                          <CheckCircle2 size={12} /> Strengths
                        </div>
                        <p style={{ color: 'var(--text-muted)', lineHeight: 1.5 }}>{item.evaluation.strengths}</p>
                      </div>
                    )}
                    {item.evaluation.improvements && (
                      <div style={{ fontSize: '0.78rem' }}>
                        <div style={{ fontWeight: 600, color: COLORS.amber, display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                          <AlertTriangle size={12} /> Improve
                        </div>
                        <p style={{ color: 'var(--text-muted)', lineHeight: 1.5 }}>{item.evaluation.improvements}</p>
                      </div>
                    )}
                    {item.evaluation.tip && (
                      <div style={{ fontSize: '0.78rem' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                          <Lightbulb size={12} /> Tip
                        </div>
                        <p style={{ color: 'var(--text-muted)', lineHeight: 1.5 }}>{item.evaluation.tip}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
