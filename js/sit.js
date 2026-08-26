/* Spojení se žebříčkem. Hra na něm není závislá — když server neodpovídá
   nebo není signál, všechno běží dál a výsledek se pošle později.

   Od 21. 8. 2026: účast v žebříčku vyžaduje přihlášení e-mailem (6místný
   kód poslaný na e-mail, žádné heslo). Bez přihlášení hra funguje úplně
   stejně, jen se výsledky nikam neposílají a nejde vidět svět/kamarády. */

const Sit = {

  KLIC_SESSION:  'skok.session',    // {email, access_token, refresh_token, vyprsi}
  KLIC_JMENO:    'skok.jmeno',
  KLIC_KOD:      'skok.kod',
  KLIC_KAMARADI: 'skok.kamaradi',
  KLIC_FRONTA:   'skok.fronta',

  /* ---------- drobnosti ---------- */

  nacti(k, v){ try { const x = localStorage.getItem(k); return x === null ? v : x; } catch(e){ return v; } },
  uloz(k, v){ try { localStorage.setItem(k, String(v)); } catch(e){} },
  smaz(k){ try { localStorage.removeItem(k); } catch(e){} },

  pripojeno(){
    return typeof SIT_URL === 'string' && SIT_URL !== '' &&
           typeof SIT_KLIC === 'string' && SIT_KLIC !== '';
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
    if (kod.length !== 6) return { ok:false, chyba:'A code has six characters.' };
    if (kod === this.kod())  return { ok:false, chyba:'That is your own code.' };
    const k = this.kamaradi();
    if (k.indexOf(kod) > -1) return { ok:false, chyba:'You already have this friend.' };
    if (k.length >= 50)      return { ok:false, chyba:'Your friend list is full.' };
    k.push(kod);
    this.ulozKamarady(k);
    return { ok:true, kod };
  },

  odeberKamarada(kod){
    this.ulozKamarady(this.kamaradi().filter((k) => k !== kod));
  },

  /* ---------- přihlášení e-mailem (Supabase Auth, OTP kód) ---------- */

  session(){
    try { return JSON.parse(this.nacti(this.KLIC_SESSION, 'null')); }
    catch(e){ return null; }
  },

  prihlasen(){ return !!this.session(); },

  odhlasit(){
    this.smaz(this.KLIC_SESSION);
    this.smaz(this.KLIC_JMENO);
    this.smaz(this.KLIC_KOD);
  },

  /* ---------- záloha postupu (krystaly, nákupy, rekord) ---------- */

  KLIC_PREFIX: 'skok.',
  /* tohle se nezálohuje — session je tajná, jméno/kód řeší registruj(),
     fronta je jen dočasná čekárna na odeslání výsledku */
  KLICE_VYNECHAT: ['skok.session', 'skok.jmeno', 'skok.kod', 'skok.fronta'],

  /* sesbírá všechno "skok.*" z tohohle zařízení do jednoho objektu */
  posbiratPostup(){
    const data = {};
    try {
      for (let i = 0; i < localStorage.length; i++){
        const k = localStorage.key(i);
        if (k && k.indexOf(this.KLIC_PREFIX) === 0 && this.KLICE_VYNECHAT.indexOf(k) === -1){
          data[k] = localStorage.getItem(k);
        }
      }
    } catch(e){}
    return data;
  },

  /* Sloučí stažený postup s tím, co je na zařízení — nikdy nic neubere:
     vlastněné věci (*.vlastni) se sjednotí, čísla (krystaly, rekordy…)
     se vezmou vyšší, vybraný skin/stopa/mapa zůstává podle zařízení. */
  pouzitPostup(vzdalena){
    if (!vzdalena || typeof vzdalena !== 'object') return;
    for (const k in vzdalena){
      if (k.indexOf(this.KLIC_PREFIX) !== 0 || this.KLICE_VYNECHAT.indexOf(k) > -1) continue;
      const vzd = vzdalena[k];
      const mist = this.nacti(k, null);

      if (mist === null){ this.uloz(k, vzd); continue; }
      if (/\.vybrany$/.test(k)) continue;   // preferuj výběr na tomhle zařízení

      if (/\.vlastni$/.test(k)){
        try {
          const a = JSON.parse(mist) || [];
          const b = JSON.parse(vzd) || [];
          this.uloz(k, JSON.stringify(Array.from(new Set(a.concat(b)))));
        } catch(e){ /* nechat, co je na zařízení */ }
        continue;
      }

      const a = Number(mist), b = Number(vzd);
      if (!isNaN(a) && !isNaN(b)) this.uloz(k, String(Math.max(a, b)));
    }
  },

  /* Nahraje aktuální postup na server. Neblokující — když se nepovede,
     zkusí se to znovu při další příležitosti (další nákup, konec běhu…). */
  async nahrajPostup(){
    if (!this.prihlasen()) return false;
    try { await this.rpc('uloz_postup', { p_data: this.posbiratPostup() }, true); return true; }
    catch(e){ return false; }
  },

  /* Stáhne postup ze serveru a sloučí ho s tím, co je na zařízení. */
  async stahniPostup(){
    if (!this.prihlasen()) return false;
    try {
      const vzdalena = await this.rpc('nacti_postup', {}, true);
      this.pouzitPostup(vzdalena);
      return true;
    } catch(e){ return false; }
  },

  /* Pošle na e-mail 6místný kód. Účet se založí sám, když ještě neexistuje. */
  async posliKod(email){
    if (!this.pripojeno()) throw new Error('nepripojeno');
    const odpoved = await fetch(SIT_URL.replace(/\/+$/, '') + '/auth/v1/otp', {
      method: 'POST',
      headers: { apikey: SIT_KLIC, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, create_user: true }),
    });
    if (!odpoved.ok) throw new Error('server ' + odpoved.status);
  },

  /* Ověří kód z e-mailu a uloží přihlášení. */
  async overKod(email, kod){
    if (!this.pripojeno()) throw new Error('nepripojeno');
    const odpoved = await fetch(SIT_URL.replace(/\/+$/, '') + '/auth/v1/verify', {
      method: 'POST',
      headers: { apikey: SIT_KLIC, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, token: String(kod || '').trim(), type: 'email' }),
    });
    if (!odpoved.ok) throw new Error('spatny kod');
    const data = await odpoved.json();
    this.uloz(this.KLIC_SESSION, JSON.stringify({
      email,
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      vyprsi: Date.now() + (data.expires_in || 3600) * 1000,
    }));
    return true;
  },

  /* Platný přístupový token — po vypršení si tiše požádá o nový.
     Vrátí null, když přihlášení vůbec neplatí (musí se přihlásit znovu). */
  async platnyToken(){
    const s = this.session();
    if (!s) return null;
    if (s.vyprsi > Date.now() + 30000) return s.access_token;

    try {
      const odpoved = await fetch(SIT_URL.replace(/\/+$/, '') + '/auth/v1/token?grant_type=refresh_token', {
        method: 'POST',
        headers: { apikey: SIT_KLIC, 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: s.refresh_token }),
      });
      if (!odpoved.ok) throw new Error('refresh selhal');
      const data = await odpoved.json();
      const nova = {
        email: s.email,
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        vyprsi: Date.now() + (data.expires_in || 3600) * 1000,
      };
      this.uloz(this.KLIC_SESSION, JSON.stringify(nova));
      return nova.access_token;
    } catch(e){
      this.odhlasit();
      return null;
    }
  },

  /* ---------- volání serveru ---------- */

  /* vyzadujePrihlaseni: true u zápisu (musí jít pod přihlášeným účtem),
     false u čtení (žebříček smí vidět kdokoliv, i bez přihlášení) */
  async rpc(jmenoFunkce, telo, vyzadujePrihlaseni){
    if (!this.pripojeno()) throw new Error('nepripojeno');
    let token = SIT_KLIC;
    if (vyzadujePrihlaseni){
      token = await this.platnyToken();
      if (!token) throw new Error('neprihlasen');
    }
    const odpoved = await fetch(SIT_URL.replace(/\/+$/, '') + '/rest/v1/rpc/' + jmenoFunkce, {
      method: 'POST',
      headers: {
        'apikey': SIT_KLIC,
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(telo),
    });
    if (!odpoved.ok) throw new Error('server ' + odpoved.status);
    const text = await odpoved.text();
    return text ? JSON.parse(text) : null;
  },

  /* Registrace přezdívky pod přihlášeným účtem. Vrátí kód pro kamarády. */
  async registruj(jmeno){
    const j = String(jmeno || '').trim().slice(0, 16) || 'Climber';
    const kod = await this.rpc('registruj', { p_jmeno: j }, true);
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
     Bez signálu (nebo bez přihlášení) tak nic nezmizí — odejde to,
     jakmile bude spojení i přihlášení v pořádku. */
  posli(den, metry){
    const f = this.fronta();
    const stavajici = f.find((z) => z.den === den);
    if (stavajici){ stavajici.metry = Math.max(stavajici.metry, metry); }
    else { f.push({ den, metry }); }
    this.uloz(this.KLIC_FRONTA, JSON.stringify(f.slice(-10)));
    return this.synchronizuj();
  },

  async synchronizuj(){
    if (!this.pripojeno() || !this.prihlasen() || !this.jmeno()) return false;
    let f = this.fronta();
    if (!f.length) return true;

    if (!this.kod()){
      try { await this.registruj(this.jmeno()); } catch(e){ return false; }
    }

    const zbyva = [];
    for (const zaznam of f){
      try {
        await this.rpc('zapis_skore', { p_den: zaznam.den, p_metry: zaznam.metry }, true);
      } catch(e){
        zbyva.push(zaznam);      // zkusíme příště
      }
    }
    this.uloz(this.KLIC_FRONTA, JSON.stringify(zbyva));
    return zbyva.length === 0;
  },

  /* ---------- čtení žebříčků (nevyžaduje přihlášení) ---------- */

  async svet(den, limit){
    const r = await this.rpc('top_dne', { p_den: den, p_limit: limit || 50 }, false);
    return Array.isArray(r) ? r : [];
  },

  async kamaradiDne(den){
    const kody = this.kamaradi();
    /* sebe do seznamu přidáme taky, ať se vidíš v pořadí */
    if (this.kod()) kody.push(this.kod());
    if (!kody.length) return [];
    const r = await this.rpc('skore_kamaradu', { p_den: den, p_kody: kody }, false);
    return Array.isArray(r) ? r : [];
  },
};
