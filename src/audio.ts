export class Soundscape {
  ctx: AudioContext | null = null;
  enabled = true;
  musicEnabled = true;
  timer: ReturnType<typeof setInterval> | null = null;
  step = 0;
  battle = false;
  unlock() {
    if (!this.ctx) this.ctx = new AudioContext();
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    if (!this.timer) this.timer = setInterval(() => this.tick(), 470);
  }
  tone(hz: number, duration: number, volume = 0.04, type: OscillatorType = 'sine', delay = 0) {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime + delay,
      o = this.ctx.createOscillator(),
      g = this.ctx.createGain();
    o.type = type;
    o.frequency.value = hz;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(volume, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.001, t + duration);
    o.connect(g);
    g.connect(this.ctx.destination);
    o.start(t);
    o.stop(t + duration + 0.02);
  }
  play(kind: string) {
    if (!this.enabled) return;
    this.unlock();
    if (kind === 'click') {
      this.tone(520, 0.07, 0.02, 'sine');
    }
    if (kind === 'move') {
      this.tone(185, 0.08, 0.025, 'triangle');
      this.tone(240, 0.09, 0.02, 'triangle', 0.07);
    }
    if (kind === 'damage') {
      this.tone(85, 0.18, 0.075, 'triangle');
      this.tone(150, 0.1, 0.03, 'sawtooth');
    }
    if (kind === 'heal' || kind === 'buff') {
      [392, 494, 587].forEach((f, i) => this.tone(f, 0.35, 0.025, 'sine', i * 0.09));
    }
    if (kind === 'cast') {
      [220, 330, 440, 660].forEach((f, i) => this.tone(f, 0.5, 0.025, 'triangle', i * 0.07));
    }
    if (kind === 'victory') {
      [261.63, 329.63, 392, 523.25].forEach((f, i) =>
        this.tone(f, 1.2, 0.045, 'triangle', i * 0.18)
      );
    }
    if (kind === 'defeat') {
      [330, 294, 261, 196].forEach((f, i) => this.tone(f, 0.8, 0.04, 'triangle', i * 0.2));
    }
  }
  tick() {
    if (!this.ctx || !this.enabled || !this.musicEnabled || document.hidden) return;
    const melody = [
      62, 69, 74, 76, 77, 76, 74, 69, 65, 72, 74, 77, 76, 72, 69, 65, 60, 67, 72, 74, 76, 74, 72,
      67, 57, 64, 69, 72, 71, 69, 64, 62
    ];
    const n = melody[this.step % melody.length],
      hz = 440 * 2 ** ((n - 69) / 12);
    this.tone(hz, 0.68, 0.012, 'triangle');
    if (this.step % 4 === 0)
      this.tone(
        440 * 2 ** (([38, 41, 36, 33][Math.floor(this.step / 8) % 4] - 69) / 12),
        1.8,
        0.02,
        'sine'
      );
    if (this.battle && this.step % 2 === 0) this.tone(70, 0.13, 0.018, 'triangle');
    this.step++;
  }
}
