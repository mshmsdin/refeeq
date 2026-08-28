import https from 'https';

function fetchText(url) {
  return new Promise(res => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, r => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => res(d));
    }).on('error', e => {
      console.log('Fetch error:', e.message);
      res('');
    });
  });
}

async function main() {
  console.log('1. Checking JW Media API for Arabic NWT...');
  const pubApiUrl = 'https://b.jw-cdn.org/apis/pub-media/GETPUBMEDIALINKS?pub=bi12&output=json&fileformat=EPUB%2CPDF%2CJWPUB&alllangs=0&langwritten=A';
  const pubApi = await fetchText(pubApiUrl);
  try {
    const json = JSON.parse(pubApi);
    console.log('JW Media files found for Arabic:');
    if (json.files?.A?.EPUB) {
      console.log('EPUB:', json.files.A.EPUB.map(f => ({ title: f.title, fileUrl: f.file?.url })));
    }
    if (json.files?.A?.JWPUB) {
      console.log('JWPUB:', json.files.A.JWPUB.map(f => ({ title: f.title, fileUrl: f.file?.url })));
    }
  } catch (e) {
    console.log('Pub API raw:', pubApi.slice(0, 300));
  }

  console.log('\n2. Checking Online Bible API for Jesuit...');
  const catholicApi = await fetchText('https://raw.githubusercontent.com/ancient-creeds/arabic-bible/master/jesuit.json');
  console.log('Catholic test raw length:', catholicApi.length);
}

main();
