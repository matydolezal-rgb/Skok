/* Skiny na postavičku. Kupují se za krystaly nasbírané v bězích,
   žádná herní výhoda — jen jak vypadáš. */

const Skiny = {

  KLIC_VLASTNI:  'skok.skiny.vlastni',
  KLIC_VYBRANY:  'skok.skiny.vybrany',

  SEZNAM: [
    { id:'default',    jmeno:'Climber',   cena:0,
      telo:['#f4efe4','#c3b49b'], hlava:'#fdf7ec', sala:'#e0748a' },
    { id:'liska',       jmeno:'Fox',       cena:1,
      telo:['#e8834a','#c9622c'], hlava:'#f3a865', sala:'#3d4657' },
    { id:'tucnak',      jmeno:'Penguin',   cena:1,
      telo:['#2b3038','#14171c'], hlava:'#232830', sala:'#e0a83d' },
    { id:'policajt',    jmeno:'Officer',   cena:1,
      telo:['#2c4b7a','#1c355c'], hlava:'#fdf7ec', sala:'#1c355c' },
    { id:'panda',       jmeno:'Panda',     cena:1,
      telo:['#ffffff','#e6e6e6'], hlava:'#ffffff', sala:'#e0748a' },
    { id:'kuchar',      jmeno:'Chef',      cena:1,
      telo:['#fbfaf6','#e2ddd0'], hlava:'#fdf7ec', sala:'#c94f4f' },
    { id:'yeti',        jmeno:'Yeti',      cena:1,
      telo:['#eaf3fb','#b9d3ea'], hlava:'#f4fafd', sala:'#4fa3c9' },
    { id:'ninja',       jmeno:'Ninja',     cena:1,
      telo:['#2a2d33','#15171b'], hlava:'#2a2d33', sala:'#c94f4f' },
    { id:'kosmonaut',   jmeno:'Astronaut', cena:1,
      telo:['#eef1f4','#c7ccd1'], hlava:'#dfe6ec', sala:'#e0748a' },
  ],

  nacti(k, v){ try { const x = localStorage.getItem(k); return x === null ? v : x; } catch(e){ return v; } },
  uloz(k, v){ try { localStorage.setItem(k, String(v)); } catch(e){} },

  najdi(id){ return this.SEZNAM.find((s) => s.id === id) || this.SEZNAM[0]; },

  vlastni(){
    let pole;
    try { pole = JSON.parse(this.nacti(this.KLIC_VLASTNI, '["default"]')) || ['default']; }
    catch(e){ pole = ['default']; }
    return pole.indexOf('default') > -1 ? pole : pole.concat('default');
  },

  mam(id){ return this.vlastni().indexOf(id) > -1; },

  vybrany(){
    const id = this.nacti(this.KLIC_VYBRANY, 'default');
    return this.mam(id) ? id : 'default';
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
