/* Spojení se žebříčkem. Hra na něm není závislá — když server neodpovídá
   nebo není signál, všechno běží dál a výsledek se pošle později. */

const Sit = {

  KLIC_HRAC:     'skok.hrac',
  KLIC_JMENO:    'skok.jmeno',
  KLIC_KOD:      'skok.kod',
  KLIC_KAMARADI: 'skok.kamaradi',
  KLIC_FRONTA:   'skok.fronta',

  /* ---------- drobnosti ---------- */

  nacti(k, v){ try { const x = localStorage.getItem(k); return x === null ? v : x; } catch(e){ return v; } },
  uloz(k, v){ try { localStorage.setItem(k, String(v)); } catch(e){} },

  pripojeno(){
    return typeof SIT_URL === 'string' && SIT_URL !== '' &&
           typeof SIT_KLIC === 'string' && SIT_KLIC !== '';
  },

  /* náhodné id zařízení — žádný účet, žádný e-mail */
  hrac(){
    let id = this.nacti(this.KLIC_HRAC, '');
    if (!id){
      id = (crypto && crypto.randomUUID) ? crypto.randomUUID()
         : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
             const r = Math.random() * 16 | 0;
             return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
           });
      this.uloz(this.KLIC_HRAC, id);
    }
    return id;
  },

  jmeno(){ return this.nacti(this.KLIC_JMENO, ''); },
  kod(){   return this.nacti(this.KLIC_KOD, ''); },

  kamaradi(){
    try { return JSON.parse(this.nacti(this.KLIC_KAMARADI, '[]')) || []; }
    catch(e){ return []; }
  },

  ulozKamarady(pole){ this.uloz(this.KLIC_KAMARADI, JSON.stringify(pole)); },

  pridejKamarada(kod){
    kod = String(kod || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (kod.length !== 6) return { ok:false, chyba:'Kód má mít šest znaků.' };
    if (kod === this.kod())  return { ok:false, chyba:'To je tvůj vlastní kód.' };
    const k = this.kamaradi();
    if (k.indexOf(kod) > -1) return { ok:false, chyba:'Tohohle kamaráda už máš.' };
    if (k.length >= 50)      return { ok:false, chyba:'Víc kamarádů se do seznamu nevejde.' };
    k.push(kod);
    this.ulozKamarady(k);
    return { ok:true, kod };
  },

  odeberKamarada(kod){
    this.ulozKamarady(this.kamaradi().filter((k) => k !== kod));
  },

  /* ---------- volání serveru ---------- */

  async rpc(jmenoFunkce, telo){
    if (!this.pripojeno()) throw new Error('nepripojeno');
    const odpoved = await fetch(SIT_URL.replace(/\/+$/, '') + '/rest/v1/rpc/' + jmenoFunkce, {
      method: 'POST',
      headers: {
        'apikey': SIT_KLIC,
        'Authorization': 'Bearer ' + SIT_KLIC,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(telo),
    });
    if (!odpoved.ok) throw new Error('server ' + odpoved.status);
    const text = await odpoved.text();
    return text ? JSON.parse(text) : null;
  },

  /* Registrace zařízení. Vrátí kód pro kamarády. */
  async registruj(jmeno){
    const j = String(jmeno || '').trim().slice(0, 16) || 'Lezec';
    const kod = await this.rpc('registruj', { p_hrac: this.hrac(), p_jmeno: j });
    this.uloz(this.KLIC_JMENO, j);
    if (kod) this.uloz(this.KLIC_KOD, kod);
    return kod;
  },

  /* ---------- odesílání výsledků ---------- */

  fronta(){
    try { return JSON.parse(this.nacti(this.KLIC_FRONTA, '[]')) || []; }
    catch(e){ return []; }
  },

  /* Výsledek se nejdřív schová do fronty, teprve pak se zkusí odeslat.
     Bez signálu tak nic nezmizí — odejde to při nejbližší příležitosti. */
  posli(den, metry){
    const f = this.fronta();
    const stavajici = f.find((z) => z.den === den);
    if (stavajici){ stavajici.metry = Math.max(stavajici.metry, metry); }
    else { f.push({ den, metry }); }
    this.uloz(this.KLIC_FRONTA, JSON.stringify(f.slice(-10)));
    return this.synchronizuj();
  },

  async synchronizuj(){
    if (!this.pripojeno() || !this.jmeno()) return false;
    let f = this.fronta();
    if (!f.length) return true;

    if (!this.kod()){
      try { await this.registruj(this.jmeno()); } catch(e){ return false; }
    }

    const zbyva = [];
    for (const zaznam of f){
      try {
        await this.rpc('zapis_skore', {
          p_hrac: this.hrac(), p_den: zaznam.den, p_metry: zaznam.metry,
        });
      } catch(e){
        zbyva.push(zaznam);      // zkusíme příště
      }
    }
    this.uloz(this.KLIC_FRONTA, JSON.stringify(zbyva));
    return zbyva.length === 0;
  },

  /* ---------- čtení žebříčků ---------- */

  async svet(den, limit){
    const r = await this.rpc('top_dne', { p_den: den, p_limit: limit || 50 });
    return Array.isArray(r) ? r : [];
  },

  async kamaradiDne(den){
    const kody = this.kamaradi();
    /* sebe do seznamu přidáme taky, ať se vidíš v pořadí */
    if (this.kod()) kody.push(this.kod());
    if (!kody.length) return [];
    const r = await this.rpc('skore_kamaradu', { p_den: den, p_kody: kody });
    return Array.isArray(r) ? r : [];
  },
};
