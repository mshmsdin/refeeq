import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseChapterFile } from './svd_chapter_parser.js';

const dir = path.dirname(fileURLToPath(import.meta.url));

test('فان دايك: رقم الفصل في الملف لا يُحسب رقم العدد الأول', () => {
  const content = ['﻿اَلتَّثْنِيَة.', '18.', 'عدد أول من الفصل.', 'عدد ثان من الفصل.', 'عدد ثالث من الفصل.'].join('\n');
  const rows = parseChapterFile(content);
  assert.deepEqual(rows.map((row) => row.verse), [1, 2, 3]);
  assert.equal(rows[0].text, 'عدد أول من الفصل.');
});

test('فان دايك: الفصل الأول يبقى مرقماً من 1 كما كان', () => {
  const rows = parseChapterFile('اَلتَّكْوِينُ.\n1.\nفي البدء خلق الله.\nوكانت الأرض خربة.');
  assert.deepEqual(rows.map((row) => row.verse), [1, 2]);
});

test('فان دايك: سطر بلا حروف عربية أو أقصر من ثلاثة أحرف لا يصير عدداً', () => {
  const rows = parseChapterFile('عنوان.\n5.\nنص عربي صالح هنا.\nab\n--\nنص عربي ثان صالح.');
  assert.deepEqual(rows.map((row) => row.verse), [1, 2]);
});

// ملف المصدر الحقيقي موجود في ذاكرة التخزين المؤقت للمستورد على الأجهزة التي نزّلته فقط.
const cached = path.join(dir, '..', 'cache', 'arb-vd', 'arb-vd_006_DEU_18_read.txt');
test('فان دايك: تثنية 18 من المصدر الحقيقي: العدد 18 هو «أقيم لهم نبياً»', { skip: !fs.existsSync(cached) }, () => {
  const rows = parseChapterFile(fs.readFileSync(cached, 'utf8'));
  const norm = (s) => s.replace(/[ً-ْٰ«»]/g, '').replace(/ٱ/g, 'ا');
  assert.equal(rows.length, 22);
  assert.match(norm(rows.find((row) => row.verse === 15).text), /^يقيم لك الرب إلهك نبيا من وسطك/);
  assert.match(norm(rows.find((row) => row.verse === 18).text), /^أقيم لهم نبيا من وسط إخوتهم مثلك/);
});
