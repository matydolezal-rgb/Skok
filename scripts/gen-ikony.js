/* Vygeneruje ikony pro web, iOS i Android z jednoho zdroje (dev/ikony-gen.html).
   Spouští se ručně: node scripts/gen-ikony.js
   Není součástí buildu — ikony se mění zřídka a výsledky jsou v gitu.

   Kreslí headless Chrome, protože ikona je canvas, ne obrázek. Velikost se
   řídí velikostí okna, takže každá velikost je vlastní spuštění. */

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const KOREN = path.resolve(__dirname, '..');
const GENERATOR = 'file:///' + path.join(KOREN, 'dev', 'ikony-gen.html').replace(/\\/g, '/');

/* Na tomhle stroji je Chrome v "Program Files (x86)" — zkoušíme obě obvyklé
   cesty, ať skript funguje i jinde. */
const CHROME = [
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
].find((p) => fs.existsSync(p));

if (!CHROME){ console.error('Chrome nenalezen — uprav cestu v CHROME.'); process.exit(1); }

/* Co všechno se generuje.
   iOS chce jediný soubor 1024×1024, zbytek si Xcode odvodí sám.
   Android potřebuje dvě sady: starší mipmapy (celá ikona) a adaptivní
   ikonu rozdělenou na pozadí a popředí — tu si systém ořízne do tvaru,
   který si výrobce telefonu zvolí (kolečko, čtvereček, kapka).
   Web má navíc "maskable" variantu se zmenšenou kresbou, protože ta se
   na ploše ořezává stejně jako na Androidu. */
const HUSTOTY = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };

const ULOHY = [
  { rezim: 'full', velikost: 1024, cil: 'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png' },
  { rezim: 'full', velikost: 512,  cil: 'icons/icon-512.png' },
];

for (const [hustota, nasobek] of Object.entries(HUSTOTY)){
  const mip = `android/app/src/main/res/mipmap-${hustota}`;
  ULOHY.push({ rezim: 'full', velikost: Math.round(48 * nasobek),  cil: `${mip}/ic_launcher.png` });
  ULOHY.push({ rezim: 'full', velikost: Math.round(48 * nasobek),  cil: `${mip}/ic_launcher_round.png` });
  ULOHY.push({ rezim: 'fg',       velikost: Math.round(108 * nasobek), cil: `${mip}/ic_launcher_foreground.png` });
  ULOHY.push({ rezim: 'bg',       velikost: Math.round(108 * nasobek), cil: `${mip}/ic_launcher_background.png` });
}

/* POZOR, ověřeno měřením: headless Chrome se u oken menších než zhruba 96 px
   zasekne a screenshot nikdy nedokončí (48 i 72 px spolehlivě vytimeoutovaly,
   96 px a víc proběhlo do 1,2 s). Malé ikony proto kreslíme ve velkém okně
   a necháme je zmenšit měřítkem zařízení — výsledek má přesně požadované
   rozměry. Bez tohohle obchvatu skript tiše visí na první android mipmapě. */
const MIN_OKNO = 96;

let hotovo = 0;
for (const u of ULOHY){
  const cil = path.join(KOREN, u.cil);
  fs.mkdirSync(path.dirname(cil), { recursive: true });

  const male = u.velikost < MIN_OKNO;
  const okno = male ? 384 : u.velikost;
  const argy = [
    '--headless', '--disable-gpu', '--hide-scrollbars',
    '--default-background-color=00000000',      // průhledné pozadí kvůli režimu fg
    `--screenshot=${cil}`,
    `--window-size=${okno},${okno}`,
  ];
  if (male) argy.push(`--force-device-scale-factor=${u.velikost / okno}`);
  argy.push(`${GENERATOR}?m=${u.rezim}`);

  execFileSync(CHROME, argy, { stdio: 'ignore', timeout: 30000 });

  const b = fs.readFileSync(cil);
  const w = b.readUInt32BE(16), h = b.readUInt32BE(20);
  if (w !== u.velikost || h !== u.velikost){
    console.error(`CHYBA ${u.cil}: čekáno ${u.velikost}px, vzniklo ${w}x${h}`);
    process.exit(1);
  }
  console.log(`${String(u.rezim).padEnd(9)} ${String(u.velikost).padStart(4)}px  ${u.cil}`);
  hotovo++;
}

console.log(`\nHotovo: ${hotovo} souborů.`);
