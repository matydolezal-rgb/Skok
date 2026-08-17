/* Stopy za postavou — vlečou se za tebou ve vzduchu při skoku.
   Stejně jako skiny: jen kosmetika, žádná herní výhoda. */

const Stopy = {

  KLIC_VLASTNI: 'skok.stopy.vlastni',
  KLIC_VYBRANY: 'skok.stopy.vybrany',

  SEZNAM: [
    { id:'zadna',    jmeno:'None',      cena:0,
      barvy:['#9db4cf'] },
    { id:'jiskry',   jmeno:'Embers',    cena:30,
      barvy:['#ffb347','#ff8c42','#ffd98a'] },
    { id:'mraz',     jmeno:'Frost',     cena:45,
      barvy:['#9fe4ff','#cdf3ff','#6fc9e8'] },
    { id:'kvety',    jmeno:'Petals',    cena:45,
      barvy:['#f2a6c4','#ffd6e8','#f4efe4'] },
    { id:'bubliny',  jmeno:'Bubbles',   cena:60,
      barvy:['#7fd8d8','#a8ecec','#4fa3c9'] },
    { id:'stin',     jmeno:'Shadow',    cena:70,
      barvy:['#3a3f4a','#232830','#565f6e'] },
    { id:'duha',     jmeno:'Rainbow',   cena:90,
      barvy:['#e0748a','#ffb347','#ffe98a','#7fc99a','#9fe4ff','#c9a8f2'] },
    { id:'hvezdny',  jmeno:'Stardust',  cena:130,
      barvy:['#d9b3ff','#ffe0a0','#ffffff'] },
  ],

  nacti(k, v){ try { const x = localStorage.getItem(k); return x === null ? v : x; } catch(e){ return v; } },
  uloz(k, v){ try { localStorage.setItem(k, String(v)); } catch(e){} },

  najdi(id){ return this.SEZNAM.find((s) => s.id === id) || this.SEZNAM[0]; },

  vlastni(){
    let pole;
    try { pole = JSON.parse(this.nacti(this.KLIC_VLASTNI, '["zadna"]')) || ['zadna']; }
    catch(e){ pole = ['zadna']; }
    return pole.indexOf('zadna') > -1 ? pole : pole.concat('zadna');
  },

  mam(id){ return this.vlastni().indexOf(id) > -1; },

  vybrany(){
    const id = this.nacti(this.KLIC_VYBRANY, 'zadna');
    return this.mam(id) ? id : 'zadna';
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
