-- Migrace z 26. 8. 2026 — utáhnout práva na funkce, které mají být
-- jen pro přihlášené.
--
-- PROČ: PostgreSQL dává každé nové funkci právo na spuštění roli PUBLIC,
-- tedy i nepřihlášenému návštěvníkovi. Grant "to authenticated" v schema.sql
-- tohle výchozí právo nepřebije — jen přidá další. Nepřihlášený tak mohl
-- zavolat muj_profil() a nacti_postup().
--
-- ŽÁDNÁ DATA NEUNIKALA: obě funkce filtrují na auth.uid(), který je pro
-- nepřihlášeného prázdný, takže vracely prázdný výsledek. Zapisovací funkce
-- (registruj, zapis_skore, uloz_postup) se navíc brání samy výjimkou
-- "not authenticated". Tohle je tedy zpřísnění a srovnání skutečnosti
-- s tím, co komentáře slibují — ne zalepení díry.
--
-- BEZPEČNÉ SPUSTIT NA BĚŽÍCÍ DATABÁZI: mění jen práva, žádná data.
-- Pořadí revoke → grant je důležité: revoke sebere výchozí právo všem,
-- grant ho hned vrátí přihlášeným. Kdyby se spustil jen revoke, přestala
-- by hra fungovat i přihlášeným.
--
-- KDE SPUSTIT: Supabase → SQL Editor → New query → vložit → Run.

-- Jen pro přihlášené.
revoke execute on function muj_profil()               from public, anon;
revoke execute on function nacti_postup()             from public, anon;
revoke execute on function uloz_postup(jsonb)         from public, anon;
revoke execute on function registruj(text)            from public, anon;
revoke execute on function zapis_skore(date, int)     from public, anon;

grant execute on function muj_profil()                to authenticated;
grant execute on function nacti_postup()              to authenticated;
grant execute on function uloz_postup(jsonb)          to authenticated;
grant execute on function registruj(text)             to authenticated;
grant execute on function zapis_skore(date, int)      to authenticated;

-- Žebříček zůstává čitelný i bez přihlášení — to je záměr, aby si hru mohl
-- někdo prohlédnout dřív, než si zakládá účet.
grant execute on function top_dne(date, int)          to anon, authenticated;
grant execute on function skore_kamaradu(date, text[]) to anon, authenticated;

-- Kontrola. Sloupec "anon_muze" má být false u prvních pěti funkcí
-- a true u top_dne a skore_kamaradu.
select p.proname as funkce,
       has_function_privilege('anon', p.oid, 'execute')          as anon_muze,
       has_function_privilege('authenticated', p.oid, 'execute') as prihlaseny_muze
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('muj_profil','nacti_postup','uloz_postup','registruj',
                    'zapis_skore','top_dne','skore_kamaradu')
order by anon_muze, p.proname;
