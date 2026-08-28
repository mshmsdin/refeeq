import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';

const epubPath = path.join(process.cwd(), 'scratch', 'bi12_A.epub');
const zip = new AdmZip(epubPath);
const zipEntries = zip.getEntries();

console.log(`Total files in EPUB: ${zipEntries.length}`);
const xhtmlFiles = zipEntries.filter(e => e.entryName.endsWith('.xhtml') || e.entryName.endsWith('.html'));
console.log(`Total HTML/XHTML files: ${xhtmlFiles.length}`);

// Sample 5 files
console.log('Sample file names:');
xhtmlFiles.slice(0, 10).forEach(f => console.log(f.entryName));

// Read one chapter file (e.g. Genesis 1 or Matthew 1)
const sample = xhtmlFiles.find(f => f.entryName.includes('chapter') || f.entryName.includes('100106') || f.entryName.includes('OEBPS'));
if (sample) {
  const content = sample.getData().toString('utf8');
  console.log('\nSample file preview (first 500 chars):');
  console.log(content.slice(0, 500));
}
