import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle, Camera, CameraOff, Check, Play, Radio, RefreshCw,
  Settings2, Volume2, X, Eye, EyeOff, Mic, MicOff
} from 'lucide-react';
import { Panel, SectionLabel } from '../components/Layout';
import { BrutalButton, Meter } from '../components/Cards';

/* ─── Status metadata ─────────────────────────────────────── */
const statusCopy = {
  idle:        ["Not Checked",  "var(--steel)",  AlertTriangle],
  checking:    ["Checking",     "var(--amber)",  RefreshCw],
  granted:     ["Granted",      "var(--signal)", Check],
  available:   ["Available",    "var(--signal)", Check],
  unclear:     ["Unclear",      "var(--amber)",  AlertTriangle],
  unsupported: ["Unsupported",  "var(--amber)",  AlertTriangle],
  denied:      ["Denied",       "var(--alarm)",  X],
  error:       ["Error",        "var(--alarm)",  X],
};

/* ─── Helpers ─────────────────────────────────────────────── */
function stopStream(stream) {
  stream?.getTracks().forEach((track) => track.stop());
}

/** Sample a video frame via canvas and return average brightness 0-255. */
function sampleVideoBrightness(video, canvas) {
  if (!video || video.readyState < 2) return null;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  canvas.width  = 64;
  canvas.height = 36;
  ctx.drawImage(video, 0, 0, 64, 36);
  const { data } = ctx.getImageData(0, 0, 64, 36);
  let total = 0;
  for (let i = 0; i < data.length; i += 4) {
    total += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }
  return total / (data.length / 4);
}

/* ─── Sub-components ──────────────────────────────────────── */
function StatusRow({ label, status, detail }) {
  const [text, color, Icon] = statusCopy[status] || statusCopy.idle;
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px',
      border: '1px solid var(--border)', borderRadius: 8, background: 'var(--panel2)',
    }}>
      <span style={{
        width: 28, height: 28, borderRadius: 6, background: `${color}18`,
        border: `1px solid ${color}44`, display: 'grid', placeItems: 'center', flexShrink: 0,
      }}>
        <Icon size={14} style={{ color }} />
      </span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>{label}</div>
        <div style={{ fontSize: '0.75rem', color, marginTop: 2 }}>{text}</div>
        {detail && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 3, lineHeight: 1.4 }}>{detail}</div>}
      </div>
    </div>
  );
}

function DeviceSelect({ label, value, devices, onChange, disabled }) {
  return (
    <label style={{ display: 'block' }}>
      <span style={{ fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>{label}</span>
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="iv-input"
        style={{ marginTop: 6, opacity: disabled ? 0.5 : 1, background: 'var(--panel2)', color: 'var(--text-primary)' }}
      >
        <option value="">System default</option>
        {devices.map((device, index) => (
          <option key={device.deviceId || `${device.kind}-${index}`} value={device.deviceId} style={{ background: '#111' }}>
            {device.label || `${label} ${index + 1}`}
          </option>
        ))}
      </select>
    </label>
  );
}

/* ─── Toast notification component ───────────────────────── */
function Toast({ toasts, onDismiss }) {
  return (
    <div style={{
      position: 'fixed', top: 20, right: 20, zIndex: 9999,
      display: 'flex', flexDirection: 'column', gap: 10, pointerEvents: 'none',
    }}>
      {toasts.map((t) => (
        <div key={t.id} style={{
          display: 'flex', alignItems: 'flex-start', gap: 12,
          padding: '12px 16px',
          background: 'var(--panel)',
          border: `1px solid ${t.type === 'error' ? 'rgba(239,68,68,0.4)' : 'rgba(245,158,11,0.4)'}`,
          borderRadius: 10,
          maxWidth: 360,
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          animation: 'toastIn 0.25s cubic-bezier(0.22,1,0.36,1)',
          pointerEvents: 'all',
        }}>
          <span style={{ flexShrink: 0, marginTop: 2, color: t.type === 'error' ? 'var(--alarm)' : 'var(--amber)' }}>
            {t.icon === 'camera' ? <EyeOff size={16} /> : <MicOff size={16} />}
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{t.title}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{t.message}</div>
          </div>
          <button onClick={() => onDismiss(t.id)}
            style={{ flexShrink: 0, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0 }}
            aria-label="Dismiss notification">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

/* ─── Clarity badge overlay ───────────────────────────────── */
function ClarityBadge({ cameraClarity, micClarity }) {
  if (cameraClarity === null && micClarity === null) return null;
  const camOk = cameraClarity === 'ok';
  const micOk = micClarity   === 'ok';
  return (
    <div style={{ position: 'absolute', bottom: 10, right: 10, display: 'flex', flexDirection: 'column', gap: 5 }}>
      {cameraClarity !== null && (
        <span style={{
          background: camOk ? 'rgba(34,197,94,0.9)' : 'rgba(245,158,11,0.9)',
          color: '#000', borderRadius: 20, padding: '3px 9px',
          fontSize: '0.68rem', fontWeight: 700,
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          {camOk ? <Eye size={11} /> : <EyeOff size={11} />}
          {camOk ? 'Clear' : 'Unclear'}
        </span>
      )}
      {micClarity !== null && (
        <span style={{
          background: micOk ? 'rgba(34,197,94,0.9)' : 'rgba(245,158,11,0.9)',
          color: '#000', borderRadius: 20, padding: '3px 9px',
          fontSize: '0.68rem', fontWeight: 700,
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          {micOk ? <Mic size={11} /> : <MicOff size={11} />}
          {micOk ? 'Mic OK' : 'Silent'}
        </span>
      )}
    </div>
  );
}

/* ─── Main page ───────────────────────────────────────────── */
export function CalibrationPage({ go, sessionConfig }) {
  const cameraOff = sessionConfig?.cameraMode === 'off';
  const videoRef          = useRef(null);
  const canvasRef         = useRef(document.createElement('canvas'));
  const streamRef         = useRef(null);
  const audioContextRef   = useRef(null);
  const analyserFrameRef  = useRef(null);
  const speakerAudioRef   = useRef(null);

  /* clarity check timers */
  const cameraCheckRef    = useRef(null);
  const micSilenceRef     = useRef(null);
  const micPeakRef        = useRef(0); // rolling peak mic level for silence detection

  const [cameraStatus,   setCameraStatus]   = useState(cameraOff ? "available" : "idle");
  const [micStatus,      setMicStatus]      = useState("idle");
  const [speakerStatus,  setSpeakerStatus]  = useState("idle");
  const [message,        setMessage]        = useState(cameraOff ? "Grant microphone access to calibrate this interview setup." : "Grant camera and microphone access to calibrate this interview setup.");
  const [devices,        setDevices]        = useState({ cameras: [], microphones: [], speakers: [] });
  const [selectedCamera, setSelectedCamera] = useState("");
  const [selectedMic,    setSelectedMic]    = useState("");
  const [selectedSpeaker,setSelectedSpeaker]= useState("");
  const [micLevel,       setMicLevel]       = useState(0);

  /* clarity state: null = not yet checked, 'ok' | 'unclear' | 'silent' */
  const [cameraClarity,  setCameraClarity]  = useState(null);
  const [micClarity,     setMicClarity]     = useState(null);

  /* toast queue */
  const [toasts, setToasts] = useState([]);
  const toastIdRef = useRef(0);

  const canEnter = (cameraOff || cameraStatus === "granted" || cameraStatus === "available") && micStatus === "granted";

  /* ── Toast helpers ── */
  const pushToast = useCallback((title, message, icon, type = 'warn') => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, title, message, icon, type }]);
    // auto-dismiss after 6 s
    setTimeout(() => dismissToast(id), 6000);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  /* ── Camera clarity check ── */
  const startCameraClarity = useCallback(() => {
    if (cameraCheckRef.current) clearInterval(cameraCheckRef.current);

    // wait a moment for video to settle
    let warningShown = false;
    let checksBeforeWarn = 0;

    cameraCheckRef.current = setInterval(() => {
      const brightness = sampleVideoBrightness(videoRef.current, canvasRef.current);
      if (brightness === null) return;

      // < 12 brightness = effectively black / lens covered
      if (brightness < 12) {
        checksBeforeWarn += 1;
        if (checksBeforeWarn >= 3 && !warningShown) {
          setCameraClarity('unclear');
          setCameraStatus('unclear');
          pushToast(
            'Camera unclear',
            'Your camera feed appears very dark or blocked. Please uncover your lens or improve the lighting.',
            'camera',
            'warn'
          );
          warningShown = true;
        }
      } else {
        checksBeforeWarn = 0;
        warningShown     = false;
        setCameraClarity('ok');
        setCameraStatus('granted');
      }
    }, 1500); // sample every 1.5 s
  }, [pushToast]);

  /* ── Mic silence check ── */
  const startMicSilenceCheck = useCallback(() => {
    if (micSilenceRef.current) clearInterval(micSilenceRef.current);
    micPeakRef.current = 0;
    let silentTicks = 0;
    let warningShown = false;

    micSilenceRef.current = setInterval(() => {
      const peak = micPeakRef.current;
      micPeakRef.current = 0; // reset rolling peak

      if (peak < 3) {
        silentTicks += 1;
        if (silentTicks >= 4 && !warningShown) {
          setMicClarity('silent');
          pushToast(
            'Microphone silent',
            'No audio is being detected. Ensure your microphone is connected, not muted, and selected correctly.',
            'mic',
            'warn'
          );
          warningShown = true;
        }
      } else {
        silentTicks  = 0;
        warningShown = false;
        setMicClarity('ok');
      }
    }, 2000); // check every 2 s
  }, [pushToast]);

  const speakerDetail = useMemo(() => {
    if (!("setSinkId" in HTMLMediaElement.prototype)) {
      return "This browser can play test audio, but cannot choose a specific speaker.";
    }
    if (devices.speakers.length === 0 && speakerStatus === "available") {
      return "Default speaker is available.";
    }
    return selectedSpeaker
      ? "Selected output device will be used for the speaker test."
      : "Using system default speaker output.";
  }, [devices.speakers.length, selectedSpeaker, speakerStatus]);

  useEffect(() => {
    refreshDevices();
    return () => {
      stopStream(streamRef.current);
      if (analyserFrameRef.current) cancelAnimationFrame(analyserFrameRef.current);
      if (cameraCheckRef.current)   clearInterval(cameraCheckRef.current);
      if (micSilenceRef.current)    clearInterval(micSilenceRef.current);
      audioContextRef.current?.close?.();
      speakerAudioRef.current?.pause?.();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function refreshDevices() {
    if (!navigator.mediaDevices?.enumerateDevices) {
      setMessage("Media device APIs are not available in this browser.");
      return;
    }
    const list = await navigator.mediaDevices.enumerateDevices();
    setDevices({
      cameras:     list.filter((d) => d.kind === "videoinput"),
      microphones: list.filter((d) => d.kind === "audioinput"),
      speakers:    list.filter((d) => d.kind === "audiooutput"),
    });
    setSpeakerStatus("setSinkId" in HTMLMediaElement.prototype ? "available" : "unsupported");
  }

  function startMicMeter(stream) {
    if (analyserFrameRef.current) cancelAnimationFrame(analyserFrameRef.current);
    audioContextRef.current?.close?.();

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      setMessage("Audio analysis is not supported in this browser, but microphone access was granted.");
      return;
    }

    const audioContext = new AudioContextClass();
    const source   = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    const data     = new Uint8Array(analyser.fftSize);

    source.connect(analyser);
    audioContextRef.current = audioContext;

    const readLevel = () => {
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i += 1) {
        const value = (data[i] - 128) / 128;
        sum += value * value;
      }
      const rms   = Math.sqrt(sum / data.length);
      const level = Math.min(100, Math.round(rms * 260));
      setMicLevel(level);

      // track rolling peak for silence detection
      if (level > micPeakRef.current) micPeakRef.current = level;

      analyserFrameRef.current = requestAnimationFrame(readLevel);
    };

    readLevel();
  }

  async function requestAccess() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraStatus("error");
      setMicStatus("error");
      setMessage("Camera and microphone access require a modern browser over HTTPS or localhost.");
      return;
    }

    /* reset clarity on each attempt */
    setCameraClarity(null);
    setMicClarity(null);
    if (cameraCheckRef.current) clearInterval(cameraCheckRef.current);
    if (micSilenceRef.current)  clearInterval(micSilenceRef.current);

    setCameraStatus(cameraOff ? "available" : "checking");
    setMicStatus("checking");
    setMessage(cameraOff ? "Requesting microphone permission..." : "Requesting camera and microphone permission...");
    stopStream(streamRef.current);

    const videoConstraint = cameraOff ? false : (selectedCamera ? { deviceId: { exact: selectedCamera } } : true);
    const audioConstraint = selectedMic    ? { deviceId: { exact: selectedMic    } } : true;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraint,
        audio: audioConstraint,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      const hasVideo = stream.getVideoTracks().length > 0;
      const hasAudio = stream.getAudioTracks().length > 0;

      setCameraStatus(cameraOff ? "available" : (hasVideo ? "granted" : "error"));
      setMicStatus(hasAudio   ? "granted" : "error");
      setMessage(cameraOff 
        ? "Microphone is connected. Checking clarity — speak normally to test mic level."
        : "Camera and microphone are connected. Checking clarity — speak normally to test mic level."
      );

      startMicMeter(stream);
      await refreshDevices();

      /* start clarity checks a moment after stream starts */
      if (hasVideo && !cameraOff) {
        setTimeout(() => startCameraClarity(), 1200);
      }
      if (hasAudio) {
        // give the user ~2 s to start speaking before the silence window opens
        setTimeout(() => startMicSilenceCheck(), 2000);
      }
    } catch (error) {
      const denied = error?.name === "NotAllowedError" || error?.name === "SecurityError";
      setCameraStatus(denied ? "denied" : "error");
      setMicStatus(denied ? "denied" : "error");
      setMicLevel(0);
      setMessage(
        denied
          ? "Permission was denied. Enable camera and microphone access in your browser settings."
          : error?.message || "Could not open the selected camera and microphone."
      );
    }
  }

  async function testSpeaker() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      setSpeakerStatus("unsupported");
      setMessage("Speaker test is not supported in this browser.");
      return;
    }

    try {
      const audioContext  = new AudioContextClass();
      const destination   = audioContext.createMediaStreamDestination();
      const oscillator    = audioContext.createOscillator();
      const gain          = audioContext.createGain();
      const audio         = new Audio();

      oscillator.type            = "sine";
      oscillator.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.18, audioContext.currentTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.45);
      oscillator.connect(gain);
      gain.connect(destination);
      audio.srcObject = destination.stream;

      if (selectedSpeaker && "setSinkId" in audio) {
        await audio.setSinkId(selectedSpeaker);
      }

      speakerAudioRef.current = audio;
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.5);
      await audio.play();
      setSpeakerStatus("available");
      setMessage("Speaker test played. If you heard the tone, your output device is ready.");
      setTimeout(() => {
        audio.pause();
        audioContext.close();
      }, 700);
    } catch (error) {
      setSpeakerStatus("error");
      setMessage(error?.message || "Speaker test failed. Try another output device or browser.");
    }
  }

  /* ── Derived clarity detail strings ── */
  const cameraDetail = useMemo(() => {
    if (cameraOff) return "Camera is disabled for this session.";
    if (cameraStatus !== 'granted' && cameraStatus !== 'unclear')
      return cameraStatus === 'idle' ? "Required for interview presence checks." : "Live video stream is connected.";
    if (cameraClarity === 'unclear') return "⚠ Feed appears dark or blocked — check lens & lighting.";
    if (cameraClarity === 'ok')      return "✓ Video feed is clear.";
    return "Live video stream is connected.";
  }, [cameraStatus, cameraClarity, cameraOff]);

  const micDetail = useMemo(() => {
    if (micStatus !== 'granted') return micStatus === 'idle'
      ? "Required for voice capture and transcription."
      : "Live audio stream is connected.";
    if (micClarity === 'silent') return "⚠ No audio detected — check mic connection and mute status.";
    if (micClarity === 'ok')     return "✓ Microphone is picking up audio.";
    return "Speak normally to verify the mic level.";
  }, [micStatus, micClarity]);

  return (
    <div className="iv-fade-in">
      {/* ── Toast layer ── */}
      <Toast toasts={toasts} onDismiss={dismissToast} />

      {/* Keyframe for toast animation */}
      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateX(40px) scale(0.95); }
          to   { opacity: 1; transform: translateX(0)    scale(1);    }
        }
      `}</style>

      <div className="grid xl:grid-cols-[1fr_380px] gap-4">
        {/* ── Camera panel ── */}
        <Panel className="p-5">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <SectionLabel>Camera Preview</SectionLabel>
            <span style={{
              fontSize: '0.75rem', fontWeight: 600,
              color: canEnter ? 'var(--signal)' : 'var(--amber)',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <Radio size={12} /> {canEnter ? 'Ready' : 'Waiting'}
            </span>
          </div>

          <div style={{
            position: 'relative', minHeight: 340,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden', borderRadius: 10,
            background: 'var(--panel2)',
            border: `1px solid ${cameraClarity === 'unclear' ? 'var(--amber)' : 'var(--border)'}`,
          }}>
            {cameraOff ? (
              <div style={{ textAlign: 'center' }}>
                <CameraOff size={56} style={{ color: 'var(--text-faint)', margin: '0 auto' }} />
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 10 }}>Camera is disabled for this session</div>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef} autoPlay muted playsInline
                  style={{
                    position: 'absolute', inset: 0, height: '100%', width: '100%', objectFit: 'cover',
                    display: cameraStatus === 'granted' || cameraStatus === 'unclear' ? 'block' : 'none',
                  }}
                />
                {cameraStatus !== 'granted' && cameraStatus !== 'unclear' && (
                  <div style={{ textAlign: 'center' }}>
                    <Camera size={56} style={{ color: 'var(--text-faint)', margin: '0 auto' }} />
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 10 }}>No camera stream yet</div>
                  </div>
                )}
              </>
            )}

            {/* status badge top-left */}
            <span style={{
              position: 'absolute', top: 10, left: 10,
              background: cameraOff ? 'rgba(255,255,255,0.08)' : cameraClarity === 'unclear' ? 'rgba(245,158,11,0.9)' : cameraStatus === 'granted' ? 'rgba(34,197,94,0.9)' : 'rgba(0,0,0,0.7)',
              color: cameraOff ? 'var(--text-muted)' : (cameraStatus === 'granted' || cameraClarity === 'unclear') ? '#000' : '#999',
              borderRadius: 20, padding: '4px 10px', fontSize: '0.7rem', fontWeight: 700,
            }}>
              Camera · {cameraOff ? 'Disabled' : cameraClarity === 'unclear' ? 'Unclear' : cameraStatus}
            </span>

            {/* clarity badges bottom-right */}
            <ClarityBadge cameraClarity={cameraClarity} micClarity={micClarity} />
          </div>

          <div className="grid md:grid-cols-2 gap-4" style={{ marginTop: 16 }}>
            <DeviceSelect label="Camera"     value={selectedCamera} devices={devices.cameras}     onChange={setSelectedCamera} disabled={cameraOff} />
            <DeviceSelect label="Microphone" value={selectedMic}    devices={devices.microphones} onChange={setSelectedMic}    />
          </div>
        </Panel>

        {/* ── Access + controls panel ── */}
        <Panel className="p-5">
          <SectionLabel>Device Access</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <StatusRow
              label="Camera Access"
              status={cameraStatus === 'unclear' ? 'unclear' : cameraStatus}
              detail={cameraDetail}
            />
            <StatusRow
              label="Microphone Access"
              status={micClarity === 'silent' ? 'unclear' : micStatus}
              detail={micDetail}
            />
            <StatusRow
              label="Speaker Output"
              status={speakerStatus}
              detail={speakerDetail}
            />
          </div>

          <div style={{ marginTop: 20 }}>
            <Meter
              label="Live Mic Level"
              value={micLevel}
              color={micLevel > 8 ? 'var(--signal)' : 'var(--amber)'}
            />
            {micClarity === 'silent' && (
              <p style={{ fontSize: '0.75rem', color: 'var(--amber)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                <MicOff size={12} /> No audio — speak louder or check input device.
              </p>
            )}
          </div>

          <div style={{ marginTop: 20 }}>
            <DeviceSelect
              label="Speaker"
              value={selectedSpeaker}
              devices={devices.speakers}
              onChange={setSelectedSpeaker}
              disabled={!("setSinkId" in HTMLMediaElement.prototype)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 20 }}>
            <BrutalButton icon={Settings2} onClick={requestAccess} className="w-full">Allow Devices</BrutalButton>
            <BrutalButton icon={Volume2} variant="outline" onClick={testSpeaker} className="w-full">Test Speaker</BrutalButton>
          </div>

          <div style={{
            marginTop: 16, padding: '10px 12px',
            background: 'var(--panel2)', border: '1px solid var(--border)',
            borderRadius: 8, fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5,
          }}>
            {message}
          </div>

          <button
            disabled={!canEnter}
            onClick={() => go("interview")}
            className="iv-btn iv-btn-primary w-full"
            style={{ marginTop: 16, padding: '11px 16px', fontSize: '0.88rem' }}
          >
            <Play size={15} /> Enter Interview
          </button>
        </Panel>
      </div>
    </div>
  );
}
