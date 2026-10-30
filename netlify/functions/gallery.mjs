import { authorize, errorResponse, fail, itemKey, items, json, publicItem, store, validId } from '../lib/gallery.mjs';

export default async (request, dependencies = {}) => {
  try {
    if (request.method !== 'GET') return json({ error: 'Método no permitido.' }, 405);
    const storage = (dependencies.store || store)();
    const id = new URL(request.url).searchParams.get('image');
    if (id !== null) {
      if (!validId(id)) fail(404, 'Foto no encontrada.');
      const item = await storage.get(itemKey(id), { type: 'json' });
      if (!item) fail(404, 'Foto no encontrada.');
      if (!item.published) await authorize(request, dependencies.userReader);
      const image = await storage.get(item.imageKey, { type: 'arrayBuffer' });
      if (!image) fail(404, 'Foto no encontrada.');
      return new Response(image, { headers: {
        'Content-Type': item.mime, 'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff', 'Cross-Origin-Resource-Policy': 'same-origin'
      } });
    }
    return json({ items: (await items(storage)).filter(item => item.published).map(publicItem) });
  } catch (error) { return errorResponse(error); }
};
