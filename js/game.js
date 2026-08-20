/* Stav hry a fyzika. Nekreslí — od toho je render.js. */

const P = {
  R:        15,     // poloměr postavy
  GRAVITY:  2100,
  SLIDE:    98,     // jak rychle sjíždíš, když visíš na stěně
  JUMP_VY:  -880,
  JUMP_VX:  500,
  METER:    50,     // kolik bodů je jeden metr
};

/* Zvuk i vibrace jsou nepovinné — testovací stránky je nenačítají
   a ne každé zařízení je umí, hra proto nesmí spadnout.
   Názvy schválně dlouhé: jednopísmenné globály se snadno přepíšou
   proměnnou odjinud (stalo se — H jako výška plátna vs. H jako vibrace). */
function prehraj(jmeno, arg){
  if (typeof Zvuk !== 'undefined' && Zvuk[jmeno]) Zvuk[jmeno](arg);
}

function zavibruj(jmeno, arg){
  if (typeof Haptika !== 'undefined' && Haptika[jmeno]) Haptika[jmeno](arg);
}

const Game = {

  reset(width, height, seedStr){
    this.W = width;
    this.H = height;
    this.seed = seedStr;
    this.rng = makeRng(seedStr);
    World.init(width, seedStr);

    this.player = {
      x: World.leftWall(0) + P.R,
      y: 0,
      vx: 0, vy: 0,
      side: -1,            // které stěny se drží
      state: 'cling',      // 'cling' | 'air'
      stun: 0,
      imunita: 0,          // po zásahu chvíli nejde dostat další ránu
      squash: 0,           // deformace při dopadu, 0–1
      face: 1,
    };

    this.camY   = this.player.y - height * 0.58;
    this.waterY = 720;
    this.height = 0;       // nejvyšší dosažená výška v metrech
    this.time   = 0;
    this.rocks  = [];
    this.parts  = [];
    this.rings  = [];
    this.shake  = 0;
    this.flash  = 0;      // bílé probliknutí při nárazu
    this.hitStop = 0;     // krátké zastavení času, aby rána byla cítit
    this.zona   = 'skala';
    this.zonaText = '';
    this.zonaCas  = 0;
    this.over   = false;
    this.cause  = '';
    this.rockTimer = 1.6;
    this.znacky = [];      // dnešní výsledky kamarádů, kreslí se do rokliny
    this.krystaly = 0;     // co jsi v tomhle běhu nasbíral
    this.sebrano = {};     // co už je pryč, ať se nedá sebrat dvakrát
    this.started = false;  // voda se rozjede až prvním skokem
    return this;
  },

  /* Síla odrazu podle povrchu. Ze sněhu se odrazíš slaběji — boří se pod
     nohama a sebere ti část odrazu. Vodorovná rychlost zůstává stejná,
     takže na druhou stěnu doletíš vždycky; jen získáš míň výšky. */
  odrazVy(p){
    return World.snowAt(p.y, p.side) ? P.JUMP_VY * 0.92 : P.JUMP_VY;
  },

  /* ---------- vstup ---------- */
  jump(){
    if (this.over) return;
    const p = this.player;
    this.started = true;
    if (p.state !== 'cling') return;

    p.state = 'air';
    const snih = World.snowAt(p.y, p.side);
    p.vx = -p.side * P.JUMP_VX;
    p.vy = this.odrazVy(p);
    p.face = -p.side;
    /* ze sněhu odletí místo prachu chomáč sněhu (na jiné mapě jiná barva prachu) */
    const mp = (typeof Mapy !== 'undefined') ? Mapy.aktivni() : null;
    const barvaSnih = mp ? mp.prachSnih : '#eaf4ff', barvaProst = mp ? mp.prachSkok : '#9db4cf';
    this.burst(p.x, p.y, snih ? 11 : 7, snih ? barvaSnih : barvaProst, snih ? 0.8 : 1);
    prehraj('skok');
  },

  /* ---------- částice ---------- */
  /* color může být jedna barva, nebo pole barev — pak si každá částice vybere svou náhodně.
     rMult zvětšuje jen velikost teček (dostřel řeší spread), výchozí 1 pro běžné efekty hry. */
  burst(x, y, n, color, spread, rMult){
    const paleta = Array.isArray(color) ? color : null;
    const rm = rMult || 1;
    for (let i = 0; i < n; i++){
      const a = this.rng() * Math.PI * 2;
      const s = this.rng.range(40, 220) * (spread || 1);
      this.parts.push({
        x, y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - 40,
        life: this.rng.range(0.25, 0.7),
        max:  0.7,
        r: this.rng.range(1.5, 3.6) * rm,
        color: paleta ? paleta[Math.floor(this.rng() * paleta.length)] : color,
      });
    }
    if (this.parts.length > 260) this.parts.splice(0, this.parts.length - 260);
  },

  /* dopad do vody na konci běhu — kosmetická volba z obchodu (viz Splash).
     Větší tečky (rMult) a mohutnější prstence než běžné částice ve hře — tohle je
     poslední věc, co hráč u běhu vidí, má to bouchnout jako gól v Rocket League. */
  splashBurst(x, y){
    const s = (typeof Splash !== 'undefined') ? Splash.najdi(Splash.vybrany()) : null;
    const cfg = s || { barvy:['#6fc9e8'], n:26, spread:1.6, vlny:1, rings:0 };

    /* celá paleta barev jde do každé vlny — každá částice si vybere svou náhodně,
       jinak by u efektů s jednou vlnou (třeba Rainbow Burst) vyletěla jen jedna barva */
    for (let w = 0; w < cfg.vlny; w++){
      this.burst(x, y, Math.round(cfg.n / cfg.vlny), cfg.barvy, cfg.spread * (1 + w * 0.25), 1.9);
    }
    for (let i = 0; i < cfg.rings; i++){
      const zivot = 0.65 - i * 0.1;
      this.rings.push({ x, y, life: zivot, max: zivot, r0: 10 + i * 18, grow: 260, color: cfg.barvy[i % cfg.barvy.length] });
    }
  },

  /* stopa za postavou ve vzduchu — čistě kosmetická volba z obchodu.
     Emise i velikost zvětšené, ať je to vidět i na malém mobilním displeji. */
  trailEmit(dt, p){
    if (typeof Stopy === 'undefined') return;
    const t = Stopy.najdi(Stopy.vybrany());
    if (!t || t.id === 'zadna') return;
    if (!this.rng.chance(dt * 60)) return;
    this.parts.push({
      x: p.x + this.rng.range(-3, 3),
      y: p.y + this.rng.range(-3, 3),
      vx: -p.vx * 0.12 + this.rng.range(-18, 18),
      vy: -p.vy * 0.08 + this.rng.range(-18, 18),
      life: this.rng.range(0.4, 0.78),
      max:  0.78,
      r: this.rng.range(2.2, 4.6),
      color: t.barvy[Math.floor(this.rng() * t.barvy.length)],
    });
  },

  /* ---------- hlavní krok ---------- */
  update(dt){
    if (this.over) return;
    this.time += dt;
    const p = this.player;

    if (p.stun > 0) p.stun -= dt;
    if (p.imunita > 0) p.imunita -= dt;
    if (p.squash > 0) p.squash = Math.max(0, p.squash - dt * 4);

    if (p.state === 'cling'){
      p.onIce  = World.iceAt(p.y, p.side);
      p.onSnow = !p.onIce && World.snowAt(p.y, p.side);
      /* Led klouže, sníh naopak drží líp než holá skála.
         Cenu za to platíš při odrazu — viz odrazVy(). */
      p.y += P.SLIDE * (p.onIce ? 2.8 : p.onSnow ? 0.65 : 1) * dt;
      p.x = World.wallAt(p.y, p.side) - p.side * P.R;
      /* z ledu odlétávají úlomky, ať je hned poznat, že ujíždíš */
      if (p.onIce && this.rng.chance(dt * 14)){
        const mp = (typeof Mapy !== 'undefined') ? Mapy.aktivni() : null;
        this.parts.push({ x: p.x, y: p.y + P.R, vx: this.rng.range(-40, 40), vy: -this.rng.range(10, 60),
                          life: 0.5, max: 0.5, r: this.rng.range(1, 2.4), color: mp ? mp.ulomky : '#bfe9ff' });
      }
      /* sjel jsi do trnů — stěna tě odhodí */
      if (World.spikeAt(p.y, p.side)) this.bounceOffSpikes(p);
    } else {
      p.vy += P.GRAVITY * dt;
      p.x  += p.vx * dt;
      p.y  += p.vy * dt;
      this.trailEmit(dt, p);
      this.tryCling(p);
    }

    this.updateWater(dt);
    this.updateRocks(dt);
    this.updateKrystaly();
    this.updateParts(dt);

    /* výška se počítá jen z toho, co jsi udržel */
    const h = Math.max(0, -p.y / P.METER);
    if (h > this.height) this.height = h;

    if (this.flash > 0)   this.flash = Math.max(0, this.flash - dt * 3.4);
    if (this.zonaCas > 0) this.zonaCas = Math.max(0, this.zonaCas - dt);

    /* vstup do nové části hory */
    const novaZona = this.height >= World.SNOW_FROM_M ? 'snih'
                   : this.height >= World.ICE_FROM_M  ? 'led'
                   : 'skala';
    if (novaZona !== this.zona){
      this.zona = novaZona;
      const mp = (typeof Mapy !== 'undefined') ? Mapy.aktivni() : null;
      this.zonaText = novaZona === 'snih' ? (mp ? mp.zonaSnih : 'SNOW')
                     : novaZona === 'led'  ? (mp ? mp.zonaLed  : 'ICE')
                     : '';
      this.zonaCas = 2.6;
      if (this.zonaText) prehraj('zona');
    }

    /* hukot vody sílí, jak se blíží */
    const odstup = this.waterY - p.y;
    const blizko = Math.max(0, Math.min(1, 1 - odstup / 900));
    prehraj('voda', blizko);
    /* hudba se řídí tím, co je zrovna napínavější — výška, nebo voda za zády */
    prehraj('napeti', Math.max(blizko, Math.min(1, this.height / 200)));

    /* kamera */
    const target = p.y - this.H * 0.58;
    this.camY += (target - this.camY) * Math.min(1, dt * 6.5);

    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 3.2);

    if (p.y > this.waterY){
      this.over  = true;
      this.cause = 'The water caught you';
      this.splashBurst(p.x, this.waterY);
      this.shake = 1;
      prehraj('konec');
      zavibruj('konec');
    }
  },

  tryCling(p){
    const L = World.leftWall(p.y);
    const R = World.rightWall(p.y);

    /* rozhoduje dotyk stěny, ne směr letu — jinak by šlo propadnout skrz */
    let side = 0;
    if (p.x - P.R <= L) side = -1;
    else if (p.x + P.R >= R) side = 1;
    if (!side) return;

    if (p.stun > 0){
      /* omráčený se nechytí, jen se odrazí — ale nesmí ztratit tolik
         rychlosti, aby pak uvízl uprostřed a jen padal */
      p.x = World.wallAt(p.y, side) - side * P.R;
      const back = Math.max(240, Math.abs(p.vx) * 0.6);
      p.vx = -side * back;
      return;
    }

    if (World.spikeAt(p.y, side)){
      p.x = World.wallAt(p.y, side) - side * P.R;
      p.side = side;
      this.bounceOffSpikes(p);
      return;
    }

    p.side   = side;
    p.state  = 'cling';
    p.x      = World.wallAt(p.y, side) - side * P.R;
    p.vx     = 0;
    p.vy     = 0;
    p.face   = -side;
    p.squash = 1;

    const povrch = World.iceAt(p.y, side) ? 'led' : World.snowAt(p.y, side) ? 'snih' : 'skala';
    const mp = (typeof Mapy !== 'undefined') ? Mapy.aktivni() : null;
    this.burst(p.x, p.y + P.R * 0.5,
               povrch === 'snih' ? 9 : 6,
               povrch === 'skala' ? (mp ? mp.dopadSkala : '#7d8ea3') : (mp ? mp.dopadMokro : '#dff0ff'),
               povrch === 'snih' ? 0.9 : 0.7);
    prehraj('dopad', povrch);
  },

  bounceOffSpikes(p){
    p.state = 'air';
    p.vx = -p.side * 380;
    p.vy = -240;
    p.stun = 0.18;
    this.shake = Math.max(this.shake, 0.55);
    this.flash = 0.75;
    this.hitStop = 0.06;
    this.burst(p.x, p.y, 10, '#e0748a', 1.1);
    prehraj('trny');
    zavibruj('trny');
  },

  /* ---------- voda ---------- */
  /* Voda zrychluje s výškou. Nakonec předhoní i dokonalého hráče —
     každý běh musí jednou skončit, jde jen o to kdy. */
  waterSpeed(){
    return 62 + Math.min(300, this.height * 0.62);
  },

  updateWater(dt){
    if (!this.started) return;
    this.waterY -= this.waterSpeed() * dt;
    /* bublinky u hladiny */
    if (this.rng.chance(dt * 8)){
      const y = this.waterY;
      const x = this.rng.range(World.leftWall(y), World.rightWall(y));
      this.parts.push({ x, y, vx: this.rng.range(-20,20), vy: -this.rng.range(20,70),
                        life: 0.9, max: 0.9, r: this.rng.range(1.5,3), color:'#7fd8f0' });
    }
  },

  /* ---------- kameny ---------- */
  updateRocks(dt){
    if (this.started){
      this.rockTimer -= dt;
      if (this.rockTimer <= 0){
        this.rockTimer = Math.max(0.8, 1.7 - this.height * 0.0048) * this.rng.range(0.7, 1.3);
        this.spawnRock();
      }
    }

    const p = this.player;
    for (let i = this.rocks.length - 1; i >= 0; i--){
      const r = this.rocks[i];
      const ledovy = r.typ === 'rampouch';
      r.vy += (ledovy ? 620 : 420) * dt;
      r.y  += r.vy * dt;
      r.rot += r.spin * dt;

      /* náraz do stěny */
      if (r.x - r.r < World.leftWall(r.y) || r.x + r.r > World.rightWall(r.y)){
        this.burst(r.x, r.y, 6, ledovy ? '#bfe9ff' : '#6b6257', 0.9);
        this.rocks.splice(i, 1);
        continue;
      }

      /* zásah hráče */
      const dx = r.x - p.x, dy = r.y - p.y;
      /* Po ráně chvíli neprůstřelný. Bez toho tě ve výšce, kde padá něco
         každou půlvteřinu, série zásahů semele bez šance to zachránit. */
      if (dx*dx + dy*dy < (r.r + P.R) * (r.r + P.R) && p.stun <= 0 && p.imunita <= 0){
        const koule = r.typ === 'koule';
        p.imunita = 0.8;
        p.state = 'air';
        p.vx = (p.x < r.x ? -1 : 1) * (koule ? 240 : 320);
        p.vy = koule ? 80 : 120;
        p.stun = koule ? 0.30 : 0.26;     // koule omráčí, ale neodhodí tak daleko
        this.shake = 1;
        this.flash = koule ? 0.6 : 0.8;
        this.hitStop = 0.07;
        this.burst(r.x, r.y, koule ? 20 : 14,
                   koule ? '#ffffff' : ledovy ? '#cdefff' : '#8a7d6c',
                   koule ? 1.5 : 1.3);
        prehraj('zasah', r.typ);
        zavibruj('zasah', r.typ);
        this.rocks.splice(i, 1);
        continue;
      }

      if (r.y > this.waterY + 40 || r.y > this.camY + this.H + 200){
        if (r.y > this.waterY - 10) this.burst(r.x, this.waterY, 8, '#6fc9e8', 1);
        this.rocks.splice(i, 1);
      }
    }
  },

  spawnRock(){
    const y = this.camY - 60;
    const x = this.rng.range(World.leftWall(y) + 22, World.rightWall(y) - 22);

    /* co padá, se řídí výškou: dole kameny, od ledu rampouchy,
       ve sněhu k tomu velké sněhové koule */
    let typ = 'kamen';
    if (this.height > World.SNOW_FROM_M && this.rng.chance(0.55)) typ = 'koule';
    else if (this.height > World.ICE_FROM_M && this.rng.chance(0.45)) typ = 'rampouch';

    this.rocks.push({
      x, y,
      typ,
      vy: typ === 'rampouch' ? this.rng.range(280, 460)
        : typ === 'koule'    ? this.rng.range(170, 260)
        :                      this.rng.range(150, 320),
      r:  typ === 'rampouch' ? this.rng.range(7, 12)
        : typ === 'koule'    ? this.rng.range(15, 23)
        :                      this.rng.range(9, 19),
      dl: typ === 'rampouch' ? this.rng.range(30, 52) : 0,
      rot: typ === 'rampouch' ? 0 : this.rng() * 6.28,
      spin: typ === 'rampouch' ? 0 : this.rng.range(-3, 3),
      shape: Math.floor(this.rng.range(0, 3)),
    });
  },

  /* ---------- krystaly ---------- */
  updateKrystaly(){
    const p = this.player;
    /* Dosah schválně těsný. Když je velkorysý, krystaly se sbírají samy
       jen tím, že lezeš — a pak je to druhé skóre za metry, ne rozhodnutí. */
    const dosah = 15 + P.R;
    const blizke = World.krystalyKolem(p.y - 260, p.y + 260);

    for (const k of blizke){
      if (this.sebrano[k.id]) continue;
      const dx = k.x - p.x, dy = k.y - p.y;
      if (dx*dx + dy*dy > dosah*dosah) continue;

      this.sebrano[k.id] = true;
      this.krystaly += k.hodnota;
      this.burst(k.x, k.y, 10 + k.hodnota * 3,
                 k.druh === 'vzacny' ? '#d9b3ff' : k.druh === 'ledovy' ? '#9fe4ff' : '#ffd98a',
                 1.1);
      prehraj('krystal', k.hodnota);
      zavibruj('krystal');
    }
  },

  /* ---------- částice ---------- */
  updateParts(dt){
    for (let i = this.parts.length - 1; i >= 0; i--){
      const q = this.parts[i];
      q.vy += 620 * dt;
      q.x  += q.vx * dt;
      q.y  += q.vy * dt;
      q.life -= dt;
      if (q.life <= 0) this.parts.splice(i, 1);
    }
    for (let i = this.rings.length - 1; i >= 0; i--){
      const r = this.rings[i];
      r.life -= dt;
      if (r.life <= 0) this.rings.splice(i, 1);
    }
  },

  /* Doznívání otřesu, probliknutí a částic. Musí běžet i po konci běhu a v pauze —
     update() se tam zastaví, a zaseknutý otřes (i zamrzlý splash) by tam trčel pořád. */
  utlum(dt){
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 3.2);
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 3.4);
    this.updateParts(dt);
  },

  meters(){ return Math.floor(this.height); },
};
