import React, { useState } from 'react';
import { CheckCircle2, Upload, Loader2, Type, Mic, ArrowRight, ArrowLeft, ChevronDown, Camera, CameraOff } from 'lucide-react';

import { Panel, SectionLabel } from '../components/Layout';
import { uploadResume } from '../services/api';
import { COLORS } from '../utils/constants';

const TYPES = [
  "Campus Placement","Communication Skills","SQL", "Python", "Data Science", "HR",
  "Frontend Developer", "Full-Stack Developer", "Embedded Engineer",
  "IoT Engineer", "DevOps Engineer", "Mobile Developer", "Game Developer",
  "AI/ML Engineer", "Cybersecurity Specialist", "Cloud Engineer",
  "Blockchain Developer", "Kerala PSC",
];

export function SetupPage({ go, sessionConfig, setSessionConfig }) {
  const { type, difficulty, duration, answerMode = 'type' } = sessionConfig;

  const [uploading, setUploading]     = useState(false);
  const [fileName, setFileName]       = useState('');
  const [uploadError, setUploadError] = useState('');

  const update = (key, val) =>
    setSessionConfig((prev) => ({ ...prev, [key]: val }));

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    setUploading(true);
    setUploadError('');
    try {
      const data = await uploadResume(file);
      update('resumeText', data.text);
    } catch (err) {
      setUploadError(err.message || 'Failed to parse resume.');
      update('resumeText', '');
    } finally {
      setUploading(false);
    }
  };

  const questionCount = duration === '15 mins' ? 5 : duration === '45 mins' ? 15 : 10;

  return (
    <div className="max-w-5xl iv-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Page header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <div>
          <h1 className="iv-display" style={{ fontSize: '1.5rem', color: 'var(--text-primary)' }}>
            Configure Session
          </h1>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Set up your interview preferences below
          </p>
        </div>
        <button
          onClick={() => go('dashboard')}
          className="iv-btn iv-btn-ghost"
          style={{ gap: 6, fontSize: '0.82rem' }}
        >
          <ArrowLeft size={15} /> Dashboard
        </button>
      </div>

      {/* ── Body grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 290px', gap: 16 }}>

        {/* ─── LEFT COLUMN ─── */}
        <Panel className="p-5" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

          {/* Interview Type */}
          <div>
            <SectionLabel>Interview Type</SectionLabel>
            <div style={{ position: 'relative' }}>
              <select
                value={type}
                onChange={(e) => update('type', e.target.value)}
                className="iv-input"
                style={{ paddingRight: 36, appearance: 'none', WebkitAppearance: 'none' }}
              >
                {TYPES.map(item => (
                  <option key={item} value={item} style={{ background: '#111', color: '#f0f0f0' }}>
                    {item}
                  </option>
                ))}
              </select>
              <ChevronDown size={15} style={{
                position: 'absolute', right: 12, top: '50%',
                transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none',
              }} />
            </div>
          </div>

          <Divider />

          {/* Difficulty + Duration */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <SectionLabel>Difficulty</SectionLabel>
              <SegmentRow
                options={['Junior', 'Mid', 'Senior']}
                value={difficulty}
                onChange={v => update('difficulty', v)}
              />
            </div>
            <div>
              <SectionLabel>Duration</SectionLabel>
              <SegmentRow
                options={['15 mins', '30 mins', '45 mins']}
                value={duration}
                onChange={v => update('duration', v)}
              />
            </div>
          </div>

          <Divider />

          {/* Answer Mode */}
          <div>
            <SectionLabel>Answer Mode</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { id: 'type',  label: 'Type',  sub: 'Keyboard input',       Icon: Type },
                { id: 'speak', label: 'Speak', sub: 'Voice auto-transcribe', Icon: Mic  },
              ].map(({ id, label, sub, Icon }) => (
                <button
                  key={id}
                  onClick={() => update('answerMode', id)}
                  data-active={answerMode === id}
                  className="iv-choice"
                >
                  <Icon size={17} style={{ flexShrink: 0, color: answerMode === id ? 'var(--accent)' : 'var(--text-muted)' }} />
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>{label}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 1 }}>{sub}</div>
                  </div>
                  {answerMode === id && <CheckCircle2 size={14} style={{ marginLeft: 'auto', flexShrink: 0, color: 'var(--accent)' }} />}
                </button>
              ))}
            </div>
            {answerMode === 'speak' && (
              <div style={{
                marginTop: 10, padding: '8px 12px',
                background: 'rgba(245,158,11,0.08)',
                border: '1px solid rgba(245,158,11,0.25)',
                borderRadius: 8,
                fontSize: '0.75rem', color: 'var(--amber)', lineHeight: 1.5,
              }}>
                ⚠ Mic auto-starts after each question. Stops when you click Submit. Chrome / Edge only.
              </div>
            )}
          </div>

          <Divider />

          {/* Camera Mode */}
          <div>
            <SectionLabel>Camera Mode</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { id: 'on',  label: 'Camera On',  sub: 'Webcam video enabled',   Icon: Camera },
                { id: 'off', label: 'Camera Off', sub: 'No video / audio only', Icon: CameraOff },
              ].map(({ id, label, sub, Icon }) => {
                const active = (sessionConfig.cameraMode || 'on') === id;
                return (
                  <button
                    key={id}
                    onClick={() => update('cameraMode', id)}
                    data-active={active}
                    className="iv-choice"
                  >
                    <Icon size={17} style={{ flexShrink: 0, color: active ? 'var(--accent)' : 'var(--text-muted)' }} />
                    <div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>{label}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 1 }}>{sub}</div>
                    </div>
                    {active && <CheckCircle2 size={14} style={{ marginLeft: 'auto', flexShrink: 0, color: 'var(--accent)' }} />}
                  </button>
                );
              })}
            </div>
          </div>

          <Divider />

          {/* Interview Mode */}
          <div>
            <SectionLabel>Interview Mode</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { id: 'practice', label: 'Practice Mode',    sub: 'Hints & encouragement' },
                { id: 'real',     label: 'Real Simulation',  sub: 'No hints, strict timing' },
              ].map(({ id, label, sub }) => {
                const currentMode = sessionConfig.practiceMode ? 'practice' : 'real';
                const active = currentMode === id;
                const accentColor = id === 'practice' ? COLORS.accent : COLORS.alarm;
                return (
                  <button
                    key={id}
                    onClick={() => update('practiceMode', id === 'practice')}
                    data-active={active}
                    className="iv-choice"
                    style={active ? {
                      borderColor: accentColor,
                      background: `${accentColor}18`,
                      boxShadow: `0 0 0 1px ${accentColor}`,
                    } : {}}
                  >
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>{label}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 1 }}>{sub}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <Divider />

          {/* Interviewer Personality */}
          <div>
            <SectionLabel>Interviewer Personality</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {[
                { id: 'friendly',        label: 'Friendly',   emoji: '😊' },
                { id: 'professional',    label: 'Professional', emoji: '👔' },
                { id: 'strict',          label: 'Strict',     emoji: '🧑‍⚖️' },
                { id: 'senior_engineer', label: 'Sr. Eng.',   emoji: '💻' },
                { id: 'hr',              label: 'HR',         emoji: '🤝' },
                { id: 'startup_founder', label: 'Startup',    emoji: '🚀' },
              ].map(({ id, label, emoji }) => {
                const active = (sessionConfig.personality || 'professional') === id;
                return (
                  <button
                    key={id}
                    onClick={() => update('personality', id)}
                    style={{
                      padding: '10px 8px',
                      border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                      background: active ? 'var(--accent-glow)' : 'var(--panel2)',
                      borderRadius: 8,
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: active ? 'var(--text-primary)' : 'var(--text-muted)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      transition: 'all 0.15s',
                    }}
                  >
                    <span>{emoji}</span>
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <Divider />

          {/* Resume Upload */}
          <div>
            <SectionLabel>Resume Upload</SectionLabel>
            <label style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 14px',
              cursor: uploading ? 'wait' : 'pointer',
              border: `1px ${uploading ? 'dashed' : 'solid'} ${
                uploading ? 'var(--amber)' : sessionConfig.resumeText ? 'var(--signal)' : 'var(--border)'
              }`,
              borderRadius: 8,
              background: 'var(--panel2)',
              transition: 'border-color 0.2s',
            }}>
              {uploading
                ? <Loader2 size={18} className="animate-spin" style={{ color: 'var(--amber)', flexShrink: 0 }} />
                : sessionConfig.resumeText
                ? <CheckCircle2 size={18} style={{ color: 'var(--signal)', flexShrink: 0 }} />
                : <Upload size={18} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              }
              <span style={{
                fontSize: '0.82rem', fontWeight: 500,
                color: uploading ? 'var(--amber)' : sessionConfig.resumeText ? 'var(--signal)' : 'var(--text-muted)',
              }}>
                {uploading
                  ? 'Parsing resume…'
                  : sessionConfig.resumeText
                  ? `Loaded: ${fileName}`
                  : 'Upload resume · .txt or .pdf'}
              </span>
              <input type="file" style={{ display: 'none' }} accept=".txt,.pdf" onChange={handleFileChange} disabled={uploading} />
            </label>

            {uploadError && (
              <div style={{ fontSize: '0.75rem', color: 'var(--alarm)', marginTop: 6 }}>
                ⚠ {uploadError}
              </div>
            )}

            {sessionConfig.resumeText && (
              <details style={{ marginTop: 8, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--panel2)', overflow: 'hidden' }}>
                <summary style={{
                  padding: '8px 12px', fontSize: '0.75rem', fontWeight: 500,
                  cursor: 'pointer', color: 'var(--text-muted)', userSelect: 'none', listStyle: 'none',
                }}>
                  View extracted text ({sessionConfig.resumeText.length} chars)
                </summary>
                <pre style={{
                  margin: 0, padding: '8px 12px',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '0.7rem', color: 'var(--text-muted)',
                  background: 'var(--panel)', whiteSpace: 'pre-wrap',
                  overflowY: 'auto', maxHeight: 120, lineHeight: 1.6,
                }}>
                  {sessionConfig.resumeText}
                </pre>
              </details>
            )}
          </div>
        </Panel>

        {/* ─── RIGHT COLUMN — Session Preview ─── */}
        <Panel className="p-5" style={{ display: 'flex', flexDirection: 'column' }}>
          <SectionLabel>Session Preview</SectionLabel>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 'auto' }}>
            {[
              { label: 'Type',       value: type,                                                    color: 'var(--text-primary)' },
              { label: 'Difficulty', value: difficulty,                                               color: COLORS.amber },
              { label: 'Duration',   value: duration,                                                 color: 'var(--text-muted)' },
              { label: 'Questions',  value: questionCount,                                            color: COLORS.accent, big: true },
              { label: 'Mode',       value: answerMode === 'speak' ? '🎤 Speak' : '⌨ Type',         color: 'var(--text-primary)' },
              { label: 'Camera',     value: (sessionConfig.cameraMode || 'on') === 'on' ? '🎥 On' : '❌ Off', color: (sessionConfig.cameraMode || 'on') === 'on' ? COLORS.signal : COLORS.alarm },
              { label: 'Personality',value: (sessionConfig.personality || 'professional').replace('_', ' '), color: COLORS.blue },
              { label: 'Style',      value: sessionConfig.practiceMode ? 'Practice' : 'Simulation',  color: sessionConfig.practiceMode ? COLORS.signal : COLORS.alarm },
            ].map(({ label, value, color, big }) => (
              <div
                key={label}
                style={{
                  display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
                  padding: '10px 0', borderBottom: '1px solid var(--border)', gap: 8,
                }}
              >
                <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>
                  {label}
                </span>
                <span style={{
                  fontFamily: big ? "'JetBrains Mono', monospace" : 'inherit',
                  fontSize: big ? '1.6rem' : '0.82rem',
                  fontWeight: 700, color, lineHeight: 1,
                  textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {value}
                </span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <button
            onClick={() => go('calibration')}
            className="iv-btn iv-btn-primary w-full"
            style={{ marginTop: 20, padding: '11px 16px', fontSize: '0.88rem' }}
          >
            <ArrowRight size={16} />
            Continue to Calibration
          </button>
        </Panel>
      </div>
    </div>
  );
}

/* ── Divider ── */
function Divider() {
  return <div style={{ height: 1, background: 'var(--border)', margin: '20px 0' }} />;
}

/* ── Segmented Control ── */
function SegmentRow({ options, value, onChange }) {
  return (
    <div
      className="iv-segment"
      style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}
    >
      {options.map(opt => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          data-active={value === opt}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}
