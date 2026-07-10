import React, { useEffect, useState } from 'react';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Panel, SectionLabel } from '../components/Layout';
import { ReportDetails } from '../components/ReportDetails';
import { getSession, deleteSession } from '../services/api';

export function ResultsPage({ go, sessionId }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const handleDeleteSession = async (sid) => {
    try {
      await deleteSession(sid);
      go('dashboard');
    } catch (err) {
      alert(`Failed to delete session: ${err.message}`);
    }
  };

  useEffect(() => {
    if (!sessionId) {
      setError("No active session recorded. Go to dashboard to start a new interview.");
      setLoading(false);
      return;
    }
    const fetchSession = async () => {
      try {
        setLoading(true);
        const data = await getSession(sessionId);
        setSession(data);
        setError(null);
      } catch (err) {
        setError(err.message || "Failed to load session details.");
      } finally {
        setLoading(false);
      }
    };
    fetchSession();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="min-h-[400px] grid place-items-center">
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <Loader2 className="animate-spin mx-auto mb-3" size={22} style={{ color: 'var(--accent)' }} />
          <div style={{ fontSize: '0.82rem' }}>Retrieving interview results…</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Panel className="p-6">
        <div style={{ textAlign: 'center' }}>
          <AlertCircle size={40} style={{ color: 'var(--alarm)', margin: '0 auto 12px' }} />
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Could not load report</div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{error}</p>
        </div>
      </Panel>
    );
  }

  return (
    <div className="space-y-4 iv-fade-in">
      <Panel className="p-4">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'var(--success-glow)', border: '1px solid rgba(34,197,94,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <CheckCircle2 size={18} style={{ color: 'var(--signal)' }} />
          </div>
          <div>
            <SectionLabel color="var(--signal)">Evaluation Summary</SectionLabel>
            <h1 className="iv-display" style={{ fontSize: '1.4rem', color: 'var(--text-primary)' }}>
              Interview Complete
            </h1>
          </div>
        </div>
      </Panel>

      <ReportDetails session={session} onDelete={handleDeleteSession} />
    </div>
  );
}
