// Procedural train sound: a low rumble and rail-joint clacks. Nothing plays until the first click or key.
export class TrainAudio {
  constructor() { this.ctx = null; this.on = false; this.muted = false; }

  start() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = (this.ctx = new AC());
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(ctx.destination);
    this.master.gain.linearRampToValueAtTime(0.55, ctx.currentTime + 1.5);

    // brown-ish noise loop for the rumble
    const len = ctx.sampleRate * 4;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.2; }
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 220; lp.Q.value = 0.4;
    const g = ctx.createGain(); g.gain.value = 0.55;
    src.connect(lp).connect(g).connect(this.master);
    src.start();
    // a soft motor hum with slow wobble
    const hum = ctx.createOscillator(); hum.type = 'sine'; hum.frequency.value = 62;
    const hg = ctx.createGain(); hg.gain.value = 0.035;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.23; const lg = ctx.createGain(); lg.gain.value = 3;
    lfo.connect(lg).connect(hum.frequency);
    hum.connect(hg).connect(this.master); hum.start(); lfo.start();
    // white noise buffer for clacks
    const nb = ctx.createBuffer(1, ctx.sampleRate * 0.2, ctx.sampleRate);
    const nd = nb.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    this.noise = nb;
    this.on = true;
  }

  // one wheel over a joint: a short knock plus a dull thump
  clack(strength = 1) {
    if (!this.on || this.muted) return;
    const ctx = this.ctx, t = ctx.currentTime + 0.01;
    const s = ctx.createBufferSource(); s.buffer = this.noise;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1400 + Math.random() * 300; bp.Q.value = 2.5;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.16 * strength, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    s.connect(bp).connect(g).connect(this.master); s.start(t); s.stop(t + 0.1);
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(55, t + 0.09);
    const og = ctx.createGain(); og.gain.setValueAtTime(0.0001, t); og.gain.exponentialRampToValueAtTime(0.28 * strength, t + 0.005); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    o.connect(og).connect(this.master); o.start(t); o.stop(t + 0.15);
  }

  toggle() {
    if (!this.ctx) { this.start(); return true; }
    this.muted = !this.muted;
    this.master.gain.cancelScheduledValues(this.ctx.currentTime);
    this.master.gain.linearRampToValueAtTime(this.muted ? 0 : 0.55, this.ctx.currentTime + 0.3);
    return !this.muted;
  }
}
