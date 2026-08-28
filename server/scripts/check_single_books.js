import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';

const epubPath = path.join(process.cwd(), 'scratch', 'bi12_A.epub');
const zip = new AdmZip(epubPath);

const bookNav = zip.getEntry('OEBPS/biblebooknav.xhtml').getData().toString('utf8');
console.log('Single chapter links in booknav:');
const singleMatches = bookNav.matchAll(/<a href="([^"]+)">([^<]+)<\/a>/g);
for (const m of singleMatches) {
  if (!m[1].includes('biblechapternav')) {
    console.log(m[2], '->', m[1]);
  }
}
