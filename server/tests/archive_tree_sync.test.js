import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { prepareArchiveRestore, applyArchiveRestore } from '../utils/archive_tree_sync.js';

function fixture(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'rafeeq-restore-'));
  const image = path.join(directory, 'fixture.jpg');
  fs.writeFileSync(image, 'image fixture');
  const db = new Database(':memory:');
  db.pragma('foreign_keys=ON');
  db.exec(`CREATE TABLE folders (id INTEGER PRIMARY KEY, path TEXT UNIQUE, name TEXT, parent_path TEXT, sect TEXT, file_count INTEGER DEFAULT 0);
    CREATE TABLE documents (id INTEGER PRIMARY KEY, filename TEXT, relative_path TEXT UNIQUE, full_path TEXT,
      folder_name TEXT, folder_path TEXT, sect TEXT, book_source TEXT, file_size INTEGER, ocr_text TEXT);
    CREATE TABLE document_folders (document_id INTEGER REFERENCES documents(id), folder_id INTEGER REFERENCES folders(id),
      folder_path TEXT, UNIQUE(document_id, folder_id));
    CREATE TABLE bible_verses (text TEXT);
    INSERT INTO bible_verses VALUES ('preserved verse');
    INSERT INTO folders VALUES (7, 'generic', 'generic', '', 'test', 1);
    INSERT INTO documents VALUES (100, 'original.jpg', 'original.jpg', '/original.jpg', 'generic', 'generic', 'test', 'original source', 50, 'preserved OCR');`);
  const manifest = {
    expected_document_count: 1, expected_max_id: 100,
    folders: [
      {path:'root', name:'root', parent_path:'', sect:'test'},
      {path:'root\\topic', name:'topic', parent_path:'root', sect:'test'},
      {path:'root\\generic', name:'generic', parent_path:'root', sect:'test'}
    ],
    renames: [{old_path:'generic', path:'root\\generic'}],
    documents: [{id:101, filename:'new.jpg', relative_path:'legacy-shia/new.jpg', folder_path:'root\\topic', sect:'test'}],
    links: [{document_id:100, folder_path:'root\\topic'}, {document_id:101, folder_path:'root\\topic'}]
  };
  t.after(() => {db.close();fs.unlinkSync(image);fs.rmdirSync(directory);});
  return {db, manifest, resolve:() => image};
}

test('restore preserves IDs, OCR and Bible, retains folder links and rolls up distinct counts', t => {
  const {db, manifest, resolve} = fixture(t);
  const prepared = prepareArchiveRestore(db, manifest, resolve);
  assert.equal(applyArchiveRestore(db, manifest, prepared).inserted, 1);
  assert.equal(db.prepare('SELECT ocr_text FROM documents WHERE id=100').get().ocr_text, 'preserved OCR');
  assert.equal(db.prepare('SELECT id FROM folders WHERE path=?').get('root\\generic').id, 7);
  assert.equal(db.prepare('SELECT file_count FROM folders WHERE path=?').get('root').file_count, 2);
  assert.equal(db.prepare('SELECT file_count FROM folders WHERE path=?').get('root\\topic').file_count, 2);
  assert.equal(db.prepare('SELECT text FROM bible_verses').get().text, 'preserved verse');
  assert.deepEqual(db.pragma('foreign_key_check'), []);
  assert.equal(applyArchiveRestore(db, manifest, prepareArchiveRestore(db, manifest, resolve)).inserted, 0);
});

test('missing media and invalid hierarchy leave the archive unchanged', t => {
  const {db, manifest, resolve} = fixture(t);
  assert.throws(() => prepareArchiveRestore(db, manifest, () => null), /Missing media/);
  manifest.folders[0].parent_path = 'root\\topic';
  assert.throws(() => prepareArchiveRestore(db, manifest, resolve), /Invalid folder hierarchy/);
  assert.equal(db.prepare('SELECT COUNT(*) AS c FROM documents').get().c, 1);
});

test('live ID collisions and concurrent additions are rejected before writing', t => {
  const {db, manifest, resolve} = fixture(t);
  manifest.documents[0].id = 100;
  assert.throws(() => prepareArchiveRestore(db, manifest, resolve), /Document ID conflict/);
  manifest.documents[0].id = 101;
  const prepared = prepareArchiveRestore(db, manifest, resolve);
  db.prepare('INSERT INTO documents (id, relative_path) VALUES (200, ?)').run('concurrent.jpg');
  assert.throws(() => applyArchiveRestore(db, manifest, prepared), /changed during backup/);
  assert.equal(db.prepare('SELECT path FROM folders WHERE id=7').get().path, 'generic');
});

test('deleted imports cannot attach their orphan tags to a recovered image', t => {
  const {db, manifest, resolve} = fixture(t);
  db.exec("CREATE TABLE document_tags (document_id INTEGER, tag TEXT); INSERT INTO document_tags VALUES (101, 'old tag')");
  assert.throws(() => prepareArchiveRestore(db, manifest, resolve), /reuse old archive references/);
  manifest.documents[0].id = 102;
  manifest.links[1].document_id = 102;
  applyArchiveRestore(db, manifest, prepareArchiveRestore(db, manifest, resolve));
  assert.equal(db.prepare('SELECT COUNT(*) AS c FROM documents WHERE id=101').get().c, 0);
  assert.equal(db.prepare('SELECT document_id FROM document_tags').get().document_id, 101);
});
