/* Společná kasa pro celý obchod — skiny i stopy sahají na stejné krystaly,
   ať se utracené nikde nezdvojí a zůstatek všude sedí. */

const Mena = {
  KLIC_UTRACENO: 'skok.obchod.utraceno',

  nacti(k, v){ try { const x = localStorage.getItem(k); return x === null ? v : x; } catch(e){ return v; } },
  uloz(k, v){ try { localStorage.setItem(k, String(v)); } catch(e){} },

  utraceno(){ return Number(this.nacti(this.KLIC_UTRACENO, 0)) || 0; },

  /* kolik krystalů zbývá na útratu = co jsi kdy nasbíral - co už je utracené */
  zustatek(celkemNasbirano){ return Math.max(0, celkemNasbirano - this.utraceno()); },

  pripsat(cena){ this.uloz(this.KLIC_UTRACENO, this.utraceno() + cena); },
};
