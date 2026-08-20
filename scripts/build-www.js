// Kopíruje herní soubory do www/ pro Capacitor build.
// Zdroj zůstává v kořeni (GitHub Pages deploy se nemění), www/ je jen odvozený artefakt.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'www');

const ITEMS = ['index.html', 'manifest.json', 'sw.js', 'css', 'js', 'icons'];

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

for (const item of ITEMS) {
  const src = path.join(ROOT, item);
  if (fs.existsSync(src)) copyRecursive(src, path.join(OUT, item));
}

console.log('www/ hotovo');
