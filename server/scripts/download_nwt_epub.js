import fs from 'fs';
import path from 'path';
import https from 'https';

const url = 'https://cfp2.jw-cdn.org/a/dc939f/1/o/bi12_A.epub';
const outPath = path.join(process.cwd(), 'scratch', 'bi12_A.epub');

if (!fs.existsSync(path.dirname(outPath))) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
}

console.log('Downloading Arabic NWT EPUB from JW CDN...');
const file = fs.createWriteStream(outPath);

https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
  console.log('Status code:', res.statusCode);
  res.pipe(file);
  file.on('finish', () => {
    file.close();
    const stats = fs.statSync(outPath);
    console.log(`Download finished! File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
  });
}).on('error', err => {
  console.error('Download error:', err.message);
});
