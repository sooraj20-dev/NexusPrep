import React, { useEffect, useState } from 'react';
import { FileText, Loader2, AlertCircle, Trash2 } from 'lucide-react';
import { Panel, SectionLabel } from '../components/Layout';
import { COLORS } from '../utils/constants';
import { getSessions, deleteSession } from '../services/api';
import { ReportDetails } from '../components/ReportDetails';

export function HistoryPage() {
  const [sessions, setSessions]             = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState(null);

  const handleDeleteSession = async (sid) => {
    try {
      await deleteSession(sid);
      const updated = sessions.filter(s => (s.id || s.sessionId) !== sid);
      setSessions(updated);
      if (selectedSession?.id === sid || selectedSession?.sessionId === sid) {
        setSelectedSession(updated.length > 0 ? updated[0] : null);
      }
    } catch (err) {
      alert(`Failed to delete session: ${err.message}`);
    }
  };

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const data = await getSessions();
        setSessions(data);
        if (data.length > 0) setSelectedSession(data[0]);
        setError(null);
      } catch (err) {
        setError(err.message || "Failed to load interview history.");
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const formatDateString = (isoString) => {
    if (!isoString) return '—';
    try {
      return new Date(isoString).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
    } catch { return isoString; }
  };

  if (loading) {
    return (
      <div className="min-h-[400px] grid place-items-center">
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <Loader2 className="animate-spin mx-auto mb-3" size={22} style={{ color: 'var(--accent)' }} />
          <div style={{ fontSize: '0.82rem' }}>Loading history…</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Panel className="p-6">
        <div style={{ textAlign: 'center' }}>
          <AlertCircle size={40} style={{ color: 'var(--alarm)', margin: '0 auto 12px' }} />
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Could not load history</div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{error}</p>
        </div>
      </Panel>
    );
  }

  return (
    <div className="grid lg:grid-cols-[300px_1fr] gap-4 iv-fade-in">
      {/* ── Left: History List ── */}
      <Panel className="p-4 flex flex-col" style={{ height: 'calc(100vh - 180px)', overflow: 'hidden' }}>
        <SectionLabel>Archive</SectionLabel>

        {sessions.length === 0 ? (
          <div style={{
            flex: 1, display: 'grid', placeItems: 'center', textAlign: 'center',
            border: '1px dashed var(--border)', borderRadius: 8, background: 'var(--panel2)', marginTop: 8
          }}>
            <div>
              <FileText size={28} style={{ color: 'var(--text-faint)', margin: '0 auto 8px' }} />
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No interviews yet</div>
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, overflowY: 'auto', marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {sessions.map(s => {
              const active    = selectedSession?.id === s.id;
              const avgScore  = s.average_score !== undefined ? s.average_score : s.averageScore || 0;
              const scoreCol  = avgScore >= 80 ? COLORS.signal : avgScore >= 60 ? COLORS.amber : COLORS.alarm;
              return (
                <div
                  key={s.id}
                  onClick={() => setSelectedSession(s)}
                  style={{
                    padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                    border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                    background: active ? 'var(--accent-glow)' : 'var(--panel2)',
                    transition: 'border-color 0.15s, background 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {s.type}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        fontSize: '0.75rem', fontWeight: 700, color: scoreCol,
                        background: `${scoreCol}18`, padding: '2px 7px', borderRadius: 12,
                      }}>
                        {avgScore}%
                      </span>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          if (window.confirm("Delete this report? This cannot be undone.")) {
                            handleDeleteSession(s.id || s.sessionId);
                          }
                        }}
                        style={{
                          background: 'transparent', border: 'none', cursor: 'pointer',
                          color: 'var(--text-faint)', padding: 2, borderRadius: 4, display: 'flex',
                          transition: 'color 0.15s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--alarm)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-faint)'}
                        title="Delete report"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    <span>{s.difficulty}</span>
                    <span>{formatDateString(s.started_at)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      {/* ── Right: Report Detail ── */}
      <Panel className="p-4" style={{ height: 'calc(100vh - 180px)', overflowY: 'auto' }}>
        {selectedSession ? (
          <ReportDetails session={selectedSession} onDelete={handleDeleteSession} />
        ) : (
          <div style={{
            height: '100%', display: 'grid', placeItems: 'center', textAlign: 'center',
            border: '1px dashed var(--border)', borderRadius: 8, background: 'var(--panel2)',
          }}>
            <div>
              <FileText size={36} style={{ color: 'var(--text-faint)', margin: '0 auto 10px' }} />
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Select a session to view details</p>
            </div>
          </div>
        )}
      </Panel>
    </div>
  );
}
