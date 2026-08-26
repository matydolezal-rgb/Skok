/* Připojení k žebříčku.
   Dokud jsou obě hodnoty prázdné, hra funguje úplně stejně,
   jen žebříček ukazuje pouze tvoje vlastní výsledky.

   Vyplní se po založení projektu v Supabase:
   Project Settings → Data API → Project URL a klíč "anon public".
   Ten klíč je určený do prohlížeče, není to heslo — sám o sobě nic neumí,
   protože tabulky jsou chráněné (viz server/schema.sql). */

const SIT_URL  = 'https://jzxedbxhjecpzsoadekk.supabase.co';
const SIT_KLIC = 'sb_publishable_jVW6MgYhQBPxdkELVuqV7Q_SLbJ42Tp';

/* RevenueCat — veřejné API klíče (jeden pro Android, jeden pro iOS),
   z app.revenuecat.com/projects/.../apps. Dokud je iOS klíč prázdný,
   nákup krystalů na iOS zůstane nedostupný, na Androidu funguje. */
const REVENUECAT_KLIC_ANDROID = 'goog_bDbiJPgILGEXmjkdJUmttSAwlcg';
const REVENUECAT_KLIC_IOS = '';

/* Číslo verze v rohu obrazovky — musí sedět s VERZE v sw.js, ať Matyáš
   na první pohled pozná, jestli se mu appka na telefonu aktualizovala. */
const VERZE_ZOBRAZENI = 'v52';
