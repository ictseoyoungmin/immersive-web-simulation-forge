/**
 * Procedural mechanical foley (planning §9 — 기계음·서보음·잠금음).
 *
 * Everything is synthesised: no audio files, no fetches. The context is created
 * lazily on the first user gesture so autoplay policy is never violated, and the
 * whole bus can be muted without tearing anything down.
 *
 * Sound is feedback, not decoration — each cue maps to one mechanical event in
 * the assembly grammar (travel / seat / lock / unlock / arrest).
 */

export function createFoley() {
  let context = null;
  let master = null;
  let muted = false;
  let servoVoice = null;
  const noiseCache = new Map();

  function ensure() {
    if (context) return context;
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) return null;
    context = new Context();
    master = context.createGain();
    master.gain.value = muted ? 0 : 0.5;
    // gentle bus compression so the click transients never spike
    const shaper = context.createDynamicsCompressor();
    shaper.threshold.value = -18;
    shaper.knee.value = 22;
    shaper.ratio.value = 5;
    shaper.attack.value = 0.003;
    shaper.release.value = 0.2;
    master.connect(shaper);
    shaper.connect(context.destination);
    return context;
  }

  function noiseBuffer(seconds) {
    const key = seconds.toFixed(3);
    if (noiseCache.has(key)) return noiseCache.get(key);
    const length = Math.max(1, Math.floor(context.sampleRate * seconds));
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < length; i += 1) {
      const white = Math.random() * 2 - 1;
      last = (last + white * 0.42) / 1.42;   // slightly brown: less hiss, more material
      data[i] = last * 2.4;
    }
    noiseCache.set(key, buffer);
    return buffer;
  }

  function envelope(gainNode, peak, attack, decay, at) {
    gainNode.gain.setValueAtTime(0.0001, at);
    gainNode.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), at + attack);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, at + attack + decay);
  }

  function burst({ duration = 0.09, peak = 0.5, frequency = 2400, q = 6, type = 'bandpass', at = 0 }) {
    const source = context.createBufferSource();
    source.buffer = noiseBuffer(Math.max(0.12, duration + 0.05));
    const filter = context.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(frequency, at);
    filter.Q.value = q;
    const gain = context.createGain();
    envelope(gain, peak, 0.004, duration, at);
    source.connect(filter); filter.connect(gain); gain.connect(master);
    source.start(at);
    source.stop(at + duration + 0.08);
  }

  function tone({ frequency = 120, endFrequency = null, duration = 0.16, peak = 0.35, type = 'sine', at = 0 }) {
    const osc = context.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, at);
    if (endFrequency) osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), at + duration);
    const gain = context.createGain();
    envelope(gain, peak, 0.006, duration, at);
    osc.connect(gain); gain.connect(master);
    osc.start(at);
    osc.stop(at + duration + 0.05);
  }

  const api = {
    get available() { return Boolean(context) || Boolean(window.AudioContext || window.webkitAudioContext); },
    get muted() { return muted; },

    resume() {
      const ctx = ensure();
      if (ctx && ctx.state === 'suspended') ctx.resume();
      return Boolean(ctx);
    },

    setMuted(value) {
      muted = Boolean(value);
      if (master) master.gain.setTargetAtTime(muted ? 0 : 0.5, context.currentTime, 0.02);
      if (muted) api.stopServo();
      return muted;
    },

    /** Continuous servo whine while a part is travelling. */
    startServo(seconds = 0.9) {
      if (!ensure() || muted) return;
      api.stopServo();
      const now = context.currentTime;
      const osc = context.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(184, now);
      osc.frequency.linearRampToValueAtTime(268, now + seconds * 0.55);
      osc.frequency.linearRampToValueAtTime(196, now + seconds);

      const filter = context.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(900, now);
      filter.frequency.linearRampToValueAtTime(1650, now + seconds * 0.6);
      filter.Q.value = 3.2;

      const gain = context.createGain();
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.075, now + 0.05);
      gain.gain.setValueAtTime(0.075, now + seconds * 0.8);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + seconds);

      osc.connect(filter); filter.connect(gain); gain.connect(master);
      osc.start(now);
      osc.stop(now + seconds + 0.05);
      servoVoice = { osc, gain };
    },

    stopServo() {
      if (!servoVoice || !context) return;
      try {
        servoVoice.gain.gain.cancelScheduledValues(context.currentTime);
        servoVoice.gain.gain.setTargetAtTime(0.0001, context.currentTime, 0.03);
        servoVoice.osc.stop(context.currentTime + 0.12);
      } catch { /* already stopped */ }
      servoVoice = null;
    },

    /** Part meets its stop face. */
    seat() {
      if (!ensure() || muted) return;
      const at = context.currentTime;
      burst({ duration: 0.045, peak: 0.42, frequency: 2600, q: 5, at });
      tone({ frequency: 168, endFrequency: 96, duration: 0.09, peak: 0.22, type: 'triangle', at });
    },

    /** Fastener engages — thread torque-down, lever clamp, catch, or pin detent. */
    lock(kind = 'lever') {
      if (!ensure() || muted) return;
      const at = context.currentTime;
      if (kind === 'thread') {
        for (let i = 0; i < 3; i += 1) burst({ duration: 0.03, peak: 0.3, frequency: 1750, q: 8, at: at + i * 0.055 });
        tone({ frequency: 132, endFrequency: 88, duration: 0.16, peak: 0.3, type: 'sine', at: at + 0.11 });
      } else if (kind === 'catch') {
        burst({ duration: 0.05, peak: 0.55, frequency: 3100, q: 7, at });
        tone({ frequency: 220, endFrequency: 110, duration: 0.12, peak: 0.26, type: 'square', at });
      } else if (kind === 'collar') {
        burst({ duration: 0.08, peak: 0.34, frequency: 1400, q: 3, at });
        tone({ frequency: 104, endFrequency: 72, duration: 0.2, peak: 0.3, type: 'sine', at: at + 0.03 });
      } else {
        burst({ duration: 0.038, peak: 0.5, frequency: 2900, q: 9, at });
        tone({ frequency: 148, endFrequency: 92, duration: 0.14, peak: 0.28, type: 'triangle', at });
      }
    },

    unlock() {
      if (!ensure() || muted) return;
      const at = context.currentTime;
      tone({ frequency: 92, endFrequency: 138, duration: 0.1, peak: 0.2, type: 'triangle', at });
      burst({ duration: 0.05, peak: 0.32, frequency: 1900, q: 5, at: at + 0.04 });
    },

    /** Arrested approach — the part hits an obstruction and cannot seat. */
    arrest() {
      if (!ensure() || muted) return;
      const at = context.currentTime;
      burst({ duration: 0.11, peak: 0.62, frequency: 850, q: 1.6, at });
      tone({ frequency: 86, endFrequency: 58, duration: 0.24, peak: 0.36, type: 'square', at });
      tone({ frequency: 1180, endFrequency: 940, duration: 0.16, peak: 0.10, type: 'triangle', at: at + 0.01 });
    },

    /** Validation rejection tone — deliberately unmusical. */
    fault() {
      if (!ensure() || muted) return;
      const at = context.currentTime;
      tone({ frequency: 196, endFrequency: 188, duration: 0.11, peak: 0.16, type: 'square', at });
      tone({ frequency: 146, endFrequency: 138, duration: 0.15, peak: 0.16, type: 'square', at: at + 0.13 });
    },

    /** Panel interaction — barely there, just enough to feel physical. */
    ui(kind = 'select') {
      if (!ensure() || muted) return;
      const at = context.currentTime;
      if (kind === 'select') burst({ duration: 0.022, peak: 0.16, frequency: 4200, q: 10, at });
      else if (kind === 'commit') { burst({ duration: 0.03, peak: 0.2, frequency: 3400, q: 8, at }); tone({ frequency: 320, duration: 0.07, peak: 0.1, type: 'sine', at }); }
      else burst({ duration: 0.018, peak: 0.1, frequency: 5200, q: 12, at });
    },

    dispose() {
      api.stopServo();
      noiseCache.clear();
      if (context) { context.close?.(); context = null; master = null; }
    }
  };

  return api;
}
