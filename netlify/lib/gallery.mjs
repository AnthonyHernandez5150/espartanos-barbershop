import { getStore } from '@netlify/blobs';
import { getUser } from '@netlify/identity';
import { randomUUID } from 'node:crypto';

export const categories = ['Cortes', 'Barba', 'Diseños', 'Cejas', 'Otros'];
export const maxImageBytes = 3 * 1024 * 1024;
export const store = () => getStore({ name: 'gallery', consistency: 'strong' });
export const json = (data, status = 200) => Response.json(data, {
  status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }
});
export const fail = (status, message) => { throw Object.assign(new Error(message), { status }); };
export const validId = (id) => /^[a-f0-9-]{36}$/.test(id || '');
export const itemKey = (id) => `items/${id}.json`;
export const publicItem = ({ id, category, caption, featured, published, createdAt }) => ({
  id, category, caption, featured, published, createdAt,
  image: `/.netlify/functions/gallery?image=${id}`,
  alt: caption || `${category} de Espartano’s Barbershop`
});

export async function authorize(request, userReader = getUser) {
  // SDK verifies the session in Netlify's v2 runtime; never decode a browser JWT here.
  const user = await userReader();
  if (!user) fail(401, 'Inicia sesión para continuar.');
  if (!Array.isArray(user.roles) || !user.roles.includes('gallery-editor')) {
    fail(403, 'Tu cuenta necesita el permiso gallery-editor. Contacta al administrador.');
  }
  return user;
}

export function checkOrigin(request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) fail(403, 'Origen no permitido.');
}

export function fields(input) {
  if (!input || !categories.includes(input.category)) fail(400, 'Selecciona una categoría válida.');
  if (typeof input.caption !== 'string' || input.caption.length > 120) fail(400, 'La descripción debe tener hasta 120 caracteres.');
  if (typeof input.featured !== 'boolean' || typeof input.published !== 'boolean') fail(400, 'Opciones de publicación inválidas.');
  return { category: input.category, caption: input.caption.trim(), featured: input.featured, published: input.published };
}

export function imageType(bytes) {
  if (bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'image/jpeg';
  if (bytes.length >= 8 && Buffer.from(bytes.subarray(0, 8)).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return 'image/png';
  if (bytes.length >= 12 && Buffer.from(bytes.subarray(0, 4)).toString() === 'RIFF' && Buffer.from(bytes.subarray(8, 12)).toString() === 'WEBP') return 'image/webp';
  return null;
}

export async function items(storage) {
  const result = [];
  for await (const page of storage.list({ prefix: 'items/', paginate: true })) {
    const entries = await Promise.all(page.blobs.map(({ key }) => storage.get(key, { type: 'json' })));
    result.push(...entries.filter(Boolean));
  }
  return result.sort((a, b) => Number(b.featured) - Number(a.featured) || b.createdAt.localeCompare(a.createdAt));
}

export function errorResponse(error) {
  if (!error.status) console.error('Gallery operation failed:', error.name);
  return json({ error: error.status ? error.message : 'No se pudo completar la operación. Intenta de nuevo.' }, error.status || 500);
}

export async function adminHandler(request, dependencies = {}) {
  try {
    if (!['GET', 'POST', 'PATCH', 'DELETE'].includes(request.method)) return json({ error: 'Método no permitido.' }, 405);
    await authorize(request, dependencies.userReader);
    if (request.method !== 'GET') checkOrigin(request);
    const storage = (dependencies.store || store)();
    if (request.method === 'GET') return json({ items: (await items(storage)).map(publicItem) });
    if (request.method === 'POST') {
      if (Number(request.headers.get('content-length')) > maxImageBytes + 32768) fail(413, 'La foto supera 3 MB.');
      const data = await request.formData();
      if (data.get('permission') !== 'true') fail(400, 'Confirma que tienes permiso para publicar esta foto.');
      const file = data.get('image');
      if (!file || typeof file.arrayBuffer !== 'function') fail(400, 'Selecciona una foto.');
      if (file.size < 12 || file.size > maxImageBytes) fail(413, 'La foto debe tener como máximo 3 MB.');
      const bytes = await file.arrayBuffer();
      const mime = imageType(new Uint8Array(bytes));
      if (!mime || mime !== file.type) fail(400, 'Solo se permiten fotos JPEG, PNG o WebP válidas.');
      let metadata;
      try { metadata = JSON.parse(data.get('metadata')); } catch { fail(400, 'Datos inválidos.'); }
      const id = randomUUID();
      const item = { id, ...fields(metadata), imageKey: `images/${id}`, mime, createdAt: new Date().toISOString() };
      await storage.set(item.imageKey, bytes);
      try { await storage.setJSON(itemKey(id), item); }
      catch (error) { await storage.delete(item.imageKey); throw error; }
      return json({ item: publicItem(item) }, 201);
    }
    const id = new URL(request.url).searchParams.get('id');
    if (!validId(id)) fail(400, 'Foto inválida.');
    const current = await storage.get(itemKey(id), { type: 'json' });
    if (!current) fail(404, 'No se encontró la foto.');
    if (request.method === 'DELETE') {
      await storage.delete(itemKey(id));
      await storage.delete(current.imageKey);
      return json({ deleted: true });
    }
    let input;
    try { input = await request.json(); } catch { fail(400, 'Datos inválidos.'); }
    const item = { ...current, ...fields(input) };
    await storage.setJSON(itemKey(id), item);
    return json({ item: publicItem(item) });
  } catch (error) { return errorResponse(error); }
}
