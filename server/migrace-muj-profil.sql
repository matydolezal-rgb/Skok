-- Migrace z 26. 8. 2026 — přezdívka se zadává jen napoprvé.
--
-- PROČ: po přihlášení se hra ptala na přezdívku pokaždé, protože ji hledala
-- jen v paměti telefonu (`skok.jmeno`), a ta se schválně nezálohuje. Po
-- přeinstalaci appky tam nic nebylo, takže se ptala znovu — a hráč si tím
-- mohl přezdívku při každém přihlášení přepsat, což mátlo ostatní
-- v žebříčku. Zdroj pravdy je účet na serveru, jen se ho hra neuměla zeptat.
--
-- BEZPEČNÉ SPUSTIT NA BĚŽÍCÍ DATABÁZI: jen přidává jednu čtecí funkci,
-- nemaže ani nemění žádná data. (Na rozdíl od celého schema.sql, který
-- začíná `drop table` a smazal by účty — ten se spouští jen při zakládání.)
--
-- KDE SPUSTIT: Supabase → SQL Editor → New query → vložit → Run.

create or replace function muj_profil()
returns table (jmeno text, kod text)
language sql
security definer
set search_path = public
as $$
  select h.jmeno, h.kod from hraci h where h.id = auth.uid();
$$;

grant execute on function muj_profil() to authenticated;

-- Kontrola, že se to povedlo — má vrátit jeden řádek s "muj_profil".
select routine_name
from information_schema.routines
where routine_schema = 'public' and routine_name = 'muj_profil';
