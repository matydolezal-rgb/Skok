-- Databáze pro žebříček hry Skok (Supabase / PostgreSQL).
-- Spustit jednou v Supabase → SQL Editor → New query → Run.
--
-- Zásada: hra se k tabulkám nedostane přímo. Všechno jde přes čtyři funkce
-- níže, takže z prohlížeče nejde nic smazat ani přepsat cizí výsledek.

-- ---------- tabulky ----------

create table if not exists hraci (
  id        uuid primary key,                    -- náhodné id zařízení, žádný účet
  jmeno     text not null,
  kod       text not null unique,                -- kód pro kamarády, např. K7XM2P
  vytvoreno timestamptz not null default now()
);

create table if not exists skore (
  den       date not null,
  hrac      uuid not null references hraci(id) on delete cascade,
  metry     integer not null check (metry >= 0 and metry <= 5000),
  zapsano   timestamptz not null default now(),
  primary key (den, hrac)                        -- jeden řádek na hráče a den
);

create index if not exists skore_den_metry on skore (den, metry desc);

-- Nikdo zvenčí nesmí do tabulek přímo. Zapnutá ochrana bez jediného
-- povolujícího pravidla znamená: přes REST API se k datům nedostaneš.
alter table hraci enable row level security;
alter table skore enable row level security;

-- ---------- funkce, které hra volá ----------

-- Registrace zařízení. Vrátí kód pro kamarády. Volá se jednou.
create or replace function registruj(p_hrac uuid, p_jmeno text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_kod   text;
  v_jmeno text;
  i       integer := 0;
begin
  v_jmeno := nullif(btrim(p_jmeno), '');
  if v_jmeno is null then v_jmeno := 'Lezec'; end if;
  v_jmeno := left(v_jmeno, 16);

  select kod into v_kod from hraci where id = p_hrac;
  if v_kod is not null then
    update hraci set jmeno = v_jmeno where id = p_hrac;
    return v_kod;
  end if;

  -- kód bez znaků, které jdou splést (0/O, 1/I)
  loop
    i := i + 1;
    v_kod := (
      select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
                               1 + floor(random() * 32)::int, 1), '')
      from generate_series(1, 6)
    );
    begin
      insert into hraci (id, jmeno, kod) values (p_hrac, v_jmeno, v_kod);
      return v_kod;
    exception when unique_violation then
      if i > 20 then raise exception 'nepodarilo se vygenerovat kod'; end if;
    end;
  end loop;
end;
$$;

-- Zápis výsledku. Uloží se jen tehdy, když je lepší než dnešní maximum.
create or replace function zapis_skore(p_hrac uuid, p_den date, p_metry integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_metry integer;
begin
  if p_metry is null or p_metry < 0 or p_metry > 5000 then
    raise exception 'neplatny vysledek';
  end if;
  -- výsledky jdou zapsat jen pro dnešek nebo včerejšek (kvůli časovým pásmům)
  if p_den < current_date - 1 or p_den > current_date + 1 then
    raise exception 'neplatne datum';
  end if;
  if not exists (select 1 from hraci where id = p_hrac) then
    raise exception 'neznamy hrac';
  end if;

  insert into skore (den, hrac, metry) values (p_den, p_hrac, p_metry)
  on conflict (den, hrac) do update
    set metry = greatest(skore.metry, excluded.metry),
        zapsano = now()
  returning metry into v_metry;

  return v_metry;
end;
$$;

-- Nejlepší dnešní výsledky ze všech hráčů.
create or replace function top_dne(p_den date, p_limit integer default 50)
returns table (jmeno text, kod text, metry integer)
language sql
security definer
set search_path = public
as $$
  select h.jmeno, h.kod, s.metry
  from skore s
  join hraci h on h.id = s.hrac
  where s.den = p_den
  order by s.metry desc, s.zapsano asc
  limit least(coalesce(p_limit, 50), 200);
$$;

-- Dnešní výsledky vybraných kamarádů (podle jejich kódů).
create or replace function skore_kamaradu(p_den date, p_kody text[])
returns table (jmeno text, kod text, metry integer)
language sql
security definer
set search_path = public
as $$
  select h.jmeno, h.kod, coalesce(s.metry, -1)
  from hraci h
  left join skore s on s.hrac = h.id and s.den = p_den
  where h.kod = any (select upper(btrim(k)) from unnest(p_kody) as k)
  order by coalesce(s.metry, -1) desc, h.jmeno asc
  limit 100;
$$;

-- Hra je anonymní návštěvník — smí volat jen tyhle čtyři funkce.
grant execute on function registruj(uuid, text)        to anon;
grant execute on function zapis_skore(uuid, date, int) to anon;
grant execute on function top_dne(date, int)           to anon;
grant execute on function skore_kamaradu(date, text[]) to anon;
