/* Společná kasa pro celý obchod — skiny i stopy sahají na stejné krystaly,
   ať se utracené nikde nezdvojí a zůstatek všude sedí. */

const Mena = {
  KLIC_UTRACENO: 'skok.obchod.utraceno',
  KLIC_DOKOUPENO: 'skok.obchod.dokoupeno',
  KLIC_ODMENY: 'skok.obchod.odmeny',

  nacti(k, v){ try { const x = localStorage.getItem(k); return x === null ? v : x; } catch(e){ return v; } },
  uloz(k, v){ try { localStorage.setItem(k, String(v)); } catch(e){} },

  utraceno(){ return Number(this.nacti(this.KLIC_UTRACENO, 0)) || 0; },

  /* krystaly dokoupené za skutečné peníze — nepočítají se do "nasbíráno",
     to zůstává jen ze hry kvůli žebříčku, ale zvyšují to, co jde utratit */
  dokoupeno(){ return Number(this.nacti(this.KLIC_DOKOUPENO, 0)) || 0; },

  /* dárky za umístění v denním žebříčku — vedeny zvlášť od dokoupených,
     ať "dokoupeno" zůstane pravdivé číslo pro účetnictví nákupů. Do
     "nasbíráno" se stejně jako nákupy nepočítají. */
  odmeny(){ return Number(this.nacti(this.KLIC_ODMENY, 0)) || 0; },

  /* kolik krystalů zbývá na útratu = co jsi kdy nasbíral + co dokoupil
     + co jsi dostal za umístění - co už je utracené */
  zustatek(celkemNasbirano){
    return Math.max(0, celkemNasbirano + this.dokoupeno() + this.odmeny() - this.utraceno());
  },

  pripsat(cena){ this.uloz(this.KLIC_UTRACENO, this.utraceno() + cena); },

  pripsatNakup(pocetKrystalu){ this.uloz(this.KLIC_DOKOUPENO, this.dokoupeno() + pocetKrystalu); },

  pripsatOdmenu(pocetKrystalu){ this.uloz(this.KLIC_ODMENY, this.odmeny() + pocetKrystalu); },
};
