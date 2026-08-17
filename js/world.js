/* Tvar rokliny. Čistě matematika — žádný stav, žádné kreslení.
   Souřadnice: y roste dolů, takže šplhání nahoru znamená klesající y. */

const World = {

  W: 420,          // šířka herní plochy v bodech
  seedNum: 0,

  init(width, seedStr){
    this.W = width;
    this.seedNum = hashSeed(seedStr || 'x') % 100000;
  },

  /* střed rokliny se vlní do stran */
  centerX(y){
    return this.W * 0.5
         + this.W * 0.085 * Math.sin(y * 0.00090 + 0.7)
         + this.W * 0.045 * Math.sin(y * 0.00230 + 1.9);
  },

  /* poloviční šířka průrvy — jednou úzko, jednou volno */
  halfGap(y){
    const g = this.W * 0.270
            + this.W * 0.045 * Math.sin(y * 0.00160)
            + this.W * 0.030 * Math.sin(y * 0.00061 + 2.1);
    const min = this.W * 0.20;
    const max = this.W * 0.33;
    return Math.max(min, Math.min(max, g));
  },

  leftWall(y){  return this.centerX(y) - this.halfGap(y); },
  rightWall(y){ return this.centerX(y) + this.halfGap(y); },

  /* stěna pro danou stranu: -1 vlevo, +1 vpravo */
  wallAt(y, side){ return side < 0 ? this.leftWall(y) : this.rightWall(y); },

  /* ---------- trny ----------
     Stěna je rozdělená na pásma. Některá pásma jsou osazená trny a nedá se
     na nich zachytit. Nikdy ne na obou stranách naráz — vždy musí být kudy. */

  BAND: 250,

  /* holý los, jestli by pásmo mělo trny — bez ohledu na okolí */
  losTrnu(band, side){
    if (band > -2) return false;                 // start je čistý
    return hash1(band * 7919 + (side < 0 ? 13 : 5711) + this.seedNum) < 0.26;
  },

  /* Trny nesmí být proti sobě ani v sousedním pásmu. Odraz od trnů totiž
     míří vzhůru — mezi dvěma řadami proti sobě by šlo pinkat donekonečna
     a hráč by o běh přišel bez možnosti to zachránit.
     Přednost má levá stěna, ať je rozhodnutí jednoznačné. */
  bandHasSpikes(band, side){
    if (!this.losTrnu(band, side)) return false;
    if (side < 0) return true;
    for (let d = -1; d <= 1; d++){
      if (this.losTrnu(band + d, -1)) return false;
    }
    return true;
  },

  /* je na daném místě stěny trn? */
  spikeAt(y, side){
    const band = Math.floor(y / this.BAND);
    if (!this.bandHasSpikes(band, side)) return false;
    const top = band * this.BAND;
    const h = hash1(band * 31 + this.seedNum + (side < 0 ? 1 : 2));
    const len = this.BAND * (0.45 + h * 0.35);
    const off = (this.BAND - len) * 0.5;
    return y > top + off && y < top + off + len;
  },

  /* ---------- led ----------
     Od 120 metrů výš jsou některé úseky stěny namrzlé. Nezabíjejí,
     ale sjíždíš po nich skoro třikrát rychleji — nedá se na nich čekat. */

  ICE_FROM_M: 70,

  iceStartY(){ return -this.ICE_FROM_M * 50; },

  bandIsIcy(band, side){
    if (band * this.BAND > this.iceStartY()) return false;      // ještě nízko
    if (this.bandHasSpikes(band, side)) return false;           // trny mají přednost
    const hloubka = Math.min(1, (this.iceStartY() - band * this.BAND) / 12000);
    return hash1(band * 4409 + (side < 0 ? 91 : 137) + this.seedNum) < 0.22 + hloubka * 0.28;
  },

  iceAt(y, side){
    return this.bandIsIcy(Math.floor(y / this.BAND), side);
  },

  iceBand(band, side){
    if (!this.bandIsIcy(band, side)) return null;
    return { y0: band * this.BAND, y1: (band + 1) * this.BAND };
  },

  /* ---------- sníh ----------
     Od 200 metrů je stěna zaváta skoro všude. Sjíždíš po ní rychleji než
     po holé skále, ale pomaleji než po ledu — a překvapí to míň, protože
     sníh je téměř souvislý. */

  SNOW_FROM_M: 140,

  snowStartY(){ return -this.SNOW_FROM_M * 50; },

  bandIsSnowy(band, side){
    if (band * this.BAND > this.snowStartY()) return false;
    if (this.bandHasSpikes(band, side)) return false;
    if (this.bandIsIcy(band, side)) return false;          // led má přednost
    return hash1(band * 6151 + (side < 0 ? 23 : 71) + this.seedNum) < 0.82;
  },

  snowAt(y, side){
    return this.bandIsSnowy(Math.floor(y / this.BAND), side);
  },

  snowBand(band, side){
    if (!this.bandIsSnowy(band, side)) return null;
    return { y0: band * this.BAND, y1: (band + 1) * this.BAND };
  },

  /* rozsah trnového pásma pro vykreslení, nebo null */
  spikeBand(band, side){
    if (!this.bandHasSpikes(band, side)) return null;
    const top = band * this.BAND;
    const h = hash1(band * 31 + this.seedNum + (side < 0 ? 1 : 2));
    const len = this.BAND * (0.45 + h * 0.35);
    const off = (this.BAND - len) * 0.5;
    return { y0: top + off, y1: top + off + len };
  },
};
