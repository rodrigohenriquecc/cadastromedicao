const fs = require('fs');

const metaPath = 'public/data/meta.csv';
let meta = fs.readFileSync(metaPath, 'utf8');
const metaLines = meta.split(/\r?\n/);
for (let i = 1; i < metaLines.length; i++) {
  let line = metaLines[i];
  if (line.startsWith('"') && line.endsWith('"')) {
    line = line.substring(1, line.length - 1);
    line = line.replace(/""/g, '"');
    metaLines[i] = line;
  }
}
fs.writeFileSync(metaPath, metaLines.join('\n'));
console.log('meta.csv fixed');

const biPath = 'public/data/planilha_bi.csv';
let bi = fs.readFileSync(biPath, 'utf8');
const biLines = bi.split(/\r?\n/);
for (let i = 1; i < biLines.length; i++) {
  if (!biLines[i].trim()) continue;
  let parts = biLines[i].split(';');
  if (parts.length >= 4) {
    let lat = parts[2].replace(/\./g, '');
    if (lat.startsWith('-') && lat.length > 3) lat = lat.slice(0, 3) + '.' + lat.slice(3);
    let lon = parts[3].replace(/\./g, '');
    if (lon.startsWith('-') && lon.length > 3) lon = lon.slice(0, 3) + '.' + lon.slice(3);
    parts[2] = lat;
    parts[3] = lon;
    biLines[i] = parts.join(';');
  }
}
fs.writeFileSync(biPath, biLines.join('\n'));
console.log('planilha_bi.csv fixed');
