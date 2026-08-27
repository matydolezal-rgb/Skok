-- Doplněk k migrace-odmeny.sql (28. 8. 2026).
--
-- PROČ: kontrola po předchozí migraci ukázala u odmena_vypocet
-- prihlaseny_muze = true, ačkoliv je to jen vnitřní pomocník, který appka
-- nevolá. Ukázalo se, že Supabase dává novým funkcím ve schématu public
-- právo přímo rolím anon a authenticated (nastavené default privileges),
-- ne jen obecné roli PUBLIC. "revoke from public, anon" proto sebral jen
-- anonymní přístup a přihlášeným právo zůstalo.
--
-- ŽÁDNÁ DÍRA TO NEBYLA: funkce jen čte a vrací pořadí, které je stejně
-- vidět v žebříčku. Vyzvednout cizí odměnu přes ni nejde — vyzvedni_odmenu
-- si identitu bere z přihlášení (auth.uid()), ne z parametru.
--
-- PROČ SE TÍM DÁREK NEROZBIJE: cekajici_odmena je security definer, takže
-- uvnitř běží s právy vlastníka funkce, a ten na odmena_vypocet právo má.
-- Volání zevnitř tedy projde i poté, co ho přihlášeným odebereme.
--
-- POUČENÍ PRO PŘÍŠTĚ: u funkcí, které mají zůstat vnitřní, revokovat i od
-- authenticated, ne jen od public a anon.
--
-- KDE SPUSTIT: Supabase → SQL Editor → nový dotaz → vložit → Run.

revoke execute on function odmena_vypocet(uuid, date) from authenticated;

-- Kontrola. odmena_vypocet má mít teď obojí false, zbylé dvě beze změny
-- (anon false, prihlaseny true) — a hlavně: dárek musí dál fungovat.
select p.proname as funkce,
       has_function_privilege('anon', p.oid, 'execute')          as anon_muze,
       has_function_privilege('authenticated', p.oid, 'execute') as prihlaseny_muze
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('cekajici_odmena','vyzvedni_odmenu','odmena_vypocet')
order by p.proname;

-- Důkaz, že vnitřní volání pořád projde: tohle musí doběhnout bez chyby
-- a vrátit prázdný výsledek (nejsi přihlášený v SQL editoru, takže
-- auth.uid() je prázdné) — ne spadnout na "permission denied".
select * from cekajici_odmena();
