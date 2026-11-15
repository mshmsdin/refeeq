import test from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import express from 'express';
import { createBibleWalletRouter } from '../routes/bible_wallet.js';

const HOUR = 3600000;
async function fixture(t) {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  db.exec(`
    CREATE TABLE bible_books (code TEXT PRIMARY KEY, name_ar TEXT, collection_id INTEGER);
    CREATE TABLE bible_collections (id INTEGER PRIMARY KEY, site_scope TEXT);
    CREATE TABLE bible_translations (id INTEGER PRIMARY KEY, slug TEXT, is_active INTEGER, site_scope TEXT);
    CREATE TABLE bible_verses (id INTEGER PRIMARY KEY, translation_id INTEGER, book_code TEXT, chapter INTEGER, verse INTEGER, text TEXT);
    INSERT INTO bible_collections VALUES (1, 'both'), (2, 'bible');
    INSERT INTO bible_books VALUES ('MAT', 'متى', 1), ('EXTRA', 'نص مستقل', 2);
    INSERT INTO bible_translations VALUES (1, 'ar-svd', 1, 'both'), (2, 'ar-nav', 1, 'both'), (3, 'en-private', 1, 'bible');
    INSERT INTO bible_verses VALUES (1,1,'MAT',5,3,'طوبى للمساكين بالروح'), (2,2,'MAT',5,3,'هنيئاً للمساكين في الروح'), (3,3,'EXTRA',1,1,'نص مستقل');
  `);
  let time = 1000000000000;
  const app = express();
  app.use(express.json());
  app.use('/api/bible/wallets', createBibleWalletRouter(db, { now: () => time, scope: 'rafeeq' }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(async () => { await new Promise(resolve => server.close(resolve)); db.close(); });
  const base = `http://127.0.0.1:${server.address().port}/api/bible/wallets`;
  const request = async (path = '', method = 'GET', body) => {
    const res = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    return { status: res.status, body: await res.json(), headers: res.headers };
  };
  const snapshot = { book: 'MAT', chapter: 5, verse: 3, translations: ['ar-nav', 'ar-svd'] };
  const create = async () => (await request('', 'POST', { snapshot, label: 'شاهد' })).body;
  return { db, request, snapshot, create, advance: ms => { time += ms; }, now: () => time };
}

test('creates two independent 14-character capabilities, saves actual excerpt and ordered comparison', async t => {
  const f = await fixture(t);
  const w = await f.create();
  assert.match(w.editToken, /^[A-Za-z0-9]{14}$/);
  assert.match(w.viewToken, /^[A-Za-z0-9]{14}$/);
  assert.notEqual(w.editToken, w.viewToken);
  assert.equal(w.expiresAt, f.now() + 48 * HOUR);
  assert.deepEqual(w.items[0].snapshot, f.snapshot);
  assert.equal(w.items[0].excerpt, 'هنيئاً للمساكين في الروح');
  assert.equal(w.items[0].bookName, 'متى');
  const viewer = await f.request('/' + w.viewToken);
  assert.equal(viewer.body.isEditor, false);
  assert.equal(viewer.body.editToken, undefined);
  assert.equal(viewer.body.viewToken, undefined);
  assert.equal(viewer.body.items[0].label, 'متى 5:3');
  assert.equal(JSON.stringify(viewer.body).includes('شاهد'), false);
  assert.equal(viewer.headers.get('cache-control'), 'no-store');
  assert.ok(!JSON.stringify(viewer.body).includes(w.editToken));
});

test('viewer cannot add, rename, reorder, delete, extend, rotate or delete wallet', async t => {
  const f = await fixture(t); const w = await f.create(); const id = w.items[0].id;
  for (const [path, method, body] of [
    ['/items','POST',{ snapshot: f.snapshot }], [`/items/${id}`,'PATCH',{label:'تغيير',position:1}],
    [`/items/${id}`,'DELETE'], ['/extend','POST'], ['/rotate','POST'], ['', 'DELETE']
  ]) assert.equal((await f.request('/' + w.viewToken + path, method, body)).status, 403);
  assert.equal((await f.request('/' + w.editToken)).body.items[0].label, 'شاهد');
});

test('extension warns above 24h, sets 24h below, and is unchanged at exactly 24h', async t => {
  const f = await fixture(t); const w = await f.create();
  let r = await f.request('/' + w.editToken + '/extend', 'POST');
  assert.equal(r.body.extended, false); assert.equal(r.body.expiresAt, w.expiresAt);
  f.advance(24 * HOUR);
  r = await f.request('/' + w.editToken + '/extend', 'POST');
  assert.equal(r.body.extended, false); assert.equal(r.body.expiresAt, w.expiresAt);
  f.advance(1);
  r = await f.request('/' + w.editToken + '/extend', 'POST');
  assert.equal(r.body.extended, true); assert.equal(r.body.expiresAt, f.now() + 24 * HOUR);
});

test('expired wallets reject reads and extension at exact expiry, and remove their entries', async t => {
  const f = await fixture(t); const w = await f.create(); f.advance(48 * HOUR);
  assert.equal((await f.request('/' + w.editToken + '/extend', 'POST')).status, 410);
  assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM bible_wallet_items').get().n, 0);
  assert.ok([404,410].includes((await f.request('/' + w.viewToken)).status));
  assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM bible_wallet_items').get().n, 0);
});

test('router reconnects after the application replaces its database connection', async t => {
  let db = new Database(':memory:');db.pragma('foreign_keys=ON');
  const app=express();app.use('/wallets',createBibleWalletRouter(()=>db));
  const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
  t.after(async()=>{await new Promise(resolve=>server.close(resolve));db.close();});
  const url=`http://127.0.0.1:${server.address().port}/wallets/Ab12Cd34Ef56Gh`;
  assert.equal((await fetch(url)).status,404);
  db.close();db=new Database(':memory:');db.pragma('foreign_keys=ON');
  assert.equal((await fetch(url)).status,404);
});

test('rotation invalidates both previous links while retaining entries; deletion invalidates new links', async t => {
  const f = await fixture(t); const w = await f.create();
  const rotated = (await f.request('/' + w.editToken + '/rotate', 'POST')).body;
  assert.notEqual(rotated.editToken, w.editToken); assert.notEqual(rotated.viewToken, w.viewToken);
  assert.equal(rotated.items.length, 1); assert.equal(rotated.expiresAt, w.expiresAt);
  for (const token of [w.editToken,w.viewToken]) assert.equal((await f.request('/' + token)).status, 404);
  assert.equal((await f.request('/' + rotated.viewToken)).body.items.length, 1);
  assert.equal((await f.request('/' + rotated.editToken, 'DELETE')).status, 200);
  for (const token of [rotated.editToken,rotated.viewToken]) assert.equal((await f.request('/' + token)).status, 404);
});

test('moves in both directions, edits labels, deletes and renumbers without losing snapshots', async t => {
  const f = await fixture(t); const w = await f.create(); const path = '/' + w.editToken;
  await f.request(path + '/items', 'POST', {snapshot: {...f.snapshot,verse:null},label:'ثانٍ'});
  let r = (await f.request(path + '/items', 'POST', {snapshot: {...f.snapshot,chapter:null,verse:null},label:'ثالث'})).body;
  const third = r.items[2].id;
  r = (await f.request(path + '/items/' + third, 'PATCH', {position:1,label:'الأول الآن'})).body;
  assert.deepEqual(r.items.map(x=>x.label), ['الأول الآن','شاهد','ثانٍ']);
  r = (await f.request(path + '/items/' + third, 'PATCH', {position:3})).body;
  assert.deepEqual(r.items.map(x=>x.label), ['شاهد','ثانٍ','الأول الآن']);
  assert.equal((await f.request(path+'/items/'+third,'PATCH',{position:0})).status,400);
  r = (await f.request(path + '/items/' + w.items[0].id, 'DELETE')).body;
  assert.deepEqual(r.items.map(x=>x.position),[1,2]);
  assert.deepEqual(r.items[1].snapshot.translations, f.snapshot.translations);
});

test('rejects nonexistent, malformed, unavailable and out-of-scope snapshots before creating wallets', async t => {
  const f = await fixture(t);
  for (const snapshot of [null,{}, {...f.snapshot,chapter:-1}, {...f.snapshot,verse:999},
    {...f.snapshot,book:'NOPE'}, {...f.snapshot,translations:['missing']},
    {...f.snapshot,chapter:null}, {book:'EXTRA',chapter:1,verse:1,translations:['en-private']}]) {
    assert.equal((await f.request('', 'POST', {snapshot})).status, 400);
  }
  assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM bible_wallets').get().n,0);
});
