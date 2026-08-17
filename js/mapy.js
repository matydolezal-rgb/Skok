/* Mapy — jak roklina vypadá. Čistě kosmetické: fyzika (led klouže, sníh
   zpomaluje a stojí sílu při odrazu, trny na dotek odhodí) je všude
   úplně stejná, mění se jen paleta a tvary. Proto to funguje beze
   změny i v Daily Challenge — žebříček zůstává férový. */

const Mapy = {

  KLIC_VLASTNI: 'skok.mapy.vlastni',
  KLIC_VYBRANY: 'skok.mapy.vybrany',

  SEZNAM: [
    /* výchozí — přesně dnešní barvy, aby hráč bez nákupu neviděl žádnou změnu */
    {
      id:'skala', jmeno:'Rock', cena:0,
      sky:      [['#0d1626','#5b6f9c'], ['#0a111d','#2c3a55'], ['#05070c','#0e1524']],
      farRocks: [['#111a2b','#33405e'], ['#0c1421','#232e46']],
      backWall: [['#0b1120','#1b2439'], ['#05080f','#0d1422']],
      wall:     [['#242c3d','#49546f'], ['#3c4760','#6a769a']],
      hrana:    ['rgba(140,190,255,', 'rgba(220,238,255,'],
      sneh:     { fill:['rgba(225,235,248,.30)','rgba(248,252,255,.88)'], stin:'rgba(150,175,205,.30)' },
      led:      { fill:['rgba(150,215,255,.14)','rgba(205,240,255,.60)'], lesk:'rgba(255,255,255,.55)', hrana:'rgba(235,252,255,.95)' },
      trnKamen: { grad:['#7f7a6e','#9c968a','#575349'], okraj:'rgba(28,25,20,.85)', zvyrazneni:'rgba(215,205,185,.55)' },
      trnLed:   { grad:['rgba(175,225,250,.95)','rgba(240,252,255,.98)','rgba(140,200,235,.95)'], okraj:'rgba(90,160,205,.9)', zvyrazneni:'rgba(255,255,255,.95)' },
      kamen:    { barva:'#6e6559', okraj:'rgba(20,18,15,.65)', zvyrazneni:'rgba(255,240,215,.16)' },
      rampouch: { grad:['rgba(190,235,255,.95)','rgba(255,255,255,.98)','rgba(120,190,235,.95)'], okraj:'rgba(70,140,190,.8)' },
      koule:    { grad:['#ffffff','#e8f1fb','#a9bed6'], okraj:'rgba(60,85,120,.85)', hrudky:'rgba(140,165,195,.45)' },
      prachSkok:'#9db4cf', prachSnih:'#eaf4ff', ulomky:'#bfe9ff', dopadSkala:'#7d8ea3', dopadMokro:'#dff0ff',
    },

    /* poušť — kaktusy dole, kosti nahoře, tekutý písek místo sněhu */
    {
      id:'poust', jmeno:'Desert', cena:120,
      sky:      [['#3a1f0d','#f2a552'], ['#2a1508','#c97a2e'], ['#160a03','#7a4418']],
      farRocks: [['#2a1a0c','#5c3d1a'], ['#1e1108','#3f2a12']],
      backWall: [['#1c1006','#3a2410'], ['#120a03','#241407']],
      wall:     [['#5c4326','#c9924f'], ['#8a6533','#e0ac66']],
      hrana:    ['rgba(255,200,120,', 'rgba(255,236,190,'],
      sneh:     { fill:['rgba(196,150,84,.30)','rgba(224,186,120,.90)'], stin:'rgba(120,86,40,.30)' },
      led:      { fill:['rgba(255,214,140,.14)','rgba(255,224,170,.55)'], lesk:'rgba(255,250,230,.55)', hrana:'rgba(255,236,190,.95)' },
      trnKamen: { grad:['#3f6b35','#5f9146','#2a4a24'], okraj:'rgba(20,35,15,.85)', zvyrazneni:'rgba(210,255,180,.5)' },
      trnLed:   { grad:['#e8dcc0','#fff8e8','#c9b98a'], okraj:'rgba(90,70,40,.85)', zvyrazneni:'rgba(255,255,255,.9)' },
      kamen:    { barva:'#8a6a3a', okraj:'rgba(50,36,16,.65)', zvyrazneni:'rgba(255,230,180,.20)', vlakna:'rgba(74,52,25,.6)' },
      rampouch: { grad:['#6e4f2a','#8a6a3a','#4a3419'], okraj:'rgba(40,28,14,.8)', odnoz:'#4a3419' },
      koule:    { grad:['#f2ecd8','#e8ddc0','#b9a97e'], okraj:'rgba(70,55,30,.85)', hrudky:'rgba(140,120,85,.45)', socket:'#2a2013' },
      prachSkok:'#e8c98a', prachSnih:'#f2d9a0', ulomky:'#f0d29a', dopadSkala:'#c9a25c', dopadMokro:'#e8c98a',
    },
  ],

  nacti(k, v){ try { const x = localStorage.getItem(k); return x === null ? v : x; } catch(e){ return v; } },
  uloz(k, v){ try { localStorage.setItem(k, String(v)); } catch(e){} },

  najdi(id){ return this.SEZNAM.find((s) => s.id === id) || this.SEZNAM[0]; },

  vlastni(){
    let pole;
    try { pole = JSON.parse(this.nacti(this.KLIC_VLASTNI, '["skala"]')) || ['skala']; }
    catch(e){ pole = ['skala']; }
    return pole.indexOf('skala') > -1 ? pole : pole.concat('skala');
  },

  mam(id){ return this.vlastni().indexOf(id) > -1; },

  vybrany(){
    const id = this.nacti(this.KLIC_VYBRANY, 'skala');
    return this.mam(id) ? id : 'skala';
  },

  vyber(id){
    if (!this.mam(id)) return false;
    this.uloz(this.KLIC_VYBRANY, id);
    return true;
  },

  /* pohodlnější pro kreslicí funkce — rovnou objekt, ne jen id */
  aktivni(){ return this.najdi(this.vybrany()); },

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
