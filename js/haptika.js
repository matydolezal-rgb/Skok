/* Vibrace. Třetí smysl vedle obrazu a zvuku — na mobilu udělá s pocitem
   ze hry hodně. Krátké cuknutí, nikdy dlouhé bzučení.
   Pozor: iPhone vibrace z webu neumí vůbec, tam se tlačítko schová. */

const Haptika = {

  vypnuta: false,

  podporovano(){
    return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
  },

  hraj(vzor){
    if (this.vypnuta || !this.podporovano()) return;
    try { navigator.vibrate(vzor); } catch(e){}
  },

  /* trny — dvě rychlá cuknutí, jako když se od něčeho odrazíš */
  trny(){ this.hraj([0, 16, 28, 12]); },

  /* náraz padající věci — koule je těžší, tak i cuknutí delší */
  zasah(typ){ this.hraj(typ === 'koule' ? [0, 30] : [0, 16]); },

  /* sebraný krystal — sotva znatelné ťuknutí, ne rána */
  krystal(){ this.hraj([0, 8]); },

  /* rekord — dvě krátká cvaknutí, ať se to nesplete se zásahem (jedna dlouhá) */
  rekord(){ this.hraj([0, 14, 60, 22]); },

  /* konec běhu */
  konec(){ this.hraj([0, 45, 70, 110]); },

  ztlum(stav){
    this.vypnuta = stav;
    if (stav && this.podporovano()){
      try { navigator.vibrate(0); } catch(e){}   // zastav, co zrovna běží
    }
  },
};
