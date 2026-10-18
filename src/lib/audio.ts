// F1 audio engine.
//
// Everything here is synthesised at runtime with the Web Audio API — no sampled
// or third-party audio files are shipped. The context is only created after an
// explicit user gesture (enable()), so the site is silent until asked otherwise.

export type UiSound = 'tick' | 'click' | 'confirm' | 'deny' | 'shift' | 'flag';

interface Voice {
  gain: GainNode;
  stop: () => void;
}

function noiseBuffer(ctx: AudioContext, seconds = 3): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < length; i += 1) {
    const white = Math.random() * 2 - 1;
    // Light smoothing turns white noise into something closer to pink.
    last = (last + 0.02 * white) / 1.02;
    data[i] = white * 0.6 + last * 3.2;
  }
  return buffer;
}

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private engineVoice: (Voice & { set: (rpm: number, load: number) => void }) | null = null;
  private ambienceVoice: Voice | null = null;
  private rainVoice: Voice | null = null;
  private _volume = 0.7;
  private _muted = false;
  private _enabled = false;

  get enabled(): boolean {
    return this._enabled;
  }

  get supported(): boolean {
    if (typeof window === 'undefined') return false;
    return Boolean(window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext);
  }

  get muted(): boolean {
    return this._muted;
  }

  get volume(): number {
    return this._volume;
  }

  async enable(): Promise<void> {
    if (!this.supported) return;
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this._muted ? 0 : this._volume;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    this._enabled = true;
  }

  disable(): void {
    this._enabled = false;
    this.engineVoice?.stop();
    this.engineVoice = null;
    this.ambienceVoice?.stop();
    this.ambienceVoice = null;
    this.rainVoice?.stop();
    this.rainVoice = null;
    if (this.ctx && this.ctx.state === 'running') void this.ctx.suspend();
  }

  setVolume(value: number): void {
    this._volume = Math.min(1, Math.max(0, value));
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(this._muted ? 0 : this._volume, this.ctx.currentTime, 0.05);
    }
  }

  setMuted(muted: boolean): void {
    this._muted = muted;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(muted ? 0 : this._volume, this.ctx.currentTime, 0.08);
    }
  }

  /** Short interface blip. */
  ui(kind: UiSound): void {
    if (!this._enabled || !this.ctx || !this.master) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const table: Record<UiSound, { type: OscillatorType; f0: number; f1: number; dur: number; peak: number }> = {
      tick: { type: 'triangle', f0: 1400, f1: 1400, dur: 0.035, peak: 0.05 },
      click: { type: 'square', f0: 320, f1: 220, dur: 0.07, peak: 0.06 },
      confirm: { type: 'triangle', f0: 520, f1: 880, dur: 0.16, peak: 0.07 },
      deny: { type: 'square', f0: 240, f1: 120, dur: 0.18, peak: 0.06 },
      shift: { type: 'square', f0: 900, f1: 300, dur: 0.09, peak: 0.08 },
      flag: { type: 'triangle', f0: 700, f1: 1500, dur: 0.5, peak: 0.08 },
    };
    const cfg = table[kind];
    osc.type = cfg.type;
    osc.frequency.setValueAtTime(cfg.f0, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, cfg.f1), now + cfg.dur);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(cfg.peak, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + cfg.dur);
    osc.connect(gain).connect(this.master);
    osc.start(now);
    osc.stop(now + cfg.dur + 0.02);
  }

  /** Continuous power unit: call from the render loop with 0..1 values. */
  setEngine(rpm: number, load: number): void {
    if (!this._enabled || !this.ctx || !this.master) return;
    if (!this.engineVoice) this.engineVoice = this.createEngineVoice();
    if (!this.engineVoice) return;
    this.engineVoice.set(rpm, load);
  }

  setAmbience(on: boolean): void {
    if (!this._enabled || !this.ctx || !this.master) return;
    if (on && !this.ambienceVoice) this.ambienceVoice = this.createAmbienceVoice();
    if (!on && this.ambienceVoice) {
      this.ambienceVoice.stop();
      this.ambienceVoice = null;
    }
  }

  setRain(on: boolean): void {
    if (!this._enabled || !this.ctx || !this.master) return;
    if (on && !this.rainVoice) this.rainVoice = this.createRainVoice();
    if (!on && this.rainVoice) {
      this.rainVoice.stop();
      this.rainVoice = null;
    }
  }

  private createEngineVoice(): (Voice & { set: (rpm: number, load: number) => void }) | null {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return null;

    const out = ctx.createGain();
    out.gain.value = 0.0001;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 900;
    filter.Q.value = 6;
    filter.connect(out).connect(master);

    const a = ctx.createOscillator();
    a.type = 'sawtooth';
    const b = ctx.createOscillator();
    b.type = 'sawtooth';
    b.detune.value = 9;
    const sub = ctx.createOscillator();
    sub.type = 'square';
    const subGain = ctx.createGain();
    subGain.gain.value = 0.35;
    sub.connect(subGain).connect(filter);
    a.connect(filter);
    b.connect(filter);

    // Induction / air noise rides on top of the harmonics.
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer(ctx);
    noise.loop = true;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.Q.value = 1.1;
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.18;
    noise.connect(noiseFilter).connect(noiseGain).connect(out);

    a.start();
    b.start();
    sub.start();
    noise.start();

    const set = (rpm: number, load: number) => {
      const r = Math.min(1, Math.max(0, rpm));
      const l = Math.min(1, Math.max(0, load));
      const base = 48 + Math.pow(r, 1.12) * 205;
      const now = ctx.currentTime;
      a.frequency.setTargetAtTime(base, now, 0.04);
      b.frequency.setTargetAtTime(base * 1.005, now, 0.04);
      sub.frequency.setTargetAtTime(base * 0.5, now, 0.05);
      filter.frequency.setTargetAtTime(420 + r * 2600 + l * 500, now, 0.06);
      noiseFilter.frequency.setTargetAtTime(500 + r * 2600, now, 0.08);
      out.gain.setTargetAtTime(0.02 + l * 0.08 + r * 0.03, now, 0.09);
    };

    const stop = () => {
      const now = ctx.currentTime;
      out.gain.setTargetAtTime(0.0001, now, 0.08);
      window.setTimeout(() => {
        try {
          a.stop();
          b.stop();
          sub.stop();
          noise.stop();
        } catch {
          /* already stopped */
        }
      }, 400);
    };

    return { gain: out, set, stop };
  }

  private createAmbienceVoice(): Voice | null {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return null;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx, 4);
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 480;
    const gain = ctx.createGain();
    gain.gain.value = 0.0001;
    // Slow breathe so the crowd/atmosphere bed does not feel like a static loop.
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.08;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.022;
    lfo.connect(lfoGain).connect(gain.gain);
    src.connect(filter).connect(gain).connect(master);
    src.start();
    lfo.start();
    gain.gain.setTargetAtTime(0.03, ctx.currentTime, 1.2);
    return {
      gain,
      stop: () => {
        gain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.4);
        window.setTimeout(() => {
          try {
            src.stop();
            lfo.stop();
          } catch {
            /* already stopped */
          }
        }, 900);
      },
    };
  }

  private createRainVoice(): Voice | null {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return null;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx, 4);
    src.loop = true;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 950;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 5200;
    const gain = ctx.createGain();
    gain.gain.value = 0.0001;
    src.connect(hp).connect(lp).connect(gain).connect(master);
    src.start();
    gain.gain.setTargetAtTime(0.045, ctx.currentTime, 0.8);
    return {
      gain,
      stop: () => {
        gain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.3);
        window.setTimeout(() => {
          try {
            src.stop();
          } catch {
            /* already stopped */
          }
        }, 700);
      },
    };
  }
}

export const audio = new AudioEngine();
