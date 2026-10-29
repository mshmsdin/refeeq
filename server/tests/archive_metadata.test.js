import test from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import {repairArchiveMetadata, auditArchiveMetadata} from '../utils/archive_metadata.js';

test('repairs missing ancestors in every section without changing content or manual settings', t => {
 const db=new Database(':memory:');t.after(()=>db.close());
 db.exec(`CREATE TABLE folders(id INTEGER PRIMARY KEY,path TEXT UNIQUE,name TEXT,parent_path TEXT,sect TEXT,category TEXT,file_count INTEGER DEFAULT 0);
 CREATE TABLE documents(id INTEGER PRIMARY KEY,sect TEXT,filename TEXT,folder_name TEXT,folder_path TEXT,category TEXT,relative_path TEXT,ocr_text TEXT,images_json TEXT,book_source TEXT);
 CREATE TABLE document_folders(document_id INTEGER,folder_id INTEGER);
 CREATE TABLE favorites(id INTEGER PRIMARY KEY,document_id INTEGER,notes TEXT);
 CREATE TABLE document_tags(id INTEGER PRIMARY KEY,document_id INTEGER,tag TEXT);
 CREATE TABLE bible_verses(text TEXT);
 INSERT INTO favorites VALUES(1,1,'saved note');
 INSERT INTO document_tags VALUES(1,1,'saved tag');
 INSERT INTO bible_verses VALUES('preserved verse');
 INSERT INTO folders VALUES(1,'الدفاع — أدلة\\موضوع','موضوع','الدفاع — أدلة','إلحاد','إلحاد',0);
 INSERT INTO folders VALUES(2,'مسيحية\\موضوع','موضوع','مسيحية','نصارى',NULL,0);
 INSERT INTO documents VALUES(1,'إلحاد','a','موضوع','الدفاع — أدلة\\موضوع','الدفاع — أدلة','a.jpg','preserved',NULL,'source');
 INSERT INTO documents VALUES(2,'نصارى','b','موضوع','مسيحية\\موضوع','موضوع','b.jpg','original',NULL,'source');
 INSERT INTO documents VALUES(3,'شيعة','c','فقه','فقه','attack','c.jpg','original',NULL,'source');
 INSERT INTO documents VALUES(4,'إلحاد','d','موضوع','الدفاع — أدلة\\موضوع',NULL,'d.jpg','manual unset',NULL,'source');
 INSERT INTO document_folders VALUES(1,1);`);
 const before=auditArchiveMetadata(db);
 const result=repairArchiveMetadata(db);
 const after=auditArchiveMetadata(db);
 assert.equal(result.created_parents,3);
 assert.equal(after.content_fingerprint,before.content_fingerprint);
 assert.equal(after.settings_fingerprint,before.settings_fingerprint);
 assert.equal(db.prepare('SELECT text FROM bible_verses').get().text,'preserved verse');
 assert.equal(after.documents,4);assert.equal(after.orphan_parents.length,0);
 assert.equal(after.missing_primary_folders,0);assert.equal(after.invalid_document_categories,0);
 assert.deepEqual(db.prepare('SELECT category FROM documents ORDER BY id').all().map(x=>x.category),['defense',null,'attack',null]);
 assert.equal(db.prepare('SELECT file_count FROM folders WHERE path=?').get('الدفاع — أدلة').file_count,2);
 assert.equal(repairArchiveMetadata(db).created_parents,0);
 assert.equal(repairArchiveMetadata(db).normalized_documents,0);
});

test('conflicting sections roll back the entire repair', t => {
 const db=new Database(':memory:');t.after(()=>db.close());
 db.exec(`CREATE TABLE folders(id INTEGER PRIMARY KEY,path TEXT UNIQUE,name TEXT,parent_path TEXT,sect TEXT,category TEXT);
 CREATE TABLE documents(folder_path TEXT,folder_name TEXT,sect TEXT);
 INSERT INTO folders VALUES(1,'root','root','','one',NULL);
 INSERT INTO documents VALUES('root','root','two');`);
 assert.throws(()=>repairArchiveMetadata(db),/different section/);
 assert.equal(db.prepare('SELECT COUNT(*) AS c FROM folders').get().c,1);
});
