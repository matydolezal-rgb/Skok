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
    /* ne úplně všude — souvislý sníh přes celou horu dělal z výstupu dřinu */
    return hash1(band * 6151 + (side < 0 ? 23 : 71) + this.seedNum) < 0.6;
  },

  snowAt(y, side){
    return this.bandIsSnowy(Math.floor(y / this.BAND), side);
  },

  snowBand(band, side){
    if (!this.bandIsSnowy(band, side)) return null;
    return { y0: band * this.BAND, y1: (band + 1) * this.BAND };
  },

  /* ---------- krystaly ----------
     Rozmístění je dané seedem, takže je má každý hráč ve stejné roklině
     na stejných místech. Dva druhy:
       • ve vzduchu uprostřed průrvy — sebereš je tím, že se dobře trefíš
         do okamžiku odrazu, protože letět se dá jen po pevné dráze
       • ve stěně — sebereš je tím, že se zrovna tam chytíš nebo tudy sjedeš
     Hodnota roste s výškou: křemen 1, ledový 2, vzácný 3. */

  KRYSTAL_PASMO: 190,

  krystalVPasmu(band){
    if (band > -2) return null;                 // hned u startu žádné
    const h = hash1(band * 3301 + this.seedNum);
    if (h > 0.72) return null;                  // v části pásem nic není

    const y = band * this.KRYSTAL_PASMO + 40 + hash1(band * 77 + this.seedNum) * 100;
    const druh = y <= this.snowStartY() ? 'vzacny'
               : y <= this.iceStartY()  ? 'ledovy'
               : 'kremen';
    const hodnota = druh === 'vzacny' ? 3 : druh === 'ledovy' ? 2 : 1;

    /* Většina patří do stěny. Krystal ve vzduchu posbírá dráha skoku skoro
       sama, kdežto pro ten ve stěně musíš přesně dopadnout — a to je teprve
       rozhodnutí, kvůli kterému sbírání do hry patří. */
    if (h < 0.25){
      /* dál od středu — uprostřed průrvy by je posbíral každý skok */
      const posun = (hash1(band * 131 + this.seedNum) - 0.5) * this.halfGap(y) * 1.5;
      return { id: 'v' + band, x: this.centerX(y) + posun, y, druh, hodnota, vzduch: true };
    }

    const side = hash1(band * 191 + this.seedNum) < 0.5 ? -1 : 1;
    if (this.spikeAt(y, side)) return null;     // v trnech by se nedal sebrat
    return { id: 's' + band, x: this.wallAt(y, side) - side * 11, y, druh, hodnota, vzduch: false, side };
  },

  /* krystaly, které můžou být zrovna vidět nebo na dosah */
  krystalyKolem(odY, doY){
    const out = [];
    const b0 = Math.floor(odY / this.KRYSTAL_PASMO) - 1;
    const b1 = Math.floor(doY / this.KRYSTAL_PASMO) + 1;
    for (let b = b0; b <= b1; b++){
      const k = this.krystalVPasmu(b);
      if (k) out.push(k);
    }
    return out;
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
