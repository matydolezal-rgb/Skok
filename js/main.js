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
    tabMe: $('tab-me'), tabFriends: $('tab-friends'),
    boardList: $('board-list'), boardEmpty: $('board-empty'), boardBack: $('btn-board-back'),
    overNum: $('over-num'), overBest: $('over-best'), overCause: $('over-cause'),
    retry: $('btn-retry'), toMenu: $('btn-menu'),
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
    ui.menu.classList.toggle('hidden',  o !== 'menu');
    ui.board.classList.toggle('hidden', o !== 'board');
    ui.over.classList.toggle('hidden',  o !== 'over');
    ui.hud.classList.toggle('hidden',   o !== 'play');
  }

  /* ---------- menu ---------- */
  function obnovMenu(){
    const dnes = todaySeed();
    const hotovo = getDaily(dnes);
    ui.dailyNote.textContent = hotovo === null
      ? 'dnešní roklina — jeden pokus'
      : 'dnes máš ' + hotovo + ' m — hotovo';
    ui.daily.classList.toggle('card-main', hotovo === null);

    const best = getBest();
    ui.freeNote.textContent = best ? 'trénink — tvůj rekord ' + best + ' m' : 'trénuj, kolikrát chceš';
    show('menu');
  }

  /* ---------- žebříček ---------- */
  let zalozka = 'me';

  function obnovZebricek(){
    ui.tabMe.classList.toggle('tab-on', zalozka === 'me');
    ui.tabFriends.classList.toggle('tab-on', zalozka === 'friends');
    ui.boardList.innerHTML = '';

    if (zalozka === 'friends'){
      ui.boardList.classList.add('hidden');
      ui.boardEmpty.classList.remove('hidden');
      ui.boardEmpty.innerHTML =
        '<b>Kamarádi zatím nejsou zapojení.</b><br><br>' +
        'Aby se ti tu ukazovala jejich skóre, musí hra posílat výsledky na server. ' +
        'To je další krok — pak dostaneš kód, který kamarádovi pošleš, a uvidíte se navzájem.';
      return;
    }

    const h = historieVyzev();
    if (!h.length){
      ui.boardList.classList.add('hidden');
      ui.boardEmpty.classList.remove('hidden');
      ui.boardEmpty.innerHTML = '<b>Zatím žádná denní výzva.</b><br><br>Zahraj si dnešní a objeví se tady.';
      return;
    }

    ui.boardEmpty.classList.add('hidden');
    ui.boardList.classList.remove('hidden');

    /* seřazeno podle výkonu, ať je vidět, který den byl tvůj nejlepší */
    const dnes = todaySeed();
    const podleVykonu = h.slice().sort((a, b) => b.m - a.m);

    podleVykonu.forEach((z, i) => {
      const row = document.createElement('div');
      row.className = 'row' + (z.datum === dnes ? ' today' : '');
      row.innerHTML =
        '<span class="row-rank">' + (i + 1) + '.</span>' +
        '<span class="row-main">' +
          '<span class="row-name">' + hezkeDatum(z.datum) + (z.datum === dnes ? ' — dnes' : '') + '</span>' +
          '<span class="row-sub">denní výzva</span>' +
        '</span>' +
        '<span class="row-score">' + z.m + ' m</span>';
      ui.boardList.appendChild(row);
    });
  }

  /* ---------- běh ---------- */
  function startDaily(){
    const dnes = todaySeed();
    if (getDaily(dnes) !== null){    // dnešek už je odehraný — ukaž výsledky
      zalozka = 'me';
      obnovZebricek();
      show('board');
      return;
    }
    rezim = 'daily';
    ui.mode.textContent = 'denní výzva';
    spust(dnes);
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
    show('play');
  }

  function konecBehu(){
    const m = Game.meters();
    const best = getBest();
    ui.overNum.textContent = m;
    ui.overCause.textContent = Game.cause || 'Konec';

    if (rezim === 'daily'){
      const dnes = todaySeed();
      if (getDaily(dnes) === null) save(KEY_DAILY + dnes, m);
      ui.overBest.textContent = 'Dnešní výzva je hotová. Zítra nová roklina.';
      ui.retry.textContent = 'Volný let';
    } else {
      ui.overBest.textContent = m > best ? 'Nový rekord!' : 'Rekord: ' + best + ' m';
      ui.retry.textContent = 'Znovu';
    }

    if (m > best) save(KEY_BEST, m);
    show('over');
  }

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
      else if (obrazovka === 'menu') startDaily();
    }
  });

  ui.daily.addEventListener('click', startDaily);
  ui.free.addEventListener('click', startFree);
  ui.boardBtn.addEventListener('click', () => { zalozka = 'me'; obnovZebricek(); show('board'); });
  ui.boardBack.addEventListener('click', obnovMenu);
  ui.tabMe.addEventListener('click', () => { zalozka = 'me'; obnovZebricek(); });
  ui.tabFriends.addEventListener('click', () => { zalozka = 'friends'; obnovZebricek(); });
  ui.toMenu.addEventListener('click', obnovMenu);
  /* po denní výzvě i po volném letu vede tlačítko na volný let —
     denní se dá hrát jen jednou za den, jinak by ztratila smysl */
  ui.retry.addEventListener('click', startFree);

  /* ---------- smyčka ---------- */
  const STEP = 1 / 120;

  function frame(ts){
    requestAnimationFrame(frame);
    if (!last) last = ts;
    let dt = (ts - last) / 1000;
    last = ts;
    if (dt > 0.25) dt = 0.25;

    if (obrazovka === 'play'){
      acc += dt;
      let guard = 0;
      while (acc >= STEP && guard++ < 60){ Game.update(STEP); acc -= STEP; }

      ui.mNum.textContent = Game.meters();
      Render.draw(ctx, Game, getBest());

      if (Game.over){
        overDelay += dt;
        if (overDelay > 0.9) konecBehu();
      }
    } else if (Game.player){
      /* pod nabídkami běží roklina dál jako živé pozadí */
      Game.time += dt;
      Game.updateParts(dt);
      Render.draw(ctx, Game, 0);
    }
  }

  fit();
  Game.reset(W, H, todaySeed());
  obnovMenu();
  requestAnimationFrame(frame);

})();
