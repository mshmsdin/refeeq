import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import React from 'react';
import Renderer from 'react-test-renderer';

const require = createRequire(import.meta.url);
let source = await fs.readFile(new URL('./useBibleWallet.js', import.meta.url), 'utf8');
source = source.replace("from 'react'", `from '${pathToFileURL(require.resolve('react')).href}'`)
  .replace("import { apiUrl } from './apiUrls';", "const apiUrl = endpoint => '/bible' + endpoint;")
  .replaceAll('import.meta.env.BASE_URL', "'/bible/'");
const { useBibleWallet } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const EDIT = 'Aa12Bb34Cc56Dd'; const VIEW = 'Ee12Ff34Gg56Hh';
const storedKey = 'bible-wallet-editor:/bible/';
const snapshot = {book:'MAT',chapter:5,verse:3,translations:['ar-svd']};
const result = (editor = true) => ({success:true,isEditor:editor,expiresAt:Date.now()+48*3600000,serverNow:Date.now(),items:[{id:1,snapshot}],...(editor ? {editToken:EDIT,viewToken:VIEW} : {})});
const response = body => ({ok:true,status:200,json:async()=>body});
async function mount(t, fetcher, initial = EDIT) {
  const originalFetch = globalThis.fetch; const originalStorage = globalThis.localStorage;
  const storage = new Map([[storedKey,EDIT]]);
  globalThis.localStorage = {getItem:key=>storage.get(key),setItem:(key,v)=>storage.set(key,v),removeItem:key=>storage.delete(key)};
  globalThis.fetch = fetcher;
  let value; let root;
  function Probe() { value=useBibleWallet(initial); return null; }
  await Renderer.act(async()=>{root=Renderer.create(React.createElement(Probe));});
  t.after(async()=>{await Renderer.act(async()=>root.unmount());globalThis.fetch=originalFetch;globalThis.localStorage=originalStorage;});
  return {get value(){return value;},storage};
}

test('temporary read failure never creates a replacement or loses the saved editing link', async t => {
  let posts=0;
  const h=await mount(t,async (url,options)=>{
    if (options?.method==='POST') {posts++;return response(result());}
    throw new Error('انقطاع مؤقت');
  });
  await Renderer.act(async()=>{await h.value.add(snapshot);});
  assert.equal(posts,0);
  assert.equal(h.storage.get(storedKey),EDIT);
});

test('adding an item sends its user-entered label with the saved snapshot', async t => {
  let request;
  const h = await mount(t, async (url, options) => {
    if (options?.method === 'POST') request = { url, body: JSON.parse(options.body) };
    return response(result());
  });
  await Renderer.act(async () => { await h.value.add(snapshot, 'مقارنة الإصحاح الأول'); });
  assert.equal(request.url, '/bible/api/bible/wallets/Aa12Bb34Cc56Dd/items');
  assert.equal(request.body.label, 'مقارنة الإصحاح الأول');
  assert.deepEqual(request.body.snapshot, snapshot);
});

test('late editor mutation cannot replace viewer state after navigating to its link', async t => {
  let finish; let pending;
  const h=await mount(t,async (url,options)=>{
    if(options?.method==='PATCH') return new Promise(resolve=>{finish=()=>resolve(response(result()));});
    return response(result(!url.endsWith(VIEW)));
  });
  await Renderer.act(async()=>{pending=h.value.update(1,{label:'جديد'});});
  await Renderer.act(async()=>{h.value.selectToken(VIEW);});
  assert.equal(h.value.data.isEditor,false);
  await Renderer.act(async()=>{finish();await pending;});
  assert.equal(h.value.data.isEditor,false);
  assert.equal(h.value.data.editToken,undefined);
});

test('reader hook does not run a repeating clock that rerenders the full reader', async t => {
  const original=globalThis.setInterval;let timers=0;
  globalThis.setInterval=(...args)=>{timers++;return original(...args);};
  t.after(()=>{globalThis.setInterval=original;});
  await mount(t,async()=>response(result()),'');
  assert.equal(timers,0);
});

test('returning through history to the same wallet token reloads rather than clears it', async t => {
  const h=await mount(t,async()=>response(result()));
  await Renderer.act(async()=>{h.value.selectToken(EDIT);});
  assert.equal(h.value.data?.isEditor,true);
  assert.equal(h.value.data?.items.length,1);
});
