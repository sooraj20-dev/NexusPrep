import React, { useState, useEffect, useRef } from 'react';
import {
  Zap, Mic, BarChart3, Eye, Brain, Shield, Award, ArrowRight,
  Play, Star, CheckCircle, TrendingUp, Clock, Users, ChevronDown
} from 'lucide-react';

/* ── Animated Counter ─────────────────────────────────────── */
function AnimatedCounter({ target, suffix = '', duration = 2000 }) {
  const [value, setValue] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const start = performance.now();
        const step = (now) => {
          const progress = Math.min((now - start) / duration, 1);
          const ease = 1 - Math.pow(1 - progress, 3);
          setValue(Math.floor(ease * target));
          if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }
    }, { threshold: 0.5 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);

  return <span ref={ref}>{value}{suffix}</span>;
}

/* ── Floating Particle ─────────────────────────────────────── */
function Particles() {
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 3 + 1,
    delay: Math.random() * 4,
    duration: Math.random() * 6 + 4,
  }));

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {particles.map(p => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            background: p.id % 3 === 0 ? 'var(--accent)' : p.id % 3 === 1 ? 'var(--signal)' : 'var(--blue)',
            opacity: 0.4,
            animation: `floatParticle ${p.duration}s ${p.delay}s ease-in-out infinite alternate`,
          }}
        />
      ))}
    </div>
  );
}

/* ── Feature Card ──────────────────────────────────────────── */
function FeatureCard({ icon: Icon, title, desc, color, delay = 0 }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? 'rgba(99,102,241,0.06)' : 'var(--panel)',
        border: `1px solid ${hovered ? color : 'var(--border)'}`,
        borderRadius: 16,
        padding: '28px 24px',
        cursor: 'default',
        transition: 'all 0.3s ease',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: hovered ? `0 20px 40px rgba(0,0,0,0.4), 0 0 0 1px ${color}22` : 'none',
        animationDelay: `${delay}ms`,
      }}
      className="iv-fade-in"
    >
      <div style={{
        width: 48, height: 48, borderRadius: 12,
        background: `${color}18`,
        border: `1px solid ${color}33`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 16,
        transition: 'transform 0.3s ease',
        transform: hovered ? 'scale(1.1)' : 'scale(1)',
      }}>
        <Icon size={22} color={color} />
      </div>
      <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 8, color: 'var(--text-primary)' }}>{title}</h3>
      <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>{desc}</p>
    </div>
  );
}

/* ── Mode Badge ────────────────────────────────────────────── */
function ModeBadge({ label, emoji, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '8px 16px',
        borderRadius: 99,
        border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
        background: active ? 'rgba(99,102,241,0.15)' : 'var(--panel2)',
        color: active ? 'var(--accent)' : 'var(--text-muted)',
        fontSize: '0.82rem',
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        display: 'flex', alignItems: 'center', gap: 6,
      }}
    >
      <span>{emoji}</span> {label}
    </button>
  );
}

/* ── Main Landing Page ─────────────────────────────────────── */
export function LandingPage({ go }) {
  const [activeMode, setActiveMode] = useState('SQL');
  const [ctaHovered, setCtaHovered] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const modes = [
    { label: 'SQL', emoji: '🗄️' },
    { label: 'Python', emoji: '🐍' },
    { label: 'Data Science', emoji: '📊' },
    { label: 'HR', emoji: '🤝' },
    { label: 'Koios Sim', emoji: '🚀' },
  ];

  const features = [
    {
      icon: Mic,
      title: 'Live AI Interview',
      desc: 'Real-time voice-driven interview with intelligent follow-up questions and dynamic difficulty adaptation.',
      color: '#6366f1',
    },
    {
      icon: Eye,
      title: 'Eye Contact Tracking',
      desc: 'Computer vision metrics track your gaze, posture, and confidence in real time via your webcam.',
      color: '#22c55e',
    },
    {
      icon: BarChart3,
      title: 'Performance Analytics',
      desc: 'Deep-dive into speech rate, technical accuracy, confidence scores, and communication trends.',
      color: '#3b82f6',
    },
    {
      icon: Brain,
      title: 'AI Feedback Engine',
      desc: 'Local LLM-powered scoring provides instant, private, and detailed feedback on every response.',
      color: '#f59e0b',
    },
    {
      icon: Award,
      title: 'Achievements & Streaks',
      desc: 'Gamified progress system with badges, milestones, and daily streaks to keep you motivated.',
      color: '#ec4899',
    },
    {
      icon: Shield,
      title: 'Local-First & Private',
      desc: 'All processing happens on your machine. Zero data leaves your device. Full privacy guaranteed.',
      color: '#14b8a6',
    },
  ];

  const stats = [
    { label: 'Interview Modes', value: 5, suffix: '+', icon: Brain },
    { label: 'Metrics Tracked', value: 6, suffix: '', icon: BarChart3 },
    { label: 'Avg Score Boost', value: 32, suffix: '%', icon: TrendingUp },
    { label: 'Session Lengths', value: 3, suffix: '', icon: Clock },
  ];

  const personas = [
    { emoji: '😊', name: 'Friendly Coach', desc: 'Perfect for beginners' },
    { emoji: '👔', name: 'Professional', desc: 'Standard interview style' },
    { emoji: '🧑‍⚖️', name: 'Strict Examiner', desc: 'Maximum challenge' },
    { emoji: '💻', name: 'Senior Engineer', desc: 'Deep technical focus' },
    { emoji: '🤝', name: 'HR Recruiter', desc: 'Behavioral questions' },
    { emoji: '🚀', name: 'Startup Founder', desc: 'Fast & impact-driven' },
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--ink)',
      color: 'var(--text-primary)',
      fontFamily: "'Inter', system-ui, sans-serif",
      overflowX: 'hidden',
    }}>

      {/* ── Keyframes injected once ── */}
      <style>{`
        @keyframes floatParticle {
          from { transform: translateY(0px) translateX(0px); opacity: 0.2; }
          to   { transform: translateY(-30px) translateX(10px); opacity: 0.6; }
        }
        @keyframes heroGlow {
          0%, 100% { opacity: 0.4; }
          50%       { opacity: 0.7; }
        }
        @keyframes heroPulse {
          0%, 100% { transform: scale(1); }
          50%       { transform: scale(1.04); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .hero-title {
          background: linear-gradient(135deg, #f0f0f0 0%, #a5b4fc 40%, #818cf8 70%, #f0f0f0 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 4s linear infinite;
        }
        .land-cta-btn {
          position: relative;
          overflow: hidden;
        }
        .land-cta-btn::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 50%, transparent 100%);
          transform: translateX(-100%);
          transition: transform 0.6s ease;
        }
        .land-cta-btn:hover::after {
          transform: translateX(100%);
        }
        .land-section-reveal {
          animation: slideUp 0.6s ease forwards;
        }
        @keyframes borderRotate {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>

      {/* ── Top Nav ── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        padding: '14px 40px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: scrolled ? 'rgba(10,10,10,0.92)' : 'transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        borderBottom: scrolled ? '1px solid var(--border)' : '1px solid transparent',
        transition: 'all 0.3s ease',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 16px rgba(99,102,241,0.5)',
          }}>
            <Zap size={18} color="#fff" />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1rem', letterSpacing: '-0.02em' }}>InterviewOS</div>
            <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: -1 }}>AI COACH</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '5px 10px', borderRadius: 99,
            background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)',
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--signal)', boxShadow: '0 0 6px var(--signal)' }} />
            <span style={{ fontSize: '0.7rem', color: 'var(--signal)', fontWeight: 600 }}>Local · Private</span>
          </div>

          <button
            id="nav-enter-btn"
            onClick={() => go('dashboard')}
            style={{
              padding: '8px 20px',
              background: 'var(--accent)',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={e => e.target.style.opacity = 0.85}
            onMouseLeave={e => e.target.style.opacity = 1}
          >
            Open App →
          </button>
        </div>
      </nav>

      {/* ── Hero Section ── */}
      <section style={{
        position: 'relative',
        minHeight: '92vh',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        textAlign: 'center',
        padding: '80px 24px 60px',
        overflow: 'hidden',
      }}>
        {/* Background glow orbs */}
        <div style={{
          position: 'absolute', top: '15%', left: '15%',
          width: 500, height: 500, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)',
          animation: 'heroGlow 4s ease-in-out infinite',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', top: '30%', right: '10%',
          width: 350, height: 350, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(34,197,94,0.10) 0%, transparent 70%)',
          animation: 'heroGlow 5s ease-in-out infinite 1s',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: '10%', left: '30%',
          width: 400, height: 300, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)',
          animation: 'heroGlow 6s ease-in-out infinite 2s',
          pointerEvents: 'none',
        }} />

        <Particles />

        {/* Badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '7px 16px', borderRadius: 99,
          background: 'rgba(99,102,241,0.1)',
          border: '1px solid rgba(99,102,241,0.3)',
          marginBottom: 28,
          animation: 'slideUp 0.5s ease forwards',
        }}>
          <Zap size={13} color="var(--accent)" />
          <span style={{ fontSize: '0.77rem', color: 'var(--accent)', fontWeight: 600 }}>
            AI-Powered · Local-First · Free
          </span>
        </div>

        {/* Hero Title */}
        <h1 className="hero-title" style={{
          fontSize: 'clamp(2.8rem, 7vw, 5.5rem)',
          fontWeight: 900,
          letterSpacing: '-0.04em',
          lineHeight: 1.05,
          marginBottom: 24,
          maxWidth: 900,
          animation: 'slideUp 0.6s ease 0.1s both',
        }}>
          Master Your Interview.<br />On Your Terms.
        </h1>

        {/* Sub */}
        <p style={{
          fontSize: 'clamp(1rem, 2vw, 1.2rem)',
          color: 'var(--text-muted)',
          maxWidth: 600,
          lineHeight: 1.7,
          marginBottom: 44,
          animation: 'slideUp 0.6s ease 0.2s both',
        }}>
          Practice SQL, Python, Data Science, and more with a real-time AI coach that tracks your
          eye contact, confidence, speech, and gives instant feedback — all locally on your machine.
        </p>

        {/* CTA Buttons */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', justifyContent: 'center',
          animation: 'slideUp 0.6s ease 0.3s both',
        }}>
          <button
            id="hero-start-btn"
            className="land-cta-btn"
            onMouseEnter={() => setCtaHovered(true)}
            onMouseLeave={() => setCtaHovered(false)}
            onClick={() => go('setup')}
            style={{
              padding: '14px 32px',
              fontSize: '1rem',
              fontWeight: 800,
              borderRadius: 12,
              border: 'none',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 10,
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              transform: ctaHovered ? 'translateY(-2px)' : 'translateY(0)',
              boxShadow: ctaHovered
                ? '0 16px 40px rgba(99,102,241,0.5), 0 0 0 1px rgba(99,102,241,0.5)'
                : '0 8px 24px rgba(99,102,241,0.3)',
            }}
          >
            <Play size={16} fill="#fff" />
            Start Interview
            <ArrowRight size={16} style={{ transition: 'transform 0.2s', transform: ctaHovered ? 'translateX(3px)' : 'translateX(0)' }} />
          </button>

          <button
            id="hero-dashboard-btn"
            onClick={() => go('dashboard')}
            style={{
              padding: '14px 28px',
              fontSize: '0.9rem',
              fontWeight: 700,
              borderRadius: 12,
              border: '1px solid var(--border)',
              background: 'var(--panel)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
              transition: 'border-color 0.2s, background 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#3a3a3a'; e.currentTarget.style.background = 'var(--panel2)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--panel)'; }}
          >
            <BarChart3 size={15} />
            View Dashboard
          </button>
        </div>

        {/* Scroll hint */}
        <div style={{
          position: 'absolute', bottom: 32,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
          color: 'var(--text-faint)', fontSize: '0.72rem',
          animation: 'slideUp 0.6s ease 0.6s both',
        }}>
          <span>Explore features</span>
          <ChevronDown size={16} style={{ animation: 'heroPulse 2s ease-in-out infinite' }} />
        </div>
      </section>

      {/* ── Stats Bar ── */}
      <section style={{
        padding: '40px 40px',
        borderTop: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)',
        background: 'var(--panel)',
      }}>
        <div style={{
          maxWidth: 900, margin: '0 auto',
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: 32, textAlign: 'center',
        }}>
          {stats.map((s) => (
            <div key={s.label}>
              <div style={{
                fontSize: 'clamp(2rem, 4vw, 2.8rem)',
                fontWeight: 900,
                letterSpacing: '-0.03em',
                color: 'var(--accent)',
                lineHeight: 1,
              }}>
                <AnimatedCounter target={s.value} suffix={s.suffix} />
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 6, fontWeight: 500 }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features Grid ── */}
      <section style={{ padding: '80px 40px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <div style={{
            display: 'inline-block',
            padding: '5px 14px', borderRadius: 99,
            background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)',
            fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent)',
            textTransform: 'uppercase', letterSpacing: '0.1em',
            marginBottom: 16,
          }}>
            Everything You Need
          </div>
          <h2 style={{
            fontSize: 'clamp(1.6rem, 3.5vw, 2.5rem)',
            fontWeight: 800, letterSpacing: '-0.03em',
            marginBottom: 14,
          }}>
            Built for Serious Candidates
          </h2>
          <p style={{ color: 'var(--text-muted)', maxWidth: 500, margin: '0 auto', lineHeight: 1.7 }}>
            Every feature is designed to simulate the real interview experience and accelerate your growth.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 20,
        }}>
          {features.map((f, i) => (
            <FeatureCard key={f.title} {...f} delay={i * 80} />
          ))}
        </div>
      </section>

      {/* ── Interview Modes ── */}
      <section style={{
        padding: '80px 40px',
        background: 'var(--panel)',
        borderTop: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
          <div style={{
            display: 'inline-block',
            padding: '5px 14px', borderRadius: 99,
            background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)',
            fontSize: '0.72rem', fontWeight: 700, color: 'var(--signal)',
            textTransform: 'uppercase', letterSpacing: '0.1em',
            marginBottom: 16,
          }}>
            Interview Modes
          </div>
          <h2 style={{
            fontSize: 'clamp(1.6rem, 3.5vw, 2.5rem)',
            fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 14,
          }}>
            Pick Your Battlefield
          </h2>
          <p style={{ color: 'var(--text-muted)', maxWidth: 480, margin: '0 auto 40px', lineHeight: 1.7 }}>
            Select from five specialized modes tailored to different career paths and interview types.
          </p>

          {/* Mode selector */}
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginBottom: 40,
          }}>
            {modes.map(m => (
              <ModeBadge
                key={m.label}
                label={m.label}
                emoji={m.emoji}
                active={activeMode === m.label}
                onClick={() => setActiveMode(m.label)}
              />
            ))}
          </div>

          {/* Mode preview card */}
          <div style={{
            background: 'var(--panel2)',
            border: '1px solid var(--border)',
            borderRadius: 16,
            padding: '32px 40px',
            textAlign: 'left',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', top: 0, right: 0,
              width: 200, height: 200,
              background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)',
              pointerEvents: 'none',
            }} />

            {activeMode === 'SQL' && (
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--accent)', fontWeight: 700, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.1em' }}>🗄️ SQL Mode</div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 10 }}>Database & Query Mastery</h3>
                <p style={{ color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: 20 }}>
                  Practice complex SQL queries, optimization strategies, window functions, CTEs, and real-world database design scenarios with live AI feedback.
                </p>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {['JOINs & Subqueries', 'Window Functions', 'Query Optimization', 'Schema Design', 'Transactions'].map(t => (
                    <span key={t} style={{
                      padding: '5px 12px', borderRadius: 99,
                      background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)',
                      fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 600,
                    }}>{t}</span>
                  ))}
                </div>
              </div>
            )}
            {activeMode === 'Python' && (
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--signal)', fontWeight: 700, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.1em' }}>🐍 Python Mode</div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 10 }}>Python Programming Deep Dive</h3>
                <p style={{ color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: 20 }}>
                  From algorithms and data structures to OOP patterns, Pandas, and production-level Python engineering. Designed for DS and backend roles.
                </p>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {['Data Structures', 'OOP & Design Patterns', 'Pandas / NumPy', 'Async Programming', 'Testing'].map(t => (
                    <span key={t} style={{
                      padding: '5px 12px', borderRadius: 99,
                      background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)',
                      fontSize: '0.75rem', color: 'var(--signal)', fontWeight: 600,
                    }}>{t}</span>
                  ))}
                </div>
              </div>
            )}
            {activeMode === 'Data Science' && (
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--blue)', fontWeight: 700, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.1em' }}>📊 Data Science Mode</div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 10 }}>ML, Stats & Analysis</h3>
                <p style={{ color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: 20 }}>
                  Cover machine learning concepts, statistical thinking, model evaluation, feature engineering, and end-to-end DS pipeline design.
                </p>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {['ML Algorithms', 'Statistics', 'Model Evaluation', 'Feature Engineering', 'Deep Learning'].map(t => (
                    <span key={t} style={{
                      padding: '5px 12px', borderRadius: 99,
                      background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)',
                      fontSize: '0.75rem', color: 'var(--blue)', fontWeight: 600,
                    }}>{t}</span>
                  ))}
                </div>
              </div>
            )}
            {activeMode === 'HR' && (
              <div>
                <div style={{ fontSize: '0.72rem', color: '#ec4899', fontWeight: 700, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.1em' }}>🤝 HR Mode</div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 10 }}>Behavioral & Soft Skills</h3>
                <p style={{ color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: 20 }}>
                  Master STAR method responses, behavioral questions, leadership scenarios, and cultural fit discussions with HR-focused AI personas.
                </p>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {['STAR Method', 'Leadership', 'Conflict Resolution', 'Teamwork', 'Self-Assessment'].map(t => (
                    <span key={t} style={{
                      padding: '5px 12px', borderRadius: 99,
                      background: 'rgba(236,72,153,0.1)', border: '1px solid rgba(236,72,153,0.2)',
                      fontSize: '0.75rem', color: '#ec4899', fontWeight: 600,
                    }}>{t}</span>
                  ))}
                </div>
              </div>
            )}
            {activeMode === 'Koios Sim' && (
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--amber)', fontWeight: 700, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.1em' }}>🚀 Koios Simulation Mode</div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 10 }}>Full Simulation Experience</h3>
                <p style={{ color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: 20 }}>
                  The most immersive mode — a combined technical + behavioral gauntlet simulating a real top-tier company interview loop from start to finish.
                </p>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {['Mixed Technical', 'System Design', 'Behavioral Round', 'Code Review', 'Full Debrief'].map(t => (
                    <span key={t} style={{
                      padding: '5px 12px', borderRadius: 99,
                      background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)',
                      fontSize: '0.75rem', color: 'var(--amber)', fontWeight: 600,
                    }}>{t}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── AI Personas ── */}
      <section style={{ padding: '80px 40px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{
            display: 'inline-block',
            padding: '5px 14px', borderRadius: 99,
            background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)',
            fontSize: '0.72rem', fontWeight: 700, color: 'var(--amber)',
            textTransform: 'uppercase', letterSpacing: '0.1em',
            marginBottom: 16,
          }}>
            AI Personas
          </div>
          <h2 style={{
            fontSize: 'clamp(1.6rem, 3.5vw, 2.5rem)',
            fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 14,
          }}>
            Meet Your Interviewers
          </h2>
          <p style={{ color: 'var(--text-muted)', maxWidth: 480, margin: '0 auto', lineHeight: 1.7 }}>
            Choose from 6 distinct AI personalities, each with unique communication styles and question strategies.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 16,
        }}>
          {personas.map((p, i) => (
            <div
              key={p.name}
              style={{
                background: 'var(--panel)',
                border: '1px solid var(--border)',
                borderRadius: 14,
                padding: '24px 16px',
                textAlign: 'center',
                cursor: 'default',
                transition: 'all 0.25s ease',
                animationDelay: `${i * 60}ms`,
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)';
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.background = 'rgba(99,102,241,0.04)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.background = 'var(--panel)';
              }}
            >
              <div style={{ fontSize: 36, marginBottom: 10 }}>{p.emoji}</div>
              <div style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: 5 }}>{p.name}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{p.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How It Works ── */}
      <section style={{
        padding: '80px 40px',
        background: 'var(--panel)',
        borderTop: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
          <div style={{
            display: 'inline-block',
            padding: '5px 14px', borderRadius: 99,
            background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)',
            fontSize: '0.72rem', fontWeight: 700, color: 'var(--blue)',
            textTransform: 'uppercase', letterSpacing: '0.1em',
            marginBottom: 16,
          }}>
            How It Works
          </div>
          <h2 style={{
            fontSize: 'clamp(1.6rem, 3.5vw, 2.5rem)',
            fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 48,
          }}>
            From Setup to Mastery in 4 Steps
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 32 }}>
            {[
              { step: '01', icon: '⚙️', title: 'Configure', desc: 'Pick mode, difficulty, duration, and upload your resume' },
              { step: '02', icon: '📷', title: 'Calibrate', desc: 'Quick webcam and audio calibration for accurate metrics' },
              { step: '03', icon: '🎤', title: 'Interview', desc: 'Answer AI questions in real-time with live feedback' },
              { step: '04', icon: '📈', title: 'Improve', desc: 'Review detailed analytics and unlock your next session' },
            ].map((s, i) => (
              <div key={s.step} style={{ textAlign: 'center' }}>
                <div style={{
                  width: 56, height: 56, borderRadius: '50%',
                  background: 'var(--panel2)',
                  border: '2px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 16px',
                  fontSize: 24,
                  position: 'relative',
                }}>
                  {s.icon}
                  <div style={{
                    position: 'absolute', top: -8, right: -8,
                    width: 22, height: 22, borderRadius: '50%',
                    background: 'var(--accent)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.6rem', fontWeight: 800, color: '#fff',
                  }}>{s.step}</div>
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 8 }}>{s.title}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section style={{
        padding: '100px 40px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%,-50%)',
          width: 600, height: 400, borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(99,102,241,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 20,
          padding: '6px 14px', borderRadius: 99,
          background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)',
        }}>
          <CheckCircle size={13} color="var(--signal)" />
          <span style={{ fontSize: '0.75rem', color: 'var(--signal)', fontWeight: 600 }}>Ready to launch</span>
        </div>

        <h2 style={{
          fontSize: 'clamp(2rem, 5vw, 3.5rem)',
          fontWeight: 900, letterSpacing: '-0.04em',
          marginBottom: 18, lineHeight: 1.1,
        }}>
          Your next interview.<br />
          <span style={{ color: 'var(--accent)' }}>Start practicing today.</span>
        </h2>

        <p style={{
          color: 'var(--text-muted)', fontSize: '1rem',
          maxWidth: 440, margin: '0 auto 40px', lineHeight: 1.7,
        }}>
          No cloud. No subscriptions. No compromises. Just you, the AI, and real growth.
        </p>

        <button
          id="cta-start-interview-btn"
          onClick={() => go('setup')}
          style={{
            padding: '16px 40px',
            fontSize: '1.05rem',
            fontWeight: 800,
            borderRadius: 14,
            border: 'none',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: '#fff',
            cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 12,
            boxShadow: '0 12px 40px rgba(99,102,241,0.4)',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-3px)';
            e.currentTarget.style.boxShadow = '0 20px 50px rgba(99,102,241,0.55)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 12px 40px rgba(99,102,241,0.4)';
          }}
        >
          <Zap size={18} fill="#fff" />
          Launch Interview Now
          <ArrowRight size={18} />
        </button>

        <div style={{
          marginTop: 24,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20,
          flexWrap: 'wrap',
        }}>
          {['100% Local', 'No Sign-up', 'Instant Start', 'Free Forever'].map(tag => (
            <div key={tag} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <CheckCircle size={12} color="var(--signal)" />
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{tag}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{
        padding: '24px 40px',
        borderTop: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 26, height: 26, borderRadius: 8, background: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Zap size={13} color="#fff" />
          </div>
          <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>InterviewOS</span>
          <span style={{ color: 'var(--text-faint)', fontSize: '0.75rem' }}>· AI Interview Coach</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Shield size={13} color="var(--signal)" />
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Local-first · All data stays on your device · MIT License</span>
        </div>
      </footer>
    </div>
  );
}
