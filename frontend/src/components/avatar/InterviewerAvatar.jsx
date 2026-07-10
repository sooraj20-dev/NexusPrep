/**
 * InterviewerAvatar — CSS/SVG-based animated interviewer avatar.
 *
 * States drive animations:
 *   idle       → gentle breathing (scale pulsing)
 *   thinking   → rotating thought dots + head tilt
 *   speaking   → mouth open/close animation
 *   listening  → eyebrows raised, attentive
 *   smiling    → curved mouth, raised cheeks
 *   questioning → one eyebrow raised, slight head tilt
 *
 * Personality drives color scheme:
 *   friendly        → warm amber tones
 *   professional    → steel blue tones  
 *   strict          → cool grey/red tones
 *   senior_engineer → teal/green tones
 *   hr              → warm pink tones
 *   startup_founder → vivid signal green
 *
 * Future-ready: Replace this component with Three.js/Live2D renderer
 * by swapping <InterviewerAvatar /> — AvatarController state is unchanged.
 */

import React, { useEffect, useRef } from 'react';

// Personality color mapping
const PERSONALITY_COLORS = {
  friendly:         { primary: '#FFB200', secondary: '#FF8C00', bg: 'rgba(255,178,0,0.12)' },
  professional:     { primary: '#58B8FF', secondary: '#3A8FCC', bg: 'rgba(88,184,255,0.10)' },
  strict:           { primary: '#FF4422', secondary: '#CC2200', bg: 'rgba(255,68,34,0.10)' },
  senior_engineer:  { primary: '#C9FF3A', secondary: '#8ACC00', bg: 'rgba(201,255,58,0.10)' },
  hr:               { primary: '#FF88CC', secondary: '#CC44AA', bg: 'rgba(255,136,204,0.10)' },
  startup_founder:  { primary: '#C9FF3A', secondary: '#00FFAA', bg: 'rgba(0,255,170,0.10)' },
};

// State → expression mapping
const STATE_EXPRESSIONS = {
  idle:        { eyeOpen: 0.85, mouthCurve: 2,  eyebrowRaise: 0, headTilt: 0  },
  thinking:    { eyeOpen: 0.6,  mouthCurve: 0,  eyebrowRaise: 4, headTilt: -5 },
  speaking:    { eyeOpen: 0.9,  mouthCurve: 3,  eyebrowRaise: 0, headTilt: 0  },
  listening:   { eyeOpen: 1.0,  mouthCurve: 1,  eyebrowRaise: 6, headTilt: 5  },
  smiling:     { eyeOpen: 0.5,  mouthCurve: 10, eyebrowRaise: 0, headTilt: 0  },
  questioning: { eyeOpen: 0.9,  mouthCurve: 0,  eyebrowRaise: 8, headTilt: -8 },
};

// CSS animations injected once
const AVATAR_STYLES = `
  @keyframes av-breathe {
    0%, 100% { transform: translateY(0px) scale(1); }
    50%       { transform: translateY(-3px) scale(1.01); }
  }
  @keyframes av-blink {
    0%, 90%, 100% { scaleY: 1; }
    95%           { scaleY: 0.05; }
  }
  @keyframes av-mouth-talk {
    0%, 100% { transform: scaleY(0.4); }
    50%       { transform: scaleY(1.8); }
  }
  @keyframes av-think-dot {
    0%, 100% { opacity: 0.2; transform: translateY(0); }
    50%       { opacity: 1;   transform: translateY(-4px); }
  }
  @keyframes av-spin-ring {
    from { stroke-dashoffset: 120; }
    to   { stroke-dashoffset: 0; }
  }
`;

let stylesInjected = false;
function injectStyles() {
  if (stylesInjected || typeof document === 'undefined') return;
  const style = document.createElement('style');
  style.textContent = AVATAR_STYLES;
  document.head.appendChild(style);
  stylesInjected = true;
}

export function InterviewerAvatar({ state = 'idle', personality = 'professional', size = 110 }) {
  injectStyles();

  const colors = PERSONALITY_COLORS[personality] || PERSONALITY_COLORS.professional;
  const expr   = STATE_EXPRESSIONS[state] || STATE_EXPRESSIONS.idle;

  const blinkRef = useRef(null);
  const eyeRef1  = useRef(null);
  const eyeRef2  = useRef(null);

  // Random blink every 3-5s
  useEffect(() => {
    const blink = () => {
      [eyeRef1.current, eyeRef2.current].forEach(eye => {
        if (!eye) return;
        eye.style.transition = 'transform 0.05s';
        eye.style.transform  = 'scaleY(0.05)';
        setTimeout(() => {
          if (eye) {
            eye.style.transform = `scaleY(${expr.eyeOpen})`;
          }
        }, 120);
      });
      blinkRef.current = setTimeout(blink, 3000 + Math.random() * 2000);
    };
    blinkRef.current = setTimeout(blink, 1500 + Math.random() * 2000);
    return () => clearTimeout(blinkRef.current);
  }, [expr.eyeOpen]);

  const cx = size / 2;
  const headR = size * 0.38;
  const eyeY  = size * 0.38;
  const eyeOffX = size * 0.14;

  // Mouth path: flat (0) to wide smile (10)
  const mouthY  = size * 0.58;
  const mouthW  = size * 0.22;
  const curveAmt = expr.mouthCurve * (size / 100);
  const mouthPath = `M ${cx - mouthW} ${mouthY} Q ${cx} ${mouthY + curveAmt} ${cx + mouthW} ${mouthY}`;

  // Eyebrow positions
  const browY   = eyeY - size * 0.12;
  const browOff = expr.eyebrowRaise;
  const browW   = size * 0.09;

  const containerAnim = state === 'idle' ? 'av-breathe 3.5s ease-in-out infinite' :
                        state === 'thinking' ? 'av-breathe 1.2s ease-in-out infinite' :
                        state === 'smiling'  ? 'av-breathe 0.8s ease-in-out infinite' :
                        'none';

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
    }}>
      {/* Avatar face */}
      <div style={{
        animation: containerAnim,
        transform: `rotate(${expr.headTilt}deg)`,
        transition: 'transform 0.4s ease',
        position: 'relative',
      }}>
        <svg
          width={size} height={size}
          viewBox={`0 0 ${size} ${size}`}
          style={{ display: 'block', overflow: 'visible' }}
        >
          {/* Glow ring (state indicator) */}
          <circle
            cx={cx} cy={cx} r={headR + 6}
            fill="none"
            stroke={colors.primary}
            strokeWidth={state === 'speaking' ? 3 : state === 'thinking' ? 2 : 1}
            strokeOpacity={state === 'idle' ? 0.2 : 0.5}
            style={{
              transition: 'stroke-width 0.3s, stroke-opacity 0.3s',
              strokeDasharray: state === 'thinking' ? '8 6' : 'none',
              animation: state === 'thinking' ? 'av-spin-ring 2s linear infinite' : 'none',
            }}
          />

          {/* Head */}
          <circle
            cx={cx} cy={cx} r={headR}
            fill={colors.bg}
            stroke={colors.primary}
            strokeWidth={2.5}
          />

          {/* Left eyebrow */}
          <line
            x1={cx - eyeOffX - browW} y1={browY - browOff}
            x2={cx - eyeOffX + browW} y2={browY - browOff + (state === 'questioning' ? 5 : 0)}
            stroke={colors.primary} strokeWidth={2} strokeLinecap="round"
            style={{ transition: 'all 0.3s ease' }}
          />
          {/* Right eyebrow */}
          <line
            x1={cx + eyeOffX - browW} y1={browY - browOff + (state === 'questioning' ? 5 : 0)}
            x2={cx + eyeOffX + browW} y2={browY - browOff}
            stroke={colors.primary} strokeWidth={2} strokeLinecap="round"
            style={{ transition: 'all 0.3s ease' }}
          />

          {/* Left eye */}
          <ellipse
            ref={eyeRef1}
            cx={cx - eyeOffX} cy={eyeY}
            rx={size * 0.065} ry={size * 0.09 * expr.eyeOpen}
            fill={colors.primary}
            style={{
              transform: `scaleY(${expr.eyeOpen})`,
              transformOrigin: `${cx - eyeOffX}px ${eyeY}px`,
              transition: 'transform 0.3s ease',
            }}
          />
          {/* Right eye */}
          <ellipse
            ref={eyeRef2}
            cx={cx + eyeOffX} cy={eyeY}
            rx={size * 0.065} ry={size * 0.09 * expr.eyeOpen}
            fill={colors.primary}
            style={{
              transform: `scaleY(${expr.eyeOpen})`,
              transformOrigin: `${cx + eyeOffX}px ${eyeY}px`,
              transition: 'transform 0.3s ease',
            }}
          />

          {/* Pupils */}
          <circle cx={cx - eyeOffX} cy={eyeY + size * 0.015} r={size * 0.025} fill="var(--ink)" />
          <circle cx={cx + eyeOffX} cy={eyeY + size * 0.015} r={size * 0.025} fill="var(--ink)" />
          {/* Eye shine */}
          <circle cx={cx - eyeOffX + size * 0.02} cy={eyeY - size * 0.02} r={size * 0.012} fill="white" opacity={0.8} />
          <circle cx={cx + eyeOffX + size * 0.02} cy={eyeY - size * 0.02} r={size * 0.012} fill="white" opacity={0.8} />

          {/* Nose dot */}
          <circle cx={cx} cy={size * 0.5} r={size * 0.02} fill={colors.secondary} opacity={0.6} />

          {/* Mouth */}
          <path
            d={mouthPath}
            fill="none"
            stroke={colors.primary}
            strokeWidth={2.5}
            strokeLinecap="round"
            style={{
              transition: 'all 0.25s ease',
              transformOrigin: `${cx}px ${mouthY}px`,
              animation: state === 'speaking' ? 'av-mouth-talk 0.35s ease-in-out infinite' : 'none',
            }}
          />

          {/* Thinking dots */}
          {state === 'thinking' && [0, 1, 2].map(i => (
            <circle
              key={i}
              cx={cx + (i - 1) * size * 0.1}
              cy={size * 0.78}
              r={size * 0.025}
              fill={colors.primary}
              style={{
                animation: `av-think-dot 0.9s ease-in-out infinite`,
                animationDelay: `${i * 0.2}s`,
              }}
            />
          ))}

          {/* Smile cheeks (smiling state) */}
          {state === 'smiling' && (
            <>
              <ellipse cx={cx - eyeOffX * 1.6} cy={size * 0.56} rx={size * 0.07} ry={size * 0.04} fill={colors.primary} opacity={0.3} />
              <ellipse cx={cx + eyeOffX * 1.6} cy={size * 0.56} rx={size * 0.07} ry={size * 0.04} fill={colors.primary} opacity={0.3} />
            </>
          )}
        </svg>
      </div>

      {/* State label */}
      <div style={{
        fontFamily: "'Inter', sans-serif", fontSize: '0.62rem',
        fontWeight: 600,
        textTransform: 'uppercase', letterSpacing: '0.06em',
        color: state === 'idle' ? 'var(--text-muted)' : colors.primary,
        transition: 'color 0.3s ease',
      }}>
        {state === 'idle'        ? 'AI Interviewer' :
         state === 'thinking'   ? 'Thinking...' :
         state === 'speaking'   ? 'Speaking' :
         state === 'listening'  ? 'Listening' :
         state === 'smiling'    ? 'Great answer!' :
         state === 'questioning'? 'Focused' : 'AI Interviewer'}
      </div>
    </div>
  );
}
