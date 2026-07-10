import React, { useState, useEffect, useCallback } from 'react';
import {
  Home, Mic, BarChart3, CalendarDays, Award, Settings,
  ShieldCheck, Wifi, WifiOff, Zap
} from 'lucide-react';
import { LandingPage }      from './pages/LandingPage';
import { DashboardPage }    from './pages/DashboardPage';
import { SetupPage }        from './pages/SetupPage';
import { CalibrationPage }  from './pages/CalibrationPage';
import { InterviewPage }    from './pages/InterviewPage';
import { ResultsPage }      from './pages/ResultsPage';
import { AnalyticsPage }    from './pages/AnalyticsPage';
import { HistoryPage }      from './pages/HistoryPage';
import { AchievementsPage } from './pages/AchievementsPage';
import { SettingsPage }     from './pages/SettingsPage';
import { pageTitles }       from './utils/constants';
import { checkHealth }      from './services/api';
import './App.css';

const navItems = [
  { id: "dashboard",    label: "Dashboard",     icon: Home },
  { id: "setup",        label: "New Interview",  icon: Mic },
  { id: "analytics",   label: "Analytics",      icon: BarChart3 },
  { id: "history",     label: "History",        icon: CalendarDays },
  { id: "achievements",label: "Achievements",    icon: Award },
  { id: "settings",    label: "Settings",       icon: Settings },
];

function App() {
  const [page, setPage] = useState("landing");
  const [sessionConfig, setSessionConfig] = useState({ type: "SQL", difficulty: "Mid", duration: "30 mins" });
  const [sessionId, setSessionId] = useState(null);
  const [backendStatus, setBackendStatus] = useState("checking");

  const navigate = useCallback((newPage) => {
    if (newPage === "setup" || newPage === "calibration") {
      setSessionId(null);
      if (newPage === "setup") {
        setSessionConfig(prev => ({ ...prev, resumeText: undefined }));
      }
    }
    setPage(newPage);
  }, []);

  const pollHealth = useCallback(async () => {
    try {
      const health = await checkHealth();
      setBackendStatus(health.ollama ? "connected" : "ollama_offline");
    } catch {
      setBackendStatus("offline");
    }
  }, []);

  useEffect(() => {
    pollHealth();
    const interval = setInterval(pollHealth, 15000);
    return () => clearInterval(interval);
  }, [pollHealth]);

  const statusDot = {
    checking:      { color: "var(--amber)",  label: "Connecting" },
    connected:     { color: "var(--signal)", label: "Online" },
    ollama_offline:{ color: "var(--amber)",  label: "Ollama offline" },
    offline:       { color: "var(--alarm)",  label: "Offline" },
  }[backendStatus] || { color: "var(--steel)", label: "Unknown" };

  const renderPage = () => {
    switch (page) {
      case "landing":      return <LandingPage go={navigate} />;
      case "dashboard":    return <DashboardPage go={navigate} />;
      case "setup":        return <SetupPage go={navigate} sessionConfig={sessionConfig} setSessionConfig={setSessionConfig} />;
      case "calibration":  return <CalibrationPage go={navigate} sessionConfig={sessionConfig} />;
      case "interview":    return <InterviewPage go={navigate} sessionConfig={sessionConfig} sessionId={sessionId} setSessionId={setSessionId} />;
      case "results":      return <ResultsPage go={navigate} sessionId={sessionId} />;
      case "analytics":    return <AnalyticsPage />;
      case "history":      return <HistoryPage />;
      case "achievements": return <AchievementsPage />;
      case "settings":     return <SettingsPage />;
      default:             return <DashboardPage go={navigate} />;
    }
  };

  // Landing page renders full-screen without the sidebar shell
  if (page === 'landing') {
    return (
      <div style={{ background: 'var(--ink)', minHeight: '100vh' }}>
        {renderPage()}
      </div>
    );
  }

  return (
    <div
      className="iv-root min-h-screen"
      style={{ background: 'var(--ink)', color: 'var(--text-primary)', fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      <div className="iv-shell" style={{ height: '100vh', overflow: 'hidden' }}>

        {/* ── Sidebar ── */}
        <aside className="iv-sidebar flex flex-col" style={{ padding: '16px 12px' }}>
          {/* Logo */}
          <div style={{ padding: '4px 8px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: 'var(--accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Zap size={15} color="#fff" />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', lineHeight: 1.1 }}>InterviewOS</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 1 }}>AI Coach</div>
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav className="iv-nav flex flex-col gap-0.5 flex-1">
            {navItems.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => navigate(id)}
                data-active={page === id}
                className="iv-nav-item"
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </nav>

          {/* Footer */}
          <div style={{ padding: '12px 8px 4px', borderTop: '1px solid var(--border)', marginTop: 8 }}>
            {/* Status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
              <div style={{
                width: 7, height: 7, borderRadius: '50%',
                background: statusDot.color,
                flexShrink: 0,
                boxShadow: `0 0 6px ${statusDot.color}`,
              }} />
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{statusDot.label}</span>
            </div>
            {/* Privacy note */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <ShieldCheck size={13} style={{ color: 'var(--signal)', flexShrink: 0 }} />
              <span style={{ fontSize: '0.68rem', color: 'var(--text-faint)', lineHeight: 1.4 }}>Local-first · Private</span>
            </div>
          </div>
        </aside>

        {/* ── Main ── */}
        <main style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%', minWidth: 0 }}>
          {/* Header */}
          <header style={{
            padding: '14px 24px',
            borderBottom: '1px solid var(--border)',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--panel)',
          }}>
            <h1 style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)' }}>
              {pageTitles[page]}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: '0.75rem' }}>
              {backendStatus === 'connected'
                ? <Wifi size={14} style={{ color: 'var(--signal)' }} />
                : <WifiOff size={14} style={{ color: 'var(--alarm)' }} />
              }
              <span style={{ color: statusDot.color }}>{statusDot.label}</span>
            </div>
          </header>

          {/* Page Content */}
          <div
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: page === 'interview' ? 'hidden' : 'auto',
              overflowX: 'hidden',
            }}
            className={page !== 'interview' ? 'p-4 md:p-6' : ''}
          >
            {renderPage()}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
