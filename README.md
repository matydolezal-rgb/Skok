# Skok

Mobilní arkáda na jeden prst. Šplháš roklinou vzhůru, zespodu stoupá voda, shora padají kameny.
Klepnutí = odraz na protější stěnu. Skóre jsou metry.

Hraje se **plně offline**. Každý den má stejnou roklinu pro všechny hráče (denní seed),
takže výsledky jdou později férově porovnávat.

## Spuštění

Žádný build, žádné závislosti. Stačí otevřít `index.html` v prohlížeči,
nebo hru navštívit přes GitHub Pages a na mobilu si ji přidat na plochu.

## Struktura

| Soubor | K čemu je |
|---|---|
| `js/world.js` | tvar rokliny — stěny, šířka průrvy, trnová pásma |
| `js/game.js` | fyzika a stav hry, žádné kreslení |
| `js/render.js` | veškeré kreslení, nemění stav |
| `js/main.js` | herní smyčka, ovládání, přepínání obrazovek |
| `js/rng.js` | seedovaná náhoda — stejný den = stejná roklina |
| `sw.js` | offline režim (při změně hry zvyš `VERZE`) |

## Testování

V počítači není Node ani Python, testuje se bezhlavým Chromem přes stránky ve složce `dev/`:

```
chrome --headless --allow-file-access-from-files --dump-dom dev/sim.html
```

| Stránka | Co dělá |
|---|---|
| `dev/sim.html` | odehraje stovky běhů čtyřmi styly hraní, hlídá chyby a měří vyváženost |
| `dev/trace.html` | jeden běh po vteřinách — kde hráč ztrácí výšku |
| `dev/jumps.html` | zisk každého jednotlivého skoku |
| `dev/uitest.html` | proklik obrazovek a tlačítek |
| `dev/frame.html` | vykreslí ukázkové snímky (`--screenshot`) |
| `dev/icon.html` | vygeneruje ikonu aplikace |

Pomocní roboti v `sim.html` musí brát čísla z `P` a `World`, ne mít vlastní kopie —
jinak předpovídají jinou hru, než která se hraje.
