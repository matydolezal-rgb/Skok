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

    /* na některých zařízeních se zvuk nepodaří spustit vůbec —
       hra kvůli tomu nesmí spadnout, prostě bude tichá */
    try { this.ctx = new AC(); } catch(e){ return; }
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

  /* Měkké šustnutí místo pípnutí. Skok je nejčastější zvuk ve hře —
     když je ostrý, po deseti kolech bolí uši. */
  skok(){
    this.sum(0.13, 0.075, 700, 'bandpass', 2100);
    this.ton(190, 0.09, 'sine', 0.055, 260);
  },

  /* dopad zní taky často — držíme ho tiše, rozliší se barvou, ne hlasitostí */
  dopad(povrch){
    if (povrch === 'led'){
      this.ton(860, 0.09, 'sine', 0.075, 1200);
      this.sum(0.14, 0.070, 3200, 'highpass');
    } else if (povrch === 'snih'){
      this.sum(0.20, 0.105, 800, 'lowpass', 380);
    } else {
      this.ton(140, 0.10, 'sine', 0.130, 80);
      this.sum(0.10, 0.075, 900, 'lowpass');
    }
  },

  /* Nárazy musí být cítit, ne bolet. Proto tiše a bez pilových průběhů —
     ránu už stejně sděluje probliknutí a zamrznutí obrazu. */
  trny(){
    this.ton(190, 0.22, 'triangle', 0.085, 75);
    this.sum(0.18, 0.075, 1500, 'bandpass', 480);
  },

  zasah(typ){
    if (typ === 'rampouch'){
      this.ton(980, 0.12, 'sine', 0.060, 480);
      this.sum(0.18, 0.055, 3000, 'highpass');
    } else if (typ === 'koule'){
      this.sum(0.28, 0.105, 620, 'lowpass', 190);
      this.ton(105, 0.18, 'sine', 0.075, 60);
    } else {
      this.ton(88, 0.24, 'sine', 0.105, 45);
      this.sum(0.22, 0.085, 1000, 'lowpass');
    }
  },

  konec(){
    this.sum(0.9, 0.20, 2400, 'lowpass', 180);
    this.ton(300, 0.7, 'sine', 0.115, 60);
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

  /* ================= HUDBA =================
     Skládá se za běhu z jednoduchých tónů — žádný soubor ke stažení
     a žádná cizí autorská práva. Záměrně bez melodie, kterou by šlo
     po pár kolech nenávidět: pomalé akordy a řídké kapky tónů.
     S rostoucím napětím se rozsvítí a zhoustne.                       */

  hudbaVypnuta: false,
  hudbaBezi: false,
  hudbaGain: null,
  hudbaFiltr: null,
  hudbaCasovac: null,
  hudbaKrok: 0,
  hudbaCas: 0,
  hudbaNapeti: 0,

  /* Am – F – C – G, v nízké poloze, ať to nepřebíjí zvuky hry */
  AKORDY: [
    [110.00, 164.81, 261.63],
    [ 87.31, 174.61, 261.63],
    [130.81, 196.00, 329.63],
    [ 98.00, 196.00, 293.66],
  ],

  hudbaStart(){
    this.probud();
    if (!this.ctx || this.hudbaBezi || this.hudbaVypnuta) return;

    this.hudbaGain = this.ctx.createGain();
    this.hudbaGain.gain.value = 0;
    this.hudbaFiltr = this.ctx.createBiquadFilter();
    this.hudbaFiltr.type = 'lowpass';
    this.hudbaFiltr.frequency.value = 900;
    this.hudbaFiltr.connect(this.hudbaGain);
    this.hudbaGain.connect(this.master);

    /* pomalý náběh, ať hudba nezačne ranou */
    this.hudbaGain.gain.linearRampToValueAtTime(0.16, this.ctx.currentTime + 2.5);

    this.hudbaBezi = true;
    this.hudbaKrok = 0;
    this.hudbaCas = this.ctx.currentTime + 0.15;
    this.hudbaCasovac = setInterval(() => this.hudbaPlanuj(), 220);
  },

  hudbaStop(){
    if (this.hudbaCasovac){ clearInterval(this.hudbaCasovac); this.hudbaCasovac = null; }
    if (this.hudbaGain && this.ctx){
      const g = this.hudbaGain, t = this.ctx.currentTime;
      g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(g.gain.value, t);
      g.gain.linearRampToValueAtTime(0, t + 0.6);
      setTimeout(() => { try { g.disconnect(); } catch(e){} }, 900);
    }
    this.hudbaGain = null;
    this.hudbaFiltr = null;
    this.hudbaBezi = false;
  },

  /* napětí 0–1: čím výš a čím blíž voda, tím je hudba světlejší a hustší */
  napeti(x){
    this.hudbaNapeti = Math.max(0, Math.min(1, x));
    if (this.hudbaFiltr){
      const cil = 700 + this.hudbaNapeti * 2600;
      this.hudbaFiltr.frequency.value += (cil - this.hudbaFiltr.frequency.value) * 0.05;
    }
  },

  /* naplánuje, co zazní v nejbližší půlvteřině */
  hudbaPlanuj(){
    if (!this.ctx || !this.hudbaBezi) return;
    const dopredu = this.ctx.currentTime + 0.6;
    const doba = 0.5;                       // délka jednoho kroku

    while (this.hudbaCas < dopredu){
      const t = this.hudbaCas;
      const akord = this.AKORDY[Math.floor(this.hudbaKrok / 8) % this.AKORDY.length];

      /* každých osm kroků nový akord — dlouhý, měkký, tichý */
      if (this.hudbaKrok % 8 === 0){
        akord.forEach((f, i) => this.hudbaTon(f, t, 4.6, 'sine', 0.055 - i * 0.008, true));
      }

      /* kapky tónů nad akordem, řidší v klidu, hustší v napětí */
      const sance = 0.14 + this.hudbaNapeti * 0.40;
      if (Math.random() < sance){
        const f = akord[Math.floor(Math.random() * akord.length)] * (Math.random() < 0.5 ? 4 : 2);
        this.hudbaTon(f, t, 1.4, 'triangle', 0.030 + this.hudbaNapeti * 0.020, false);
      }

      /* tep, který se ozve jen když je zle */
      if (this.hudbaNapeti > 0.55 && this.hudbaKrok % 4 === 0){
        this.hudbaTon(58, t, 0.5, 'sine', 0.06 * this.hudbaNapeti, false);
      }

      this.hudbaCas += doba;
      this.hudbaKrok++;
    }
  },

  hudbaTon(freq, kdy, delka, typ, hlasitost, dlouhyNabeh){
    if (!this.ctx || !this.hudbaFiltr) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = typ;
    o.frequency.value = freq;
    const nabeh = dlouhyNabeh ? delka * 0.35 : 0.02;
    g.gain.setValueAtTime(0.0001, kdy);
    g.gain.exponentialRampToValueAtTime(hlasitost, kdy + nabeh);
    g.gain.exponentialRampToValueAtTime(0.0001, kdy + delka);
    o.connect(g); g.connect(this.hudbaFiltr);
    o.start(kdy); o.stop(kdy + delka + 0.05);
  },

  hudbaZtlum(stav){
    this.hudbaVypnuta = stav;
    if (stav) this.hudbaStop();
  },
};
