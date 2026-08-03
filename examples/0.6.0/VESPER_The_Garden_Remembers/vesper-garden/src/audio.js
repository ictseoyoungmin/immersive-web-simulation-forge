(function (V) {
  "use strict";

  const C = V.CONFIG;
  const SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21];

  class GardenAudio {
    constructor() {
      this.context = null;
      this.master = null;
      this.ambientBus = null;
      this.voiceBus = null;
      this.effectBus = null;
      this.voices = new Map();
      this.muted = false;
      this.available = Boolean(window.AudioContext || window.webkitAudioContext);
      this.lastFocus = false;
      this.focusTone = null;
    }

    async unlock() {
      if (!this.available) return false;
      if (!this.context) this.buildGraph();
      if (this.context.state === "suspended") await this.context.resume();
      return this.context.state === "running";
    }

    buildGraph() {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      const context = new AudioContextClass({ latencyHint: "interactive" });
      const master = context.createGain();
      const compressor = context.createDynamicsCompressor();
      compressor.threshold.value = -20;
      compressor.knee.value = 18;
      compressor.ratio.value = 5;
      compressor.attack.value = .015;
      compressor.release.value = .32;
      master.gain.value = this.muted ? 0 : .58;
      master.connect(compressor).connect(context.destination);

      this.context = context;
      this.master = master;
      this.ambientBus = context.createGain();
      this.voiceBus = context.createGain();
      this.effectBus = context.createGain();
      this.ambientBus.gain.value = .34;
      this.voiceBus.gain.value = .5;
      this.effectBus.gain.value = .72;
      this.ambientBus.connect(master);
      this.voiceBus.connect(master);
      this.effectBus.connect(master);
      this.createAmbientBed();
      this.createFocusTone();
    }

    createAmbientBed() {
      const context = this.context;
      const lowpass = context.createBiquadFilter();
      lowpass.type = "lowpass";
      lowpass.frequency.value = 420;
      lowpass.Q.value = .5;
      lowpass.connect(this.ambientBus);

      const frequencies = [43.65, 65.41, 87.31];
      frequencies.forEach((frequency, index) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = index === 0 ? "sine" : "triangle";
        oscillator.frequency.value = frequency;
        oscillator.detune.value = index === 1 ? -6 : index === 2 ? 5 : 0;
        gain.gain.value = index === 0 ? .055 : .022;
        oscillator.connect(gain).connect(lowpass);
        oscillator.start();
      });

      const length = Math.floor(context.sampleRate * 3.4);
      const buffer = context.createBuffer(1, length, context.sampleRate);
      const channel = buffer.getChannelData(0);
      let last = 0;
      for (let i = 0; i < length; i += 1) {
        const white = Math.random() * 2 - 1;
        last = last * .993 + white * .007;
        channel[i] = last * .36;
      }
      const noise = context.createBufferSource();
      const noiseFilter = context.createBiquadFilter();
      const noiseGain = context.createGain();
      noise.buffer = buffer;
      noise.loop = true;
      noiseFilter.type = "bandpass";
      noiseFilter.frequency.value = 760;
      noiseFilter.Q.value = .45;
      noiseGain.gain.value = .045;
      noise.connect(noiseFilter).connect(noiseGain).connect(this.ambientBus);
      noise.start();
    }

    createFocusTone() {
      const context = this.context;
      const oscillator = context.createOscillator();
      const oscillator2 = context.createOscillator();
      const filter = context.createBiquadFilter();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator2.type = "triangle";
      oscillator.frequency.value = 174.61;
      oscillator2.frequency.value = 261.63;
      oscillator2.detune.value = -8;
      filter.type = "lowpass";
      filter.frequency.value = 680;
      gain.gain.value = 0;
      oscillator.connect(filter);
      oscillator2.connect(filter);
      filter.connect(gain).connect(this.effectBus);
      oscillator.start();
      oscillator2.start();
      this.focusTone = { oscillator, oscillator2, filter, gain };
    }

    setMuted(muted) {
      this.muted = Boolean(muted);
      if (!this.context || !this.master) return;
      const now = this.context.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setTargetAtTime(this.muted ? 0 : .58, now, .025);
    }

    frequencyFor(index, order = 0) {
      const def = C.FLOWER_DEFINITIONS[index];
      const semitones = SCALE[(def.note + order) % SCALE.length];
      return 110 * Math.pow(2, semitones / 12);
    }

    createVoice(index, order) {
      if (!this.context || this.voices.has(index)) return;
      const context = this.context;
      const def = C.FLOWER_DEFINITIONS[index];
      const frequency = this.frequencyFor(index, order);
      const oscillator = context.createOscillator();
      const overtone = context.createOscillator();
      const filter = context.createBiquadFilter();
      const gain = context.createGain();
      const pan = context.createStereoPanner ? context.createStereoPanner() : context.createGain();
      oscillator.type = index % 3 === 0 ? "sine" : index % 3 === 1 ? "triangle" : "sine";
      overtone.type = "sine";
      oscillator.frequency.value = frequency;
      overtone.frequency.value = frequency * (index % 2 ? 2.005 : 1.501);
      overtone.detune.value = (order - 2) * 2;
      filter.type = "lowpass";
      filter.frequency.value = 520;
      filter.Q.value = 1.2;
      gain.gain.value = 0;
      if (pan.pan) pan.pan.value = V.clamp((def.x / C.WORLD_WIDTH) * 1.5 - .75, -.72, .72);
      oscillator.connect(filter);
      overtone.connect(filter);
      filter.connect(gain).connect(pan).connect(this.voiceBus);
      oscillator.start();
      overtone.start();
      this.voices.set(index, { oscillator, overtone, filter, gain, pan, order, lastEnvelope: 0 });
    }

    syncFromState(game) {
      if (!this.context) return;
      for (let i = 0; i < game.flowerLimit; i += 1) {
        const flower = game.state.flowers[i];
        if (flower.active) this.createVoice(i, flower.order || 0);
      }
    }

    update(game, input) {
      if (!this.context || this.context.state !== "running") return;
      this.syncFromState(game);
      const now = this.context.currentTime;
      for (const [index, voice] of this.voices) {
        const flower = game.state.flowers[index];
        if (!flower || !flower.active) {
          voice.gain.gain.setTargetAtTime(0, now, .12);
          continue;
        }
        const def = C.FLOWER_DEFINITIONS[index];
        const wave = game.getWave(def, flower, game.state.fieldTime);
        const nearPulse = Math.pow(Math.max(0, 1 - wave.cycle), 4);
        const breathing = .18 + .16 * (Math.sin(wave.cycle * V.TAU - Math.PI * .5) * .5 + .5);
        const codaBoost = game.state.phase === "coda" ? .12 : 0;
        const envelope = .012 + breathing * .025 + nearPulse * .045 + codaBoost;
        voice.gain.gain.setTargetAtTime(envelope, now, .055);
        voice.filter.frequency.setTargetAtTime(430 + wave.cycle * 510 + nearPulse * 740, now, .08);
        voice.lastEnvelope = envelope;
      }
      const focusActive = Boolean(input && input.focus && game.state.moth.focus > .01 && ["play", "return"].includes(game.state.phase));
      if (this.focusTone) {
        const focusGain = focusActive ? .035 + game.state.moth.focus * .035 : 0;
        this.focusTone.gain.gain.setTargetAtTime(focusGain, now, focusActive ? .04 : .09);
        this.focusTone.filter.frequency.setTargetAtTime(480 + game.state.moth.focus * 900, now, .06);
      }
      this.lastFocus = focusActive;
    }

    playTone(frequency, duration, options = {}) {
      if (!this.context || this.context.state !== "running") return;
      const context = this.context;
      const now = context.currentTime;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const filter = context.createBiquadFilter();
      const pan = context.createStereoPanner ? context.createStereoPanner() : context.createGain();
      oscillator.type = options.type || "sine";
      oscillator.frequency.setValueAtTime(frequency, now);
      if (options.endFrequency) oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, options.endFrequency), now + duration);
      filter.type = "lowpass";
      filter.frequency.value = options.filter || 1800;
      gain.gain.setValueAtTime(.0001, now);
      gain.gain.exponentialRampToValueAtTime(options.gain || .12, now + Math.min(.035, duration * .15));
      gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
      if (pan.pan) pan.pan.value = V.clamp(options.pan || 0, -1, 1);
      oscillator.connect(filter).connect(gain).connect(pan).connect(this.effectBus);
      oscillator.start(now);
      oscillator.stop(now + duration + .05);
    }

    playBloom(index, order) {
      if (!this.context) return;
      this.createVoice(index, order);
      const root = this.frequencyFor(index, order);
      const def = C.FLOWER_DEFINITIONS[index];
      const pan = V.clamp((def.x / C.WORLD_WIDTH) * 1.5 - .75, -.72, .72);
      [1, 1.5, 2, 3].forEach((ratio, i) => {
        setTimeout(() => this.playTone(root * ratio, 1.35 + i * .18, { gain: .11 / (1 + i * .18), filter: 2200 + i * 320, pan, type: i % 2 ? "triangle" : "sine" }), i * 115);
      });
    }

    playPulse(index) {
      if (!this.context) return;
      const def = C.FLOWER_DEFINITIONS[index];
      const flower = this.voices.get(index);
      const root = this.frequencyFor(index, flower ? flower.order : 0);
      const pan = V.clamp((def.x / C.WORLD_WIDTH) * 1.5 - .75, -.72, .72);
      this.playTone(root * 2, .42, { gain: .035, filter: 2600, pan, type: "sine" });
    }

    playFray() {
      if (!this.context) return;
      this.playTone(180, .58, { endFrequency: 46, gain: .11, filter: 1300, type: "sawtooth" });
      this.playTone(320, .33, { endFrequency: 120, gain: .055, filter: 1800, pan: -.18, type: "triangle" });
    }

    playReform() {
      if (!this.context) return;
      this.playTone(220, .8, { endFrequency: 440, gain: .075, filter: 2200, type: "sine" });
      setTimeout(() => this.playTone(330, .7, { endFrequency: 660, gain: .055, filter: 2600, pan: .15, type: "sine" }), 90);
    }

    playCodaVoice(index, beat) {
      if (!this.context) return;
      const root = this.frequencyFor(index, beat);
      [1, 1.25, 1.5, 2].forEach((ratio, i) => {
        setTimeout(() => this.playTone(root * ratio, 1.8, { gain: .1 - i * .012, filter: 3200, pan: V.lerp(-.55, .55, beat / Math.max(1, C.ACTIVE_FLOWER_LIMIT - 1)), type: i === 1 ? "triangle" : "sine" }), i * 95);
      });
    }

    playUi() {
      this.playTone(523.25, .16, { gain: .035, filter: 2400, type: "sine" });
    }
  }

  V.GardenAudio = GardenAudio;
})(window.Vesper ||= {});
