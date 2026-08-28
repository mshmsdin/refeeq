import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';

const epubPath = path.join(process.cwd(), 'scratch', 'bi12_A.epub');
const zip = new AdmZip(epubPath);

const bookNav = zip.getEntry('OEBPS/biblebooknav.xhtml');
if (bookNav) {
  console.log('Book nav content:');
  console.log(bookNav.getData().toString('utf8').slice(0, 1500));
}

// Find Genesis 1 file or Matthew 1 file
const ch1File = zip.getEntry('OEBPS/1001060402.xhtml');
if (ch1File) {
  console.log('\n--- Chapter file preview ---');
  console.log(ch1File.getData().toString('utf8').slice(0, 2000));
}
