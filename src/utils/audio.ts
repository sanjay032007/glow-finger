class AudioEngine {
  private ctx: AudioContext | null = null;
  private ambientGain: GainNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private isAmbientPlaying = false;
  private chordTimeout: any = null;

  private getCtx(): { ctx: AudioContext; t: number } | null {
    this.init();
    if (!this.ctx) return null;
    return { ctx: this.ctx, t: this.ctx.currentTime };
  }

  private createNoiseBuffer(duration: number): AudioBuffer {
    const bufferSize = this.ctx!.sampleRate * duration;
    const buffer = this.ctx!.createBuffer(1, bufferSize, this.ctx!.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  private playTone(freq: number, type: OscillatorType, duration: number, volume: number) {
    const r = this.getCtx();
    if (!r) return null;
    const { ctx, t } = r;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(t);
    osc.stop(t + duration);
    return { osc, gain, t, ctx };
  }

  private init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playClick() {
    const r = this.playTone(800, 'sine', 0.15, 0.08);
    if (r) r.osc.frequency.exponentialRampToValueAtTime(100, r.t + 0.15);
  }

  playSnap() {
    const r = this.getCtx();
    if (!r) return;
    const { ctx, t } = r;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1500, t);
    osc.frequency.exponentialRampToValueAtTime(150, t + 0.08);
    
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    
    const buffer = this.createNoiseBuffer(0.03);
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(2000, t);
    
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.1, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
    
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(t);
    osc.stop(t + 0.08);
    noise.start(t);
    noise.stop(t + 0.08);
  }

  playHover() {
    const r = this.playTone(200, 'triangle', 0.08, 0.03);
    if (r) {
      r.osc.frequency.cancelScheduledValues(r.t);
      r.osc.frequency.setValueAtTime(200, r.t);
      r.osc.frequency.linearRampToValueAtTime(400, r.t + 0.08);
      r.gain.gain.cancelScheduledValues(r.t);
      r.gain.gain.setValueAtTime(0.03, r.t);
      r.gain.gain.linearRampToValueAtTime(0.001, r.t + 0.08);
    }
  }

  playSlash() {
    const r = this.getCtx();
    if (!r) return;
    const { ctx, t } = r;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(1500, t + 0.12);
    
    const buffer = this.createNoiseBuffer(0.1);
    
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(800, t);
    noiseFilter.frequency.exponentialRampToValueAtTime(300, t + 0.12);
    
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.05, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(t);
    osc.stop(t + 0.12);
    noise.start(t);
    noise.stop(t + 0.12);
  }

  playCombo() {
    const r = this.getCtx();
    if (!r) return;
    const { ctx, t } = r;
    
    const notes = [261.63, 329.63, 392.00, 523.25];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + idx * 0.06);
      gain.gain.setValueAtTime(0.06, t + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.06 + 0.2);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t + idx * 0.06);
      osc.stop(t + idx * 0.06 + 0.2);
    });
  }

  playBomb() {
    const r = this.getCtx();
    if (!r) return;
    const { ctx, t } = r;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, t);
    osc.frequency.exponentialRampToValueAtTime(10, t + 0.4);
    
    const buffer = this.createNoiseBuffer(0.4);
    
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(200, t);
    filter.frequency.exponentialRampToValueAtTime(40, t + 0.4);
    
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.2, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(t);
    osc.stop(t + 0.4);
    noise.start(t);
    noise.stop(t + 0.4);
  }

  playFreeze() {
    const r = this.playTone(1200, 'sine', 0.5, 0.08);
    if (r) {
      r.osc.frequency.linearRampToValueAtTime(600, r.t + 0.5);
      const lfo = r.ctx.createOscillator();
      const lfoGain = r.ctx.createGain();
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(30, r.t);
      lfoGain.gain.setValueAtTime(100, r.t);
      lfo.connect(lfoGain);
      lfoGain.connect(r.osc.frequency);
      lfo.start(r.t);
      lfo.stop(r.t + 0.5);
    }
  }

  playCamera() {
    const r = this.getCtx();
    if (!r) return;
    const { ctx, t } = r;
    
    const buffer = this.createNoiseBuffer(0.12);
    
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, t);
    filter.frequency.exponentialRampToValueAtTime(3500, t + 0.05);
    filter.frequency.exponentialRampToValueAtTime(1200, t + 0.12);
    
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    
    noise.start(t);
    noise.stop(t + 0.12);
  }

  startAmbientLoop() {
    this.init();
    if (!this.ctx || this.isAmbientPlaying) return;
    
    this.isAmbientPlaying = true;
    this.ambientGain = this.ctx.createGain();
    this.ambientGain.gain.setValueAtTime(0.02, this.ctx.currentTime);
    
    this.filter = this.ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.setValueAtTime(300, this.ctx.currentTime);
    
    this.ambientGain.connect(this.filter);
    this.filter.connect(this.ctx.destination);
    
    const chords = [
      [65.41, 130.81, 155.56, 196.00, 233.08],
      [58.27, 116.54, 146.83, 174.61, 233.08],
      [51.91, 103.83, 130.81, 155.56, 207.65],
    ];
    
    let chordIdx = 0;
    const playChordLoop = () => {
      if (!this.isAmbientPlaying || !this.ctx) return;
      const t = this.ctx.currentTime;
      const chord = chords[chordIdx];
      const duration = 6.0;
      
      chord.forEach((freq) => {
        const osc = this.ctx!.createOscillator();
        const oscGain = this.ctx!.createGain();
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);
        
        oscGain.gain.setValueAtTime(0, t);
        oscGain.gain.linearRampToValueAtTime(0.15, t + 1.5);
        oscGain.gain.setValueAtTime(0.15, t + duration - 1.5);
        oscGain.gain.linearRampToValueAtTime(0, t + duration);
        
        osc.connect(oscGain);
        oscGain.connect(this.ambientGain!);
        
        osc.start(t);
        osc.stop(t + duration);
      });
      
      this.filter!.frequency.cancelScheduledValues(t);
      this.filter!.frequency.setValueAtTime(250, t);
      this.filter!.frequency.exponentialRampToValueAtTime(600, t + duration / 2);
      this.filter!.frequency.exponentialRampToValueAtTime(250, t + duration);
      
      chordIdx = (chordIdx + 1) % chords.length;
      this.chordTimeout = setTimeout(playChordLoop, (duration - 0.1) * 1000);
    };
    
    playChordLoop();
  }

  stopAmbientLoop() {
    this.isAmbientPlaying = false;
    if (this.chordTimeout) {
      clearTimeout(this.chordTimeout);
    }
    if (this.ambientGain) {
      try {
        this.ambientGain.disconnect();
      } catch (e) {}
    }
  }
}

export const audio = new AudioEngine();
