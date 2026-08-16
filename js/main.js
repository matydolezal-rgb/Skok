/* Smyčka, ovládání, přepínání obrazovek. */

(function(){

  const cv  = document.getElementById('cv');
  const ctx = cv.getContext('2d');
  const app = document.getElementById('app');

  const ui = {
    title:  document.getElementById('ui-title'),
    over:   document.getElementById('ui-over'),
    hud:    document.getElementById('hud'),
    mNum:   document.getElementById('m-num'),
    play:   document.getElementById('btn-play'),
    retry:  document.getElementById('btn-retry'),
    menu:   document.getElementById('btn-menu'),
    bestT:  document.getElementById('best-title'),
    overNum:document.getElementById('over-num'),
    overBest:document.getElementById('over-best'),
    overCause:document.getElementById('over-cause'),
  };

  const BEST_KEY = 'skok.best';
  let best = 0;
  try { best = Number(localStorage.getItem(BEST_KEY) || 0) || 0; } catch(e){}

  let W = 420, H = 800, dpr = 1;
  let mode = 'title';       // 'title' | 'play' | 'over'
  let last = 0, acc = 0;
  let overDelay = 0;

  /* ---------- plátno ---------- */
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

  /* ---------- obrazovky ---------- */
  function show(m){
    mode = m;
    ui.title.classList.toggle('hidden', m !== 'title');
    ui.over.classList.toggle('hidden',  m !== 'over');
    ui.hud.classList.toggle('hidden',   m !== 'play');
  }

  /* první pokus dne je férová "denní roklina", další pokusy mají vlastní */
  function runSeed(){
    const day = todaySeed();
    const key = 'skok.attempt.' + day;
    let n = 0;
    try {
      n = Number(localStorage.getItem(key) || 0);
      localStorage.setItem(key, String(n + 1));
    } catch(e){}
    return n === 0 ? day : day + '#' + n;
  }

  function startRun(){
    fit();
    Game.reset(W, H, runSeed());
    overDelay = 0;
    show('play');
  }

  function toTitle(){
    ui.bestT.textContent = best + ' m';
    show('title');
  }

  function endRun(){
    const m = Game.meters();
    ui.overNum.textContent = m;
    ui.overCause.textContent = Game.cause || 'Konec';
    if (m > best){
      best = m;
      try { localStorage.setItem(BEST_KEY, String(best)); } catch(e){}
      ui.overBest.textContent = 'Nový rekord!';
    } else {
      ui.overBest.textContent = 'Rekord: ' + best + ' m';
    }
    show('over');
  }

  /* ---------- ovládání ---------- */
  function tap(e){
    if (mode !== 'play') return;
    e.preventDefault();
    Game.jump();
  }
  cv.addEventListener('pointerdown', tap, { passive:false });
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'ArrowUp'){
      e.preventDefault();
      if (mode === 'play') Game.jump();
      else if (mode === 'title') startRun();
    }
  });

  ui.play.addEventListener('click',  startRun);
  ui.retry.addEventListener('click', startRun);
  ui.menu.addEventListener('click',  toTitle);

  /* ---------- smyčka ---------- */
  const STEP = 1 / 120;   // pevný krok fyziky, ať se hra chová všude stejně

  function frame(ts){
    requestAnimationFrame(frame);
    if (!last) last = ts;
    let dt = (ts - last) / 1000;
    last = ts;
    if (dt > 0.25) dt = 0.25;

    if (mode === 'play'){
      acc += dt;
      let guard = 0;
      while (acc >= STEP && guard++ < 60){ Game.update(STEP); acc -= STEP; }

      ui.mNum.textContent = Game.meters();
      Render.draw(ctx, Game, best);

      if (Game.over){
        /* chvilku necháme doznít dopad, pak teprve výsledek */
        overDelay += dt;
        if (overDelay > 0.9) endRun();
      }
    } else if (Game.W !== undefined && Game.player){
      /* na menu běží pozadí dál, ať to nestojí */
      Game.time += dt;
      Game.updateParts(dt);
      Render.draw(ctx, Game, best);
    }
  }

  /* ---------- start ---------- */
  fit();
  Game.reset(W, H, todaySeed());   // ať je co kreslit pod úvodní obrazovkou
  toTitle();
  requestAnimationFrame(frame);

})();
