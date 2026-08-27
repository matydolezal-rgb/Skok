-- Migrace z 28. 8. 2026 — dárek za umístění v denním žebříčku.
--
-- CO TO DĚLÁ: kdo skončí v první trojce za daný den, může si další den
-- vyzvednout krystaly. 1. místo 50, 2. místo 30, 3. místo 20.
--
-- PROČ NA SERVERU A NE V APPCE: kdyby o umístění i o vyzvednutí rozhodoval
-- telefon, stačilo by smazat data appky a brát dárek pořád dokola — a šlo by
-- si i "vyrobit" první místo. Server si pořadí spočítá sám ze zapsaných
-- výsledků a vyzvednutí zapíše, takže druhý pokus už nic nedá.
--
-- MINIMÁLNĚ 5 HRÁČŮ ZA DEN: dokud hraje pár lidí, byl by v top 3 skoro
-- každý a odměna by ztratila smysl. Když ten den hrálo míň lidí, nedává se.
--
-- BEZPEČNÉ SPUSTIT NA BĚŽÍCÍ DATABÁZI: přidává jednu tabulku a dvě funkce,
-- nemaže ani nemění žádná stávající data.
--
-- KDE SPUSTIT: Supabase → SQL Editor → New query → vložit celé → Run.

-- ---------- tabulka vyzvednutých odměn ----------
-- Jeden řádek na hráče a den. Primární klíč zároveň zaručuje, že tentýž den
-- nejde vyzvednout dvakrát, i kdyby appka poslala požadavek dvakrát rychle
-- za sebou.
create table if not exists odmeny (
  hrac      uuid not null references hraci(id) on delete cascade,
  den       date not null,
  poradi    integer not null,
  krystalu  integer not null,
  vyzvednuto timestamptz not null default now(),
  primary key (hrac, den)
);

alter table odmeny enable row level security;

-- ---------- společný výpočet ----------
-- Vrátí pořadí hráče v daném dni a kolik mu za to náleží, nebo nic.
-- Používají to obě funkce níž, ať se pravidla nemůžou rozejít.
create or replace function odmena_vypocet(p_uid uuid, p_den date)
returns table (poradi integer, krystalu integer)
language sql
security definer
set search_path = public
as $$
  with poradi_dne as (
    select hrac,
           rank() over (order by metry desc, zapsano asc) as m
    from skore
    where den = p_den
  ),
  pocet as (select count(*) as n from skore where den = p_den)
  select p.m::integer,
         (case p.m when 1 then 50 when 2 then 30 when 3 then 20 end)::integer
  from poradi_dne p, pocet
  where p.hrac = p_uid
    and p.m <= 3
    and pocet.n >= 5;      -- pod pět hráčů se odměna nedává
$$;

-- ---------- co na mě čeká ----------
-- Najde nejnovější den (dnešek se nepočítá, ten ještě běží), kde jsem byl
-- v top 3 a ještě jsem si dárek nevzal. Kouká sedm dní zpátky, aby o odměnu
-- nepřišel někdo, kdo se pár dní nedostal ke hraní.
-- NIC NEZAPISUJE — appka se tím jen ptá, jestli má ukázat dárek.
create or replace function cekajici_odmena()
returns table (den date, poradi integer, krystalu integer)
language sql
security definer
set search_path = public
as $$
  select d.den, v.poradi, v.krystalu
  from (
    select distinct s.den
    from skore s
    where s.hrac = auth.uid()
      and s.den < current_date
      and s.den >= current_date - 7
  ) d
  cross join lateral odmena_vypocet(auth.uid(), d.den) v
  where not exists (
    select 1 from odmeny o where o.hrac = auth.uid() and o.den = d.den
  )
  order by d.den desc
  limit 1;
$$;

-- ---------- vyzvednutí ----------
-- Zapíše vyzvednutí a vrátí počet krystalů. Druhé volání pro tentýž den
-- vrátí 0, protože insert neprojde přes primární klíč.
create or replace function vyzvedni_odmenu(p_den date)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_poradi integer;
  v_krystalu integer;
  v_zapsano integer;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if p_den is null or p_den >= current_date or p_den < current_date - 7 then
    return 0;
  end if;

  select poradi, krystalu into v_poradi, v_krystalu
  from odmena_vypocet(v_uid, p_den);

  if v_krystalu is null then return 0; end if;   -- nebyl v top 3, nebo málo hráčů

  insert into odmeny (hrac, den, poradi, krystalu)
  values (v_uid, p_den, v_poradi, v_krystalu)
  on conflict (hrac, den) do nothing;

  get diagnostics v_zapsano = row_count;
  if v_zapsano = 0 then return 0; end if;        -- už bylo vyzvednuto dřív

  return v_krystalu;
end;
$$;

-- ---------- práva ----------
-- Nejdřív odebrat výchozí právo pro všechny (PostgreSQL ho dává automaticky),
-- teprve pak přidat přihlášeným. Bez revoke by na funkce dosáhl i nepřihlášený.
-- Pozor: Supabase dává novým funkcím ve schématu public právo přímo rolím
-- anon a authenticated, ne jen obecné roli PUBLIC. U vnitřního pomocníka
-- se proto musí odebrat i authenticated, jinak na něj přihlášení dosáhnou.
-- Volání zevnitř druhých dvou funkcí projde dál — jsou security definer.
revoke execute on function odmena_vypocet(uuid, date) from public, anon, authenticated;
revoke execute on function cekajici_odmena()          from public, anon;
revoke execute on function vyzvedni_odmenu(date)      from public, anon;

grant execute on function cekajici_odmena()           to authenticated;
grant execute on function vyzvedni_odmenu(date)       to authenticated;
-- odmena_vypocet je jen vnitřní pomocník, appka ho nevolá — nikomu se nedává.

-- ---------- kontrola ----------
-- Má vrátit tři řádky: cekajici_odmena a vyzvedni_odmenu s anon_muze = false
-- a prihlaseny_muze = true, odmena_vypocet obojí false.
select p.proname as funkce,
       has_function_privilege('anon', p.oid, 'execute')          as anon_muze,
       has_function_privilege('authenticated', p.oid, 'execute') as prihlaseny_muze
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('cekajici_odmena','vyzvedni_odmenu','odmena_vypocet')
order by p.proname;
