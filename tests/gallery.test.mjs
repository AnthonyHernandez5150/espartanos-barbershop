import test from 'node:test';
import assert from 'node:assert/strict';
import { adminHandler, fields, imageType, maxImageBytes, items } from '../netlify/lib/gallery.mjs';
import publicHandler from '../netlify/functions/gallery.mjs';

const url = 'https://example.test/.netlify/functions/gallery-admin';
const editor = async () => ({ id: 'editor', roles: ['gallery-editor'] });
const metadata = { category: 'Cortes', caption: 'Corte clásico', featured: true, published: true };
function memoryStore() {
  const data = new Map();
  return {
    data,
    async get(key) { return data.get(key) ?? null; },
    async set(key, value) { data.set(key, value); },
    async setJSON(key, value) { data.set(key, value); },
    async delete(key) { data.delete(key); },
    async *list() { yield { blobs: [...data.keys()].filter(key => key.startsWith('items/')).map(key => ({ key })) }; }
  };
}
function upload(bytes, type = 'image/jpeg', permission = 'true') {
  const data = new FormData();
  data.set('image', new Blob([bytes], { type }), 'foto.jpg');
  data.set('metadata', JSON.stringify(metadata)); data.set('permission', permission);
  return new Request(url, { method: 'POST', headers: { origin: 'https://example.test' }, body: data });
}
const jpeg = Uint8Array.from([255,216,255,224,0,16,74,70,73,70,0,0]);

test('every private method rejects anonymous callers before accessing storage', async () => {
  for (const method of ['GET', 'POST', 'PATCH', 'DELETE']) {
    const result = await adminHandler(new Request(url, { method }), {
      userReader: async () => null, store: () => { throw new Error('must not access storage'); }
    });
    assert.equal(result.status, 401);
  }
});
test('a signed-in user without the server-controlled role cannot write', async () => {
  const result = await adminHandler(upload(jpeg), { userReader: async () => ({ roles: [], userMetadata: { roles: ['gallery-editor'] } }) });
  assert.equal(result.status, 403);
});
test('missing or cross-site origins are rejected', async () => {
  for (const origin of [null, 'https://evil.test']) {
    const result = await adminHandler(new Request(url, { method: 'DELETE', headers: origin ? { origin } : {} }), { userReader: editor });
    assert.equal(result.status, 403);
  }
});
test('upload, list, edit, unpublish and delete persist in the backing store', async () => {
  const storage = memoryStore(); const deps = { userReader: editor, store: () => storage };
  const created = await adminHandler(upload(jpeg), deps);
  assert.equal(created.status, 201);
  const { item } = await created.json();
  assert.ok(item.image.startsWith('/.netlify/functions/gallery?image='));
  assert.equal(storage.data.size, 2);
  let result = await adminHandler(new Request(url), deps);
  assert.equal((await result.json()).items.length, 1);
  result = await adminHandler(new Request(`${url}?id=${item.id}`, {
    method: 'PATCH', headers: { origin: 'https://example.test', 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...metadata, caption: 'Nuevo texto', published: false, imageKey: 'injected' })
  }), deps);
  assert.equal(result.status, 200);
  assert.equal((await items(storage))[0].published, false);
  assert.equal((await items(storage))[0].imageKey, `images/${item.id}`);
  result = await adminHandler(new Request(`${url}?id=${item.id}`, { method: 'DELETE', headers: { origin: 'https://example.test' } }), deps);
  assert.equal(result.status, 200); assert.equal(storage.data.size, 0);
});
test('rejects unsupported, mislabeled, oversized and unapproved uploads', async () => {
  const storage = memoryStore(); const deps = { userReader: editor, store: () => storage };
  for (const request of [upload('<svg>not a photo</svg>', 'image/svg+xml'), upload(jpeg, 'image/png'), upload(jpeg, 'image/jpeg', 'false')]) {
    assert.equal((await adminHandler(request, deps)).status, 400);
  }
  assert.equal((await adminHandler(upload(new Uint8Array(maxImageBytes + 1)), deps)).status, 413);
  assert.equal(storage.data.size, 0);
});
test('validation ignores arbitrary storage fields and rejects bad categories and captions', () => {
  assert.deepEqual(fields({ ...metadata, id: 'injected', imageKey: 'injected' }), metadata);
  assert.throws(() => fields({ ...metadata, category: '<script>' }));
  assert.throws(() => fields({ ...metadata, caption: 'a'.repeat(121) }));
  assert.equal(imageType(jpeg), 'image/jpeg');
  assert.equal(imageType(new Uint8Array([137,80,78,71,13,10,26,10])), 'image/png');
  assert.equal(imageType(new TextEncoder().encode('RIFF0000WEBP')), 'image/webp');
  assert.equal(imageType(new TextEncoder().encode('<svg>')), null);
});

test('public API hides unpublished items and blocks private images and all writes', async () => {
  const storage = memoryStore();
  const deps = { store: () => storage, userReader: async () => null };
  const id = '00000000-0000-0000-0000-000000000001';
  await storage.setJSON(`items/${id}.json`, { id, ...metadata, published: false, createdAt: '2026-10-30', imageKey: `images/${id}`, mime: 'image/jpeg' });
  let result = await publicHandler(new Request('https://example.test/.netlify/functions/gallery'), deps);
  assert.deepEqual((await result.json()).items, []);
  result = await publicHandler(new Request(`https://example.test/.netlify/functions/gallery?image=${id}`), deps);
  assert.equal(result.status, 401);
  result = await publicHandler(new Request('https://example.test/.netlify/functions/gallery', { method: 'POST' }), deps);
  assert.equal(result.status, 405);
});
