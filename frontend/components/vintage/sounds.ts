'use client';

/**
 * Tiny mechanical click for transport buttons. Uses Web Audio so we don't
 * have to ship a WAV file. Synthesizes a short noise burst with a fast
 * envelope — sounds like a relay click. Opt-in via localStorage.
 */
let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (ctx) return ctx;
  try {
    const Ctor = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    return ctx;
  } catch {
    return null;
  }
}

export function playMechanicalClick() {
  if (typeof window === 'undefined') return;
  if (localStorage.getItem('mym-mech-sounds') !== '1') return;
  if (document.documentElement.dataset.skin !== 'vintage') return;
  const c = getCtx();
  if (!c) return;
  if (c.state === 'suspended') c.resume().catch(() => {});

  const now = c.currentTime;
  // A short burst of band-passed noise.
  const noise = c.createBufferSource();
  const buffer = c.createBuffer(1, 1024, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.6;
  noise.buffer = buffer;

  const filter = c.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 2400;
  filter.Q.value = 1.6;

  const gain = c.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.18, now + 0.001);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(c.destination);
  noise.start(now);
  noise.stop(now + 0.06);
}
