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
    overNum: $('over-num'), overBest: $('over-best'), overCause: $('over-cause'), overScore: $('over-score'),
    gemNum: $('gem-num'), gemTotal: $('gem-total'), overGems: $('over-gems'),
    retry: $('btn-retry'), toMenu: $('btn-menu'),
    sound: $('btn-sound'), music: $('btn-music'), haptic: $('btn-haptic'),
    pause: $('ui-pause'), pauseBtn: $('btn-pause'), pauseNum: $('pause-num'),
    resume: $('btn-resume'), quit: $('btn-quit'),
    shop: $('ui-shop'), shopBtn: $('btn-shop'), shopBack: $('btn-shop-back'),
    shopGrid: $('shop-grid'), shopBalance: $('shop-balance'),
    shopTabSkiny: $('shop-tab-skiny'), shopTabStopy: $('shop-tab-stopy'), shopTabMapy: $('shop-tab-mapy'),
    shopTabSplash: $('shop-tab-splash'),
    krystalyScreen: $('ui-krystaly'), krystalyBtn: $('btn-krystaly'), krystalyBack: $('btn-krystaly-back'),
    krystalyGrid: $('krystaly-grid'), krystalyBalance: $('krystaly-balance'),
    zoom: $('skin-zoom'), zoomCanvas: $('skin-zoom-canvas'), zoomName: $('skin-zoom-name'),
  };

  /* ---------- ukládání ---------- */
  const KEY_BEST  = 'skok.best';
  const KEY_DAILY = 'skok.daily.';      // + datum

  function load(k, d){ try { const v = localStorage.getItem(k); return v === null ? d : v; } catch(e){ return d; } }
  function save(k, v){ try { localStorage.setItem(k, String(v)); } catch(e){} }

  const KEY_GEMS = 'skok.krystaly';

  function getBest(){ return Number(load(KEY_BEST, 0)) || 0; }
  function getGems(){ return Number(load(KEY_GEMS, 0)) || 0; }
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

  const MESICE = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  function hezkeDatum(seed){
    const [y, m, d] = seed.split('-');
    return MESICE[Number(m) - 1] + ' ' + Number(d);
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
    ui.shop.classList.toggle('hidden',   o !== 'shop');
    ui.krystalyScreen.classList.toggle('hidden', o !== 'krystaly');
    ui.over.classList.toggle('hidden',   o !== 'over');
    ui.pause.classList.toggle('hidden',  o !== 'pause');
    ui.hud.classList.toggle('hidden',    o !== 'play' && o !== 'pause');
    ui.pauseBtn.classList.toggle('hidden', o !== 'play');
  }

  /* ---------- menu ---------- */
  function obnovMenu(){
    Zvuk.vodaStop();
    Zvuk.hudbaStop();
    /* pojistka: do menu se nikdy nesmí přenést rozjetý otřes */
    Game.shake = 0;
    Game.flash = 0;
    const dnes = todaySeed();
    const nejlepsi = getDaily(dnes);
    ui.dailyNote.textContent = nejlepsi === null
      ? "today's ravine — the same for everyone"
      : 'best today ' + nejlepsi + ' m — try to beat it';

    const best = getBest();
    ui.freeNote.textContent = best ? 'practice — your record ' + best + ' m' : 'practise as much as you like';
    ui.gemTotal.textContent = Mena.zustatek(getGems());
    show('menu');
  }

  /* ---------- žebříček ---------- */
  let zalozka = 'world';
  let krokPrihlaseni = 'email';   // 'email' | 'kod' | 'jmeno'
  let zadanyEmail = '';

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
          '<span class="row-name">' + bezpecne(p.jmeno) + (p.kod === zvyraznitKod ? ' — you' : '') + '</span>' +
          '<span class="row-sub">' + bezpecne(p.popis || '') + '</span>' +
        '</span>' +
        '<span class="row-score">' + (p.metry < 0 ? '—' : p.metry + ' m') + '</span>';
      ui.boardList.appendChild(row);
    });
  }

  /* Přihlášení e-mailem — tři kroky: e-mail → 6místný kód z pošty → přezdívka.
     Žádné heslo, žádný účet mimo hru. */
  function panelPrihlaseni(){
    ui.boardPanel.classList.remove('hidden');

    if (krokPrihlaseni === 'kod') return krokKod();
    if (krokPrihlaseni === 'jmeno') return krokJmeno();
    return krokEmail();

    function krokEmail(){
      ui.boardPanel.innerHTML =
        '<span class="panel-label">Log in with your email</span>' +
        '<div class="panel-row">' +
          '<input id="in-email" type="email" placeholder="you@example.com" autocomplete="email">' +
          '<button class="panel-btn" id="btn-email">Send code</button>' +
        '</div>' +
        '<span class="panel-msg" id="msg-email">We\'ll send a code by email, no password needed.</span>';

      $('btn-email').addEventListener('click', async () => {
        const email = $('in-email').value.trim();
        const msg = $('msg-email');
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
          msg.className = 'panel-msg chyba'; msg.textContent = 'That doesn\'t look like a valid email.'; return;
        }
        msg.className = 'panel-msg'; msg.textContent = 'Sending…';
        try {
          await Sit.posliKod(email);
          zadanyEmail = email;
          krokPrihlaseni = 'kod';
          panelPrihlaseni();
        } catch(e){
          msg.className = 'panel-msg chyba';
          msg.textContent = 'Could not send the code. Try again later.';
        }
      });
    }

    function krokKod(){
      ui.boardPanel.innerHTML =
        '<span class="panel-label">Code sent to ' + bezpecne(zadanyEmail) + '</span>' +
        '<div class="panel-row">' +
          '<input id="in-kod-prihlaseni" maxlength="8" inputmode="numeric" placeholder="12345678">' +
          '<button class="panel-btn" id="btn-over-kod">Verify</button>' +
        '</div>' +
        '<span class="panel-msg" id="msg-kod-prihlaseni">Check your inbox (and spam folder).</span>' +
        '<button class="panel-link" id="btn-jiny-email">Use a different email</button>';

      $('btn-over-kod').addEventListener('click', async () => {
        const kod = $('in-kod-prihlaseni').value.trim();
        const msg = $('msg-kod-prihlaseni');
        if (kod.length < 4){ msg.className = 'panel-msg chyba'; msg.textContent = 'Enter the code from the email.'; return; }
        msg.className = 'panel-msg'; msg.textContent = 'Checking…';
        try {
          await Sit.overKod(zadanyEmail, kod);
          krokPrihlaseni = 'jmeno';
          panelPrihlaseni();
        } catch(e){
          msg.className = 'panel-msg chyba';
          msg.textContent = 'Wrong or expired code. Try again.';
        }
      });
      $('btn-jiny-email').addEventListener('click', () => {
        krokPrihlaseni = 'email';
        panelPrihlaseni();
      });
    }

    function krokJmeno(){
      ui.boardPanel.innerHTML =
        '<span class="panel-label">What name should others see?</span>' +
        '<div class="panel-row">' +
          '<input id="in-jmeno" maxlength="16" placeholder="nickname" value="' + bezpecne(Sit.jmeno()) + '">' +
          '<button class="panel-btn" id="btn-jmeno">Save</button>' +
        '</div>' +
        '<span class="panel-msg" id="msg-jmeno">You can change it any time.</span>';

      $('btn-jmeno').addEventListener('click', async () => {
        const j = $('in-jmeno').value.trim();
        const msg = $('msg-jmeno');
        if (j.length < 2){ msg.className = 'panel-msg chyba'; msg.textContent = 'Use at least two characters.'; return; }
        msg.className = 'panel-msg'; msg.textContent = 'Saving…';
        try {
          await Sit.registruj(j);
          await Sit.synchronizuj();
          /* stáhne a slije postup z účtu (nikdy nic neubere), pak pošle
             sloučený výsledek zpátky — ať je server i zařízení srovnané */
          await Sit.stahniPostup();
          await Sit.nahrajPostup();
          krokPrihlaseni = 'email';
          obnovMenu();
          obnovZebricek();
        } catch(e){
          msg.className = 'panel-msg chyba';
          msg.textContent = 'The server is not responding. Try again later — the game keeps working.';
        }
      });
    }
  }

  function panelKamaradi(){
    ui.boardPanel.classList.remove('hidden');
    ui.boardPanel.innerHTML =
      '<span class="panel-label">Your code — send it to a friend</span>' +
      '<div class="panel-code">' + bezpecne(Sit.kod() || '——————') + '</div>' +
      '<div class="panel-row">' +
        '<input id="in-kod" maxlength="7" placeholder="friend\'s code">' +
        '<button class="panel-btn" id="btn-kod">Add</button>' +
      '</div>' +
      /* Tenhle panel vidí jen přihlášený hráč (výš se nepřihlášený odbočí
         na panelPrihlaseni), a tomu se kamarádi zálohují na účet — dřív tu
         stálo "stored on this phone only", což od zavedení záloh nebyla pravda. */
      '<span class="panel-msg" id="msg-kod">Friends are saved to your account.</span>' +
      '<button class="panel-link" id="btn-odhlasit">Log out (' + bezpecne(Sit.session() ? Sit.session().email : '') + ')</button>';

    $('btn-kod').addEventListener('click', () => {
      const msg = $('msg-kod');
      const v = Sit.pridejKamarada($('in-kod').value);
      if (!v.ok){ msg.className = 'panel-msg chyba'; msg.textContent = v.chyba; return; }
      msg.className = 'panel-msg ok';
      msg.textContent = 'Added: ' + v.kod;
      obnovZebricek();
    });
    $('btn-odhlasit').addEventListener('click', () => {
      Sit.odhlasit();
      krokPrihlaseni = 'email';
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
      ? 'your best run of each day'
      : "today's ravine · " + hezkeDatum(dnes);

    /* ---- moje výsledky: fungují i bez serveru ---- */
    if (zalozka === 'me'){
      const h = historieVyzev();
      if (!h.length){
        prazdno('<b>No daily challenge yet.</b><br><br>Play today\'s one and it will show up here.');
        return;
      }
      vypisRadky(h.slice().sort((a, b) => b.m - a.m).map((z) => ({
        jmeno: hezkeDatum(z.datum) + (z.datum === dnes ? ' — today' : ''),
        popis: 'best run of the day',
        metry: z.m,
        kod: null,
      })), null);
      return;
    }

    /* ---- svět a kamarádi: potřebují server ---- */
    if (!Sit.pripojeno()){
      prazdno('<b>The leaderboard is not connected yet.</b><br><br>' +
              'The game has nowhere to send scores. Once the server is ready, ' +
              'other players and your friends will show up here.');
      return;
    }

    if (!Sit.prihlasen() || !Sit.jmeno()){
      prazdno('Log in to see the leaderboard and appear on it yourself.');
      panelPrihlaseni();
      return;
    }

    if (zalozka === 'friends') panelKamaradi();

    prazdno('Loading…');
    try {
      const data = zalozka === 'world'
        ? await Sit.svet(dnes, 50)
        : await Sit.kamaradiDne(dnes);

      if (!data.length){
        prazdno(zalozka === 'world'
          ? '<b>Nobody has climbed today.</b><br><br>You can be the first.'
          : '<b>No friends yet.</b><br><br>Send them your code, or enter theirs.');
        if (zalozka === 'friends') panelKamaradi();
        return;
      }

      vypisRadky(data.map((r) => ({
        jmeno: r.jmeno,
        kod: r.kod,
        metry: r.metry,
        popis: r.metry < 0 ? "hasn't played today" : "today's best",
      })), Sit.kod());

      if (zalozka === 'friends') panelKamaradi();
    } catch(e){
      prazdno('<b>Could not load the leaderboard.</b><br><br>' +
              'You are probably offline. The game keeps working and your score ' +
              'will be sent as soon as there is a connection.');
      if (zalozka === 'friends') panelKamaradi();
    }
  }

  /* ---------- obchod: skiny i stopy sdílí stejnou kasu a stejné UI ---------- */
  const KATEGORIE = {
    skiny: { modul: Skiny, preview: (ctx, w, h, id, sc) => Render.previewSkin(ctx, w, h, id, sc) },
    stopy: { modul: Stopy, preview: (ctx, w, h, id, sc) => Render.previewTrail(ctx, w, h, id, sc) },
    mapy:  { modul: Mapy,  preview: (ctx, w, h, id, sc) => Render.previewMapa(ctx, w, h, id, sc) },
    splash:{ modul: Splash,preview: (ctx, w, h, id, sc) => Render.previewSplash(ctx, w, h, id, sc) },
  };
  let shopKategorie = 'skiny';

  function otevriZoom(kat, polozka){
    ui.zoomName.textContent = polozka.jmeno;
    KATEGORIE[kat].preview(ui.zoomCanvas.getContext('2d'), 320, 320, polozka.id, 6);
    ui.zoom.classList.remove('hidden');
  }
  ui.zoom.addEventListener('click', () => ui.zoom.classList.add('hidden'));

  function obnovObchod(){
    const celkem = getGems();

    ui.shopTabSkiny.classList.toggle('tab-on', shopKategorie === 'skiny');
    ui.shopTabStopy.classList.toggle('tab-on', shopKategorie === 'stopy');
    ui.shopTabMapy.classList.toggle('tab-on', shopKategorie === 'mapy');
    ui.shopTabSplash.classList.toggle('tab-on', shopKategorie === 'splash');
    ui.shopBalance.textContent = Mena.zustatek(celkem);

    const k = KATEGORIE[shopKategorie];
    const modul = k.modul;
    ui.shopGrid.innerHTML = '';

    modul.SEZNAM.forEach((s) => {
      const vlastnim = modul.mam(s.id);
      const vybrany = modul.vybrany() === s.id;

      const card = document.createElement('div');
      card.className = 'skin-card' + (vybrany ? ' equipped' : '');

      const cv = document.createElement('canvas');
      cv.width = 128; cv.height = 128;
      card.appendChild(cv);
      k.preview(cv.getContext('2d'), 128, 128, s.id);
      cv.addEventListener('click', () => otevriZoom(shopKategorie, s));

      const nm = document.createElement('div');
      nm.className = 'skin-name';
      nm.textContent = s.jmeno;
      card.appendChild(nm);

      const price = document.createElement('div');
      price.className = 'skin-price';
      price.innerHTML = s.cena > 0 ? '<span class="gem-ico">◆</span> ' + s.cena : 'free';
      card.appendChild(price);

      const btn = document.createElement('button');
      btn.className = 'skin-btn';
      if (vybrany){
        btn.textContent = 'Equipped';
        btn.className += ' equipped-tag';
        btn.disabled = true;
      } else if (vlastnim){
        btn.textContent = 'Wear';
        btn.addEventListener('click', () => { modul.vyber(s.id); obnovObchod(); });
      } else {
        const dost = modul.zustatek(celkem) >= s.cena;
        btn.textContent = 'Buy';
        btn.disabled = !dost;
        if (dost) btn.addEventListener('click', () => { modul.koupit(s.id, celkem); obnovObchod(); Sit.nahrajPostup(); });
      }
      card.appendChild(btn);

      ui.shopGrid.appendChild(card);
    });
  }

  /* ---------- samostatná obrazovka: dokoupení krystalů za skutečné peníze ---------- */
  async function obnovKrystaly(){
    ui.krystalyBalance.textContent = Mena.zustatek(getGems());
    ui.krystalyGrid.innerHTML = '';
    const dostupne = Krystaly.dostupne();
    const ceny = dostupne ? await Krystaly.ceny() : {};

    Krystaly.SEZNAM.forEach((b) => {
      const card = document.createElement('div');
      card.className = 'skin-card';

      const nm = document.createElement('div');
      nm.className = 'skin-name';
      nm.textContent = b.jmeno;
      card.appendChild(nm);

      const pocet = document.createElement('div');
      pocet.className = 'skin-price';
      pocet.innerHTML = '<span class="gem-ico">◆</span> ' + b.pocet +
        (b.bonus > 0 ? ' <span class="bonus-tag">+' + b.bonus + '</span>' : '');
      card.appendChild(pocet);

      const btn = document.createElement('button');
      btn.className = 'skin-btn';
      if (!dostupne){
        btn.textContent = 'App only';
        btn.disabled = true;
      } else {
        btn.textContent = ceny[b.id] || 'Buy';
        btn.addEventListener('click', async () => {
          btn.disabled = true;
          btn.textContent = '…';
          const vysledek = await Krystaly.koupit(b.id);
          if (!vysledek.ok && vysledek.chyba !== 'cancelled'){
            btn.textContent = 'Try again';
            btn.disabled = false;
          } else {
            obnovKrystaly();
            Sit.nahrajPostup();
          }
        });
      }
      card.appendChild(btn);

      ui.krystalyGrid.appendChild(card);
    });
  }

  /* ---------- běh ---------- */
  /* ---------- značky kamarádů ---------- */
  const KEY_ZNACKY = 'skok.znacky.';

  /* Nejdřív vezmeme, co máme uložené (funguje i bez signálu),
     pak na pozadí zkusíme stáhnout čerstvá čísla. */
  function nactiZnacky(den){
    let ulozene = [];
    try { ulozene = JSON.parse(load(KEY_ZNACKY + den, '[]')) || []; } catch(e){}
    Game.znacky = ulozene;

    if (!Sit.pripojeno() || !Sit.prihlasen() || !Sit.jmeno()) return;

    Sit.kamaradiDne(den).then((data) => {
      const znacky = data
        .filter((r) => r.metry > 0 && r.kod !== Sit.kod())
        .sort((a, b) => b.metry - a.metry)
        .slice(0, 6)
        .map((r) => ({ jmeno: r.jmeno, metry: r.metry }));
      Game.znacky = znacky;
      save(KEY_ZNACKY + den, JSON.stringify(znacky));
    }).catch(() => {});
  }

  /* Denní výzvu jde hrát kolikrát chceš — počítá se nejlepší pokus dne.
     Roklina je pro všechny stejná, takže se dá během dne předhánět. */
  function startDaily(){
    rezim = 'daily';
    ui.mode.textContent = 'daily challenge';
    const dnes = todaySeed();
    spust(dnes);
    /* značky dávají smysl jen tady — ve volném letu je roklina pokaždé jiná */
    nactiZnacky(dnes);
  }

  function startFree(){
    rezim = 'free';
    ui.mode.textContent = 'free climb';
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

  /* vyskočení čísla, zlatavá záře a pár jisker — jen když je co slavit.
     Třída se musí sundat a znovu nasadit (s reflow mezi tím), jinak by se
     u druhého rekordu za sebou animace CSS znovu nespustila. */
  function oslavRekord(){
    ui.overScore.classList.remove('record');
    ui.overBest.classList.remove('record');
    void ui.overScore.offsetWidth;
    ui.overScore.classList.add('record');
    ui.overBest.classList.add('record');
  }

  function konecBehu(){
    Zvuk.vodaStop();
    Zvuk.hudbaStop();
    const m = Game.meters();
    const best = getBest();
    ui.overNum.textContent = m;
    ui.overCause.textContent = Game.cause || 'Run over';

    /* krystaly z běhu se přičtou do sbírky (ukončený běh se nepočítá) */
    const nasbirano = Game.krystaly || 0;
    if (nasbirano > 0) save(KEY_GEMS, getGems() + nasbirano);
    ui.overGems.textContent = nasbirano > 0 ? '◆ ' + nasbirano + ' crystals collected' : '';

    let novyRekord = false;

    if (rezim === 'daily'){
      const dnes = todaySeed();
      const dosud = getDaily(dnes);
      if (dosud === null || m > dosud){
        save(KEY_DAILY + dnes, m);
        ui.overBest.textContent = dosud === null
          ? 'Your first run today. Try to beat it.'
          : 'New best today! Previously ' + dosud + ' m.';
        novyRekord = dosud !== null && m > dosud;
      } else {
        ui.overBest.textContent = 'Best today ' + dosud + ' m. One more?';
      }
      ui.retry.textContent = 'Again';
      /* výsledek do žebříčku; bez signálu počká ve frontě */
      if (Sit.pripojeno() && Sit.prihlasen() && Sit.jmeno()) Sit.posli(dnes, Math.max(m, dosud || 0));
    } else {
      novyRekord = m > best;
      ui.overBest.textContent = novyRekord ? 'New record!' : 'Record: ' + best + ' m';
      ui.retry.textContent = 'Again';
    }

    if (m > best) save(KEY_BEST, m);
    show('over');
    if (novyRekord) oslavRekord();
    if (Sit.prihlasen()) Sit.nahrajPostup();
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
  const KEY_ZVUK    = 'skok.zvuk';
  const KEY_HUDBA   = 'skok.hudba';
  const KEY_VIBRACE = 'skok.vibrace';

  Zvuk.vypnuto       = load(KEY_ZVUK,  '1') === '0';
  Zvuk.hudbaVypnuta  = load(KEY_HUDBA, '1') === '0';
  Haptika.vypnuta    = load(KEY_VIBRACE, '1') === '0';

  function obnovPrepinace(){
    ui.sound.textContent = (Zvuk.vypnuto ? '🔇' : '🔊') + ' Sound';
    ui.music.textContent = (Zvuk.hudbaVypnuta ? '🔈' : '🎵') + ' Music';
    ui.haptic.textContent = (Haptika.vypnuta ? '📴' : '📳') + ' Vibration';
    ui.sound.classList.toggle('on', !Zvuk.vypnuto);
    ui.music.classList.toggle('on', !Zvuk.hudbaVypnuta);
    ui.haptic.classList.toggle('on', !Haptika.vypnuta);
    /* na zařízeních bez vibrací (iPhone, počítač) tlačítko nemá co dělat */
    ui.haptic.classList.toggle('hidden', !Haptika.podporovano());
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

  ui.haptic.addEventListener('click', () => {
    Haptika.ztlum(!Haptika.vypnuta);
    save(KEY_VIBRACE, Haptika.vypnuta ? '0' : '1');
    obnovPrepinace();
    if (!Haptika.vypnuta) Haptika.zasah('kamen');   // ukázka, ať víš, co jsi zapnul
  });

  ui.daily.addEventListener('click', startDaily);
  ui.free.addEventListener('click', startFree);
  ui.boardBtn.addEventListener('click', () => {
    zalozka = Sit.pripojeno() ? 'world' : 'me';
    obnovZebricek();
    show('board');
  });
  ui.boardBack.addEventListener('click', obnovMenu);
  ui.shopBtn.addEventListener('click', () => { shopKategorie = 'skiny'; obnovObchod(); show('shop'); });
  ui.shopBack.addEventListener('click', obnovMenu);
  ui.shopTabSkiny.addEventListener('click', () => { shopKategorie = 'skiny'; obnovObchod(); });
  ui.shopTabStopy.addEventListener('click', () => { shopKategorie = 'stopy'; obnovObchod(); });
  ui.shopTabMapy.addEventListener('click', () => { shopKategorie = 'mapy'; obnovObchod(); });
  ui.shopTabSplash.addEventListener('click', () => { shopKategorie = 'splash'; obnovObchod(); });
  ui.krystalyBtn.addEventListener('click', () => { obnovKrystaly(); show('krystaly'); });
  ui.krystalyBack.addEventListener('click', obnovMenu);
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
      ui.gemNum.textContent = Game.krystaly;
      Render.draw(ctx, Game, getBest());

      if (Game.over){
        /* výpočet už stojí, ale otřes po dopadu musí doznít */
        Game.utlum(dt);
        overDelay += dt;
        if (overDelay > 0.9) konecBehu();
      }
    } else if (obrazovka === 'pause'){
      /* v pauze se nic nepohne — obrázek zůstane přesně tam, kde jsi přestal */
      Game.utlum(dt);
      Render.draw(ctx, Game, getBest());
    } else if (Game.player){
      /* pod nabídkami běží roklina dál jako živé pozadí */
      Game.time += dt;
      Game.utlum(dt);
      Game.updateParts(dt);
      Render.draw(ctx, Game, 0);
    }
  }

  fit();
  Game.reset(W, H, todaySeed());
  obnovPrepinace();
  obnovMenu();
  Krystaly.init();
  $('verze-znacka').textContent = typeof VERZE_ZOBRAZENI !== 'undefined' ? VERZE_ZOBRAZENI : '';
  /* pro případ, že se hráč mezitím přihlásil na jiném zařízení —
     potichu stáhne a slije postup, žádná chyba (offline) tu nevadí */
  if (Sit.prihlasen()){
    Sit.stahniPostup().then((ok) => { if (ok) obnovMenu(); });
  }
  requestAnimationFrame(frame);

})();
