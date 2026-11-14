// أدوات الكتب الممسوحة: قراءة نص أرشيف الإنترنت (DjVu XML) بإحداثيات الكلمات، وضغطها، والبحث فيها.
// الصور تبقى على أرشيف الإنترنت؛ عندنا النص وإحداثيات الكلمات فقط.
import { gzipSync, gunzipSync } from 'node:zlib';

const XML_ENTITIES = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'" };

function decodeXml(value) {
  return value.replace(/&(?:amp|lt|gt|quot|apos);/g, (m) => XML_ENTITIES[m]);
}

// توحيد الكلمة للبحث: حذف التشكيل، وتوحيد الألف والتاء المربوطة والياء، وإزالة غير الحروف.
export function normalizeScanWord(text) {
  return String(text || '')
    .replace(/[ً-ٰٟـ]/g, '')
    .replace(/[إأآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[^ء-ي0-9٠-٩a-zA-Z]/g, '');
}

export function tokenizeScanQuery(query) {
  return String(query || '')
    .split(/\s+/)
    .map(normalizeScanWord)
    .filter(Boolean);
}

// يحوّل ملف DjVu XML إلى صفحات: [{ leaf, width, height, words: [[نص, x, y, w, h]] }]
// الإحداثيات تُخزَّن بالعشرة آلاف من مقاس الصفحة فلا تتأثر بدقة الصورة.
export function parseDjvuXml(xml) {
  const pages = [];
  const chunks = String(xml).split('<OBJECT ').slice(1);
  chunks.forEach((chunk, leaf) => {
    const width = Number(/width="(\d+)"/.exec(chunk)?.[1]);
    const height = Number(/height="(\d+)"/.exec(chunk)?.[1]);
    if (!width || !height) throw new Error(`صفحة ${leaf} بلا مقاس في ملف DjVu XML`);
    const words = [];
    const wordRe = /<WORD coords="(\d+),(\d+),(\d+),(\d+)"[^>]*>([^<]*)<\/WORD>/g;
    let match;
    while ((match = wordRe.exec(chunk))) {
      const [x1, y1, x2, y2] = match.slice(1, 5).map(Number);
      const text = decodeXml(match[5]).trim();
      if (!text) continue;
      const left = Math.min(x1, x2);
      const right = Math.max(x1, x2);
      const top = Math.min(y1, y2);
      const bottom = Math.max(y1, y2);
      words.push([
        text,
        Math.round((left / width) * 10000),
        Math.round((top / height) * 10000),
        Math.round(((right - left) / width) * 10000),
        Math.round(((bottom - top) / height) * 10000)
      ]);
    }
    pages.push({ leaf, width, height, words });
  });
  return pages;
}

export function encodeWords(words) {
  return gzipSync(Buffer.from(JSON.stringify(words), 'utf8'), { level: 9 });
}

export function decodeWords(blob) {
  return JSON.parse(gunzipSync(blob).toString('utf8'));
}

export function pageText(words) {
  return words.map((word) => word[0]).join(' ');
}

export function pageSearchText(words) {
  return words.map((word) => normalizeScanWord(word[0])).join(' ');
}

// فهارس الكلمات المطابقة في صفحة: عبارة متتابعة، وكل كلمة فيها تحتوي رمز البحث المقابل لها.
export function findHitIndexes(words, query) {
  const tokens = tokenizeScanQuery(query);
  if (!tokens.length) return [];
  const normalized = words.map((word) => normalizeScanWord(word[0]));
  const hits = [];
  for (let i = 0; i + tokens.length <= normalized.length; i += 1) {
    if (tokens.every((token, k) => normalized[i + k].includes(token))) {
      for (let k = 0; k < tokens.length; k += 1) hits.push(i + k);
    }
  }
  return hits;
}

// مقطع قصير حول أول مطابقة في الصفحة.
export function buildSnippet(words, hitIndexes, radius = 6) {
  if (!hitIndexes.length) return '';
  const first = hitIndexes[0];
  const from = Math.max(0, first - radius);
  const to = Math.min(words.length, first + radius + 1);
  return words.slice(from, to).map((word) => word[0]).join(' ');
}
