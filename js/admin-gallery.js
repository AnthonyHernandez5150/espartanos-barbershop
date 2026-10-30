import { login, logout, getUser, handleAuthCallback, acceptInvite, updateUser, requestPasswordRecovery, refreshSession } from '@netlify/identity';

const api = '/.netlify/functions/gallery-admin';
const authPanel = document.querySelector('[data-auth-panel]');
const loginForm = document.querySelector('[data-login-form]');
const passwordForm = document.querySelector('[data-password-form]');
const authStatus = document.querySelector('[data-auth-status]');
const workspace = document.querySelector('[data-admin-workspace]');
const form = document.querySelector('[data-admin-form]');
const list = document.querySelector('[data-admin-list]');
const status = document.querySelector('[data-admin-form-status]');
const listStatus = document.querySelector('[data-admin-list-status]');
const fileInput = document.querySelector('[data-photo-input]');
const preview = document.querySelector('[data-photo-preview]');
const previewImage = document.querySelector('[data-photo-preview-image]');
const fileName = document.querySelector('[data-file-name]');
const submit = form.querySelector('[type="submit"]');
const deleteDialog = document.querySelector('[data-delete-dialog]');
const logoutButton = document.querySelector('[data-logout]');
let items = [];
let editId = null;
let pendingDelete = null;
let previewUrl = null;
let inviteToken = null;
let busy = false;

async function request(path = '', options = {}) {
  await refreshSession();
  const response = await fetch(api + path, { ...options, credentials: 'same-origin', cache: 'no-store' });
  const result = await response.json();
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      workspace.hidden = true;
      authPanel.hidden = false;
      authStatus.textContent = result.error;
    }
    throw new Error(result.error || 'No se pudo completar la operación.');
  }
  return result;
}

function resetForm() {
  editId = null;
  form.reset();
  fileInput.required = true;
  fileInput.disabled = false;
  submit.textContent = 'PUBLICAR FOTO';
  document.querySelector('#admin-form-title').textContent = 'Agregar foto';
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = null;
  preview.hidden = true;
  fileName.textContent = 'Ningún archivo seleccionado';
}

function render() {
  list.replaceChildren();
  document.querySelector('[data-admin-count]').textContent = `${items.length} fotos`;
  listStatus.textContent = items.length ? '' : 'Todavía no hay fotos. Agrega la primera foto de tu negocio.';
  items.forEach(item => {
    const row = document.createElement('li');
    row.className = 'admin-gallery-item';
    const thumb = document.createElement('div');
    thumb.className = 'admin-gallery-thumb';
    const image = document.createElement('img');
    image.src = item.image; image.alt = item.alt; image.loading = 'lazy';
    thumb.append(image);
    const info = document.createElement('div');
    info.className = 'admin-gallery-info';
    const category = document.createElement('span');
    category.className = 'admin-category-pill'; category.textContent = item.category;
    const caption = document.createElement('p');
    caption.className = 'admin-gallery-caption'; caption.textContent = item.caption || 'Sin descripción';
    const state = document.createElement('span');
    state.className = 'admin-gallery-note';
    state.textContent = `${item.published ? 'Publicada' : 'Oculta'}${item.featured ? ' · Destacada en inicio' : ''}`;
    info.append(category, caption, state);
    const actions = document.createElement('div'); actions.className = 'admin-gallery-actions';
    for (const [action, label] of [['feature', item.featured ? 'Quitar destacado' : 'Destacar'], ['edit', 'Editar'], ['delete', 'Eliminar']]) {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'admin-action-button'; button.textContent = label;
      button.addEventListener('click', () => act(action, item));
      actions.append(button);
    }
    row.append(thumb, info, actions); list.append(row);
  });
}

async function load() {
  const result = await request();
  items = result.items;
  render();
}

async function session() {
  const user = await getUser();
  logoutButton.hidden = !user;
  if (!user) { workspace.hidden = true; authPanel.hidden = false; return; }
  await load(); // Server authorization, not the browser's user object, controls access.
  authPanel.hidden = true;
  workspace.hidden = false;
  document.querySelector('[data-add-photo]').hidden = false;
}

async function act(action, item) {
  if (busy) return;
  if (action === 'edit') {
    resetForm(); editId = item.id;
    fileInput.required = false; fileInput.disabled = true;
    form.elements.categoria.value = item.category;
    form.elements.descripcion.value = item.caption;
    form.elements['mostrar-inicio'].value = item.featured ? 'si' : 'no';
    form.elements.publicada.checked = item.published;
    previewImage.src = item.image; preview.hidden = false;
    fileName.textContent = 'Foto actual. Para reemplazarla, agrega otra foto.';
    submit.textContent = 'GUARDAR CAMBIOS';
    document.querySelector('#admin-form-title').textContent = 'Editar foto';
    form.scrollIntoView({ block: 'start' });
    status.textContent = 'Edita los datos y guarda los cambios.';
    return;
  }
  if (action === 'delete') {
    pendingDelete = item;
    document.querySelector('[data-delete-message]').textContent = `Se eliminará permanentemente esta foto${item.caption ? ': ' + item.caption : ''}.`;
    deleteDialog.showModal(); return;
  }
  busy = true;
  try {
    await request(`?id=${item.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...item, featured: !item.featured }) });
    await load();
    listStatus.textContent = 'Cambio guardado.';
  } catch (error) { listStatus.textContent = error.message; }
  finally { busy = false; }
}

fileInput.addEventListener('change', () => {
  const file = fileInput.files[0];
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  preview.hidden = true;
  if (!file) return;
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 20 * 1024 * 1024) {
    status.textContent = 'Selecciona una foto JPEG, PNG o WebP de hasta 20 MB.';
    fileInput.value = ''; return;
  }
  previewUrl = URL.createObjectURL(file);
  previewImage.src = previewUrl; preview.hidden = false; fileName.textContent = file.name;
  status.textContent = 'Foto seleccionada. Se optimizará antes de subir.';
});

async function optimized(file) {
  const bitmap = await createImageBitmap(file);
  try {
    if (bitmap.width * bitmap.height > 80000000) throw new Error('La foto es demasiado grande. Elige una de menor resolución.');
    const ratio = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
    canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.85));
    if (!blob || blob.size > 3 * 1024 * 1024) throw new Error('La foto supera 3 MB después de optimizarla. Elige otra más pequeña.');
    return blob;
  } finally { bitmap.close(); }
}

form.addEventListener('submit', async event => {
  event.preventDefault(); if (busy) return;
  busy = true; submit.disabled = true; status.textContent = 'Guardando…';
  try {
    const metadata = { category: form.elements.categoria.value, caption: form.elements.descripcion.value,
      featured: form.elements['mostrar-inicio'].value === 'si', published: form.elements.publicada.checked };
    if (editId) {
      await request(`?id=${editId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(metadata) });
    } else {
      const file = fileInput.files[0];
      if (!file) throw new Error('Selecciona una foto.');
      const data = new FormData();
      data.set('image', await optimized(file), 'foto.jpg');
      data.set('metadata', JSON.stringify(metadata));
      data.set('permission', String(form.elements.permiso.checked));
      await request('', { method: 'POST', body: data });
    }
    resetForm(); await load(); status.textContent = 'Foto guardada correctamente.';
  } catch (error) { status.textContent = error.message; }
  finally { busy = false; submit.disabled = false; }
});

document.querySelector('[data-add-photo]').addEventListener('click', () => {
  if (busy) return;
  resetForm(); status.textContent = ''; form.scrollIntoView({ block: 'start' });
});
document.querySelector('[data-delete-cancel]').addEventListener('click', () => deleteDialog.close());
document.querySelector('[data-delete-confirm]').addEventListener('click', async () => {
  if (!pendingDelete || busy) return;
  busy = true;
  const button = document.querySelector('[data-delete-confirm]'); button.disabled = true;
  try {
    await request(`?id=${pendingDelete.id}`, { method: 'DELETE' });
    if (editId === pendingDelete.id) resetForm();
    deleteDialog.close(); await load(); listStatus.textContent = 'Foto eliminada.';
  } catch (error) { document.querySelector('[data-delete-message]').textContent = error.message; }
  finally { busy = false; button.disabled = false; }
});
deleteDialog.addEventListener('close', () => { pendingDelete = null; });

loginForm.addEventListener('submit', async event => {
  event.preventDefault(); const button = loginForm.querySelector('button'); button.disabled = true;
  try { await login(loginForm.elements.email.value, loginForm.elements.password.value); loginForm.reset(); await session(); }
  catch { authStatus.textContent = 'No se pudo iniciar sesión. Revisa tu correo, contraseña y permisos.'; }
  finally { button.disabled = false; }
});
passwordForm.addEventListener('submit', async event => {
  event.preventDefault(); const button = passwordForm.querySelector('button'); button.disabled = true;
  try {
    const password = passwordForm.elements.password.value;
    if (inviteToken) await acceptInvite(inviteToken, password);
    else await updateUser({ password });
    inviteToken = null; passwordForm.reset(); passwordForm.hidden = true; loginForm.hidden = false;
    await session();
  } catch { authStatus.textContent = 'No se pudo guardar la contraseña. Revisa el enlace o solicita uno nuevo.'; }
  finally { button.disabled = false; }
});
document.querySelector('[data-forgot-password]').addEventListener('click', async () => {
  const email = loginForm.elements.email;
  if (!email.reportValidity() || !email.value) { email.focus(); return; }
  try { await requestPasswordRecovery(email.value); authStatus.textContent = 'Si tu cuenta existe, recibirás un enlace para recuperar el acceso.'; }
  catch { authStatus.textContent = 'No se pudo solicitar el enlace. Intenta más tarde.'; }
});
logoutButton.addEventListener('click', async () => {
  if (busy) return;
  workspace.hidden = true;
  try { await logout(); }
  finally { window.location.replace('/admin/galeria/'); }
});

try {
  const callback = await handleAuthCallback();
  if (callback?.type === 'invite' || callback?.type === 'recovery') {
    inviteToken = callback.token || null;
    loginForm.hidden = true; passwordForm.hidden = false;
    authStatus.textContent = 'Crea una contraseña de al menos 10 caracteres para tu cuenta.';
  } else { await session(); }
} catch { authStatus.textContent = 'No se pudo verificar el acceso. Intenta iniciar sesión o solicita un nuevo enlace.'; }
