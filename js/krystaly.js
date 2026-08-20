/* Dokoupení krystalů za skutečné peníze. Skladba balíčků žije tady,
   skutečné ceny a měnu určuje App Store Connect / Play Console podle product ID.
   Nákup provádí RevenueCat (Capacitor.Plugins.Purchases) — Capacitor tenhle bridge
   vloží do window sám za běhu jen uvnitř nativní appky, ne v prohlížeči, takže
   se dá bez pluginu dál normálně vyvíjet i mimo appku. */

const Krystaly = {

  SEZNAM: [
    { id:'crystals_small',  jmeno:'Handful',   pocet:100,  bonus:0 },
    { id:'crystals_medium', jmeno:'Pouch',     pocet:550,  bonus:50 },
    { id:'crystals_large',  jmeno:'Chest',     pocet:1700, bonus:200 },
    { id:'crystals_mega',   jmeno:'Hoard',     pocet:6000, bonus:1000 },
  ],

  najdi(id){ return this.SEZNAM.find((b) => b.id === id) || null; },

  plugin(){
    return (typeof window !== 'undefined' && window.Capacitor && window.Capacitor.Plugins &&
            window.Capacitor.Plugins.Purchases) || null;
  },

  /* je nativní nákupní plugin k dispozici a nakonfigurovaný pro tuhle platformu? */
  dostupne(){ return !!this.plugin() && !!this._nakonfigurovano; },

  /* zavolat jednou při startu appky (viz main.js); mimo Android/iOS appku nic nedělá */
  async init(){
    const p = this.plugin();
    if (!p) return;
    const platforma = window.Capacitor.getPlatform();
    const klic = platforma === 'ios' ? REVENUECAT_KLIC_IOS : REVENUECAT_KLIC_ANDROID;
    if (!klic) return;
    try {
      await p.configure({ apiKey: klic });
      this._nakonfigurovano = true;
    } catch(e){ this._nakonfigurovano = false; }
  },

  /* načte lokalizované ceny z RevenueCat pro zobrazení v obchodě;
     vrací mapu id -> text ceny (např. "$1.99"), nebo {} když plugin chybí */
  async ceny(){
    if (!this.dostupne()) return {};
    try {
      const { current } = await this.plugin().getOfferings();
      const balicky = (current && current.availablePackages) || [];
      const mapa = {};
      for (const b of balicky) {
        const id = b.storeProduct && b.storeProduct.identifier;
        if (id) mapa[id] = b.storeProduct.priceString;
      }
      return mapa;
    } catch(e){ return {}; }
  },

  /* koupí balíček; po úspěšném nákupu připíše krystaly do Mena a vrátí {ok:true} */
  async koupit(id){
    const b = this.najdi(id);
    if (!b) return { ok:false, chyba:'unknown pack' };
    if (!this.dostupne()) return { ok:false, chyba:'purchases not available outside the app' };

    try {
      const { current } = await this.plugin().getOfferings();
      const balicky = (current && current.availablePackages) || [];
      const rcBalicek = balicky.find((p) => p.storeProduct && p.storeProduct.identifier === id);
      if (!rcBalicek) return { ok:false, chyba:'pack not found in store' };

      await this.plugin().purchasePackage({ aPackage: rcBalicek });
      Mena.pripsatNakup(b.pocet + b.bonus);
      return { ok:true, pripsano: b.pocet + b.bonus };
    } catch(e){
      if (e && e.userCancelled) return { ok:false, chyba:'cancelled' };
      return { ok:false, chyba:'purchase failed' };
    }
  },
};
