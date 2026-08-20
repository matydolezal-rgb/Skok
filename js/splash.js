/* Efekt dopadu do vody na konci běhu — kosmetika, žádná herní výhoda.
   Stejný vzor jako Stopy: barvy pohání i preview v obchodě i skutečný burst ve hře. */

const Splash = {

  KLIC_VLASTNI: 'skok.splash.vlastni',
  KLIC_VYBRANY: 'skok.splash.vybrany',

  SEZNAM: [
    { id:'zadny',    jmeno:'Splash',    cena:0,
      barvy:['#6fc9e8'], n:26, spread:1.6, vlny:1, rings:0 },
    { id:'ohniva',   jmeno:'Blast',     cena:40,
      barvy:['#ff8c42','#ffb347','#ffd98a'], n:40, spread:2.0, vlny:2, rings:1 },
    { id:'zlata',    jmeno:'Gold Rush', cena:60,
      barvy:['#ffd070','#ffe6a0','#c8a862'], n:34, spread:1.7, vlny:1, rings:2 },
    { id:'ledova',   jmeno:'Shatter',   cena:75,
      barvy:['#9fe4ff','#cdf3ff','#ffffff'], n:38, spread:1.4, vlny:1, rings:1 },
    { id:'ohnostroj',jmeno:'Fireworks', cena:100,
      barvy:['#e0748a','#ffb347','#7fc99a','#9fe4ff'], n:36, spread:1.8, vlny:3, rings:1 },
    { id:'duha',     jmeno:'Rainbow Burst', cena:140,
      barvy:['#e0748a','#ffb347','#ffe98a','#7fc99a','#9fe4ff','#c9a8f2'], n:46, spread:1.9, vlny:1, rings:2 },
  ],

  nacti(k, v){ try { const x = localStorage.getItem(k); return x === null ? v : x; } catch(e){ return v; } },
  uloz(k, v){ try { localStorage.setItem(k, String(v)); } catch(e){} },

  najdi(id){ return this.SEZNAM.find((s) => s.id === id) || this.SEZNAM[0]; },

  vlastni(){
    let pole;
    try { pole = JSON.parse(this.nacti(this.KLIC_VLASTNI, '["zadny"]')) || ['zadny']; }
    catch(e){ pole = ['zadny']; }
    return pole.indexOf('zadny') > -1 ? pole : pole.concat('zadny');
  },

  mam(id){ return this.vlastni().indexOf(id) > -1; },

  vybrany(){
    const id = this.nacti(this.KLIC_VYBRANY, 'zadny');
    return this.mam(id) ? id : 'zadny';
  },

  vyber(id){
    if (!this.mam(id)) return false;
    this.uloz(this.KLIC_VYBRANY, id);
    return true;
  },

  zustatek(celkemNasbirano){ return Mena.zustatek(celkemNasbirano); },

  koupit(id, celkemNasbirano){
    const s = this.najdi(id);
    if (!s || s.cena <= 0 || this.mam(id)) return { ok:false };
    if (Mena.zustatek(celkemNasbirano) < s.cena) return { ok:false, chyba:'not enough crystals' };
    const pole = this.vlastni();
    pole.push(id);
    this.uloz(this.KLIC_VLASTNI, JSON.stringify(pole));
    Mena.pripsat(s.cena);
    this.vyber(id);
    return { ok:true };
  },
};
