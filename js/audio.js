/* Zvuky. Nic se nestahuje — všechno si hra spočítá sama přes Web Audio.
   Prohlížeče nepustí zvuk dřív než po prvním doteku, proto se budí až v probud(). */

const Zvuk = {

  ctx: null,
  master: null,
  vypnuto: false,
  sumBuffer: null,
  vodaZdroj: null,
  vodaGain: null,

  probud(){
    if (this.ctx){
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;

    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.vypnuto ? 0 : 0.55;
    this.master.connect(this.ctx.destination);

    /* dvě vteřiny šumu, ze kterých se skládají všechny nárazy a šplouchnutí */
    const dl = this.ctx.sampleRate * 2;
    this.sumBuffer = this.ctx.createBuffer(1, dl, this.ctx.sampleRate);
    const dat = this.sumBuffer.getChannelData(0);
    for (let i = 0; i < dl; i++) dat[i] = Math.random() * 2 - 1;
  },

  ztlum(stav){
    this.vypnuto = stav;
    if (this.master) this.master.gain.value = stav ? 0 : 0.55;
  },

  /* ---------- stavební kameny ---------- */

  ton(freq, delka, typ, hlasitost, cil){
    if (!this.ctx || this.vypnuto) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = typ || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (cil) o.frequency.exponentialRampToValueAtTime(Math.max(30, cil), t + delka);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(hlasitost, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + delka);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + delka + 0.02);
  },

  sum(delka, hlasitost, freq, typ, cil){
    if (!this.ctx || this.vypnuto || !this.sumBuffer) return;
    const t = this.ctx.currentTime;
    const s = this.ctx.createBufferSource();
    s.buffer = this.sumBuffer;
    s.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = typ || 'lowpass';
    f.frequency.setValueAtTime(freq, t);
    if (cil) f.frequency.exponentialRampToValueAtTime(Math.max(60, cil), t + delka);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(hlasitost, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + delka);
    s.connect(f); f.connect(g); g.connect(this.master);
    s.start(t); s.stop(t + delka + 0.02);
  },

  /* ---------- herní zvuky ---------- */

  skok(){
    this.ton(300, 0.16, 'triangle', 0.30, 700);
    this.sum(0.07, 0.10, 1800, 'highpass');
  },

  dopad(povrch){
    if (povrch === 'led'){
      this.ton(900, 0.10, 'sine', 0.16, 1300);
      this.sum(0.16, 0.13, 3200, 'highpass');
    } else if (povrch === 'snih'){
      this.sum(0.20, 0.20, 900, 'lowpass', 400);
    } else {
      this.ton(150, 0.10, 'sine', 0.26, 80);
      this.sum(0.10, 0.16, 900, 'lowpass');
    }
  },

  trny(){
    this.ton(220, 0.28, 'sawtooth', 0.26, 70);
    this.sum(0.22, 0.24, 2600, 'highpass');
  },

  zasah(typ){
    if (typ === 'rampouch'){
      this.ton(1400, 0.14, 'triangle', 0.22, 500);
      this.sum(0.24, 0.20, 4200, 'highpass');
    } else if (typ === 'koule'){
      this.sum(0.30, 0.30, 700, 'lowpass', 200);
      this.ton(110, 0.20, 'sine', 0.20, 60);
    } else {
      this.ton(90, 0.26, 'square', 0.22, 45);
      this.sum(0.26, 0.26, 1200, 'lowpass');
    }
  },

  konec(){
    this.sum(0.9, 0.34, 2600, 'lowpass', 180);
    this.ton(320, 0.7, 'sine', 0.20, 60);
  },

  zona(){
    this.ton(520, 0.5, 'sine', 0.16, 780);
    this.ton(780, 0.6, 'sine', 0.10, 1040);
  },

  klik(){
    this.ton(680, 0.05, 'square', 0.10, 880);
  },

  /* ---------- hukot stoupající vody ---------- */

  vodaStart(){
    if (!this.ctx || !this.sumBuffer || this.vodaZdroj) return;
    const s = this.ctx.createBufferSource();
    s.buffer = this.sumBuffer;
    s.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 340;
    const g = this.ctx.createGain();
    g.gain.value = 0;
    s.connect(f); f.connect(g); g.connect(this.master);
    s.start();
    this.vodaZdroj = s;
    this.vodaGain = g;
  },

  vodaStop(){
    if (this.vodaZdroj){
      try { this.vodaZdroj.stop(); } catch(e){}
      this.vodaZdroj = null;
      this.vodaGain = null;
    }
  },

  /* blizkost 0 = daleko, 1 = voda pod patami */
  voda(blizkost){
    if (!this.vodaGain) return;
    const cil = Math.max(0, Math.min(1, blizkost));
    /* plynule, ať to nelupe */
    this.vodaGain.gain.value += (cil * 0.32 - this.vodaGain.gain.value) * 0.08;
  },
};
