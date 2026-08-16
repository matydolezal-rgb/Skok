/* Smyčka, ovládání, obrazovky a režimy hry. */

(function(){

  const cv  = document.getElementById('cv');
  const ctx = cv.getContext('2d');
  const app = document.getElementById('app');
  const $   = (id) => document.getElementById(id);

  const ui = {
    menu:  $('ui-menu'), board: $('ui-board'), over: $('ui-over'), hud: $('hud'),
    mNum:  $('m-num'),   mode:  $('hud-mode'),
    daily: $('btn-daily'), free: $('btn-free'), boardBtn: $('btn-board'),
    dailyNote: $('daily-note'), freeNote: $('free-note'),
    tabWorld: $('tab-world'), tabFriends: $('tab-friends'), tabMe: $('tab-me'),
    boardList: $('board-list'), boardEmpty: $('board-empty'), boardBack: $('btn-board-back'),
    boardPanel: $('board-panel'), boardSub: $('board-sub'),
    overNum: $('over-num'), overBest: $('over-best'), overCause: $('over-cause'),
    retry: $('btn-retry'), toMenu: $('btn-menu'),
    sound: $('btn-sound'), music: $('btn-music'),
    pause: $('ui-pause'), pauseBtn: $('btn-pause'), pauseNum: $('pause-num'),
    resume: $('btn-resume'), quit: $('btn-quit'),
  };

  /* ---------- ukládání ---------- */
  const KEY_BEST  = 'skok.best';
  const KEY_DAILY = 'skok.daily.';      // + datum

  function load(k, d){ try { const v = localStorage.getItem(k); return v === null ? d : v; } catch(e){ return d; } }
  function save(k, v){ try { localStorage.setItem(k, String(v)); } catch(e){} }

  function getBest(){ return Number(load(KEY_BEST, 0)) || 0; }
  function getDaily(datum){ const v = load(KEY_DAILY + datum, null); return v === null ? null : Number(v); }

  /* všechny odehrané denní výzvy, od nejnovější */
  function historieVyzev(){
    const out = [];
    try {
      for (let i = 0; i < localStorage.length; i++){
        const k = localStorage.key(i);
        if (k && k.indexOf(KEY_DAILY) === 0){
          out.push({ datum: k.slice(KEY_DAILY.length), m: Number(localStorage.getItem(k)) || 0 });
        }
      }
    } catch(e){}
    out.sort((a, b) => a.datum < b.datum ? 1 : -1);
    return out;
  }

  function hezkeDatum(seed){
    const [y, m, d] = seed.split('-');
    return Number(d) + '. ' + Number(m) + '.';
  }

  /* ---------- stav ---------- */
  let W = 420, H = 800, dpr = 1;
  let obrazovka = 'menu';               // 'menu' | 'play' | 'over' | 'board'
  let rezim = 'daily';                  // 'daily' | 'free'
  let last = 0, acc = 0, overDelay = 0;

  function fit(){
    const r = app.getBoundingClientRect();
    W = Math.round(r.width);
    H = Math.round(r.height);
    dpr = Math.min(2.5, window.devicePixelRatio || 1);
    cv.width  = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (Game.W !== undefined){ Game.W = W; Game.H = H; World.W = W; }
  }
  window.addEventListener('resize', fit);

  function show(o){
    obrazovka = o;
    /* aby aktualizace hry nepřerušila rozehrané kolo */
    window.__skokHraje = (o === 'play' || o === 'pause');
    ui.menu.classList.toggle('hidden',   o !== 'menu');
    ui.board.classList.toggle('hidden',  o !== 'board');
    ui.over.classList.toggle('hidden',   o !== 'over');
    ui.pause.classList.toggle('hidden',  o !== 'pause');
    ui.hud.classList.toggle('hidden',    o !== 'play' && o !== 'pause');
    ui.pauseBtn.classList.toggle('hidden', o !== 'play');
  }

  /* ---------- menu ---------- */
  function obnovMenu(){
    Zvuk.vodaStop();
    Zvuk.hudbaStop();
    const dnes = todaySeed();
    const nejlepsi = getDaily(dnes);
    ui.dailyNote.textContent = nejlepsi === null
      ? 'dnešní roklina — stejná pro všechny'
      : 'dnes nejlíp ' + nejlepsi + ' m — zkus to překonat';

    const best = getBest();
    ui.freeNote.textContent = best ? 'trénink — tvůj rekord ' + best + ' m' : 'trénuj, kolikrát chceš';
    show('menu');
  }

  /* ---------- žebříček ---------- */
  let zalozka = 'world';

  function bezpecne(s){
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function prazdno(html){
    ui.boardList.classList.add('hidden');
    ui.boardEmpty.classList.remove('hidden');
    ui.boardEmpty.innerHTML = html;
  }

  function vypisRadky(polozky, zvyraznitKod){
    ui.boardEmpty.classList.add('hidden');
    ui.boardList.classList.remove('hidden');
    ui.boardList.innerHTML = '';

    polozky.forEach((p, i) => {
      const row = document.createElement('div');
      row.className = 'row' + (p.kod && p.kod === zvyraznitKod ? ' today' : '');
      row.innerHTML =
        '<span class="row-rank">' + (i + 1) + '.</span>' +
        '<span class="row-main">' +
          '<span class="row-name">' + bezpecne(p.jmeno) + (p.kod === zvyraznitKod ? ' — ty' : '') + '</span>' +
          '<span class="row-sub">' + bezpecne(p.popis || '') + '</span>' +
        '</span>' +
        '<span class="row-score">' + (p.metry < 0 ? '—' : p.metry + ' m') + '</span>';
      ui.boardList.appendChild(row);
    });
  }

  /* jméno se zadává jen jednou, žádná registrace ani heslo */
  function panelJmeno(){
    ui.boardPanel.classList.remove('hidden');
    ui.boardPanel.innerHTML =
      '<span class="panel-label">Pod jakým jménem tě uvidí ostatní?</span>' +
      '<div class="panel-row">' +
        '<input id="in-jmeno" maxlength="16" placeholder="přezdívka">' +
        '<button class="panel-btn" id="btn-jmeno">Uložit</button>' +
      '</div>' +
      '<span class="panel-msg" id="msg-jmeno">Žádný e-mail ani heslo. Jméno jde kdykoliv změnit.</span>';

    $('btn-jmeno').addEventListener('click', async () => {
      const j = $('in-jmeno').value.trim();
      const msg = $('msg-jmeno');
      if (j.length < 2){ msg.className = 'panel-msg chyba'; msg.textContent = 'Napiš aspoň dva znaky.'; return; }
      msg.className = 'panel-msg'; msg.textContent = 'Zapisuji…';
      try {
        await Sit.registruj(j);
        await Sit.synchronizuj();
        obnovZebricek();
      } catch(e){
        msg.className = 'panel-msg chyba';
        msg.textContent = 'Server neodpovídá. Zkus to za chvíli, hra funguje dál.';
      }
    });
  }

  function panelKamaradi(){
    ui.boardPanel.classList.remove('hidden');
    ui.boardPanel.innerHTML =
      '<span class="panel-label">Tvůj kód — pošli ho kamarádovi</span>' +
      '<div class="panel-code">' + bezpecne(Sit.kod() || '——————') + '</div>' +
      '<div class="panel-row">' +
        '<input id="in-kod" maxlength="7" placeholder="kód kamaráda">' +
        '<button class="panel-btn" id="btn-kod">Přidat</button>' +
      '</div>' +
      '<span class="panel-msg" id="msg-kod">Kamarádi se ukládají jen v tomhle telefonu.</span>';

    $('btn-kod').addEventListener('click', () => {
      const msg = $('msg-kod');
      const v = Sit.pridejKamarada($('in-kod').value);
      if (!v.ok){ msg.className = 'panel-msg chyba'; msg.textContent = v.chyba; return; }
      msg.className = 'panel-msg ok';
      msg.textContent = 'Přidáno: ' + v.kod;
      obnovZebricek();
    });
  }

  async function obnovZebricek(){
    ui.tabWorld.classList.toggle('tab-on',   zalozka === 'world');
    ui.tabFriends.classList.toggle('tab-on', zalozka === 'friends');
    ui.tabMe.classList.toggle('tab-on',      zalozka === 'me');
    ui.boardPanel.classList.add('hidden');
    ui.boardPanel.innerHTML = '';

    const dnes = todaySeed();
    ui.boardSub.textContent = zalozka === 'me'
      ? 'tvoje nejlepší pokusy po dnech'
      : 'dnešní roklina · ' + hezkeDatum(dnes);

    /* ---- moje výsledky: fungují i bez serveru ---- */
    if (zalozka === 'me'){
      const h = historieVyzev();
      if (!h.length){
        prazdno('<b>Zatím žádná denní výzva.</b><br><br>Zahraj si dnešní a objeví se tady.');
        return;
      }
      vypisRadky(h.slice().sort((a, b) => b.m - a.m).map((z) => ({
        jmeno: hezkeDatum(z.datum) + (z.datum === dnes ? ' — dnes' : ''),
        popis: 'nejlepší pokus dne',
        metry: z.m,
        kod: null,
      })), null);
      return;
    }

    /* ---- svět a kamarádi: potřebují server ---- */
    if (!Sit.pripojeno()){
      prazdno('<b>Žebříček ještě není zapojený.</b><br><br>' +
              'Hra zatím nemá kam posílat výsledky. Až bude server hotový, ' +
              'objeví se tu ostatní hráči i tvoji kamarádi.');
      return;
    }

    if (!Sit.jmeno()){
      prazdno('Nejdřív si vyber přezdívku — pod tou tě uvidí ostatní.');
      panelJmeno();
      return;
    }

    if (zalozka === 'friends') panelKamaradi();

    prazdno('Načítám…');
    try {
      const data = zalozka === 'world'
        ? await Sit.svet(dnes, 50)
        : await Sit.kamaradiDne(dnes);

      if (!data.length){
        prazdno(zalozka === 'world'
          ? '<b>Dnes ještě nikdo nelezl.</b><br><br>Můžeš být první.'
          : '<b>Zatím žádní kamarádi.</b><br><br>Pošli jim svůj kód, nebo zadej jejich.');
        if (zalozka === 'friends') panelKamaradi();
        return;
      }

      vypisRadky(data.map((r) => ({
        jmeno: r.jmeno,
        kod: r.kod,
        metry: r.metry,
        popis: r.metry < 0 ? 'dnes ještě nehrál' : 'dnešní nejlepší',
      })), Sit.kod());

      if (zalozka === 'friends') panelKamaradi();
    } catch(e){
      prazdno('<b>Žebříček se nepodařilo načíst.</b><br><br>' +
              'Nejspíš nemáš signál. Hra funguje dál a tvůj výsledek se odešle, až bude spojení.');
      if (zalozka === 'friends') panelKamaradi();
    }
  }

  /* ---------- běh ---------- */
  /* Denní výzvu jde hrát kolikrát chceš — počítá se nejlepší pokus dne.
     Roklina je pro všechny stejná, takže se dá během dne předhánět. */
  function startDaily(){
    rezim = 'daily';
    ui.mode.textContent = 'denní výzva';
    spust(todaySeed());
  }

  function startFree(){
    rezim = 'free';
    ui.mode.textContent = 'volný let';
    spust('volny-' + Date.now() + '-' + Math.floor(Math.random() * 1e6));
  }

  function spust(seed){
    fit();
    Game.reset(W, H, seed);
    overDelay = 0;
    Zvuk.probud();
    Zvuk.vodaStart();
    Zvuk.hudbaStart();
    show('play');
  }

  function konecBehu(){
    Zvuk.vodaStop();
    Zvuk.hudbaStop();
    const m = Game.meters();
    const best = getBest();
    ui.overNum.textContent = m;
    ui.overCause.textContent = Game.cause || 'Konec';

    if (rezim === 'daily'){
      const dnes = todaySeed();
      const dosud = getDaily(dnes);
      if (dosud === null || m > dosud){
        save(KEY_DAILY + dnes, m);
        ui.overBest.textContent = dosud === null
          ? 'První dnešní pokus. Zkus se překonat.'
          : 'Nový nejlepší dnešek! Předtím ' + dosud + ' m.';
      } else {
        ui.overBest.textContent = 'Dnes nejlíp ' + dosud + ' m. Ještě jednou?';
      }
      ui.retry.textContent = 'Znovu';
      /* výsledek do žebříčku; bez signálu počká ve frontě */
      if (Sit.pripojeno() && Sit.jmeno()) Sit.posli(dnes, Math.max(m, dosud || 0));
    } else {
      ui.overBest.textContent = m > best ? 'Nový rekord!' : 'Rekord: ' + best + ' m';
      ui.retry.textContent = 'Znovu';
    }

    if (m > best) save(KEY_BEST, m);
    show('over');
  }

  /* ---------- pauza ---------- */
  function pozastav(){
    if (obrazovka !== 'play' || Game.over) return;
    ui.pauseNum.textContent = Game.meters();
    Zvuk.voda(0);            // ať v pauze nehučí voda
    show('pause');
  }

  function pokracuj(){
    if (obrazovka !== 'pause') return;
    last = 0; acc = 0;       // zahodíme čas strávený v pauze
    show('play');
  }

  function ukonci(){
    Zvuk.vodaStop();
    Zvuk.hudbaStop();
    obnovMenu();             // rozehraný běh se zahodí, nic se nezapisuje
  }

  ui.pauseBtn.addEventListener('click', pozastav);
  ui.resume.addEventListener('click', pokracuj);
  ui.quit.addEventListener('click', ukonci);

  /* ---------- ovládání ---------- */
  function tap(e){
    if (obrazovka !== 'play') return;
    e.preventDefault();
    Game.jump();
  }
  if (window.PointerEvent) cv.addEventListener('pointerdown', tap, { passive:false });
  else cv.addEventListener('touchstart', tap, { passive:false });

  document.addEventListener('dblclick', (e) => e.preventDefault(), { passive:false });
  document.addEventListener('gesturestart', (e) => e.preventDefault(), { passive:false });

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'ArrowUp'){
      e.preventDefault();
      if (obrazovka === 'play') Game.jump();
      else if (obrazovka === 'pause') pokracuj();
      else if (obrazovka === 'menu') startDaily();
    } else if (e.code === 'Escape'){
      if (obrazovka === 'play') pozastav();
      else if (obrazovka === 'pause') pokracuj();
    }
  });

  /* přepnutí do jiné aplikace nebo zhasnutí displeje běh taky zastaví */
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && obrazovka === 'play') pozastav();
  });

  /* ---------- zvuk a hudba ---------- */
  const KEY_ZVUK   = 'skok.zvuk';
  const KEY_HUDBA  = 'skok.hudba';

  Zvuk.vypnuto       = load(KEY_ZVUK,  '1') === '0';
  Zvuk.hudbaVypnuta  = load(KEY_HUDBA, '1') === '0';

  function obnovPrepinace(){
    ui.sound.textContent = (Zvuk.vypnuto ? '🔇' : '🔊') + ' Zvuky';
    ui.music.textContent = (Zvuk.hudbaVypnuta ? '🔈' : '🎵') + ' Hudba';
    ui.sound.classList.toggle('on', !Zvuk.vypnuto);
    ui.music.classList.toggle('on', !Zvuk.hudbaVypnuta);
  }

  ui.sound.addEventListener('click', () => {
    Zvuk.probud();
    Zvuk.ztlum(!Zvuk.vypnuto);
    save(KEY_ZVUK, Zvuk.vypnuto ? '0' : '1');
    obnovPrepinace();
    if (!Zvuk.vypnuto) Zvuk.klik();
  });

  ui.music.addEventListener('click', () => {
    Zvuk.probud();
    Zvuk.hudbaZtlum(!Zvuk.hudbaVypnuta);
    save(KEY_HUDBA, Zvuk.hudbaVypnuta ? '0' : '1');
    obnovPrepinace();
    /* ukázka rovnou v menu, ať slyšíš, co jsi zapnul */
    if (!Zvuk.hudbaVypnuta) Zvuk.hudbaStart();
  });

  ui.daily.addEventListener('click', startDaily);
  ui.free.addEventListener('click', startFree);
  ui.boardBtn.addEventListener('click', () => {
    zalozka = Sit.pripojeno() ? 'world' : 'me';
    obnovZebricek();
    show('board');
  });
  ui.boardBack.addEventListener('click', obnovMenu);
  ui.tabWorld.addEventListener('click',   () => { zalozka = 'world';   obnovZebricek(); });
  ui.tabFriends.addEventListener('click', () => { zalozka = 'friends'; obnovZebricek(); });
  ui.tabMe.addEventListener('click',      () => { zalozka = 'me';      obnovZebricek(); });
  ui.toMenu.addEventListener('click', obnovMenu);
  /* „Znovu" pokračuje ve stejném režimu, ve kterém jsi hrál */
  ui.retry.addEventListener('click', () => {
    if (rezim === 'daily') startDaily(); else startFree();
  });

  /* ---------- smyčka ---------- */
  const STEP = 1 / 120;

  function frame(ts){
    requestAnimationFrame(frame);
    if (!last) last = ts;
    let dt = (ts - last) / 1000;
    last = ts;
    if (dt > 0.25) dt = 0.25;

    if (obrazovka === 'play'){
      /* při ráně na okamžik zamrzne čas — rána je pak cítit */
      if (Game.hitStop > 0){
        Game.hitStop -= dt;
        acc = 0;
      } else {
        acc += dt;
        let guard = 0;
        while (acc >= STEP && guard++ < 60){ Game.update(STEP); acc -= STEP; }
      }

      ui.mNum.textContent = Game.meters();
      Render.draw(ctx, Game, getBest());

      if (Game.over){
        overDelay += dt;
        if (overDelay > 0.9) konecBehu();
      }
    } else if (obrazovka === 'pause'){
      /* v pauze se nic nepohne — obrázek zůstane přesně tam, kde jsi přestal */
      Render.draw(ctx, Game, getBest());
    } else if (Game.player){
      /* pod nabídkami běží roklina dál jako živé pozadí */
      Game.time += dt;
      Game.updateParts(dt);
      Render.draw(ctx, Game, 0);
    }
  }

  fit();
  Game.reset(W, H, todaySeed());
  obnovPrepinace();
  obnovMenu();
  requestAnimationFrame(frame);

})();
